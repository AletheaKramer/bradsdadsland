import { AsyncLocalStorage } from "node:async_hooks";
import { Buffer } from "node:buffer";
import { createSign } from "node:crypto";
import process from "node:process";

import { HttpError } from "./http.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const STS_URL = "https://sts.googleapis.com/v1/token";
const IAM_URL =
  "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts";
const BIGQUERY_SCOPE = "https://www.googleapis.com/auth/bigquery.readonly";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;
const DEFAULT_DATASET_ID = "bradsdadsland_dashboard";
const DEFAULT_LOCATION = "US";
const DEFAULT_MAXIMUM_BYTES_BILLED = "1000000000";
const REQUEST_TIMEOUT_MS = 20_000;
const WORKLOAD_IDENTITY_KEYS = Object.freeze([
  "DASHBOARD_GCP_PROJECT_NUMBER",
  "DASHBOARD_GCP_SERVICE_ACCOUNT_EMAIL",
  "DASHBOARD_GCP_WORKLOAD_IDENTITY_POOL_ID",
  "DASHBOARD_GCP_WORKLOAD_IDENTITY_PROVIDER_ID",
]);
const MUTATING_SQL =
  /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CALL|EXPORT|LOAD|EXECUTE|ASSERT)\b/i;

const requestAuthContext = new AsyncLocalStorage();
let cachedToken = null;
let pendingToken = null;

const unavailable = () =>
  new HttpError(
    503,
    "data_service_unavailable",
    "Live dashboard data is temporarily unavailable.",
  );

const authUnavailable = (stage, status = undefined) => {
  console.error("Dashboard BigQuery authentication unavailable", {
    stage,
    ...(Number.isInteger(status) ? { status } : {}),
  });
  return unavailable();
};

const configuredIdentifier = (value, fallback = "") => {
  const identifier = String(value || fallback).trim();
  if (!IDENTIFIER_PATTERN.test(identifier)) throw unavailable();
  return identifier;
};

const decodeJsonEnvironmentValue = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) throw unavailable();
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
    } catch {
      throw unavailable();
    }
  }
};

const getServiceAccount = () => {
  const encoded =
    process.env.DASHBOARD_BIGQUERY_SERVICE_ACCOUNT_JSON ||
    process.env.BIGQUERY_SERVICE_ACCOUNT_JSON;
  if (!String(encoded || "").trim()) return null;
  const credentials = decodeJsonEnvironmentValue(encoded);
  if (
    credentials?.type !== "service_account" ||
    typeof credentials.client_email !== "string" ||
    typeof credentials.private_key !== "string" ||
    !credentials.client_email.includes("@") ||
    !credentials.private_key.includes("PRIVATE KEY")
  ) {
    throw authUnavailable("service_account_configuration");
  }
  return credentials;
};

const workloadIdentityConfigured = () =>
  WORKLOAD_IDENTITY_KEYS.some((key) =>
    Boolean(String(process.env[key] || "").trim()),
  );

export const getBigQueryConfig = () => {
  const credentials = workloadIdentityConfigured() ? null : getServiceAccount();
  const location = String(
    process.env.DASHBOARD_BIGQUERY_LOCATION || DEFAULT_LOCATION,
  ).trim();
  const maximumBytesBilled = String(
    process.env.DASHBOARD_BIGQUERY_MAXIMUM_BYTES_BILLED ||
      DEFAULT_MAXIMUM_BYTES_BILLED,
  ).trim();
  if (
    !/^[A-Za-z0-9-]+$/.test(location) ||
    !/^\d+$/.test(maximumBytesBilled) ||
    BigInt(maximumBytesBilled) > 10_000_000_000n
  ) {
    throw unavailable();
  }
  return {
    credentials,
    projectId: configuredIdentifier(
      process.env.DASHBOARD_BIGQUERY_PROJECT_ID ||
        process.env.BIGQUERY_PROJECT_ID,
      credentials?.project_id,
    ),
    datasetId: configuredIdentifier(
      process.env.DASHBOARD_BIGQUERY_DATASET_ID ||
        process.env.BIGQUERY_DATASET_ID,
      DEFAULT_DATASET_ID,
    ),
    location,
    maximumBytesBilled,
  };
};

export const quoteTable = (projectId, datasetId, tableId) => {
  for (const identifier of [projectId, datasetId, tableId]) {
    if (!IDENTIFIER_PATTERN.test(identifier)) throw unavailable();
  }
  return `\`${projectId}.${datasetId}.${tableId}\``;
};

const encode = (value) => Buffer.from(value).toString("base64url");

