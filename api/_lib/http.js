import { Buffer } from "node:buffer";

const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Security-Policy":
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
});

export class HttpError extends Error {
  constructor(status, code, message, headers = undefined) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export const getHeader = (request, name) => {
  const lowerName = name.toLowerCase();
  const value = request?.headers?.[lowerName] ?? request?.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
};

export const setSecurityHeaders = (response) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
};

export const sendJson = (response, status, payload, headers = undefined) => {
  setSecurityHeaders(response);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [name, value] of Object.entries(headers || {})) {
    response.setHeader(name, value);
  }
  return response.status(status).json(payload);
};

export const sendError = (response, error) => {
  const known = error instanceof HttpError;
  if (!known) {
    // Never log request bodies, credentials, SQL text, or upstream payloads.
    console.error("Dashboard API request failed", {
      name: error?.name || "Error",
      code: error?.code || "unknown",
    });
  }
  return sendJson(
    response,
    known ? error.status : 500,
    {
      error: {
        code: known ? error.code : "internal_error",
        message: known
          ? error.message
          : "The service could not complete this request.",
      },
    },
    known ? error.headers : undefined,
  );
};

export const allowMethods = (request, _response, methods) => {
  const method = String(request?.method || "GET").toUpperCase();
  if (methods.includes(method)) return method;
  throw new HttpError(
    405,
    "method_not_allowed",
    "This request method is not allowed.",
    { Allow: methods.join(", ") },
  );
};

const parseBody = (body) => {
  if (body === undefined || body === null || body === "") return {};
  if (Buffer.isBuffer(body)) return parseBody(body.toString("utf8"));
  if (typeof body === "string") return parseBody(JSON.parse(body));
  if (typeof body === "object" && !Array.isArray(body)) return body;
  throw new SyntaxError("The JSON body must be an object.");
};

export const readJsonBody = async (request, maxBytes = 4096) => {
  const contentType = String(getHeader(request, "content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(415, "json_required", "Send this request as JSON.");
  }

  let suppliedBody;
  try {
    suppliedBody = request.body;
  } catch {
    throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
  }
  if (suppliedBody !== undefined) {
    let serialized;
    try {
      serialized =
        typeof suppliedBody === "string"
          ? suppliedBody
          : JSON.stringify(suppliedBody);
    } catch {
      throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
    }
    if (Buffer.byteLength(serialized) > maxBytes) {
      throw new HttpError(413, "body_too_large", "The request body is too large.");
    }
    try {
      return parseBody(suppliedBody);
    } catch {
      throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
    }
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > maxBytes) {
      throw new HttpError(413, "body_too_large", "The request body is too large.");
    }
    chunks.push(bytes);
  }
  try {
    return parseBody(Buffer.concat(chunks));
  } catch {
    throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
  }
};

export const withApiErrors = (handler) => async (request, response) => {
  try {
    return await handler(request, response);
  } catch (error) {
    return sendError(response, error);
  }
};
