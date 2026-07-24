#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  googleLoopbackAuthorizationUrl,
  loadDesktopOAuthClient,
} from "./lib/google-oauth.mjs";
import { optionEnabled, parseArgs } from "./lib/dashboard-config.mjs";

export const FIXED_GA4_MEASUREMENT_ID = "G-5714F7Y7QK";
export const FIXED_GCP_PROJECT_ID = "focused-clock-498319-f5";
export const FIXED_GCP_PROJECT_NUMBER = "1074630920917";
export const FIXED_BIGQUERY_LOCATION = "US";
export const FIXED_GOOGLE_ACCOUNT_EMAIL = "admin@bradsdadsland.com";
export const FIXED_SEARCH_CONSOLE_DATASET =
  "searchconsole_bradsdadsland";
export const GOOGLE_EXPORT_SCOPES = Object.freeze([
  "openid",
  "email",
  "https://www.googleapis.com/auth/analytics.edit",
  "https://www.googleapis.com/auth/webmasters.readonly",
]);

const TARGET_PROJECT_RESOURCES = new Set([
  `projects/${FIXED_GCP_PROJECT_ID}`,
  `projects/${FIXED_GCP_PROJECT_NUMBER}`,
]);
const BRAD_SEARCH_CONSOLE_SITES = new Set([
  "sc-domain:bradsdadsland.com",
  "https://bradsdadsland.com/",
  "https://www.bradsdadsland.com/",
]);
const DEFAULT_OAUTH_CLIENT_FILENAME =
  "bradsdadsland-google-oauth-client.json";
const DEFAULT_TOKEN_FILENAME =
  "bradsdadsland-google-exports-oauth.json";

export const googleExportAuthPaths = ({
  environment = process.env,
  homeDirectory = os.homedir(),
} = {}) => {
  const authDirectory =
    environment.BRADS_AUTH_DIR ||
    path.join(homeDirectory, ".config", "bradsdadsland-dashboard");
  return {
    authDirectory,
    clientPath:
      environment.BRADS_BOOTSTRAP_TOKEN_PATH ||
      path.join(authDirectory, DEFAULT_OAUTH_CLIENT_FILENAME),
    tokenPath: path.join(authDirectory, DEFAULT_TOKEN_FILENAME),
  };
};

export const googleExportsAuthorizationUrl = ({
  clientId,
  redirectUri,
  state,
}) =>
  googleLoopbackAuthorizationUrl({
    clientId,
    redirectUri,
    scopes: GOOGLE_EXPORT_SCOPES,
    state,
    loginHint: FIXED_GOOGLE_ACCOUNT_EMAIL,
    prompt: "select_account consent",
  });

