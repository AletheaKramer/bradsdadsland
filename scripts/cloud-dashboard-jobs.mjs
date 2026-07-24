#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  finishDashboardPipelineRun,
  startDashboardPipelineRun,
} from "./dashboard-reporting.mjs";
import {
  DEFAULT_CAMPSPOT_PARK_NAME,
  DEFAULT_CAMPSPOT_RECIPIENT,
  structuredLog,
} from "./lib/dashboard-config.mjs";
import { scopedGoogleServiceAccessToken } from "./lib/google-service-token.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTH_DIR =
  process.env.BRADS_AUTH_DIR ||
  path.join(os.tmpdir(), "brads-dashboard-auth");
const GMAIL_TOKEN_PATH =
  process.env.BRADS_GMAIL_TOKEN_PATH ||
  path.join(AUTH_DIR, "bradsdadsland-gmail-oauth.json");
const BIGQUERY_TOKEN_PATH =
  process.env.BRADS_BIGQUERY_TOKEN_PATH ||
  path.join(AUTH_DIR, "bradsdadsland-bigquery-oauth.json");
const INGEST_STATE_PATH =
  process.env.CAMPSPOT_STATE_PATH ||
  path.join(AUTH_DIR, "campspot-email-ingest-state.json");
const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const requireValue = (value, message) => {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(message);
  return normalized;
};

const parseGcsUri = (uri) => {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(String(uri || ""));
  if (!match) {
    throw new Error(
      "CAMPSPOT_STATE_GCS_URI must look like gs://bucket/path/state.json"
    );
  }
  return { bucket: match[1], object: match[2] };
};

const metadataAccessToken = async () => {
  const response = await fetch(METADATA_TOKEN_URL, {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (!response.ok) {
    throw new Error(`Cloud metadata token request failed (${response.status}).`);
  }
  const token = await response.json();
  return {
    accessToken: requireValue(
      token.access_token,
      "Cloud metadata returned no access token."
    ),
    expiresIn: Number(token.expires_in || 3000),
  };
};

const storageRequest = ({ url, accessToken, method = "GET", body }) =>
  fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
  });

const restoreState = async ({ accessToken, stateUri }) => {
  if (!stateUri) {
    structuredLog("state_restore_skipped", {
      reason: "CAMPSPOT_STATE_GCS_URI is not configured",
    });
    return;
  }
  const { bucket, object } = parseGcsUri(stateUri);
  const response = await storageRequest({
    accessToken,
    url: `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
      bucket
    )}/o/${encodeURIComponent(object)}?alt=media`,
  });
  if (response.status === 404) {
    structuredLog("state_not_found", { stateUri });
    return;
  }
  if (!response.ok) {
    throw new Error(`Could not restore Campspot state (${response.status}).`);
  }
  fs.writeFileSync(INGEST_STATE_PATH, await response.text(), { mode: 0o600 });
  structuredLog("state_restored", { stateUri });
};

const persistState = async ({ accessToken, stateUri }) => {
  if (!stateUri || !fs.existsSync(INGEST_STATE_PATH)) return;
  const { bucket, object } = parseGcsUri(stateUri);
  const response = await storageRequest({
    method: "POST",
    accessToken,
    body: fs.readFileSync(INGEST_STATE_PATH),
    url: `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
      bucket
    )}/o?uploadType=media&name=${encodeURIComponent(object)}`,
  });
  if (!response.ok) {
    throw new Error(
      `Could not persist Campspot state (${response.status}): ${(
        await response.text()
      ).slice(0, 300)}`
    );
  }
  structuredLog("state_persisted", { stateUri });
};

const writeToken = (destination, token) => {
  fs.writeFileSync(
    destination,
    `${JSON.stringify({
      access_token: token.accessToken,
      expiry_date:
        Date.now() + Math.max(60, Number(token.expiresIn || 3600) - 60) * 1000,
      scope: token.scope,
      auth_mode: "workspace_domain_delegation",
    })}\n`,
    { mode: 0o600 }
  );
};

const materializeGmailToken = async (cloudAccessToken) => {
  const serviceAccountEmail = requireValue(
    process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL,
    "GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL is required."
  );
  const delegatedUser =
    process.env.GOOGLE_WORKSPACE_DELEGATED_USER || "admin@beachcomberrv.com";
  const token = await scopedGoogleServiceAccessToken({
    cloudAccessToken,
    serviceAccountEmail,
    subject: delegatedUser,
    scopes: [GMAIL_READONLY_SCOPE],
  });
  writeToken(GMAIL_TOKEN_PATH, token);
  structuredLog("workspace_token_materialized", {
    delegatedUser,
    serviceAccountEmail,
    scope: GMAIL_READONLY_SCOPE,
  });
};

const prepareAuth = async () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true, mode: 0o700 });
  const token = await metadataAccessToken();
  fs.writeFileSync(
    BIGQUERY_TOKEN_PATH,
    `${JSON.stringify({
      access_token: token.accessToken,
      expiry_date: Date.now() + Math.max(60, token.expiresIn - 60) * 1000,
    })}\n`,
    { mode: 0o600 }
  );
  return token.accessToken;
};

