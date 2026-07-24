import { Buffer } from "node:buffer";
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import process from "node:process";
import { promisify } from "node:util";

import { getHeader, HttpError } from "./http.js";

export const DASHBOARD_COOKIE_NAME = "__Host-bdl_dashboard";
const SESSION_AUDIENCE = "bradsdadsland-dashboard";
const DEFAULT_SESSION_SECONDS = 12 * 60 * 60;
const MAX_SESSION_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginAttempts = new Map();
const scrypt = promisify(scryptCallback);

const configurationError = () =>
  new HttpError(
    503,
    "service_not_configured",
    "Dashboard access is not configured.",
  );

const encode = (value) => Buffer.from(value).toString("base64url");

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(String(left));
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(String(right));
  const length = Math.max(leftBuffer.length, rightBuffer.length, 1);
  const paddedLeft = Buffer.alloc(length);
  const paddedRight = Buffer.alloc(length);
  leftBuffer.copy(paddedLeft);
  rightBuffer.copy(paddedRight);
  return (
    timingSafeEqual(paddedLeft, paddedRight) &&
    leftBuffer.length === rightBuffer.length
  );
};

const sessionSecret = () => {
  const secret = String(process.env.DASHBOARD_SESSION_SECRET || "");
  if (Buffer.byteLength(secret) < 32) throw configurationError();
  return secret;
};

const sessionSeconds = () => {
  const configured = Number(
    process.env.DASHBOARD_SESSION_SECONDS || DEFAULT_SESSION_SECONDS,
  );
  if (!Number.isSafeInteger(configured) || configured < 15 * 60) {
    return DEFAULT_SESSION_SECONDS;
  }
  return Math.min(configured, MAX_SESSION_SECONDS);
};

const parsePasswordHash = (encodedHash) => {
  const [scheme, costText, blockText, parallelText, saltText, hashText, ...rest] =
    String(encodedHash).split("$");
  const cost = Number(costText);
  const blockSize = Number(blockText);
  const parallelization = Number(parallelText);
  if (
    scheme !== "scrypt" ||
    rest.length > 0 ||
    !Number.isSafeInteger(cost) ||
    cost < 16_384 ||
    cost > 262_144 ||
    (cost & (cost - 1)) !== 0 ||
    !Number.isSafeInteger(blockSize) ||
    blockSize < 1 ||
    blockSize > 32 ||
    !Number.isSafeInteger(parallelization) ||
    parallelization < 1 ||
    parallelization > 16 ||
    cost * blockSize > 524_288 ||
    !saltText ||
    !hashText
  ) {
    throw configurationError();
  }

  let salt;
  let hash;
  try {
    salt = Buffer.from(saltText, "base64url");
    hash = Buffer.from(hashText, "base64url");
  } catch {
    throw configurationError();
  }
  if (salt.length < 16 || hash.length < 32 || hash.length > 64) {
    throw configurationError();
  }
  return { cost, blockSize, parallelization, salt, hash };
};

export const verifyDashboardPassword = async (candidate) => {
  if (
    typeof candidate !== "string" ||
    candidate.length < 1 ||
    candidate.length > 1024
  ) {
    safeEqual(
      createHash("sha256").update(String(candidate)).digest(),
      randomBytes(32),
    );
    return false;
  }

  const encodedHash = process.env.DASHBOARD_PASSWORD_HASH;
  if (!encodedHash) throw configurationError();
  const { cost, blockSize, parallelization, salt, hash } =
    parsePasswordHash(encodedHash);
  let derived;
  try {
    derived = await scrypt(candidate, salt, hash.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: Math.max(64 * 1024 * 1024, 256 * cost * blockSize),
    });
  } catch {
    throw configurationError();
  }
  return safeEqual(derived, hash);
};

const sign = (value) =>
  createHmac("sha256", sessionSecret()).update(value).digest();