const readJson = (filePath, fallback = null) => {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

export const writePrivateJson = (filePath, payload) => {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(directory).isSymbolicLink()) {
    throw new Error(
      `Refusing to store Google OAuth material through symlinked directory ${directory}.`
    );
  }
  const directoryMode = fs.statSync(directory).mode & 0o777;
  if (directoryMode !== 0o700) {
    throw new Error(
      `Refusing to store Google OAuth material in ${directory}: directory mode must be 0700, found ${directoryMode
        .toString(8)
      .padStart(4, "0")}.`
    );
  }
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error(
      `Refusing to overwrite symlinked Google OAuth token ${filePath}.`
    );
  }
  if (fs.existsSync(filePath)) fs.chmodSync(filePath, 0o600);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}${os.EOL}`, {
    mode: 0o600,
  });
  fs.chmodSync(filePath, 0o600);
};

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
};

const googleJsonRequest = async ({
  fetchImpl,
  accessToken,
  url,
  method = "GET",
  body,
}) => {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(
      `${method} ${new URL(url).host} failed (${response.status}): ${String(
        payload.error?.message ||
          payload.error_description ||
          payload.raw ||
          "unknown error"
      ).slice(0, 500)}`
    );
  }
  return payload;
};

const paginatedGoogleRequest = async ({
  fetchImpl,
  accessToken,
  endpoint,
  collection,
}) => {
  const rows = [];
  let pageToken = "";
  const seenTokens = new Set();
  do {
    const url = new URL(endpoint);
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await googleJsonRequest({
      fetchImpl,
      accessToken,
      url: url.toString(),
    });
    if (Array.isArray(payload[collection])) {
      rows.push(...payload[collection]);
    }
    pageToken = String(payload.nextPageToken || "");
    if (pageToken && seenTokens.has(pageToken)) {
      throw new Error(`Google returned a repeated ${collection} page token.`);
    }
    if (pageToken) seenTokens.add(pageToken);
  } while (pageToken);
  return rows;
};

const propertyResource = (value) => {
  const normalized = String(value || "").trim();
  const resource = /^\d+$/.test(normalized)
    ? `properties/${normalized}`
    : normalized;
  if (!/^properties\/\d+$/.test(resource)) {
    throw new Error(
      `Invalid GA4 property guard: ${normalized || "(empty)"}.`
    );
  }
  return resource;
};

const fixedInput = (value, expected, label) => {
  const normalized =
    value === undefined ? expected : String(value).trim();
  if (normalized !== expected) {
    throw new Error(
      `${label} must remain ${expected}; refusing ${normalized || "(empty)"}.`
    );
  }
  return expected;
};

const assertKnownOptions = (options, allowed) => {
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) {
      throw new Error(`Unsupported option --${key}; refusing an unscoped run.`);
    }
  }
};

const fixedSetupGuards = (options = {}) => {
  assertKnownOptions(
    options,
    new Set([
      "apply",
      "streaming",
      "project",
      "measurement-id",
      "property",
      "location",
    ])
  );
  fixedInput(options.project, FIXED_GCP_PROJECT_ID, "Google Cloud project");
  fixedInput(
    options["measurement-id"],
    FIXED_GA4_MEASUREMENT_ID,
    "GA4 measurement ID"
  );
  fixedInput(
    options.location,
    FIXED_BIGQUERY_LOCATION,
    "BigQuery location"
  );
  return {
    guardedProperty: options.property
      ? propertyResource(options.property)
      : "",
  };
};

export const discoverBradGa4Stream = async ({
  fetchImpl = fetch,
  accessToken,
}) => {
  const accountSummaries = await paginatedGoogleRequest({
    fetchImpl,
    accessToken,
    endpoint:
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    collection: "accountSummaries",
  });
  const properties = new Map();
  for (const account of accountSummaries) {
    for (const summary of account.propertySummaries || []) {
      if (!/^properties\/\d+$/.test(String(summary.property || ""))) continue;
      const previous = properties.get(summary.property);
      const observedCanEdit =
        typeof summary.canEdit === "boolean" ? summary.canEdit : null;
      const canEditValues = [previous?.canEdit, observedCanEdit];
      properties.set(summary.property, {
        property: summary.property,
        displayName: summary.displayName || previous?.displayName || "",
        canEdit: canEditValues.includes(false)
          ? false
          : canEditValues.includes(true)
            ? true
            : null,
      });
    }
  }

  const matches = [];
  let webStreamsInspected = 0;
  for (const property of properties.values()) {
    const streams = await paginatedGoogleRequest({
      fetchImpl,
      accessToken,
      endpoint: `https://analyticsadmin.googleapis.com/v1beta/${property.property}/dataStreams`,
      collection: "dataStreams",
    });
    for (const stream of streams) {
      if (
        stream.type !== "WEB_DATA_STREAM" ||
        !stream.webStreamData?.measurementId
      ) {
        continue;
      }
      webStreamsInspected += 1;
      if (
        stream.webStreamData.measurementId === FIXED_GA4_MEASUREMENT_ID
      ) {
        matches.push({
          ...property,
          stream: {
            name: stream.name,
            displayName: stream.displayName || "",
            defaultUri: stream.webStreamData.defaultUri || "",
            measurementId: stream.webStreamData.measurementId,
          },
        });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(
      `No accessible GA4 web stream exactly matched ${FIXED_GA4_MEASUREMENT_ID}. Inspected ${properties.size} accessible GA4 properties and ${webStreamsInspected} accessible GA4 web streams.`
    );
  }
  if (matches.length !== 1) {
    throw new Error(
      `Refusing an ambiguous GA4 setup: ${matches.length} web streams matched ${FIXED_GA4_MEASUREMENT_ID}.`
    );
  }
  return {
    propertiesInspected: properties.size,
    webStreamsInspected,
    match: matches[0],
  };
};

