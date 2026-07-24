import path from "node:path";

export const DEFAULT_PROJECT_ID = "focused-clock-498319-f5";
export const DEFAULT_REPORTING_DATASET = "bradsdadsland_reporting";
export const DEFAULT_SERVING_DATASET = "bradsdadsland_dashboard";
export const DEFAULT_SEARCH_CONSOLE_DATASET = "searchconsole_bradsdadsland";
export const DEFAULT_LOCATION = "US";
export const DASHBOARD_TIME_ZONE = "America/Vancouver";
export const DASHBOARD_CURRENCY = "CAD";
export const KNOWN_BEACHCOMBER_GA4_DATASETS = Object.freeze([
  "analytics_492144314",
]);

export const DEFAULT_CAMPSPOT_RECIPIENT =
  "data-ingest-bradsdadsland@beachcomberrv.com";
export const DEFAULT_CAMPSPOT_PROPERTY_ID = "1514";
// Google Groups does not reliably retain a subject prefix. This is optional
// defense-in-depth; exact recipient and immutable Campspot property ID are the
// security boundary.
export const DEFAULT_CAMPSPOT_SUBJECT_PREFIX = "";
export const DEFAULT_CAMPSPOT_PARK_NAME = "Brad's Dads Land";
export const DEFAULT_INVENTORY_MAP_PATH = path.resolve(
  "config",
  "dashboard",
  "campspot-inventory-map.json"
);

const IDENTIFIER = /^[A-Za-z0-9_-]+$/;

export const parseArgs = (argv = []) =>
  Object.fromEntries(
    argv
      .filter((value) => value.startsWith("--"))
      .map((value) => {
        const separator = value.indexOf("=");
        return separator === -1
          ? [value.slice(2), "true"]
          : [value.slice(2, separator), value.slice(separator + 1)];
      })
  );

export const optionEnabled = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

export const identifier = (value, label) => {
  const normalized = String(value || "").trim();
  if (!IDENTIFIER.test(normalized)) {
    throw new Error(`Invalid ${label}: ${normalized || "(empty)"}`);
  }
  return normalized;
};

export const optionalIdentifier = (value, label) => {
  const normalized = String(value || "").trim();
  return normalized ? identifier(normalized, label) : "";
};

const fixedIdentifier = (value, expected, label) => {
  const actual = identifier(value, label);
  if (actual !== expected) {
    throw new Error(
      `${label} must remain ${expected}; Brad's dashboard cannot be redirected to ${actual}.`
    );
  }
  return actual;
};

export const assertBradGa4Dataset = (value) => {
  const dataset = optionalIdentifier(value, "GA4 dataset ID");
  if (!dataset) return "";
  if (!/^analytics_[0-9]+$/.test(dataset)) {
    throw new Error(
      "Brad's GA4 dataset must use the native analytics_<numeric-property-id> format."
    );
  }
  if (KNOWN_BEACHCOMBER_GA4_DATASETS.includes(dataset)) {
    throw new Error(
      `${dataset} is Beachcomber's GA4 dataset and cannot be used by Brad's dashboard.`
    );
  }
  return dataset;
};

export const getDashboardConfig = (options = {}) => {
  const projectId = fixedIdentifier(
    options.project || process.env.BRADS_GCP_PROJECT || DEFAULT_PROJECT_ID,
    DEFAULT_PROJECT_ID,
    "project ID"
  );
  const datasetId = fixedIdentifier(
    options.dataset ||
      options["source-dataset"] ||
      process.env.BRADS_REPORTING_DATASET ||
      DEFAULT_REPORTING_DATASET,
    DEFAULT_REPORTING_DATASET,
    "reporting dataset ID"
  );
  const servingDatasetId = fixedIdentifier(
    options["serving-dataset"] ||
      process.env.BRADS_SERVING_DATASET ||
      DEFAULT_SERVING_DATASET,
    DEFAULT_SERVING_DATASET,
    "serving dataset ID"
  );
  const searchConsoleDatasetId = fixedIdentifier(
    options["search-console-dataset"] ||
      process.env.BRADS_SEARCH_CONSOLE_DATASET ||
      DEFAULT_SEARCH_CONSOLE_DATASET,
    DEFAULT_SEARCH_CONSOLE_DATASET,
    "Search Console dataset ID"
  );
  const location = fixedIdentifier(
    options.location || process.env.BRADS_BIGQUERY_LOCATION || DEFAULT_LOCATION,
    DEFAULT_LOCATION,
    "BigQuery location"
  );
  const campspotPropertyCandidates = [
    options["park-id"],
    process.env.CAMPSPOT_EXPECTED_PARK_ID,
    process.env.BRADS_CAMPSPOT_PROPERTY_ID,
  ]
    .map((candidate) => String(candidate || "").trim())
    .filter(Boolean);
  for (const candidate of campspotPropertyCandidates) {
    fixedIdentifier(
      candidate,
      DEFAULT_CAMPSPOT_PROPERTY_ID,
      "Campspot property ID"
    );
  }
  const campspotPropertyId = DEFAULT_CAMPSPOT_PROPERTY_ID;

  return {
    projectId,
    datasetId,
    servingDatasetId,
    ga4DatasetId: assertBradGa4Dataset(
      options["ga4-dataset"] || process.env.BRADS_GA4_DATASET || ""
    ),
    searchConsoleDatasetId,
    campspotPropertyId,
    location,
    timeZone: DASHBOARD_TIME_ZONE,
    currency: DASHBOARD_CURRENCY,
  };
};

export const requireGa4Dataset = (config) => {
  const dataset = assertBradGa4Dataset(config.ga4DatasetId);
  if (!dataset) {
    throw new Error(
      "Brad's GA4 BigQuery dataset is not configured. Set BRADS_GA4_DATASET or pass --ga4-dataset=analytics_<property-id>."
    );
  }
  return dataset;
};

export const requireCampspotPropertyId = (config) =>
  fixedIdentifier(
    config.campspotPropertyId,
    DEFAULT_CAMPSPOT_PROPERTY_ID,
    "Campspot property ID"
  );

export const quoteTable = (projectId, datasetId, tableId) =>
  `\`${identifier(projectId, "project ID")}.${identifier(
    datasetId,
    "dataset ID"
  )}.${identifier(tableId, "table ID")}\``;

export const reportingTable = (config, tableId) =>
  quoteTable(config.projectId, config.datasetId, tableId);

export const servingTable = (config, tableId) =>
  quoteTable(config.projectId, config.servingDatasetId, tableId);

export const ga4Table = (config, tableId) =>
  quoteTable(config.projectId, requireGa4Dataset(config), tableId);

export const searchConsoleTable = (config, tableId) =>
  quoteTable(config.projectId, config.searchConsoleDatasetId, tableId);

export const sqlString = (value) =>
  `'${String(value ?? "").replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;

export const vancouverDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const assertIsoDate = (value, label = "date") => {
  const normalized = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`Invalid ${label}: ${normalized || "(empty)"}`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error(`Invalid ${label}: ${normalized}`);
  }
  return normalized;
};

export const structuredLog = (event, details = {}) => {
  process.stdout.write(
    `${JSON.stringify({ event, at: new Date().toISOString(), ...details })}\n`
  );
};
