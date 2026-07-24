import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { normalizeHeader, rowsToObjects } from "./csv.mjs";
import {
  DEFAULT_CAMPSPOT_PARK_NAME,
  DEFAULT_INVENTORY_MAP_PATH,
} from "./dashboard-config.mjs";

const COMMON_METADATA_SCHEMA = Object.freeze([
  ["insert_id", "STRING", "REQUIRED"],
  ["source_file", "STRING", "REQUIRED"],
  ["source_sha256", "STRING", "REQUIRED"],
  ["gmail_message_id", "STRING"],
  ["loaded_at", "TIMESTAMP", "REQUIRED"],
]);

export const CAMPSPOT_TABLE_SCHEMAS = Object.freeze({
  fact_campspot_reservation: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["confirmation_id", "STRING", "REQUIRED"],
    ["booking_date", "DATE"],
    ["arrival_date", "DATE"],
    ["departure_date", "DATE"],
    ["reservation_status", "STRING"],
    ["reservation_source", "STRING"],
    ["site_category", "STRING"],
    ["site_type", "STRING"],
    ["site", "STRING"],
    ["inventory_class", "STRING", "REQUIRED"],
    ["inventory_match_rule", "STRING", "REQUIRED"],
    ["gross_revenue", "FLOAT64"],
    ["net_revenue", "FLOAT64"],
    ["tax", "FLOAT64"],
    ["fees", "FLOAT64"],
    ["refunds", "FLOAT64"],
    ["transaction_id", "STRING", "REQUIRED"],
    ["invoice_keys", "STRING"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_reservation_origination: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["origination_date", "DATE"],
    ["confirmation_id", "STRING", "REQUIRED"],
    ["reservation_status", "STRING"],
    ["arrival_date", "DATE"],
    ["departure_date", "DATE"],
    ["reservation_source", "STRING"],
    ["site_category", "STRING"],
    ["site_type", "STRING"],
    ["site", "STRING"],
    ["inventory_class", "STRING", "REQUIRED"],
    ["inventory_match_rule", "STRING", "REQUIRED"],
    ["site_rent", "FLOAT64"],
    ["discount", "FLOAT64"],
    ["tax", "FLOAT64"],
    ["occupancy_fee", "FLOAT64"],
    ["locked_site_fee", "FLOAT64"],
    ["pet_fee", "FLOAT64"],
    ["reservation_surcharge", "FLOAT64"],
    ["cancellation_fee", "FLOAT64"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_reservation_day: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["category", "STRING"],
    ["site_type", "STRING"],
    ["site", "STRING"],
    ["inventory_class", "STRING", "REQUIRED"],
    ["inventory_match_rule", "STRING", "REQUIRED"],
    ["origination_date", "DATE"],
    ["stay_date", "DATE"],
    ["confirmation_id", "STRING", "REQUIRED"],
    ["reservation_source", "STRING"],
    ["total_site_income", "FLOAT64"],
    ["total_reservation_income", "FLOAT64"],
    ["lock_fee", "FLOAT64"],
    ["pet_fee", "FLOAT64"],
    ["occupancy_fee", "FLOAT64"],
    ["discount", "FLOAT64"],
    ["rate_applied", "FLOAT64"],
    ["reservation_status", "STRING"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_site_day: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["category", "STRING"],
    ["site_type", "STRING"],
    ["site", "STRING"],
    ["inventory_class", "STRING", "REQUIRED"],
    ["inventory_match_rule", "STRING", "REQUIRED"],
    ["date", "DATE"],
    ["total_site_income", "FLOAT64"],
    ["discounts", "FLOAT64"],
    ["total_reservation_income", "FLOAT64"],
    ["unavailable", "BOOL"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_occupancy_daily: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["date", "DATE"],
    ["total_occupancy_percent", "FLOAT64"],
    ["arrivals", "INT64"],
    ["departures", "INT64"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_cancellation: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["confirmation_id", "STRING", "REQUIRED"],
    ["arrival_date", "DATE"],
    ["departure_date", "DATE"],
    ["booking_date", "DATE"],
    ["cancellation_date", "DATE"],
    ["site_category", "STRING"],
    ["site_type", "STRING"],
    ["site", "STRING"],
    ["inventory_class", "STRING", "REQUIRED"],
    ["inventory_match_rule", "STRING", "REQUIRED"],
    ["cancellation_fee", "FLOAT64"],
    ["reservation_charges", "FLOAT64"],
    ["fees", "FLOAT64"],
    ["discount", "FLOAT64"],
    ["tax", "FLOAT64"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_refund: Object.freeze([
    ["property_identifier", "STRING", "REQUIRED"],
    ["reservation_key", "STRING", "REQUIRED"],
    ["reservation_status", "STRING"],
    ["refund_date", "DATE"],
    ["refund_type", "STRING"],
    ["amount", "FLOAT64"],
    ...COMMON_METADATA_SCHEMA,
  ]),
  fact_campspot_ingest_file: Object.freeze([
    ["content_sha256", "STRING", "REQUIRED"],
    ["gmail_message_id", "STRING"],
    ["report_type", "STRING", "REQUIRED"],
    ["source_file", "STRING", "REQUIRED"],
    ["property_identifier", "STRING", "REQUIRED"],
    ["park_validation", "STRING", "REQUIRED"],
    ["source_row_count", "INT64", "REQUIRED"],
    ["accepted_source_row_count", "INT64", "REQUIRED"],
    ["excluded_source_row_count", "INT64", "REQUIRED"],
    ["row_count", "INT64", "REQUIRED"],
    ["unknown_inventory_rows", "INT64", "REQUIRED"],
    ["loaded_at", "TIMESTAMP", "REQUIRED"],
    ["insert_id", "STRING", "REQUIRED"],
  ]),
});

const REPORT_TABLES = Object.freeze({
  confirmed_reservations: "fact_campspot_reservation",
  reservation_originations: "fact_campspot_reservation_origination",
  reservation_day: "fact_campspot_reservation_day",
  site_day: "fact_campspot_site_day",
  occupancy_daily: "fact_campspot_occupancy_daily",
  cancellations: "fact_campspot_cancellation",
  refunds: "fact_campspot_refund",
});

const PROHIBITED_HEADER_PATTERNS = Object.freeze([
  /\b(first|last|full|guest|customer|cardholder)\s+name\b/,
  /^name$/,
  /\be[\s-]?mail\b/,
  /\bphone\b|\bmobile\b|\btelephone\b/,
  /\baddress\b|\bstreet\b|\bpostal\b|\bzip code\b/,
  /\bcredit card\b|\bcard number\b|\bcvv\b|\bcvc\b|\bpayment method\b/,
  /\blicen[cs]e plate\b|\bvehicle\b|\bvin\b/,
  /\bnotes?\b|\bcomments?\b|\bspecial requests?\b/,
  /\buser name\b|\bcsr user\b|\bcancel+ed by user\b/,
]);

export const prohibitedCampspotHeaders = (headers) =>
  headers
    .map((header) => String(header || "").trim())
    .filter((header) =>
      PROHIBITED_HEADER_PATTERNS.some((pattern) =>
        pattern.test(normalizeHeader(header))
      )
    );

const valueMap = (row) =>
  new Map(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );

export const valueFor = (row, ...names) => {
  const normalized = valueMap(row);
  for (const name of names) {
    const value = normalized.get(normalizeHeader(name));
    if (value !== undefined) return value;
  }
  return "";
};

const normalizedHeaderSet = (headers) =>
  new Set(headers.map((header) => normalizeHeader(header)));

const hasAll = (headerSet, ...groups) =>
  groups.every((group) =>
    (Array.isArray(group) ? group : [group]).some((name) =>
      headerSet.has(normalizeHeader(name))
    )
  );

export const detectCampspotReportType = (headers) => {
  const set = normalizedHeaderSet(headers);
  if (
    hasAll(
      set,
      ["Cancelation Date", "Cancellation Date"],
      ["Confirmation", "Confirmation #"],
      ["Reservation Charges", "Reason for Cancelation", "Reason for Cancellation"]
    )
  ) {
    return "cancellations";
  }
  if (
    hasAll(
      set,
      "Refund Date",
      "Refund Type",
      ["Invoice Number", "Confirmation", "Confirmation #"],
      "Amount"
    )
  ) {
    return "refunds";
  }
  if (
    hasAll(
      set,
      "Origination Date",
      ["Confirmation #", "Confirmation"],
      "Date",
      "Total Reservation Income"
    )
  ) {
    return "reservation_day";
  }
  if (
    hasAll(
      set,
      "Origination Date",
      "Confirmation",
      ["Arrival Date", "Arrival"],
      ["Departure Date", "Departure"],
      "Site Rent"
    )
  ) {
    return "reservation_originations";
  }
  if (
    hasAll(
      set,
      "Date",
      "Site",
      "Unavailable",
      ["Total Site Income", "Total Reservation Income"]
    )
  ) {
    return "site_day";
  }
  if (
    hasAll(set, "Date", "Total Occupancy Percent", "Arrivals", "Departures")
  ) {
    return "occupancy_daily";
  }
  if (
    hasAll(
      set,
      ["Origination Date", "Booking Date"],
      ["Confirmation", "Confirmation #"],
      ["Reservation Charges", "Total Charges on Invoice", "Reservation Total"]
    )
  ) {
    return "confirmed_reservations";
  }
  if (
    hasAll(
      set,
      ["Origination Date", "Booking Date"],
      ["Confirmation", "Confirmation #"],
      ["Arrival Date", "Arrival"],
      ["Departure Date", "Departure"],
      ["Reservation Status", "Status"]
    )
  ) {
    return "confirmed_reservations";
  }
  return "unknown";
};

export const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[()$,%\s,]/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
};

export const toInteger = (value) => {
  const number = toNumber(value);
  return number === null ? null : Math.trunc(number);
};

export const toBoolean = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "y", "occupied", "unavailable"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "available"].includes(normalized)) return false;
  return null;
};

export const parseCampspotDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw
      ? null
      : raw;
  }
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const numeric = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T].*)?$/
  );
  if (numeric) {
    const [, first, second, year] = numeric;
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const dayFirst = firstNumber > 12;
    const month = dayFirst ? secondNumber : firstNumber;
    const day = dayFirst ? firstNumber : secondNumber;
    const candidate = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const parsed = new Date(`${candidate}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== candidate
      ? null
      : candidate;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeInventoryToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const loadInventoryMap = (
  mapPath = process.env.CAMPSPOT_INVENTORY_MAP_PATH ||
    DEFAULT_INVENTORY_MAP_PATH
) => {
  if (!fs.existsSync(mapPath)) {
    return {
      version: 1,
      propertyIdentifier: "",
      reviewStatus: "pending_owner_confirmation",
      exactSites: {},
      exactSiteTypes: {},
      rules: [],
      source: "safe-empty-default",
    };
  }
  const parsed = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const allowed = new Set(["campground", "vintage_trailer"]);
  const reviewStatus = String(
    parsed.reviewStatus || "pending_owner_confirmation"
  ).trim();
  if (!new Set(["pending_owner_confirmation", "approved"]).has(reviewStatus)) {
    throw new Error(
      `Inventory map has unsupported reviewStatus ${reviewStatus || "(empty)"}.`
    );
  }
  for (const [kind, entries] of [
    ["exactSites", parsed.exactSites || {}],
    ["exactSiteTypes", parsed.exactSiteTypes || {}],
  ]) {
    for (const [key, value] of Object.entries(entries)) {
      if (!allowed.has(value)) {
        throw new Error(`${kind}.${key} has unsupported inventory class ${value}.`);
      }
    }
  }
  for (const [index, rule] of (parsed.rules || []).entries()) {
    if (!["site", "site_type", "category", "combined"].includes(rule.field)) {
      throw new Error(`Inventory rule ${index + 1} has an invalid field.`);
    }
    if (!allowed.has(rule.inventoryClass)) {
      throw new Error(`Inventory rule ${index + 1} has an invalid class.`);
    }
    // Compile while loading so malformed configuration fails before an import.
    new RegExp(rule.pattern, "i");
  }
  return {
    version: Number(parsed.version || 1),
    propertyIdentifier: String(parsed.propertyIdentifier || "").trim(),
    reviewStatus,
    exactSites: parsed.exactSites || {},
    exactSiteTypes: parsed.exactSiteTypes || {},
    rules: parsed.rules || [],
    source: path.resolve(mapPath),
  };
};

export const classifyInventory = (
  { site = "", siteType = "", category = "" },
  inventoryMap
) => {
  const map = inventoryMap || loadInventoryMap();
  const normalizedSite = normalizeInventoryToken(site);
  const normalizedType = normalizeInventoryToken(siteType);
  const exactSites = new Map(
    Object.entries(map.exactSites || {}).map(([key, value]) => [
      normalizeInventoryToken(key),
      value,
    ])
  );
  const exactTypes = new Map(
    Object.entries(map.exactSiteTypes || {}).map(([key, value]) => [
      normalizeInventoryToken(key),
      value,
    ])
  );
  if (normalizedSite && exactSites.has(normalizedSite)) {
    return {
      inventoryClass: exactSites.get(normalizedSite),
      matchRule: `exact_site:${normalizedSite}`,
    };
  }
  if (normalizedType && exactTypes.has(normalizedType)) {
    return {
      inventoryClass: exactTypes.get(normalizedType),
      matchRule: `exact_site_type:${normalizedType}`,
    };
  }
  const fields = {
    site: String(site || ""),
    site_type: String(siteType || ""),
    category: String(category || ""),
    combined: [category, siteType, site].filter(Boolean).join(" "),
  };
  const matches = (map.rules || []).filter((rule) =>
    new RegExp(rule.pattern, "i").test(fields[rule.field] || "")
  );
  const classes = [...new Set(matches.map((rule) => rule.inventoryClass))];
  if (classes.length === 1) {
    const firstRule = matches.find((rule) => rule.inventoryClass === classes[0]);
    return {
      inventoryClass: classes[0],
      matchRule: `rule:${firstRule.name || firstRule.pattern}`,
    };
  }
  return {
    inventoryClass: "unknown",
    matchRule:
      classes.length > 1
        ? `conflicting_rules:${matches.map((rule) => rule.name || rule.pattern).join(",")}`
        : "unmapped",
  };
};

const normalizedPropertyValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const IMMUTABLE_PROPERTY_ID_FIELDS = Object.freeze([
  "Park ID",
  "Property ID",
  "Property Code",
]);
const IMMUTABLE_PROPERTY_ID_KEYS = new Set(
  IMMUTABLE_PROPERTY_ID_FIELDS.map((field) => normalizeHeader(field))
);

const immutablePropertyEntries = (row) =>
  Object.entries(row)
    .filter(([field]) =>
      IMMUTABLE_PROPERTY_ID_KEYS.has(normalizeHeader(field))
    )
    .map(([field, value]) => [field, String(value || "").trim()]);

/**
 * Establishes the property boundary before any report-specific aggregation.
 * A mixed export is safe only when every source row has an unambiguous
 * immutable ID. Rows for other exact IDs are counted and discarded; an
 * unscoped row makes the entire file fail closed.
 */
export const scopeCampspotRows = (
  rows,
  {
    expectedParkId = process.env.CAMPSPOT_EXPECTED_PARK_ID || "",
    expectedParkName =
      process.env.CAMPSPOT_EXPECTED_PARK_NAME || DEFAULT_CAMPSPOT_PARK_NAME,
  } = {}
) => {
  const expectedId = String(expectedParkId || "").trim();
  const expectedName = normalizedPropertyValue(expectedParkName);
  if (!expectedId) {
    throw new Error(
      "CAMPSPOT_EXPECTED_PARK_ID (or --park-id) is required; property-name or subject matching is not sufficient."
    );
  }
  const acceptedRows = [];
  let excludedSourceRowCount = 0;
  for (const [index, row] of rows.entries()) {
    const populatedIds = immutablePropertyEntries(row)
      .map(([, value]) => value)
      .filter(Boolean);
    if (populatedIds.length === 0) {
      throw new Error(
        `Campspot report row ${index + 1} has no immutable Park ID, Property ID, or Property Code.`
      );
    }
    const distinctIds = [...new Set(populatedIds)];
    if (distinctIds.length !== 1) {
      throw new Error(
        `Campspot report row ${index + 1} has conflicting immutable Park/Property IDs.`
      );
    }
    if (distinctIds[0] === expectedId) acceptedRows.push(row);
    else excludedSourceRowCount += 1;
  }
  if (acceptedRows.length === 0) {
    throw new Error(
      "Rejected Campspot report because no rows matched the expected immutable property ID."
    );
  }
  const mismatchedNames = [
    ...new Set(
      acceptedRows
        .map((row) =>
          String(valueFor(row, "Park", "Park Name", "Property Name") || "").trim()
        )
        .filter(Boolean)
    ),
  ].filter(
    (value) =>
      expectedName &&
      !normalizedPropertyValue(value).includes(expectedName) &&
      !expectedName.includes(normalizedPropertyValue(value))
  );
  if (mismatchedNames.length) {
    throw new Error(
      "Rejected Campspot report because the expected property ID conflicts with its park/property name."
    );
  }
  return {
    rows: acceptedRows,
    propertyIdentifier: expectedId,
    sourceRowCount: rows.length,
    acceptedSourceRowCount: acceptedRows.length,
    excludedSourceRowCount,
    parkValidation:
      excludedSourceRowCount > 0
        ? "immutable_property_id_row_filtered"
        : "immutable_property_id_verified",
  };
};

export const validateCampspotPark = (rows, options = {}) =>
  scopeCampspotRows(rows, options).parkValidation;

const hash = (value) =>
  crypto.createHash("sha256").update(String(value ?? "")).digest("hex");

const fileMetadata = ({
  sourceFile,
  sourceSha256,
  gmailMessageId = "",
  loadedAt = new Date().toISOString(),
}) => ({
  source_file: path.basename(String(sourceFile || "campspot-report.csv")),
  source_sha256: sourceSha256,
  gmail_message_id: gmailMessageId,
  loaded_at: loadedAt,
});

const withInsertId = (tableId, row) => {
  const identity = Object.fromEntries(
    Object.entries(row)
      .filter(
        ([key]) =>
          !["insert_id", "loaded_at", "gmail_message_id"].includes(key)
      )
      .sort(([left], [right]) => left.localeCompare(right))
  );
  return {
    ...row,
    insert_id: hash(JSON.stringify([tableId, identity])),
  };
};

const propertyIdentifier = (row) =>
  String(
    valueFor(row, "Property Code", "Property ID", "Park ID") || ""
  ).trim();

const inventoryFor = (row, inventoryMap, aliases = {}) => {
  const site = String(
    valueFor(row, ...(aliases.site || ["Site", "Site Name", "Unit Site Name"])) || ""
  ).trim();
  const siteType = String(
    valueFor(
      row,
      ...(aliases.siteType || ["Site Type", "Type Name", "Unit Site Type"])
    ) || ""
  ).trim();
  const category = String(
    valueFor(
      row,
      ...(aliases.category || ["Category", "Site Category", "Category Name"])
    ) || ""
  ).trim();
  const classification = classifyInventory({ site, siteType, category }, inventoryMap);
  return {
    site,
    siteType,
    category,
    inventoryClass: classification.inventoryClass,
    inventoryMatchRule: classification.matchRule,
  };
};

const normalizeOriginations = ({ rows, inventoryMap, metadata }) =>
  rows
    .map((row) => {
      const confirmationId = String(
        valueFor(row, "Confirmation", "Confirmation #") || ""
      ).trim();
      if (!confirmationId) return null;
      const inventory = inventoryFor(row, inventoryMap);
      return withInsertId("fact_campspot_reservation_origination", {
        property_identifier: propertyIdentifier(row),
        origination_date: parseCampspotDate(valueFor(row, "Origination Date")),
        confirmation_id: confirmationId,
        reservation_status: String(
          valueFor(row, "Status", "Reservation Status") || ""
        ).trim(),
        arrival_date: parseCampspotDate(
          valueFor(row, "Arrival Date", "Arrival")
        ),
        departure_date: parseCampspotDate(
          valueFor(row, "Departure Date", "Departure")
        ),
        reservation_source: String(valueFor(row, "Reservation Source") || "").trim(),
        site_category: inventory.category,
        site_type: inventory.siteType,
        site: inventory.site,
        inventory_class: inventory.inventoryClass,
        inventory_match_rule: inventory.inventoryMatchRule,
        site_rent: toNumber(valueFor(row, "Site Rent")),
        discount: toNumber(valueFor(row, "Discount")),
        tax: toNumber(valueFor(row, "Tax")),
        occupancy_fee: toNumber(valueFor(row, "Occupancy Fee")),
        locked_site_fee: toNumber(valueFor(row, "Locked Site Fee")),
        pet_fee: toNumber(valueFor(row, "Pet Fee")),
        reservation_surcharge: toNumber(valueFor(row, "Reservation Surcharge")),
        cancellation_fee: toNumber(
          valueFor(row, "Cancelation Fee", "Cancellation Fee")
        ),
        ...metadata,
      });
    })
    .filter(Boolean);

const normalizeReservationDay = ({ rows, inventoryMap, metadata }) =>
  rows
    .map((row) => {
      const confirmationId = String(
        valueFor(row, "Confirmation #", "Confirmation") || ""
      ).trim();
      if (!confirmationId) return null;
      const inventory = inventoryFor(row, inventoryMap, {
        site: ["Site Name", "Site"],
      });
      return withInsertId("fact_campspot_reservation_day", {
        property_identifier: propertyIdentifier(row),
        category: inventory.category,
        site_type: inventory.siteType,
        site: inventory.site,
        inventory_class: inventory.inventoryClass,
        inventory_match_rule: inventory.inventoryMatchRule,
        origination_date: parseCampspotDate(valueFor(row, "Origination Date")),
        stay_date: parseCampspotDate(valueFor(row, "Date", "Stay Date")),
        confirmation_id: confirmationId,
        reservation_source: String(valueFor(row, "Reservation Source") || "").trim(),
        total_site_income: toNumber(valueFor(row, "Total Site Income")),
        total_reservation_income: toNumber(
          valueFor(row, "Total Reservation Income")
        ),
        lock_fee: toNumber(valueFor(row, "Lock Fee", "Locked Site Fee")),
        pet_fee: toNumber(valueFor(row, "Pet Fee")),
        occupancy_fee: toNumber(valueFor(row, "Occupancy Fee")),
        discount: toNumber(valueFor(row, "Discount")),
        rate_applied: toNumber(valueFor(row, "Rate Applied")),
        reservation_status: String(
          valueFor(row, "ReservationType", "Reservation Type", "Status") || ""
        ).trim(),
        ...metadata,
      });
    })
    .filter(Boolean);

const normalizeSiteDay = ({ rows, inventoryMap, metadata }) =>
  rows.map((row) => {
    const inventory = inventoryFor(row, inventoryMap);
    return withInsertId("fact_campspot_site_day", {
      property_identifier: propertyIdentifier(row),
      category: inventory.category,
      site_type: inventory.siteType,
      site: inventory.site,
      inventory_class: inventory.inventoryClass,
      inventory_match_rule: inventory.inventoryMatchRule,
      date: parseCampspotDate(valueFor(row, "Date")),
      total_site_income: toNumber(valueFor(row, "Total Site Income")),
      discounts: toNumber(valueFor(row, "Discounts", "Discount")),
      total_reservation_income: toNumber(
        valueFor(row, "Total Reservation Income")
      ),
      unavailable: toBoolean(valueFor(row, "Unavailable")),
      ...metadata,
    });
  });

const normalizeOccupancyDaily = ({ rows, metadata }) =>
  rows.map((row) =>
    withInsertId("fact_campspot_occupancy_daily", {
      property_identifier: propertyIdentifier(row),
      date: parseCampspotDate(valueFor(row, "Date")),
      total_occupancy_percent: toNumber(
        valueFor(row, "Total Occupancy Percent")
      ),
      arrivals: toInteger(valueFor(row, "Arrivals")),
      departures: toInteger(valueFor(row, "Departures")),
      ...metadata,
    })
  );

const normalizeCancellations = ({ rows, inventoryMap, metadata }) =>
  rows
    .map((row) => {
      const confirmationId = String(
        valueFor(row, "Confirmation", "Confirmation #") || ""
      ).trim();
      if (!confirmationId) return null;
      const inventory = inventoryFor(row, inventoryMap, {
        site: ["Site/Add-on Name", "Site", "Site Name"],
        siteType: ["Type Name", "Site Type"],
        category: ["Category Name", "Site Category", "Category"],
      });
      const fees = [
        "Occupancy Fee",
        "Locked Site Fee",
        "Pet Fee",
        "Reservation Surcharges",
      ].reduce((sum, field) => sum + Number(toNumber(valueFor(row, field)) || 0), 0);
      return withInsertId("fact_campspot_cancellation", {
        property_identifier: propertyIdentifier(row),
        confirmation_id: confirmationId,
        arrival_date: parseCampspotDate(valueFor(row, "Arrival Date")),
        departure_date: parseCampspotDate(valueFor(row, "Departure Date")),
        booking_date: parseCampspotDate(valueFor(row, "Booking Date")),
        cancellation_date: parseCampspotDate(
          valueFor(row, "Cancelation Date", "Cancellation Date")
        ),
        site_category: inventory.category,
        site_type: inventory.siteType,
        site: inventory.site,
        inventory_class: inventory.inventoryClass,
        inventory_match_rule: inventory.inventoryMatchRule,
        cancellation_fee: toNumber(
          valueFor(row, "Cancelation Fee", "Cancellation Fee")
        ),
        reservation_charges: toNumber(valueFor(row, "Reservation Charges")),
        fees,
        discount: toNumber(valueFor(row, "Discount")),
        tax: toNumber(valueFor(row, "Tax")),
        ...metadata,
      });
    })
    .filter(Boolean);

const normalizeRefunds = ({ rows, metadata }) =>
  rows
    .map((row) => {
      const reservationReference = String(
        valueFor(row, "Confirmation", "Confirmation #", "Invoice Number") || ""
      ).trim();
      if (!reservationReference) return null;
      return withInsertId("fact_campspot_refund", {
        property_identifier: propertyIdentifier(row),
        reservation_key: hash(reservationReference),
        reservation_status: String(valueFor(row, "Reservation Status") || "").trim(),
        refund_date: parseCampspotDate(valueFor(row, "Refund Date")),
        refund_type: String(valueFor(row, "Refund Type") || "").trim(),
        amount: toNumber(valueFor(row, "Amount")),
        ...metadata,
      });
    })
    .filter(Boolean);

const confirmedRevenue = (row) => {
  const fields = [
    "Reservation Charges",
    "Occupancy Charges",
    "Locked Site Fees",
    "Pet Fees",
    "Surcharges",
    "Discounts",
    "Non-Deposit Misc Charges",
    "Deposit Misc Charges",
    "Legacy Misc Charges on Invoice",
    "POS Charges",
    "Utility Charges",
    "Other Charges",
  ];
  const values = fields.map((field) => toNumber(valueFor(row, field)));
  if (values.some((value) => value !== null)) {
    return values.reduce((sum, value) => sum + Number(value || 0), 0);
  }
  const total = toNumber(
    valueFor(row, "Total Charges on Invoice", "Reservation Total", "Total")
  );
  const tax = toNumber(valueFor(row, "Tax")) || 0;
  return total === null ? 0 : total - tax;
};

const normalizeConfirmedReservations = ({ rows, inventoryMap, metadata }) => {
  const reservations = new Map();
  for (const row of rows) {
    const confirmationId = String(
      valueFor(row, "Confirmation", "Confirmation #") || ""
    ).trim();
    if (!confirmationId) continue;
    const inventory = inventoryFor(row, inventoryMap, {
      site: ["Unit Site Name", "Site", "Site Name"],
      siteType: ["Unit Site Type", "Site Type", "Type Name"],
      category: ["Site Category", "Category", "Category Name"],
    });
    const tax = toNumber(valueFor(row, "Tax")) || 0;
    const netRevenue = confirmedRevenue(row);
    const fees = [
      "Occupancy Charges",
      "Locked Site Fees",
      "Pet Fees",
      "Surcharges",
    ].reduce((sum, field) => sum + Number(toNumber(valueFor(row, field)) || 0), 0);
    const current = reservations.get(confirmationId) || {
      property_identifier: propertyIdentifier(row),
      confirmation_id: confirmationId,
      booking_date: null,
      arrival_date: null,
      departure_date: null,
      statuses: new Set(),
      sources: new Set(),
      categories: new Set(),
      siteTypes: new Set(),
      sites: new Set(),
      inventoryClasses: new Set(),
      inventoryRules: new Set(),
      gross_revenue: 0,
      net_revenue: 0,
      tax: 0,
      fees: 0,
      refunds: 0,
      invoiceKeys: new Set(),
    };
    const bookingDate = parseCampspotDate(
      valueFor(row, "Origination Date", "Booking Date")
    );
    const arrivalDate = parseCampspotDate(valueFor(row, "Arrival Date", "Arrival"));
    const departureDate = parseCampspotDate(
      valueFor(row, "Departure Date", "Departure")
    );
    if (bookingDate && (!current.booking_date || bookingDate < current.booking_date)) {
      current.booking_date = bookingDate;
    }
    if (arrivalDate && (!current.arrival_date || arrivalDate < current.arrival_date)) {
      current.arrival_date = arrivalDate;
    }
    if (
      departureDate &&
      (!current.departure_date || departureDate > current.departure_date)
    ) {
      current.departure_date = departureDate;
    }
    const status = String(valueFor(row, "Reservation Status", "Status") || "").trim();
    const source = String(valueFor(row, "Reservation Source", "Referral Source") || "").trim();
    if (status) current.statuses.add(status);
    if (source) current.sources.add(source);
    if (inventory.category) current.categories.add(inventory.category);
    if (inventory.siteType) current.siteTypes.add(inventory.siteType);
    if (inventory.site) current.sites.add(inventory.site);
    current.inventoryClasses.add(inventory.inventoryClass);
    current.inventoryRules.add(inventory.inventoryMatchRule);
    current.net_revenue += netRevenue;
    current.gross_revenue += netRevenue + tax;
    current.tax += tax;
    current.fees += fees;
    current.refunds += Number(
      toNumber(valueFor(row, "Refund Amount", "Refunds", "Refunded")) || 0
    );
    const invoiceReference = String(
      valueFor(row, "Invoice Number", "Invoice") || ""
    ).trim();
    if (invoiceReference) current.invoiceKeys.add(hash(invoiceReference));
    reservations.set(confirmationId, current);
  }
  return [...reservations.values()].map((reservation) => {
    const inventoryClasses = [...reservation.inventoryClasses];
    const inventoryClass =
      inventoryClasses.length === 1 ? inventoryClasses[0] : "unknown";
    return withInsertId("fact_campspot_reservation", {
      property_identifier: reservation.property_identifier,
      confirmation_id: reservation.confirmation_id,
      booking_date: reservation.booking_date,
      arrival_date: reservation.arrival_date,
      departure_date: reservation.departure_date,
      reservation_status: [...reservation.statuses].sort().join("; "),
      reservation_source: [...reservation.sources].sort().join("; "),
      site_category: [...reservation.categories].sort().join("; "),
      site_type: [...reservation.siteTypes].sort().join("; "),
      site: [...reservation.sites].sort().join("; "),
      inventory_class: inventoryClass,
      inventory_match_rule:
        inventoryClass === "unknown"
          ? `mixed_or_unknown:${[...reservation.inventoryRules].sort().join(",")}`
          : [...reservation.inventoryRules].sort().join("; "),
      gross_revenue: reservation.gross_revenue,
      net_revenue: reservation.net_revenue,
      tax: reservation.tax,
      fees: reservation.fees,
      refunds: reservation.refunds || null,
      transaction_id: reservation.confirmation_id,
      invoice_keys:
        reservation.invoiceKeys.size > 0
          ? `;${[...reservation.invoiceKeys].sort().join(";")};`
          : "",
      ...metadata,
    });
  });
};

const NORMALIZERS = Object.freeze({
  confirmed_reservations: normalizeConfirmedReservations,
  reservation_originations: normalizeOriginations,
  reservation_day: normalizeReservationDay,
  site_day: normalizeSiteDay,
  occupancy_daily: normalizeOccupancyDaily,
  cancellations: normalizeCancellations,
  refunds: normalizeRefunds,
});

export const normalizeCampspotReport = ({
  sourceFile,
  sourceSha256,
  values,
  gmailMessageId = "",
  loadedAt = new Date().toISOString(),
  inventoryMap = loadInventoryMap(),
  expectedParkId = process.env.CAMPSPOT_EXPECTED_PARK_ID || "",
  expectedParkName =
    process.env.CAMPSPOT_EXPECTED_PARK_NAME || DEFAULT_CAMPSPOT_PARK_NAME,
}) => {
  const [headers = []] = values;
  const reportType = detectCampspotReportType(headers);
  if (reportType === "unknown") {
    throw new Error(
      `Unrecognized Campspot report columns. Refusing to import an unreviewed schema: ${headers
        .slice(0, 12)
        .join(", ")}`
    );
  }
  const objectRows = rowsToObjects(values);
  const propertyScope = scopeCampspotRows(objectRows, {
    expectedParkId,
    expectedParkName,
  });
  const safeSourceFile = `${reportType}-${sourceSha256.slice(0, 16)}.csv`;
  const metadata = fileMetadata({
    sourceFile: safeSourceFile,
    sourceSha256,
    gmailMessageId,
    loadedAt,
  });
  const tableId = REPORT_TABLES[reportType];
  const rows = NORMALIZERS[reportType]({
    rows: propertyScope.rows,
    inventoryMap,
    metadata,
  });
  const unknownInventoryRows = rows.filter(
    (row) => row.inventory_class === "unknown"
  ).length;
  const inventoryObservations = [
    ...new Map(
      rows
        .filter((row) => "inventory_class" in row)
        .map((row) => {
          const observation = {
            site: row.site || "",
            siteType: row.site_type || "",
            category: row.site_category || row.category || "",
            inventoryClass: row.inventory_class,
            matchRule: row.inventory_match_rule,
          };
          return [JSON.stringify(observation), observation];
        })
    ).values(),
  ].sort(
    (left, right) =>
      left.inventoryClass.localeCompare(right.inventoryClass) ||
      left.site.localeCompare(right.site) ||
      left.siteType.localeCompare(right.siteType)
  );
  const prohibitedHeaders = prohibitedCampspotHeaders(headers);
  const ingestRow = {
    content_sha256: sourceSha256,
    gmail_message_id: gmailMessageId,
    report_type: reportType,
    source_file: metadata.source_file,
    property_identifier: propertyScope.propertyIdentifier,
    park_validation: propertyScope.parkValidation,
    source_row_count: propertyScope.sourceRowCount,
    accepted_source_row_count: propertyScope.acceptedSourceRowCount,
    excluded_source_row_count: propertyScope.excludedSourceRowCount,
    row_count: rows.length,
    unknown_inventory_rows: unknownInventoryRows,
    loaded_at: loadedAt,
    // Content identity intentionally excludes Gmail message ID so a forwarded or
    // re-sent attachment remains idempotent even if local/GCS state is lost.
    insert_id: hash(JSON.stringify([sourceSha256, reportType])),
  };
  return {
    reportType,
    tableId,
    rows,
    ingestRow,
    parkValidation: propertyScope.parkValidation,
    propertyScope: {
      propertyIdentifier: propertyScope.propertyIdentifier,
      sourceRowCount: propertyScope.sourceRowCount,
      acceptedSourceRowCount: propertyScope.acceptedSourceRowCount,
      excludedSourceRowCount: propertyScope.excludedSourceRowCount,
    },
    prohibitedHeaders,
    unknownInventoryRows,
    inventoryObservations,
    privacy: {
      policy: "allowlist_only",
      rawColumns: headers.length,
      prohibitedColumnsDiscarded: prohibitedHeaders.length,
      rawGuestDataRetained: false,
    },
  };
};

export const safeRowForSchema = (tableId, row) => {
  const schema = CAMPSPOT_TABLE_SCHEMAS[tableId];
  if (!schema) throw new Error(`No schema for ${tableId}.`);
  return Object.fromEntries(schema.map(([name]) => [name, row[name] ?? null]));
};

export const bigQuerySchema = (tableId) => {
  const schema = CAMPSPOT_TABLE_SCHEMAS[tableId];
  if (!schema) throw new Error(`No schema for ${tableId}.`);
  return schema.map(([name, type, mode = "NULLABLE"]) => ({ name, type, mode }));
};

const safeOperationalLabel = (value, maximum = 120) => {
  const normalized = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !normalized ||
    normalized.length > maximum ||
    /@|https?:|mailto:|\b(?:phone|email|address)\b/i.test(normalized)
  ) {
    return "";
  }
  return normalized;
};

const STRICT_PROPERTY_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

const safeDiscoveryPropertyIdentifier = (row) => {
  const identifier = safeOperationalLabel(
    valueFor(row, "Park ID", "Property ID", "Property Code"),
    100
  );
  return STRICT_PROPERTY_IDENTIFIER_PATTERN.test(identifier) ? identifier : "";
};

const dateRange = (dates) => {
  const values = [...new Set(dates.filter(Boolean))].sort();
  return {
    start: values[0] || null,
    end: values.at(-1) || null,
  };
};

/**
 * Discovery is intentionally narrower than normalization: it exposes only
 * property IDs, operational date coverage, and inventory labels needed to
 * configure the importer. It never returns arbitrary row values.
 */
export const discoverCampspotReport = ({
  values,
  inventoryMap = loadInventoryMap(),
}) => {
  const [headers = []] = values;
  const reportType = detectCampspotReportType(headers);
  const rows = rowsToObjects(values);
  const propertyIdentifiers = [
    ...new Set(
      rows
        .map((row) => safeDiscoveryPropertyIdentifier(row))
        .filter(Boolean)
    ),
  ].sort();
  const bookingDates = [];
  const stayDates = [];
  const observations = new Map();
  for (const row of rows) {
    for (const field of [
      "Origination Date",
      "Booking Date",
      "Cancelation Date",
      "Cancellation Date",
      "Refund Date",
    ]) {
      bookingDates.push(parseCampspotDate(valueFor(row, field)));
    }
    for (const field of [
      "Arrival Date",
      "Arrival",
      "Departure Date",
      "Departure",
      "Stay Date",
      "Date",
    ]) {
      stayDates.push(parseCampspotDate(valueFor(row, field)));
    }
    const site = safeOperationalLabel(
      valueFor(row, "Site", "Site Name", "Unit Site Name", "Site/Add-on Name")
    );
    const siteType = safeOperationalLabel(
      valueFor(row, "Site Type", "Unit Site Type", "Type Name")
    );
    const category = safeOperationalLabel(
      valueFor(row, "Category", "Site Category", "Category Name")
    );
    if (!site && !siteType && !category) continue;
    const classification = classifyInventory({ site, siteType, category }, inventoryMap);
    const observation = {
      propertyIdentifier: safeDiscoveryPropertyIdentifier(row),
      site,
      siteType,
      category,
      inventoryClass: classification.inventoryClass,
      matchRule: classification.matchRule,
    };
    observations.set(JSON.stringify(observation), observation);
  }
  const coverageDates = [...bookingDates, ...stayDates].filter(Boolean);
  return {
    reportType,
    rowCount: rows.length,
    propertyIdentifiers,
    bookingDateRange: dateRange(bookingDates),
    stayDateRange: dateRange(stayDates),
    seasons: [
      ...new Set(
        (stayDates.some(Boolean) ? stayDates : coverageDates)
          .filter(Boolean)
          .map((date) => date.slice(0, 4))
      ),
    ].sort(),
    inventoryObservations: [...observations.values()].sort(
      (left, right) =>
        left.propertyIdentifier.localeCompare(right.propertyIdentifier) ||
        left.site.localeCompare(right.site) ||
        left.siteType.localeCompare(right.siteType) ||
        left.category.localeCompare(right.category)
    ),
    prohibitedColumnsDiscarded: prohibitedCampspotHeaders(headers).length,
  };
};
