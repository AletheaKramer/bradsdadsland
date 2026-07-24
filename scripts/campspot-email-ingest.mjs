#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import { pathToFileURL } from "node:url";

import {
  CAMPSPOT_TABLE_SCHEMAS,
  bigQuerySchema,
  discoverCampspotReport,
  loadInventoryMap,
  normalizeCampspotReport,
  safeRowForSchema,
} from "./lib/campspot-report.mjs";
import { parseCsv } from "./lib/csv.mjs";
import {
  DEFAULT_CAMPSPOT_PARK_NAME,
  DEFAULT_CAMPSPOT_RECIPIENT,
  DEFAULT_CAMPSPOT_SUBJECT_PREFIX,
  getDashboardConfig,
  optionEnabled,
  parseArgs,
  structuredLog,
} from "./lib/dashboard-config.mjs";
import {
  googleLoopbackAuthorizationUrl,
  loadDesktopOAuthClient,
} from "./lib/google-oauth.mjs";

const AUTH_DIR =
  process.env.BRADS_AUTH_DIR ||
  path.join(os.homedir(), ".config", "bradsdadsland-dashboard");
const TOKEN_PATH =
  process.env.BRADS_GMAIL_TOKEN_PATH ||
  path.join(AUTH_DIR, "bradsdadsland-gmail-oauth.json");
const STATE_PATH =
  process.env.CAMPSPOT_STATE_PATH ||
  path.join(AUTH_DIR, "campspot-email-ingest-state.json");
const DEFAULT_BOOTSTRAP_PATH =
  process.env.BRADS_BOOTSTRAP_TOKEN_PATH ||
  path.join(AUTH_DIR, "bradsdadsland-google-oauth-client.json");
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const MAX_ZIP_ENTRY_BYTES = 50 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 200;

export const CAMPSPOT_SCHEDULED_REPORT_NAMES = Object.freeze([
  "Reservation Originations with Invoice Charges",
  "Reservation Details by Day and Organization",
  "Daily Revenue and Occupancy by Site Report",
  "Daily Occupancy, Arrivals, and Departures",
  "Cancelations",
  "Confirmed Reservations with Refunds",
]);

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Returns canonical allowlisted metadata only. This is for schedule
 * reconciliation in discovery output and must never participate in message or
 * property acceptance.
 */
export const allowlistedCampspotReportName = (...candidates) => {
  for (const candidate of candidates) {
    const value = String(candidate || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .slice(0, 500);
    for (const reportName of CAMPSPOT_SCHEDULED_REPORT_NAMES) {
      if (
        new RegExp(
          `(?:^|[^A-Za-z0-9])${escapeRegExp(reportName)}(?=$|[^A-Za-z0-9])`,
          "i"
        ).test(value)
      ) {
        return reportName;
      }
    }
  }
  return null;
};

const readJson = (filePath, fallback = null) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}${os.EOL}`, {
    mode: 0o600,
  });
  fs.chmodSync(filePath, 0o600);
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const sanitizeFilename = (value, fallback = "campspot-report.csv") => {
  const clean = path
    .basename(String(value || fallback))
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/[/:\\]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback;
};

const fetchJson = async (url, { token = "", method = "GET", body } = {}) => {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  if (!response.ok) {
    const error = new Error(
      `${method} ${new URL(url).host} failed (${response.status}): ${String(
        parsed.error?.message || parsed.error_description || parsed.raw || "unknown error"
      ).slice(0, 500)}`
    );
    error.response = parsed;
    throw error;
  }
  return parsed;
};

const refreshAccessToken = async (token) => {
  if (!token.refresh_token || !token.client_id || !token.client_secret) {
    throw new Error(
      `The Gmail token at ${TOKEN_PATH} is expired and has no refresh credentials. Re-authorize it.`
    );
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: token.client_id,
      client_secret: token.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const parsed = await response.json();
  if (!response.ok) {
    throw new Error(
      `Gmail token refresh failed (${response.status}): ${String(
        parsed.error_description || parsed.error || "unknown error"
      ).slice(0, 500)}`
    );
  }
  const updated = {
    ...token,
    access_token: parsed.access_token,
    expiry_date: Date.now() + Number(parsed.expires_in || 3600) * 1000,
    scope: parsed.scope || token.scope,
  };
  writeJson(TOKEN_PATH, updated);
  return updated.access_token;
};

const getAccessToken = async () => {
  const token = readJson(TOKEN_PATH);
  if (!token) {
    throw new Error(
      `Missing Gmail token at ${TOKEN_PATH}. Run: node scripts/campspot-email-ingest.mjs auth --client=/path/to/desktop-oauth.json`
    );
  }
  if (token.access_token && Number(token.expiry_date || 0) > Date.now() + 60_000) {
    return token.access_token;
  }
  return refreshAccessToken(token);
};

const gmailApi = async (requestPath) =>
  fetchJson(`https://gmail.googleapis.com${requestPath}`, {
    token: await getAccessToken(),
  });