export const createSession = (nowMs = Date.now()) => {
  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + sessionSeconds();
  const payload = encode(
    JSON.stringify({
      v: 1,
      aud: SESSION_AUDIENCE,
      iat: issuedAt,
      exp: expiresAt,
      jti: randomBytes(16).toString("base64url"),
    }),
  );
  return {
    token: `${payload}.${encode(sign(payload))}`,
    maxAge: expiresAt - issuedAt,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
};

export const verifySessionToken = (token, nowMs = Date.now()) => {
  if (typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  let providedSignature;
  try {
    providedSignature = Buffer.from(parts[1], "base64url");
  } catch {
    return null;
  }
  if (!safeEqual(providedSignature, sign(parts[0]))) return null;

  try {
    const payloadText = Buffer.from(parts[0], "base64url").toString("utf8");
    if (Buffer.byteLength(payloadText) > 512) return null;
    const payload = JSON.parse(payloadText);
    const now = Math.floor(nowMs / 1000);
    if (
      payload?.v !== 1 ||
      payload?.aud !== SESSION_AUDIENCE ||
      !Number.isSafeInteger(payload?.iat) ||
      !Number.isSafeInteger(payload?.exp) ||
      payload.iat > now + 300 ||
      payload.exp <= now ||
      payload.exp - payload.iat > MAX_SESSION_SECONDS
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const serializeSessionCookie = ({ token, maxAge }) =>
  `${DASHBOARD_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

export const serializeExpiredSessionCookie = () =>
  `${DASHBOARD_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`;

export const parseCookies = (header) => {
  const cookies = Object.create(null);
  for (const part of String(header || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name || Object.hasOwn(cookies, name)) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
};

export const getDashboardSession = (request) => {
  const cookies = parseCookies(getHeader(request, "cookie"));
  return verifySessionToken(cookies[DASHBOARD_COOKIE_NAME]);
};

export const requireDashboardSession = (request) => {
  const session = getDashboardSession(request);
  if (!session) {
    throw new HttpError(
      401,
      "authentication_required",
      "Sign in to view the dashboard.",
    );
  }
  return session;
};

const requestOrigin = (request) => {
  const forwardedHost = String(getHeader(request, "x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(getHeader(request, "host") || "").trim();
  const forwardedProtocol = String(
    getHeader(request, "x-forwarded-proto") || "",
  )
    .split(",")[0]
    .trim();
  const protocol =
    forwardedProtocol ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return host ? `${protocol}://${host}` : "";
};

const trustedOrigins = (request) => {
  const configured = String(process.env.DASHBOARD_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return configured.length ? configured : [requestOrigin(request)].filter(Boolean);
};

export const assertTrustedMutation = (request) => {
  const fetchSite = String(getHeader(request, "sec-fetch-site") || "").toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") {
    throw new HttpError(
      403,
      "untrusted_origin",
      "This request did not come from the dashboard.",
    );
  }

  const originHeader = String(getHeader(request, "origin") || "").replace(/\/$/, "");
  if (!originHeader || originHeader === "null") {
    throw new HttpError(
      403,
      "origin_required",
      "This request did not come from the dashboard.",
    );
  }
  let normalized;
  try {
    normalized = new URL(originHeader).origin;
  } catch {
    throw new HttpError(
      403,
      "untrusted_origin",
      "This request did not come from the dashboard.",
    );
  }
  if (!trustedOrigins(request).includes(normalized)) {
    throw new HttpError(
      403,
      "untrusted_origin",
      "This request did not come from the dashboard.",
    );
  }
};

const loginKey = (request) => {
  const realIp = String(getHeader(request, "x-real-ip") || "").trim();
  const forwardedIp = String(getHeader(request, "x-forwarded-for") || "")
    .split(",")[0]
    .trim();
  return realIp || forwardedIp || "unknown";
};

const pruneAttempts = (now) => {
  if (loginAttempts.size < 1000) return;
  for (const [key, value] of loginAttempts) {
    if (
      now - value.windowStartedAt > LOGIN_WINDOW_MS &&
      value.blockedUntil <= now
    ) {
      loginAttempts.delete(key);
    }
  }
  while (loginAttempts.size >= 1000) {
    const oldest = loginAttempts.keys().next().value;
    if (oldest === undefined) break;
    loginAttempts.delete(oldest);
  }
};

export const assertLoginAllowed = (request, now = Date.now()) => {
  pruneAttempts(now);
  const attempt = loginAttempts.get(loginKey(request));
  if (attempt?.blockedUntil > now) {
    const retryAfter = Math.max(
      1,
      Math.ceil((attempt.blockedUntil - now) / 1000),
    );
    throw new HttpError(
      429,
      "too_many_attempts",
      "Too many sign-in attempts. Try again later.",
      { "Retry-After": String(retryAfter) },
    );
  }
};

export const recordFailedLogin = (request, now = Date.now()) => {
  const key = loginKey(request);
  const previous = loginAttempts.get(key);
  const current =
    !previous || now - previous.windowStartedAt > LOGIN_WINDOW_MS
      ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
      : previous;
  current.failures += 1;
  if (current.failures >= LOGIN_MAX_FAILURES) {
    current.blockedUntil = now + LOGIN_WINDOW_MS;
  }
  loginAttempts.set(key, current);
};

export const clearLoginFailures = (request) => {
  loginAttempts.delete(loginKey(request));
};

export const resetLoginLimiter = () => loginAttempts.clear();