const createServiceAccountAssertion = (
  credentials,
  nowSeconds = Math.floor(Date.now() / 1000),
) => {
  const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encode(
    JSON.stringify({
      iss: credentials.client_email,
      scope: BIGQUERY_SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;
};

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    throw unavailable();
  } finally {
    clearTimeout(timeout);
  }
};

const parseJson = async (response, stage) => {
  try {
    return await response.json();
  } catch {
    throw authUnavailable(stage);
  }
};

const requestServiceAccountToken = async (credentials) => {
  let assertion;
  try {
    assertion = createServiceAccountAssertion(credentials);
  } catch {
    throw authUnavailable("service_account_signature");
  }
  const response = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw authUnavailable("service_account_token", response.status);
  }
  const body = await parseJson(response, "service_account_json");
  if (typeof body?.access_token !== "string" || !body.access_token) {
    throw authUnavailable("service_account_payload");
  }
  return {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(60, Number(body.expires_in) || 3600) * 1000,
  };
};

const workloadIdentityConfig = () => {
  const projectNumber = String(
    process.env.DASHBOARD_GCP_PROJECT_NUMBER || "",
  ).trim();
  const poolId = configuredIdentifier(
    process.env.DASHBOARD_GCP_WORKLOAD_IDENTITY_POOL_ID,
  );
  const providerId = configuredIdentifier(
    process.env.DASHBOARD_GCP_WORKLOAD_IDENTITY_PROVIDER_ID,
  );
  const serviceAccountEmail = String(
    process.env.DASHBOARD_GCP_SERVICE_ACCOUNT_EMAIL || "",
  ).trim();
  const oidcToken = String(
    requestAuthContext.getStore()?.oidcToken ||
      process.env.VERCEL_OIDC_TOKEN ||
      "",
  ).trim();
  if (
    !/^\d{6,20}$/.test(projectNumber) ||
    !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(
      serviceAccountEmail,
    ) ||
    oidcToken.length < 100 ||
    oidcToken.length > 20_000 ||
    oidcToken.split(".").length !== 3
  ) {
    throw authUnavailable("workload_identity_configuration");
  }
  return {
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    serviceAccountEmail,
    oidcToken,
  };
};

const requestWorkloadIdentityToken = async () => {
  const config = workloadIdentityConfig();
  const exchangeResponse = await fetchWithTimeout(STS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: config.audience,
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: CLOUD_PLATFORM_SCOPE,
      subjectToken: config.oidcToken,
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
    }),
  });
  if (!exchangeResponse.ok) {
    throw authUnavailable("sts_response", exchangeResponse.status);
  }
  const exchange = await parseJson(exchangeResponse, "sts_json");
  if (typeof exchange?.access_token !== "string" || !exchange.access_token) {
    throw authUnavailable("sts_token");
  }

  const impersonationResponse = await fetchWithTimeout(
    `${IAM_URL}/${encodeURIComponent(config.serviceAccountEmail)}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exchange.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: [BIGQUERY_SCOPE],
        lifetime: "3600s",
      }),
    },
  );
  if (!impersonationResponse.ok) {
    throw authUnavailable("iam_response", impersonationResponse.status);
  }
  const impersonation = await parseJson(impersonationResponse, "iam_json");
  const expiration = Date.parse(impersonation?.expireTime);
  if (
    typeof impersonation?.accessToken !== "string" ||
    !impersonation.accessToken ||
    !Number.isFinite(expiration) ||
    expiration - Date.now() <= 60_000
  ) {
    throw authUnavailable("iam_token");
  }
  return { value: impersonation.accessToken, expiresAt: expiration };
};

const requestAccessToken = () => {
  if (workloadIdentityConfigured()) return requestWorkloadIdentityToken();
  const credentials = getServiceAccount();
  if (!credentials) throw unavailable();
  return requestServiceAccountToken(credentials);
};

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.value;
  }
  let request = pendingToken;
  if (!request) {
    request = requestAccessToken();
    pendingToken = request;
  }
  try {
    const token = await request;
    if (pendingToken === request) cachedToken = token;
    return token.value;
  } finally {
    if (pendingToken === request) pendingToken = null;
  }
};

const bigQueryRequest = async (
  path,
  options = {},
  retryAuthentication = true,
) => {
  const token = await getAccessToken();
  const response = await fetchWithTimeout(
    `https://bigquery.googleapis.com${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    },
  );
  if (response.status === 401 && retryAuthentication) {
    if (cachedToken?.value === token) cachedToken = null;
    return bigQueryRequest(path, options, false);
  }
  if (!response.ok) {
    console.error("Dashboard BigQuery request unavailable", {
      status: response.status,
    });
    throw unavailable();
  }
  try {
    return await response.json();
  } catch {
    throw unavailable();
  }
};

const scalarParameter = (type, value) => ({
  parameterType: { type },
  parameterValue: {
    value: value === null || value === undefined ? null : String(value),
  },
});

export const namedParameter = (name, type, value) => {
  if (
    !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(String(name)) ||
    !["STRING", "DATE", "INT64", "BOOL", "TIMESTAMP"].includes(type)
  ) {
    throw unavailable();
  }
  return { name, ...scalarParameter(type, value) };
};