const messageHeader = (message, name) =>
  (message.payload?.headers || []).find(
    (header) => String(header.name || "").toLowerCase() === name.toLowerCase()
  )?.value || "";

const decodeBase64Url = (value) =>
  Buffer.from(
    String(value || "").replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );

const walkParts = (part, visitor) => {
  if (!part) return;
  visitor(part);
  for (const child of part.parts || []) walkParts(child, visitor);
};

const supportedAttachmentType = (part) => {
  const filename = String(part.filename || "").toLowerCase();
  const mimeType = String(part.mimeType || "").toLowerCase();
  if (filename.endsWith(".csv") || mimeType.includes("csv")) return "csv";
  if (
    filename.endsWith(".zip") ||
    ["application/zip", "application/x-zip-compressed"].includes(mimeType)
  ) {
    return "zip";
  }
  return "";
};

const attachmentData = async (message, part) => {
  if (part.body?.data) return decodeBase64Url(part.body.data);
  if (!part.body?.attachmentId) return null;
  const attachment = await gmailApi(
    `/gmail/v1/users/me/messages/${encodeURIComponent(
      message.id
    )}/attachments/${encodeURIComponent(part.body.attachmentId)}`
  );
  return decodeBase64Url(attachment.data);
};

const findEndOfCentralDirectory = (buffer) => {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
};

/**
 * Extracts CSV members from ordinary Campspot ZIP attachments without writing the
 * original archive or raw guest-bearing CSV to disk. Stored and Deflate members
 * are supported; encrypted/ZIP64 archives fail closed.
 */
export const extractZipCsvEntries = (buffer) => {
  if (!Buffer.isBuffer(buffer)) throw new Error("ZIP input must be a Buffer.");
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0) throw new Error("Invalid ZIP: central directory was not found.");
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`ZIP contains too many entries (${entryCount}).`);
  }
  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory entry.");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const filename = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString((flags & 0x800) !== 0 ? "utf8" : "latin1");
    offset += 46 + nameLength + extraLength + commentLength;
    if (!filename.toLowerCase().endsWith(".csv") || filename.endsWith("/")) continue;
    if ((flags & 0x1) !== 0) throw new Error("Encrypted ZIP entries are not supported.");
    if (uncompressedSize > MAX_ZIP_ENTRY_BYTES) {
      throw new Error(`ZIP CSV ${filename} exceeds the safe size limit.`);
    }
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local header for ${filename}.`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (
      dataOffset < 0 ||
      compressedSize > MAX_ZIP_ENTRY_BYTES ||
      dataOffset + compressedSize > buffer.length
    ) {
      throw new Error(`ZIP CSV ${filename} has invalid or oversized compressed data.`);
    }
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let data;
    if (compression === 0) data = Buffer.from(compressed);
    else if (compression === 8) {
      data = inflateRawSync(compressed, {
        maxOutputLength: MAX_ZIP_ENTRY_BYTES,
      });
    }
    else {
      throw new Error(
        `ZIP CSV ${filename} uses unsupported compression method ${compression}.`
      );
    }
    if (data.length > MAX_ZIP_ENTRY_BYTES) {
      throw new Error(`ZIP CSV ${filename} exceeds the safe size limit.`);
    }
    entries.push({ filename: sanitizeFilename(filename), data });
  }
  return entries;
};

export const buildGmailQuery = ({
  recipient =
    process.env.CAMPSPOT_EXPECTED_RECIPIENT || DEFAULT_CAMPSPOT_RECIPIENT,
  allHistory = false,
  days = 30,
} = {}) =>
  [
    `to:"${String(recipient).replaceAll('"', "")}"`,
    'subject:"Campspot Scheduled Report"',
    "has:attachment",
    ...(allHistory ? [] : [`newer_than:${Math.max(1, Number(days) || 30)}d`]),
  ].join(" ");

