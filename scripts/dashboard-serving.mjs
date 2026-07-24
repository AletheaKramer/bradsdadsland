#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { DASHBOARD_SERVING_VIEWS } from "./dashboard-reporting.mjs";
import {
  getDashboardConfig,
  optionEnabled,
  parseArgs,
  reportingTable,
  requireGa4Dataset,
  servingTable,
} from "./lib/dashboard-config.mjs";

export { DASHBOARD_SERVING_VIEWS };

export const SERVING_VIEW_COLUMNS = Object.freeze({
  mart_dashboard_ga4_daily: Object.freeze([
    "date",
    "source",
    "medium",
    "device_category",
    "landing_page",
    "users",
    "sessions",
    "engaged_sessions",
    "page_views",
    "booking_clicks",
    "checkout_starts",
    "purchases",
    "purchase_revenue",
    "matched_bookings",
    "matched_revenue",
    "source_updated_at",
  ]),
  mart_dashboard_search_console_daily: Object.freeze([
    "date",
    "query",
    "page",
    "device",
    "clicks",
    "impressions",
    "ctr",
    "average_position",
    "source_updated_at",
  ]),
  mart_dashboard_campspot_daily: Object.freeze([
    "date",
    "inventory_class",
    "season",
    "site",
    "site_type",
    "status",
    "lead_time_band",
    "stay_length_band",
    "reservations",
    "cancellations",
    "occupied_site_nights",
    "available_site_nights",
    "gross_revenue",
    "refunds",
    "net_revenue",
    "source_updated_at",
  ]),
  mart_dashboard_booking_pace: Object.freeze([
    "snapshot_date",
    "snapshot_kind",
    "stay_date",
    "inventory_class",
    "site",
    "site_type",
    "available_site_nights",
    "booked_site_nights",
    "reservations",
    "booked_revenue",
    "source_updated_at",
  ]),
  mart_dashboard_data_health: Object.freeze([
    "source",
    "status",
    "last_record_at",
    "checked_at",
    "lag_hours",
    "records_loaded",
    "issue_count",
    "message",
  ]),
  mart_dashboard_data_quality: Object.freeze([
    "issue_key",
    "category",
    "severity",
    "status",
    "metric_value",
    "threshold_value",
    "message",
    "checked_at",
  ]),
});