export const listGa4BigQueryLinks = ({
  fetchImpl = fetch,
  accessToken,
  property,
}) =>
  paginatedGoogleRequest({
    fetchImpl,
    accessToken,
    endpoint: `https://analyticsadmin.googleapis.com/v1alpha/${propertyResource(
      property
    )}/bigQueryLinks`,
    collection: "bigqueryLinks",
  });

const verifyTargetLink = ({ link, property, stream, streaming }) => {
  if (
    !String(link.name || "").startsWith(`${property}/bigQueryLinks/`) ||
    !TARGET_PROJECT_RESOURCES.has(String(link.project || ""))
  ) {
    throw new Error("The GA4 BigQuery link escaped the Brad property boundary.");
  }
  if (link.dailyExportEnabled !== true) {
    throw new Error(
      "The existing Brad GA4 BigQuery link does not have daily export enabled; refusing to patch it implicitly."
    );
  }
  if (
    Array.isArray(link.exportStreams) &&
    link.exportStreams.length > 0 &&
    !link.exportStreams.includes(stream.name)
  ) {
    throw new Error(
      "The existing Brad GA4 BigQuery link excludes the matched Brad web stream."
    );
  }
  if (streaming && link.streamingExportEnabled !== true) {
    throw new Error(
      "Streaming was explicitly requested but the existing link does not enable it; refusing to patch it implicitly."
    );
  }
  if (link.datasetLocation !== FIXED_BIGQUERY_LOCATION) {
    throw new Error(
      `The existing Brad GA4 BigQuery link is in ${
        link.datasetLocation || "(unknown)"
      }, not ${FIXED_BIGQUERY_LOCATION}; refusing to use it.`
    );
  }
  return link;
};

const createRequestFor = ({ stream, streaming }) => ({
  project: `projects/${FIXED_GCP_PROJECT_ID}`,
  dailyExportEnabled: true,
  streamingExportEnabled: streaming,
  includeAdvertisingId: false,
  exportStreams: [stream.name],
  datasetLocation: FIXED_BIGQUERY_LOCATION,
});

export const inspectBradSearchConsoleSites = async ({
  fetchImpl = fetch,
  accessToken,
}) => {
  try {
    const payload = await googleJsonRequest({
      fetchImpl,
      accessToken,
      url: "https://www.googleapis.com/webmasters/v3/sites",
    });
    const matches = (payload.siteEntry || [])
      .filter(({ siteUrl }) => BRAD_SEARCH_CONSOLE_SITES.has(siteUrl))
      .map(({ siteUrl, permissionLevel }) => ({
        siteUrl,
        permissionLevel,
      }));
    return {
      available: true,
      matches,
      ownerVerified: matches.some(
        ({ permissionLevel }) => permissionLevel === "siteOwner"
      ),
      targetDataset: FIXED_SEARCH_CONSOLE_DATASET,
      bulkExportActivation: "manual_required_no_public_api",
    };
  } catch (error) {
    return {
      available: false,
      matches: [],
      ownerVerified: false,
      targetDataset: FIXED_SEARCH_CONSOLE_DATASET,
      bulkExportActivation: "manual_required_no_public_api",
      error: String(error.message || error).slice(0, 500),
    };
  }
};