export const validateScopedMessage = (
  message,
  {
    recipient =
      process.env.CAMPSPOT_EXPECTED_RECIPIENT || DEFAULT_CAMPSPOT_RECIPIENT,
    subjectPrefix =
      process.env.CAMPSPOT_SUBJECT_PREFIX || DEFAULT_CAMPSPOT_SUBJECT_PREFIX,
  } = {}
) => {
  const subject = messageHeader(message, "Subject").trim();
  const recipientEmails = new Set(
    [
      messageHeader(message, "To"),
      messageHeader(message, "Delivered-To"),
      messageHeader(message, "X-Original-To"),
    ]
      .join(" ")
      .match(
        /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*/gi
      )
      ?.map((email) => email.toLowerCase()) || []
  );
  if (!recipientEmails.has(String(recipient).trim().toLowerCase())) {
    throw new Error(
      `Rejected Gmail message ${message.id}: expected recipient ${recipient}.`
    );
  }
  const escaped = String(subjectPrefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixMatched =
    !escaped ||
    new RegExp(`^\\s*(?:\\[${escaped}\\]|${escaped})(?:\\b|\\s|[-:])`, "i").test(
      subject
    );
  return { subject, recipient, prefixMatched };
};

const listMessages = async ({ query, max }) => {
  const messages = [];
  let pageToken = "";
  do {
    const remaining = Math.min(500, max - messages.length);
    const response = await gmailApi(
      `/gmail/v1/users/me/messages?q=${encodeURIComponent(
        query
      )}&maxResults=${remaining}${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      }`
    );
    messages.push(...(response.messages || []));
    pageToken = response.nextPageToken || "";
  } while (pageToken && messages.length < max);
  return messages.slice(0, max);
};

const collectMessageCsvs = async (message) => {
  const output = [];
  const parts = [];
  walkParts(message.payload, (part) => parts.push(part));
  for (const part of parts) {
    const attachmentType = supportedAttachmentType(part);
    if (!attachmentType) continue;
    const data = await attachmentData(message, part);
    if (!data) continue;
    const filename = sanitizeFilename(
      part.filename,
      attachmentType === "zip" ? "campspot-reports.zip" : "campspot-report.csv"
    );
    if (attachmentType === "csv") {
      output.push({ filename, data });
    } else {
      for (const entry of extractZipCsvEntries(data)) {
        output.push({
          filename: `${filename.replace(/\.zip$/i, "")}-${entry.filename}`,
          data: entry.data,
        });
      }
    }
  }
  return output;
};

const runCommand = (command, args, { input } = {}) => {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args[0] || ""} failed: ${String(
        result.stderr || result.stdout || `exit ${result.status}`
      ).trim()}`
    );
  }
  return result.stdout.trim();
};

const bigQueryTableRef = (config, tableId) =>
  `${config.projectId}:${config.datasetId}.${tableId}`;

const loadRows = ({ config, tableId, rows }) => {
  if (!rows.length) return { tableId, inputRows: 0, action: "empty" };
  if (!CAMPSPOT_TABLE_SCHEMAS[tableId]) {
    throw new Error(`Campspot loader has no schema for ${tableId}.`);
  }
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "brads-campspot-safe-load-")
  );
  const suffix = crypto.randomBytes(6).toString("hex");
  const stagingTable = `_stage_${tableId}_${suffix}`;
  const rowsPath = path.join(tempDirectory, "safe-rows.ndjson");
  const schemaPath = path.join(tempDirectory, "schema.json");
  try {
    const safeRows = rows.map((row) => safeRowForSchema(tableId, row));
    fs.writeFileSync(
      rowsPath,
      `${safeRows.map((row) => JSON.stringify(row)).join("\n")}\n`,
      { mode: 0o600 }
    );
    fs.writeFileSync(
      schemaPath,
      `${JSON.stringify(bigQuerySchema(tableId))}\n`,
      { mode: 0o600 }
    );
    runCommand("bq", [
      `--project_id=${config.projectId}`,
      `--location=${config.location}`,
      "load",
      "--quiet=true",
      "--replace=true",
      "--source_format=NEWLINE_DELIMITED_JSON",
      `--schema=${schemaPath}`,
      bigQueryTableRef(config, stagingTable),
      rowsPath,
    ]);
    const columns = CAMPSPOT_TABLE_SCHEMAS[tableId]
      .map(([name]) => `\`${name}\``)
      .join(", ");
    runCommand(
      "bq",
      [
        `--project_id=${config.projectId}`,
        `--location=${config.location}`,
        "query",
        "--quiet=true",
        "--use_legacy_sql=false",
      ],
      {
        input: `
MERGE \`${config.projectId}.${config.datasetId}.${tableId}\` target
USING \`${config.projectId}.${config.datasetId}.${stagingTable}\` source
ON target.insert_id = source.insert_id
WHEN MATCHED THEN
  UPDATE SET
    ${CAMPSPOT_TABLE_SCHEMAS[tableId]
      .filter(([name]) => name !== "insert_id")
      .map(([name]) => `target.\`${name}\` = source.\`${name}\``)
      .join(",\n    ")}