const runNode = (args, { allowFailure = false } = {}) => {
  structuredLog("command_started", {
    command: [process.execPath, ...args].join(" "),
  });
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      BRADS_AUTH_DIR: AUTH_DIR,
      BRADS_GMAIL_TOKEN_PATH: GMAIL_TOKEN_PATH,
      BRADS_BIGQUERY_TOKEN_PATH: BIGQUERY_TOKEN_PATH,
      CAMPSPOT_STATE_PATH: INGEST_STATE_PATH,
    },
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `Command failed with exit ${result.status}: ${args.join(" ")}`
    );
  }
  structuredLog("command_completed", {
    command: args.join(" "),
    exitCode: result.status,
  });
  return { output: result.stdout.trim(), exitCode: result.status };
};

const parseLastJson = (output) => {
  const trimmed = String(output || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed.split(/\r?\n/);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(lines.slice(index).join("\n"));
      } catch {
        // Continue searching for the start of the final JSON value.
      }
    }
  }
  return null;
};

const emitHealthIssues = () => {
  const result = runNode(
    ["scripts/dashboard-reporting.mjs", "validate"],
    { allowFailure: true }
  );
  const rows = parseLastJson(result.output);
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (!["warn", "fail"].includes(row.status)) continue;
    let issueType = "";
    if (row.check_key === "freshness_ga4") issueType = "stale_ga4";
    else if (row.check_key === "freshness_search_console") {
      issueType = "stale_search_console";
    } else if (row.check_key === "freshness_campspot") {
      issueType = "stale_campspot";
    } else if (row.check_key === "unknown_inventory") {
      issueType = "unknown_inventory";
    } else if (row.check_key === "campspot_property_rows_excluded") {
      issueType = "excluded_property";
    } else if (row.check_key === "campspot_wrong_property_stored") {
      issueType = "rejected_property";
    } else if (row.check_key === "freshness_booking_pace") {
      issueType = "stale_booking_snapshot";
    }
    if (issueType) {
      structuredLog("dashboard_data_health_issue", {
        issue_type: issueType,
        status: row.status,
        message: row.message,
      });
    }
  }
};

const runTracked = async ({ source, jobName, work }) => {
  const record = await startDashboardPipelineRun({
    source,
    jobName,
    metadata: {
      runtime: "cloud_run_job",
      command:
        process.argv[2] || process.env.DASHBOARD_JOB_COMMAND || "campspot",
    },
  });
  try {
    const completion = await work();
    await finishDashboardPipelineRun({
      ...record,
      status: "succeeded",
      rowsProcessed: completion?.rowsProcessed ?? null,
      sourceThroughDate: completion?.sourceThroughDate || null,
    });
    return completion;
  } catch (error) {
    await finishDashboardPipelineRun({
      ...record,
      status: "failed",
      errorSummary: error.message,
    }).catch((loggingError) => {
      structuredLog("pipeline_log_failed", {
        jobName,
        error: loggingError.message,
      });
    });
    throw error;
  }
};

const runCampspot = async (cloudAccessToken) => {
  requireValue(
    process.env.CAMPSPOT_EXPECTED_PARK_ID,
    "CAMPSPOT_EXPECTED_PARK_ID is required before the Campspot job can run."
  );
  await materializeGmailToken(cloudAccessToken);
  const stateUri = process.env.CAMPSPOT_STATE_GCS_URI || "";
  await restoreState({ accessToken: cloudAccessToken, stateUri });
  try {
    const result = runNode([
      "scripts/campspot-email-ingest.mjs",
      "pull",
      "--load=true",
      `--max=${process.env.CAMPSPOT_EMAIL_INGEST_MAX || "500"}`,
      `--recipient=${
        process.env.CAMPSPOT_EXPECTED_RECIPIENT || DEFAULT_CAMPSPOT_RECIPIENT
      }`,
      `--park-id=${process.env.CAMPSPOT_EXPECTED_PARK_ID}`,
      `--park-name=${
        process.env.CAMPSPOT_EXPECTED_PARK_NAME || DEFAULT_CAMPSPOT_PARK_NAME
      }`,
    ]);
    const summary = parseLastJson(result.output);
    return {
      rowsProcessed: Array.isArray(summary?.processed)
        ? summary.processed.reduce(
            (sum, message) =>
              sum +
              (message.files || []).reduce(
                (fileSum, file) => fileSum + Number(file.rows || 0),
                0
              ),
            0
          )
        : null,
    };
  } finally {
    await persistState({ accessToken: cloudAccessToken, stateUri });
  }
};

const main = async () => {
  const command =
    process.argv[2] || process.env.DASHBOARD_JOB_COMMAND || "campspot";
  const cloudAccessToken = await prepareAuth();
  if (command === "campspot") {
    await runTracked({
      source: "campspot",
      jobName: "campspot_email_ingest",
      work: () => runCampspot(cloudAccessToken),
    });
    emitHealthIssues();
  } else if (command === "snapshot") {
    runNode(["scripts/dashboard-reporting.mjs", "snapshot"]);
    emitHealthIssues();
  } else if (command === "deploy-schema") {
    runNode(["scripts/dashboard-reporting.mjs", "deploy"]);
    runNode(["scripts/dashboard-serving.mjs", "deploy"]);
  } else if (command === "validate") {
    runNode(["scripts/dashboard-reporting.mjs", "validate"]);
    runNode(["scripts/dashboard-serving.mjs", "validate"]);
  } else {
    throw new Error(
      "Usage: cloud-dashboard-jobs.mjs <campspot|snapshot|deploy-schema|validate>"
    );
  }
  structuredLog("job_completed", { command });
};

main().catch((error) => {
  structuredLog("job_failed", {
    command:
      process.argv[2] || process.env.DASHBOARD_JOB_COMMAND || "campspot",
    error: error.message,
  });
  process.exitCode = 1;
});