export const setupGoogleManagedExports = async ({
  fetchImpl = fetch,
  accessToken,
  options = {},
  apply = false,
  streaming = false,
  verifiedAccountEmail,
} = {}) => {
  if (!accessToken) throw new Error("A Google OAuth access token is required.");
  if (apply && verifiedAccountEmail !== FIXED_GOOGLE_ACCOUNT_EMAIL) {
    throw new Error(
      `Apply mode requires a token bound to the verified ${FIXED_GOOGLE_ACCOUNT_EMAIL} identity.`
    );
  }
  const { guardedProperty } = fixedSetupGuards(options);
  const discovery = await discoverBradGa4Stream({
    fetchImpl,
    accessToken,
  });
  const { match } = discovery;
  if (guardedProperty && guardedProperty !== match.property) {
    throw new Error(
      `GA4 property guard ${guardedProperty} does not match the property discovered from ${FIXED_GA4_MEASUREMENT_ID}; refusing.`
    );
  }

  const links = await listGa4BigQueryLinks({
    fetchImpl,
    accessToken,
    property: match.property,
  });
  const foreignLinks = links.filter(
    ({ project }) => !TARGET_PROJECT_RESOURCES.has(String(project || ""))
  );
  if (foreignLinks.length > 0) {
    throw new Error(
      `The matched Brad GA4 property already has a link to a non-Brad project (${foreignLinks
        .map(({ project }) => project || "(missing project)")
        .join(", ")}); refusing any mutation.`
    );
  }
  if (links.length > 1) {
    throw new Error(
      "The matched Brad GA4 property has multiple BigQuery links; refusing an ambiguous setup."
    );
  }

  const createRequest = createRequestFor({
    stream: match.stream,
    streaming,
  });
  let linkStatus = "planned";
  let link = null;
  if (links.length === 1) {
    link = verifyTargetLink({
      link: links[0],
      property: match.property,
      stream: match.stream,
      streaming,
    });
    linkStatus = "verified_existing";
  } else if (apply) {
    if (match.canEdit === false) {
      throw new Error(
        "The authenticated principal can read the matched GA4 property but cannot edit it; refusing link creation."
      );
    }
    const created = await googleJsonRequest({
      fetchImpl,
      accessToken,
      method: "POST",
      url: `https://analyticsadmin.googleapis.com/v1alpha/${match.property}/bigQueryLinks`,
      body: createRequest,
    });
    link = verifyTargetLink({
      link: created,
      property: match.property,
      stream: match.stream,
      streaming,
    });
    linkStatus = "created";
  }

  const searchConsole = await inspectBradSearchConsoleSites({
    fetchImpl,
    accessToken,
  });
  const propertyId = match.property.split("/")[1];
  return {
    ok: true,
    mode: apply ? "apply" : "dry-run",
    ...(verifiedAccountEmail === FIXED_GOOGLE_ACCOUNT_EMAIL
      ? { accountEmail: FIXED_GOOGLE_ACCOUNT_EMAIL }
      : {}),
    fixedBoundary: {
      measurementId: FIXED_GA4_MEASUREMENT_ID,
      projectId: FIXED_GCP_PROJECT_ID,
      projectNumber: FIXED_GCP_PROJECT_NUMBER,
      location: FIXED_BIGQUERY_LOCATION,
    },
    ga4: {
      property: match.property,
      propertyDisplayName: match.displayName,
      canEdit: match.canEdit,
      stream: match.stream,
      dataset: `analytics_${propertyId}`,
      propertiesInspected: discovery.propertiesInspected,
      webStreamsInspected: discovery.webStreamsInspected,
      linkStatus,
      link,
      createRequest: linkStatus === "planned" ? createRequest : null,
    },
    searchConsole,
  };
};

const identityVerificationError = () =>
  new Error(
    `Google authorization must use the verified ${FIXED_GOOGLE_ACCOUNT_EMAIL} account; the OAuth token was not stored.`
  );