export const servingViewSql = (config) => [
  `
CREATE SCHEMA IF NOT EXISTS \`${config.projectId}.${config.servingDatasetId}\`
OPTIONS (
  location = '${config.location}',
  description = 'Private anonymous serving views for the Brad\\'s Dads Land dashboard'
)`,
  ...DASHBOARD_SERVING_VIEWS.map((view) => {
    const columns = SERVING_VIEW_COLUMNS[view];
    if (!columns) throw new Error(`No safe serving contract is defined for ${view}.`);
    return `
CREATE OR REPLACE VIEW ${servingTable(config, view)} AS
SELECT
  ${columns.map((column) => `\`${column}\``).join(",\n  ")}
FROM ${reportingTable(config, view)}`;
  }),
];

const run = (args, input) => {
  const result = spawnSync("bq", args, {
    input,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr || result.stdout || "BigQuery command failed").trim()
    );
  }
  return result.stdout.trim();
};

const loadDataset = (projectId, datasetId) =>
  JSON.parse(run(["show", "--format=prettyjson", `${projectId}:${datasetId}`]));

const updateDataset = (projectId, datasetId, metadata) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "brads-dashboard-dataset-acl-")
  );
  const metadataPath = path.join(directory, "dataset.json");
  try {
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
      mode: 0o600,
    });
    run(["update", `--source=${metadataPath}`, `${projectId}:${datasetId}`]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const viewReference = (entry) => entry?.view || {};
const datasetReference = (entry) => entry?.dataset?.dataset || {};

const isViewAccess = (entry, projectId, datasetId, tableId) => {
  const reference = viewReference(entry);
  return (
    (reference.projectId || reference.project_id) === projectId &&
    (reference.datasetId || reference.dataset_id) === datasetId &&
    (reference.tableId || reference.table_id) === tableId
  );
};

const isDatasetAccess = (entry, projectId, datasetId) => {
  const reference = datasetReference(entry);
  return (
    (reference.projectId || reference.project_id) === projectId &&
    (reference.datasetId || reference.dataset_id) === datasetId
  );
};

export const reconcileAuthorizedViewAccess = (
  access,
  { projectId, datasetId, tableIds }
) => {
  const next = Array.isArray(access) ? [...access] : [];
  for (const tableId of tableIds) {
    if (!next.some((entry) => isViewAccess(entry, projectId, datasetId, tableId))) {
      next.push({
        view: { projectId, datasetId, tableId },
      });
    }
  }
  return next;
};

const authorizeView = ({
  sourceProjectId,
  sourceDatasetId,
  viewProjectId,
  viewDatasetId,
  tableIds,
}) => {
  const metadata = loadDataset(sourceProjectId, sourceDatasetId);
  const current = Array.isArray(metadata.access) ? metadata.access : [];
  const next = reconcileAuthorizedViewAccess(current, {
    projectId: viewProjectId,
    datasetId: viewDatasetId,
    tableIds,
  });
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    metadata.access = next;
    updateDataset(sourceProjectId, sourceDatasetId, metadata);
  }
};

const authorizeServingDataset = (config) => {
  const metadata = loadDataset(config.projectId, config.datasetId);
  metadata.access = Array.isArray(metadata.access) ? metadata.access : [];
  if (
    !metadata.access.some((entry) =>
      isDatasetAccess(entry, config.projectId, config.servingDatasetId)
    )
  ) {
    metadata.access.push({
      dataset: {
        dataset: {
          projectId: config.projectId,
          datasetId: config.servingDatasetId,
        },
        targetTypes: ["VIEWS"],
      },
    });
    updateDataset(config.projectId, config.datasetId, metadata);
  }
};

const grantServingReader = (config, serviceAccount) => {
  if (!serviceAccount) return false;
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(serviceAccount)) {
    throw new Error("--viewer-service-account must be a service-account email.");
  }
  const metadata = loadDataset(config.projectId, config.servingDatasetId);
  metadata.access = Array.isArray(metadata.access) ? metadata.access : [];
  const exists = metadata.access.some(
    (entry) =>
      entry.userByEmail === serviceAccount &&
      ["READER", "roles/bigquery.dataViewer"].includes(entry.role)
  );
  if (!exists) {
    metadata.access.push({ role: "READER", userByEmail: serviceAccount });
    updateDataset(config.projectId, config.servingDatasetId, metadata);
  }
  return true;
};

const deploy = (config, options) => {
  requireGa4Dataset(config);
  const statements = servingViewSql(config);
  if (optionEnabled(options["dry-run"])) {
    for (const statement of statements) {
      run(
        [
          `--project_id=${config.projectId}`,
          `--location=${config.location}`,
          "query",
          "--quiet=true",
          "--use_legacy_sql=false",
          "--dry_run=true",
        ],
        statement
      );
    }
    return {
      command: "deploy",
      dryRun: true,
      views: DASHBOARD_SERVING_VIEWS,
    };
  }
  for (const statement of statements) {
    run(
      [
        `--project_id=${config.projectId}`,
        `--location=${config.location}`,
        "query",
        "--quiet=true",
        "--use_legacy_sql=false",
      ],
      statement
    );
  }
  authorizeServingDataset(config);
  authorizeView({
    sourceProjectId: config.projectId,
    sourceDatasetId: config.ga4DatasetId,
    viewProjectId: config.projectId,
    viewDatasetId: config.datasetId,
    tableIds: ["v_ga4_event_facts"],
  });
  authorizeView({
    sourceProjectId: config.projectId,
    sourceDatasetId: config.searchConsoleDatasetId,
    viewProjectId: config.projectId,
    viewDatasetId: config.datasetId,
    tableIds: ["mart_dashboard_search_console_daily"],
  });
  const readerGranted = grantServingReader(
    config,
    options["viewer-service-account"] ||
      process.env.BRADS_DASHBOARD_READER_SERVICE_ACCOUNT ||
      ""
  );
  return {
    command: "deploy",
    projectId: config.projectId,
    sourceDatasetId: config.datasetId,
    servingDatasetId: config.servingDatasetId,
    views: DASHBOARD_SERVING_VIEWS,
    readerGranted,
  };
};

const inspect = (config) => ({
  reporting: loadDataset(config.projectId, config.datasetId),
  serving: loadDataset(config.projectId, config.servingDatasetId),
  ga4: config.ga4DatasetId
    ? loadDataset(config.projectId, config.ga4DatasetId)
    : null,
  searchConsole: loadDataset(
    config.projectId,
    config.searchConsoleDatasetId
  ),
});

const validationSql = (config) => `
WITH expected AS (
  SELECT view FROM UNNEST([
    ${DASHBOARD_SERVING_VIEWS.map((view) => `'${view}'`).join(",\n    ")}
  ]) AS view
),
actual AS (
  SELECT table_name AS view
  FROM \`${config.projectId}.${config.servingDatasetId}.INFORMATION_SCHEMA.VIEWS\`
)
SELECT
  expected.view,
  IF(actual.view IS NULL, 'fail', 'pass') AS status,
  IF(actual.view IS NULL, 'Serving view is missing.', 'Serving view exists.') AS message
FROM expected
LEFT JOIN actual USING (view)
ORDER BY view`;

export const main = (argv = process.argv.slice(2)) => {
  const [command = "", ...rest] = argv;
  if (!["deploy", "inspect", "validate", "print-sql"].includes(command)) {
    throw new Error(
      "Usage: node scripts/dashboard-serving.mjs <deploy|inspect|validate|print-sql> " +
        "[--ga4-dataset=analytics_<property-id>] " +
        "[--viewer-service-account=...] [--dry-run=true]. " +
        "Project and reporting/serving/Search Console datasets are fixed to Brad's resources."
    );
  }
  const options = parseArgs(rest);
  const config = getDashboardConfig(options);
  if (command === "print-sql") return servingViewSql(config).join(";\n\n");
  if (command === "deploy") return deploy(config, options);
  if (command === "inspect") return inspect(config);
  const rows = JSON.parse(
    run(
      [
        `--project_id=${config.projectId}`,
        `--location=${config.location}`,
        "query",
        "--quiet=true",
        "--use_legacy_sql=false",
        "--format=json",
      ],
      validationSql(config)
    ) || "[]"
  );
  if (rows.some((row) => row.status === "fail")) process.exitCode = 1;
  return rows;
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    const result = main();
    process.stdout.write(
      `${typeof result === "string" ? result : JSON.stringify(result, null, 2)}\n`
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