WHEN NOT MATCHED THEN
  INSERT (${columns}) VALUES (${CAMPSPOT_TABLE_SCHEMAS[tableId]
    .map(([name]) => `source.\`${name}\``)
    .join(", ")})
`,
      }
    );
  } finally {
    try {
      runCommand("bq", [
        `--project_id=${config.projectId}`,
        "rm",
        "-f",
        "-t",
        bigQueryTableRef(config, stagingTable),
      ]);
    } catch {
      // BigQuery expires staging tables separately; do not mask the primary error.
    }
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
  return { tableId, inputRows: rows.length, action: "merged" };
};

const writeSafePreview = ({ outputDir, normalized }) => {
  if (!outputDir) return "";
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(
    outputDir,
    `${normalized.reportType}-${normalized.ingestRow.content_sha256.slice(0, 16)}.safe.ndjson`
  );
  const safeRows = normalized.rows.map((row) =>
    safeRowForSchema(normalized.tableId, row)
  );
  fs.writeFileSync(
    outputPath,
    `${safeRows.map((row) => JSON.stringify(row)).join("\n")}${
      safeRows.length ? "\n" : ""
    }`,
    { mode: 0o600 }
  );
  return outputPath;
};

const defaultState = () => ({
  version: 2,
  processedMessages: {},
  processedContent: {},
});

export const processCsv = ({
  filename,
  data,
  gmailMessageId = "",
  load = false,
  outputDir = "",
  force = false,
  state = defaultState(),
  options = {},
}) => {
  const contentSha256 = sha256(data);
  state.processedMessages ||= {};
  state.processedContent ||= {};
  if (!force && state.processedContent[contentSha256]?.loaded) {
    return {
      skipped: true,
      reason: "already_loaded_content",
      filename: `content-${contentSha256.slice(0, 16)}.csv`,
      contentSha256,
      duplicateOf: state.processedContent[contentSha256].gmailMessageId || "",
    };
  }
  const config = getDashboardConfig(options);
  const normalized = normalizeCampspotReport({
    sourceFile: filename,
    sourceSha256: contentSha256,
    values: parseCsv(data),
    gmailMessageId,
    inventoryMap: loadInventoryMap(options["inventory-map"]),
    expectedParkId:
      options["park-id"] ||
      process.env.CAMPSPOT_EXPECTED_PARK_ID ||
      process.env.BRADS_CAMPSPOT_PROPERTY_ID ||
      config.campspotPropertyId,
    expectedParkName:
      options["park-name"] ||
      process.env.CAMPSPOT_EXPECTED_PARK_NAME ||
      DEFAULT_CAMPSPOT_PARK_NAME,
  });
  const safeOutput = writeSafePreview({ outputDir, normalized });
  const loads = [];
  if (load) {
    loads.push(
      loadRows({ config, tableId: normalized.tableId, rows: normalized.rows })
    );
    loads.push(
      loadRows({
        config,
        tableId: "fact_campspot_ingest_file",
        rows: [normalized.ingestRow],
      })
    );
    state.processedContent[contentSha256] = {
      loaded: true,
      loadedAt: new Date().toISOString(),
      gmailMessageId,
      filename: normalized.ingestRow.source_file,
      reportType: normalized.reportType,
      rows: normalized.rows.length,
    };
  }
  if (normalized.unknownInventoryRows > 0) {
    structuredLog("dashboard_data_health_issue", {
      issue_type: "unknown_inventory",
      report_type: normalized.reportType,
      source_file: normalized.ingestRow.source_file,
      unknown_rows: normalized.unknownInventoryRows,
    });
  }
  if (normalized.propertyScope.excludedSourceRowCount > 0) {
    structuredLog("dashboard_data_health_issue", {
      issue_type: "excluded_property",
      report_type: normalized.reportType,
      source_file: normalized.ingestRow.source_file,
      accepted_rows: normalized.propertyScope.acceptedSourceRowCount,
      excluded_rows: normalized.propertyScope.excludedSourceRowCount,
    });
  }
  return {
    skipped: false,
    filename: normalized.ingestRow.source_file,
    contentSha256,
    reportType: normalized.reportType,
    tableId: normalized.tableId,
    rows: normalized.rows.length,
    unknownInventoryRows: normalized.unknownInventoryRows,
    inventoryObservations: normalized.inventoryObservations,
    parkValidation: normalized.parkValidation,
    propertyScope: normalized.propertyScope,
    privacy: normalized.privacy,
    discardedProhibitedHeaders: normalized.prohibitedHeaders,
    safeOutput,
    loaded: load,
    loads,
  };
};

const pull = async (options = {}) => {
  const recipient =
    options.recipient ||
    process.env.CAMPSPOT_EXPECTED_RECIPIENT ||
    DEFAULT_CAMPSPOT_RECIPIENT;
  const subjectPrefix =
    options["subject-prefix"] ||
    process.env.CAMPSPOT_SUBJECT_PREFIX ||
    DEFAULT_CAMPSPOT_SUBJECT_PREFIX;
  const allHistory = optionEnabled(options["all-history"]);
  const query =
    options.query ||
    buildGmailQuery({
      recipient,
      subjectPrefix,
      allHistory,
      days: options.days || 30,
    });
  const maxDefault = allHistory ? 10_000 : 500;
  const max = Math.max(1, Number.parseInt(options.max || String(maxDefault), 10));
  const load = optionEnabled(options.load);
  const force = optionEnabled(options.force);
  const outputDir = options["output-dir"] || options.outputDir || "";
  const state = readJson(STATE_PATH, defaultState());
  state.processedMessages ||= {};
  state.processedContent ||= {};
  const summaries = await listMessages({ query, max });
  const processed = [];
  const skipped = [];
  const failures = [];

  for (const summary of summaries) {
    if (!force && state.processedMessages[summary.id]?.loaded) {
      skipped.push({ messageId: summary.id, reason: "already_loaded_message" });
      continue;
    }
    try {
      const message = await gmailApi(
        `/gmail/v1/users/me/messages/${encodeURIComponent(summary.id)}?format=full`
      );
      const scope = validateScopedMessage(message, { recipient, subjectPrefix });
      if (!scope.prefixMatched) {
        structuredLog("campspot_subject_prefix_missing", {
          message_id: message.id,
          configured_prefix: subjectPrefix,
        });
      }
      const csvs = await collectMessageCsvs(message);
      const results = [];
      for (const csv of csvs) {
        results.push(
          processCsv({
            ...csv,
            gmailMessageId: message.id,
            load,
            outputDir,
            force,
            state,
            options,
          })
        );
      }
      processed.push({
        messageId: message.id,
        receivedAt: Number(message.internalDate || 0)
          ? new Date(Number(message.internalDate)).toISOString()
          : null,
        subjectScope: scope.prefixMatched
          ? "scheduled_report_and_optional_prefix_verified"
          : "scheduled_report_verified",
        files: results,
      });
      if (load && results.every((result) => result.loaded || result.skipped)) {
        state.processedMessages[message.id] = {
          loaded: true,
          loadedAt: new Date().toISOString(),
          contentHashes: results.map((result) => result.contentSha256),
        };
      }
    } catch (error) {
      const issueType =
        /different property|park id|park\/property ids|property column|property id|expected recipient/i.test(
          error.message
        )
        ? "rejected_property"
        : "ingest_failure";
      if (issueType === "rejected_property") {
        structuredLog("dashboard_data_health_issue", {
          issue_type: "rejected_property",
          message_id: summary.id,
          message: error.message,
        });
      }
      failures.push({ messageId: summary.id, error: error.message });
    }
  }
  writeJson(STATE_PATH, state);
  return {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    query,
    allHistory,
    load,
    messagesFound: summaries.length,
    messagesProcessed: processed.length,
    messagesSkipped: skipped.length,
    processed,
    skipped,
    failures,
  };
};

const discoverMailbox = async (options = {}) => {
  const recipient =
    options.recipient ||
    process.env.CAMPSPOT_EXPECTED_RECIPIENT ||
    DEFAULT_CAMPSPOT_RECIPIENT;
  const subjectPrefix =
    options["subject-prefix"] ||
    process.env.CAMPSPOT_SUBJECT_PREFIX ||
    DEFAULT_CAMPSPOT_SUBJECT_PREFIX;
  const allHistory = optionEnabled(options["all-history"]);
  const query =
    options.query ||
    buildGmailQuery({
      recipient,
      allHistory,
      days: options.days || 30,
    });
  const max = Math.max(
    1,
    Math.min(2_000, Number.parseInt(options.max || "200", 10))
  );
  const summaries = await listMessages({ query, max });
  const reports = [];
  const messages = [];
  const failures = [];
  const seenContent = new Set();
  for (const summary of summaries) {
    try {
      const message = await gmailApi(
        `/gmail/v1/users/me/messages/${encodeURIComponent(summary.id)}?format=full`
      );
      const scope = validateScopedMessage(message, { recipient, subjectPrefix });
      const csvs = await collectMessageCsvs(message);
      let uniqueReports = 0;
      for (const csv of csvs) {
        const contentHash = sha256(csv.data);
        if (seenContent.has(contentHash)) continue;
        seenContent.add(contentHash);
        reports.push({
          ...discoverCampspotReport({
            values: parseCsv(csv.data),
            inventoryMap: loadInventoryMap(options["inventory-map"]),
          }),
          scheduledReportName: allowlistedCampspotReportName(
            scope.subject,
            csv.filename
          ),
        });
        uniqueReports += 1;
      }
      messages.push({
        messageId: message.id,
        receivedAt: Number(message.internalDate || 0)
          ? new Date(Number(message.internalDate)).toISOString()
          : null,
        subjectPrefixMatched: scope.prefixMatched,
        uniqueReports,
      });
    } catch {
      // External-posting mail is an untrusted boundary. Do not echo subject,
      // filename, headers, values, or parser errors from a rejected message.
      failures.push({
        messageId: summary.id,
        reason: "discovery_failed_or_message_rejected",
      });
    }
  }
  const receivedDates = messages
    .map((message) => message.receivedAt)
    .filter(Boolean)
    .sort();
  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    query,
    messagesFound: summaries.length,
    messagesAccepted: messages.length,
    uniqueReports: reports.length,
    receivedRange: {
      start: receivedDates[0] || null,
      end: receivedDates.at(-1) || null,
    },
    propertyIdentifiers: [
      ...new Set(reports.flatMap((report) => report.propertyIdentifiers)),
    ].sort(),
    reportFamilies: [...new Set(reports.map((report) => report.reportType))].sort(),
    scheduledReportNames: [
      ...new Set(
        reports
          .map((report) => report.scheduledReportName)
          .filter(Boolean)
      ),
    ].sort(),
    seasons: [...new Set(reports.flatMap((report) => report.seasons))].sort(),
    inventoryObservations: [
      ...new Map(
        reports
          .flatMap((report) => report.inventoryObservations)
          .map((observation) => [JSON.stringify(observation), observation])
      ).values(),
    ].sort(
      (left, right) =>
        left.propertyIdentifier.localeCompare(right.propertyIdentifier) ||
        left.site.localeCompare(right.site) ||
        left.siteType.localeCompare(right.siteType)
    ),
    reports,
    messages,
    failures,
    privacy: {
      rawRowsStored: false,
      rawAttachmentsWritten: false,
      subjectsOrFilenamesReturned: false,
    },
  };
};

const walkInputFiles = (inputPath) => {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) return [];
  return fs
    .readdirSync(inputPath, { withFileTypes: true })
    .flatMap((entry) =>
      walkInputFiles(path.join(inputPath, entry.name))
    )
    .filter((filePath) => /\.(csv|zip)$/i.test(filePath));
};

const importHistorical = async (options = {}) => {
  const input = options.input;
  if (!input) throw new Error("Historical import requires --input=/path/to/file-or-directory.");
  const inputPath = path.resolve(input);
  const files = walkInputFiles(inputPath).sort();
  const state = readJson(STATE_PATH, defaultState());
  const load = optionEnabled(options.load);
  const force = optionEnabled(options.force);
  const outputDir = options["output-dir"] || options.outputDir || "";
  const results = [];
  const failures = [];
  for (const filePath of files) {
    try {
      const data = fs.readFileSync(filePath);
      const entries = filePath.toLowerCase().endsWith(".zip")
        ? extractZipCsvEntries(data).map((entry) => ({
            ...entry,
            filename: `${path.basename(filePath, path.extname(filePath))}-${entry.filename}`,
          }))
        : [{ filename: path.basename(filePath), data }];
      for (const entry of entries) {
        results.push(
          processCsv({
            ...entry,
            load,
            outputDir,
            force,
            state,
            options,
          })
        );
      }
    } catch (error) {
      failures.push({
        file: `input-${sha256(path.resolve(filePath)).slice(0, 16)}`,
        error: error.message,
      });
    }
  }
  writeJson(STATE_PATH, state);
  return {
    ok: failures.length === 0,
    input: inputPath,
    filesFound: files.length,
    reportsProcessed: results.length,
    load,
    results,
    failures,
  };
};

const inspectFile = (options = {}) => {
  if (!options.input) throw new Error("Inspect requires --input=/path/to/report.csv.");
  const inputPath = path.resolve(options.input);
  const data = fs.readFileSync(inputPath);
  const entries = inputPath.toLowerCase().endsWith(".zip")
    ? extractZipCsvEntries(data)
    : [{ filename: path.basename(inputPath), data }];
  return entries.map((entry) =>
    processCsv({
      ...entry,
      load: false,
      outputDir: "",
      state: defaultState(),
      options,
    })
  );
};

const auth = async (options = {}) => {
  const bootstrap = options.client
    ? loadDesktopOAuthClient(path.resolve(options.client))
    : readJson(DEFAULT_BOOTSTRAP_PATH);
  if (!bootstrap?.client_id || !bootstrap?.client_secret) {
    throw new Error(
      `Missing OAuth client credentials. Pass --client=/path/to/desktop-oauth.json or configure ${DEFAULT_BOOTSTRAP_PATH}.`
    );
  }
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
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      if (error || !code) {
        response.writeHead(400).end("Gmail authorization failed.");
        reject(new Error(error || "No OAuth authorization code returned."));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("Brad's Campspot Gmail authorization completed. You may close this tab.");
      resolve(code);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}/oauth2callback`;
  const url = googleLoopbackAuthorizationUrl({
    clientId: bootstrap.client_id,
    redirectUri,
    scopes: [GMAIL_SCOPE],
    state,
  });
  process.stdout.write(`Open this URL as admin@beachcomberrv.com:\n${url}\n`);
  if (process.platform === "darwin" && !optionEnabled(options["no-open"])) {
    spawnSync("open", [url.toString()], { stdio: "ignore" });
  }
  try {
    const code = await codePromise;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: bootstrap.client_id,
        client_secret: bootstrap.client_secret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await response.json();
    if (!response.ok) {
      throw new Error(
        `OAuth token exchange failed (${response.status}): ${token.error_description || token.error}`
      );
    }
    writeJson(TOKEN_PATH, {
      ...token,
      client_id: bootstrap.client_id,
      client_secret: bootstrap.client_secret,
      expiry_date: Date.now() + Number(token.expires_in || 3600) * 1000,
    });
    return { authorized: true, tokenPath: TOKEN_PATH, scopes: [GMAIL_SCOPE] };
  } finally {
    server.close();
  }
};