const decodeJwtJson = (segment) => {
  if (!segment || !/^[A-Za-z0-9_-]+$/.test(segment)) {
    throw identityVerificationError();
  }
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    throw identityVerificationError();
  }
};

export const verifyGoogleIdTokenIdentity = async ({
  fetchImpl = fetch,
  idToken,
  clientId,
  now = Date.now(),
}) => {
  if (!idToken || !clientId) throw identityVerificationError();
  const parts = String(idToken).split(".");
  if (parts.length !== 3) throw identityVerificationError();
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = decodeJwtJson(encodedHeader);
  const claims = decodeJwtJson(encodedClaims);
  if (
    header.alg !== "RS256" ||
    !header.kid ||
    !/^[A-Za-z0-9_-]+$/.test(encodedSignature)
  ) {
    throw identityVerificationError();
  }

  const response = await fetchImpl(
    "https://www.googleapis.com/oauth2/v3/certs",
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );
  const jwks = await parseResponse(response);
  if (!response.ok) {
    throw new Error(
      `Google ID-token key lookup failed (${response.status}); the OAuth token was not stored.`
    );
  }
  const key = (jwks.keys || []).find(
    (candidate) =>
      candidate.kid === header.kid &&
      candidate.kty === "RSA" &&
      (!candidate.alg || candidate.alg === "RS256") &&
      (!candidate.use || candidate.use === "sig")
  );
  if (!key) throw identityVerificationError();

  let signatureValid = false;
  try {
    signatureValid = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      crypto.createPublicKey({ key, format: "jwk" }),
      Buffer.from(encodedSignature, "base64url")
    );
  } catch {
    throw identityVerificationError();
  }
  const audiences = Array.isArray(claims.aud)
    ? claims.aud.map(String)
    : [String(claims.aud || "")];
  const issuerValid = new Set([
    "https://accounts.google.com",
    "accounts.google.com",
  ]).has(claims.iss);
  const audienceValid =
    audiences.includes(clientId) &&
    (audiences.length === 1 || claims.azp === clientId) &&
    (!claims.azp || claims.azp === clientId);
  const expiryValid =
    Number.isFinite(Number(claims.exp)) &&
    Number(claims.exp) > Math.floor(now / 1000);
  const emailVerified =
    claims.email_verified === true || claims.email_verified === "true";
  if (
    !signatureValid ||
    !issuerValid ||
    !audienceValid ||
    !expiryValid ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.email !== FIXED_GOOGLE_ACCOUNT_EMAIL ||
    !emailVerified
  ) {
    throw identityVerificationError();
  }
  return {
    email: FIXED_GOOGLE_ACCOUNT_EMAIL,
    emailVerified: true,
    subject: claims.sub,
  };
};

const verifiedStoredIdentity = (token, tokenPath) => {
  const identity = token?.verified_identity;
  if (
    identity?.version !== 1 ||
    identity.email !== FIXED_GOOGLE_ACCOUNT_EMAIL ||
    identity.emailVerified !== true ||
    typeof identity.subject !== "string" ||
    !identity.subject
  ) {
    throw new Error(
      `The Google exports OAuth token at ${tokenPath} is not bound to the verified ${FIXED_GOOGLE_ACCOUNT_EMAIL} identity. Run the auth command again.`
    );
  }
  return identity;
};

export const storeVerifiedGoogleExportsToken = async ({
  fetchImpl = fetch,
  payload,
  client,
  tokenPath,
  now = Date.now(),
}) => {
  if (!payload?.access_token || !payload.id_token) {
    throw identityVerificationError();
  }
  const identity = await verifyGoogleIdTokenIdentity({
    fetchImpl,
    idToken: payload.id_token,
    clientId: client?.client_id,
    now,
  });
  const { id_token: ignoredIdToken, ...oauthPayload } = payload;
  void ignoredIdToken;
  const storedToken = {
    ...oauthPayload,
    client_id: client.client_id,
    client_secret: client.client_secret,
    expiry_date: now + Number(payload.expires_in || 3600) * 1000,
    verified_identity: {
      version: 1,
      email: identity.email,
      emailVerified: true,
      subject: identity.subject,
    },
  };
  writePrivateJson(tokenPath, storedToken);
  return {
    storedToken,
    verifiedEmail: identity.email,
  };
};