const decodeScalar = (value, field) => {
  if (value === null || value === undefined) return null;
  switch (field.type) {
    case "BOOLEAN":
    case "BOOL":
      return value === true || value === "true" || value === "1";
    case "INTEGER":
    case "INT64": {
      const number = Number(value);
      return Number.isSafeInteger(number) ? number : String(value);
    }
    case "FLOAT":
    case "FLOAT64":
    case "NUMERIC":
    case "BIGNUMERIC": {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
    case "JSON":
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        return null;
      }
    case "TIMESTAMP": {
      const seconds = Number(value);
      return Number.isFinite(seconds) && String(value).trim()
        ? new Date(seconds * 1000).toISOString()
        : value;
    }
    default:
      return value;
  }
};

const decodeRecord = (record, fields) => {
  const cells = record?.f || [];
  return Object.fromEntries(
    fields.map((field, index) => {
      const raw = cells[index]?.v ?? null;
      if (field.mode === "REPEATED") {
        const values = Array.isArray(raw) ? raw : [];
        return [
          field.name,
          values.map((entry) => decodeScalar(entry?.v ?? entry, field)),
        ];
      }
      return [field.name, decodeScalar(raw, field)];
    }),
  );
};

const decodeRows = (response, fallbackFields = []) => {
  const fields = response?.schema?.fields || fallbackFields;
  return (response?.rows || []).map((row) => decodeRecord(row, fields));
};

const hasStatementSeparator = (sql) => {
  let quote = "";
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) {
        if (sql[index + 1] === quote) index += 1;
        else quote = "";
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
    } else if (character === ";") {
      return true;
    }
  }
  return false;
};

const resultsPath = ({
  projectId,
  location,
  jobId,
  maxResults,
  pageToken,
}) => {
  const params = new URLSearchParams({
    location,
    maxResults: String(maxResults),
    timeoutMs: "10000",
  });
  if (pageToken) params.set("pageToken", pageToken);
  return `/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries/${encodeURIComponent(jobId)}?${params}`;
};

const waitForQuery = async ({ projectId, location, jobReference, maxResults }) => {
  if (!jobReference?.jobId) throw unavailable();
  const path = resultsPath({
    projectId,
    location: jobReference.location || location,
    jobId: jobReference.jobId,
    maxResults,
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await bigQueryRequest(path, { method: "GET" });
    if (result.jobComplete) return result;
  }
  throw unavailable();
};

export const queryBigQuery = async ({
  query,
  parameters = [],
  maxResults = 1000,
}) => {
  if (
    typeof query !== "string" ||
    !/^\s*(?:SELECT|WITH)\b/i.test(query) ||
    MUTATING_SQL.test(query) ||
    hasStatementSeparator(query) ||
    !Array.isArray(parameters) ||
    parameters.some((parameter) => !parameter?.name)
  ) {
    throw unavailable();
  }
  const safeMaxResults = Math.max(
    1,
    Math.min(Number(maxResults) || 1000, 2500),
  );
  const config = getBigQueryConfig();
  const initial = await bigQueryRequest(
    `/bigquery/v2/projects/${encodeURIComponent(config.projectId)}/queries`,
    {
      method: "POST",
      body: JSON.stringify({
        query,
        useLegacySql: false,
        parameterMode: "NAMED",
        queryParameters: parameters,
        location: config.location,
        maxResults: safeMaxResults,
        timeoutMs: 10_000,
        useQueryCache: true,
        maximumBytesBilled: config.maximumBytesBilled,
      }),
    },
  );
  if (initial.errors?.length || initial.errorResult) throw unavailable();
  const completed = initial.jobComplete
    ? initial
    : await waitForQuery({
        projectId: config.projectId,
        location: config.location,
        jobReference: initial.jobReference,
        maxResults: safeMaxResults,
      });
  if (completed.errors?.length || completed.errorResult) throw unavailable();

  const fields = completed?.schema?.fields || [];
  const rows = decodeRows(completed, fields).slice(0, safeMaxResults);
  const jobId =
    completed.jobReference?.jobId || initial.jobReference?.jobId || "";
  const jobLocation =
    completed.jobReference?.location ||
    initial.jobReference?.location ||
    config.location;
  const seenTokens = new Set();
  let pageToken = completed.pageToken;
  while (pageToken && rows.length < safeMaxResults) {
    if (!jobId || seenTokens.has(pageToken)) throw unavailable();
    seenTokens.add(pageToken);
    const page = await bigQueryRequest(
      resultsPath({
        projectId: config.projectId,
        location: jobLocation,
        jobId,
        maxResults: safeMaxResults - rows.length,
        pageToken,
      }),
      { method: "GET" },
    );
    if (page.errors?.length || page.errorResult || page.jobComplete === false) {
      throw unavailable();
    }
    rows.push(
      ...decodeRows(page, fields).slice(0, safeMaxResults - rows.length),
    );
    pageToken = page.pageToken;
  }
  return rows;
};

export const withBigQueryOidcToken = (oidcToken, callback) => {
  if (typeof callback !== "function") throw unavailable();
  return requestAuthContext.run(
    { oidcToken: String(oidcToken || "").trim() },
    callback,
  );
};

export const resetBigQueryTokenCache = () => {
  cachedToken = null;
  pendingToken = null;
};