const usage = () => `
Usage: node scripts/campspot-email-ingest.mjs <discover|pull|import|inspect|auth> [options]

  discover [--max=200] [--days=30] [--all-history=true] (read-only safe metadata)
  pull     [--load=true] [--all-history=true] [--max=500] [--days=30]
           [--recipient=${DEFAULT_CAMPSPOT_RECIPIENT}] [--subject-prefix=${DEFAULT_CAMPSPOT_SUBJECT_PREFIX}]
  import   --input=/path/to/file-or-directory [--load=true]
  inspect  --input=/path/to/report.csv
  auth     [--client=/path/to/desktop-oauth.json]

Shared: project, reporting dataset, Search Console dataset, and location are
        fixed to Brad's resources.
        --park-id=... --park-name="${DEFAULT_CAMPSPOT_PARK_NAME}"
        --inventory-map=config/dashboard/campspot-inventory-map.json
        --output-dir=/path (writes only privacy-safe NDJSON; raw attachments are never written)
`;

export const main = async (argv = process.argv.slice(2)) => {
  const [command = "pull", ...rest] = argv;
  const options = parseArgs(rest);
  if (command === "discover") return discoverMailbox(options);
  if (command === "pull") return pull(options);
  if (command === "import") return importHistorical(options);
  if (command === "inspect") return inspectFile(options);
  if (command === "auth") return auth(options);
  if (["help", "--help", "-h"].includes(command)) return usage();
  throw new Error(usage());
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    const result = await main();
    process.stdout.write(
      `${typeof result === "string" ? result : JSON.stringify(result, null, 2)}\n`
    );
    if (result && typeof result === "object" && result.ok === false) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