const refreshAccessToken = async ({
  fetchImpl,
  token,
  tokenPath,
  now = Date.now(),
}) => {
  const storedIdentity = verifiedStoredIdentity(token, tokenPath);
  if (!token.refresh_token || !token.client_id || !token.client_secret) {
    throw new Error(
      `The Google exports token at ${tokenPath} is expired and cannot be refreshed. Run the auth command again.`
    );
  }
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: token.client_id,
      client_secret: token.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const payload = await parseResponse(response);
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Google exports token refresh failed (${response.status}): ${String(
        payload.error_description || payload.error || "unknown error"
      ).slice(0, 500)}`
    );
  }
  if (payload.id_token) {
    const refreshedIdentity = await verifyGoogleIdTokenIdentity({
      fetchImpl,
      idToken: payload.id_token,
      clientId: token.client_id,
      now,
    });
    if (refreshedIdentity.subject !== storedIdentity.subject) {
      throw identityVerificationError();
    }
  }
  const { id_token: ignoredIdToken, ...refreshPayload } = payload;
  void ignoredIdToken;
  const updated = {
    ...token,
    ...refreshPayload,
    refresh_token: token.refresh_token,
    client_id: token.client_id,
    client_secret: token.client_secret,
    expiry_date: now + Number(payload.expires_in || 3600) * 1000,
    verified_identity: storedIdentity,
  };
  writePrivateJson(tokenPath, updated);
  return updated.access_token;
};

export const googleExportsCredentials = async ({
  fetchImpl = fetch,
  tokenPath = googleExportAuthPaths().tokenPath,
  now = Date.now(),
} = {}) => {
  const token = readJson(tokenPath);
  if (!token) {
    throw new Error(
      `Missing Google exports OAuth token at ${tokenPath}. Run the auth command first.`
    );
  }
  const verifiedIdentity = verifiedStoredIdentity(token, tokenPath);
  if (
    token.access_token &&
    Number(token.expiry_date || 0) > now + 60_000
  ) {
    return {
      accessToken: token.access_token,
      verifiedEmail: verifiedIdentity.email,
    };
  }
  return {
    accessToken: await refreshAccessToken({
      fetchImpl,
      token,
      tokenPath,
      now,
    }),
    verifiedEmail: verifiedIdentity.email,
  };
};

export const googleExportsAccessToken = async (options = {}) =>
  (await googleExportsCredentials(options)).accessToken;

const authorize = async ({
  options,
  fetchImpl = fetch,
  paths = googleExportAuthPaths(),
}) => {
  assertKnownOptions(options, new Set(["client", "no-open"]));
  const clientPath = path.resolve(options.client || paths.clientPath);
  const client = loadDesktopOAuthClient(clientPath);
  const state = crypto.randomBytes(32).toString("hex");
  const server = http.createServer();
  const codePromise = new Promise((resolve, reject) => {
    server.on("request", (request, response) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname !== "/oauth2callback") {
        response.writeHead(404).end("Not found");
        return;
      }
      if (url.searchParams.get("state") !== state) {
        response.writeHead(400).end("OAuth state mismatch.");
        reject(new Error("OAuth state mismatch."));
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (!code || error) {
        response.writeHead(400).end("Google authorization failed.");
        reject(new Error(error || "No authorization code returned."));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end(
        "Brad's GA4/Search Console authorization completed. You may close this tab."
      );
      resolve(code);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}/oauth2callback`;
  const authorizationUrl = googleExportsAuthorizationUrl({
    clientId: client.client_id,
    redirectUri,
    state,
  });
  process.stdout.write(
    `Open this URL as admin@bradsdadsland.com:\n${authorizationUrl}\n`
  );
  if (process.platform === "darwin" && !optionEnabled(options["no-open"])) {
    spawnSync("open", [authorizationUrl.toString()], { stdio: "ignore" });
  }

  try {
    const code = await codePromise;
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.client_id,
        client_secret: client.client_secret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const payload = await parseResponse(response);
    if (!response.ok || !payload.access_token) {
      throw new Error(
        `OAuth token exchange failed (${response.status}): ${String(
          payload.error_description || payload.error || "unknown error"
        ).slice(0, 500)}`
      );
    }
    const { verifiedEmail } = await storeVerifiedGoogleExportsToken({
      fetchImpl,
      payload,
      client,
      tokenPath: paths.tokenPath,
    });
    return {
      authorized: true,
      accountEmail: verifiedEmail,
      tokenPath: paths.tokenPath,
      tokenFileMode: "0600",
      scopes: GOOGLE_EXPORT_SCOPES,
    };
  } finally {
    server.close();
  }
};

const explicitTrueFlag = (argumentsList, name) => {
  const prefix = `--${name}`;
  const matches = argumentsList.filter(
    (value) => value === prefix || value.startsWith(`${prefix}=`)
  );
  if (matches.length === 0) return false;
  if (matches.length !== 1 || matches[0] !== `${prefix}=true`) {
    throw new Error(
      `${prefix} must be supplied exactly once as ${prefix}=true.`
    );
  }
  return true;
};

const assertUnambiguousArguments = (argumentsList) => {
  const names = new Set();
  for (const value of argumentsList) {
    if (!value.startsWith("--")) {
      throw new Error(
        `Unexpected positional argument ${value}; refusing an ambiguous run.`
      );
    }
    const name = value.slice(2).split("=", 1)[0];
    if (!name || names.has(name)) {
      throw new Error(
        `Option --${name || "(empty)"} must be supplied at most once.`
      );
    }
    names.add(name);
  }
};

const usage = () => `
Usage: node scripts/google-managed-exports.mjs <setup|auth> [options]

  setup  Read-only by default. Discovers the one GA4 web stream matching
         ${FIXED_GA4_MEASUREMENT_ID}, lists its BigQuery links, and reports
         Brad's Search Console site access.
         --apply=true       Create the fixed GA4 BigQuery link only if absent.
         --streaming=true   Also request streaming export; daily stays required.
         --property=123     Optional exact property guard discovered from the
                            fixed measurement ID.

  auth   Run Desktop OAuth loopback as admin@bradsdadsland.com.
         --client=/path/to/${DEFAULT_OAUTH_CLIENT_FILENAME}
         --no-open=true

The project (${FIXED_GCP_PROJECT_ID}), measurement ID, dataset location, and
Search Console dataset are fixed. This utility has no Search Console bulk-export
activation call because Google does not publish one.
`;

export const main = async (
  argv = process.argv.slice(2),
  { fetchImpl = fetch } = {}
) => {
  const [command = "setup", ...rest] = argv;
  if (["help", "--help", "-h"].includes(command)) return usage();
  assertUnambiguousArguments(rest);
  const options = parseArgs(rest);
  if (command === "auth") {
    return authorize({ options, fetchImpl });
  }
  if (command !== "setup") throw new Error(usage());
  const apply = explicitTrueFlag(rest, "apply");
  const streaming = explicitTrueFlag(rest, "streaming");
  fixedSetupGuards(options);
  const credentials = await googleExportsCredentials({ fetchImpl });
  return setupGoogleManagedExports({
    fetchImpl,
    accessToken: credentials.accessToken,
    verifiedAccountEmail: credentials.verifiedEmail,
    options,
    apply,
    streaming,
  });
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    const result = await main();
    process.stdout.write(
      `${typeof result === "string" ? result : JSON.stringify(result, null, 2)}\n`
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
