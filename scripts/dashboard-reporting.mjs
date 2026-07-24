#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { CAMPSPOT_TABLE_SCHEMAS } from "./lib/campspot-report.mjs";
import {
  assertIsoDate,
  ga4Table,
  getDashboardConfig,
  optionEnabled,
  parseArgs,
  reportingTable,
  requireCampspotPropertyId,
  requireGa4Dataset,
  searchConsoleTable,
  sqlString,
  vancouverDate,
} from "./lib/dashboard-config.mjs";

export {
  DASHBOARD_CURRENCY,
  DASHBOARD_TIME_ZONE,
  DEFAULT_LOCATION,
  DEFAULT_PROJECT_ID,
  DEFAULT_REPORTING_DATASET,
  DEFAULT_SEARCH_CONSOLE_DATASET,
  DEFAULT_SERVING_DATASET,
} from "./lib/dashboard-config.mjs";

export const DASHBOARD_TABLES = Object.freeze([
  ...Object.keys(CAMPSPOT_TABLE_SCHEMAS),
  "fact_dashboard_booking_pace_snapshot",
  "fact_dashboard_pipeline_run",
]);

export const DASHBOARD_VIEWS = Object.freeze([
  "v_campspot_reservation_canonical",
  "v_campspot_cancellation_canonical",
  "v_campspot_refund_canonical",
  "v_campspot_site_day_canonical",
  "v_ga4_event_facts",
  "mart_dashboard_ga4_daily",
  "mart_dashboard_search_console_daily",
  "mart_dashboard_campspot_daily",
  "mart_dashboard_booking_pace",
  "mart_dashboard_data_health",
  "mart_dashboard_data_quality",
]);

export const DASHBOARD_SERVING_VIEWS = Object.freeze([
  "mart_dashboard_ga4_daily",
  "mart_dashboard_search_console_daily",
  "mart_dashboard_campspot_daily",
  "mart_dashboard_booking_pace",
  "mart_dashboard_data_health",
  "mart_dashboard_data_quality",
]);

const COMMANDS = new Set([
  "deploy",
  "snapshot",
  "inspect",
  "validate",
  "print-sql",
]);

const bqType = (type) => {
  if (type === "FLOAT") return "FLOAT64";
  if (type === "INTEGER") return "INT64";
  if (type === "BOOLEAN") return "BOOL";
  return type;
};

const tableDdl = (config, tableId, schema) => {
  const partitionColumn = schema.some(([name]) => name === "loaded_at")
    ? "DATE(loaded_at)"
    : null;
  return `
CREATE TABLE IF NOT EXISTS ${reportingTable(config, tableId)} (
${schema
  .map(
    ([name, type, mode = "NULLABLE"]) =>
      `  \`${name}\` ${bqType(type)}${mode === "REQUIRED" ? " NOT NULL" : ""}`
  )
  .join(",\n")}
)
${partitionColumn ? `PARTITION BY ${partitionColumn}\n` : ""}OPTIONS (
  description = 'Privacy-safe Brad\\'s Dads Land Campspot ${tableId.replace(
    /^fact_campspot_/,
    ""
  )} rows; raw guest fields are never stored.',
  require_partition_filter = FALSE
)`;
};

export const dashboardTableSql = (config) => [
  `
CREATE SCHEMA IF NOT EXISTS \`${config.projectId}.${config.datasetId}\`
OPTIONS (
  location = '${config.location}',
  description = 'Private source-first reporting data for Brad\\'s Dads Land'
)`,
  ...Object.entries(CAMPSPOT_TABLE_SCHEMAS).map(([tableId, schema]) =>
    tableDdl(config, tableId, schema)
  ),
  `
CREATE TABLE IF NOT EXISTS ${reportingTable(
    config,
    "fact_dashboard_booking_pace_snapshot"
  )} (
  snapshot_date DATE NOT NULL,
  snapshot_at TIMESTAMP NOT NULL,
  snapshot_kind STRING NOT NULL,
  stay_date DATE NOT NULL,
  inventory_class STRING NOT NULL,
  site STRING NOT NULL,
  site_type STRING,
  available_site_nights INT64 NOT NULL,
  booked_site_nights INT64 NOT NULL,
  reservations INT64 NOT NULL,
  booked_revenue FLOAT64 NOT NULL,
  source_updated_at TIMESTAMP
)
PARTITION BY snapshot_date
CLUSTER BY stay_date, inventory_class, site
OPTIONS (
  description = 'Observed nightly booking-pace snapshots. Reconstructed history is explicitly labelled and never presented as observed.',
  require_partition_filter = FALSE
)`,
  `
CREATE TABLE IF NOT EXISTS ${reportingTable(
    config,
    "fact_dashboard_pipeline_run"
  )} (
  run_id STRING NOT NULL,
  source STRING NOT NULL,
  job_name STRING NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status STRING NOT NULL,
  rows_processed INT64,
  source_through_date DATE,
  error_summary STRING,
  metadata_json STRING,
  recorded_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(started_at)
CLUSTER BY source, status
OPTIONS (description = 'Operational pipeline log with no guest data.')`,
];

const canonicalReservationsSql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "v_campspot_reservation_canonical"
)} AS
WITH confirmed AS (
  SELECT
    property_identifier,
    confirmation_id,
    booking_date,
    arrival_date,
    departure_date,
    reservation_status,
    reservation_source,
    site_category,
    site_type,
    site,
    inventory_class,
    inventory_match_rule,
    gross_revenue,
    net_revenue,
    tax,
    fees,
    refunds,
    transaction_id,
    invoice_keys,
    loaded_at AS source_updated_at
  FROM ${reportingTable(config, "fact_campspot_reservation")}
  WHERE property_identifier = ${sqlString(requireCampspotPropertyId(config))}
    AND NULLIF(confirmation_id, '') IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY property_identifier, confirmation_id
    ORDER BY loaded_at DESC, source_file DESC, insert_id DESC
  ) = 1
),
origin_rows AS (
  SELECT *
  FROM ${reportingTable(config, "fact_campspot_reservation_origination")}
  WHERE property_identifier = ${sqlString(requireCampspotPropertyId(config))}
    AND NULLIF(confirmation_id, '') IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY
      property_identifier,
      confirmation_id,
      COALESCE(site, ''),
      COALESCE(arrival_date, DATE '1900-01-01'),
      COALESCE(departure_date, DATE '1900-01-01')
    ORDER BY loaded_at DESC, source_file DESC, insert_id DESC
  ) = 1
),
originated AS (
  SELECT
    property_identifier,
    confirmation_id,
    MIN(origination_date) AS booking_date,
    MIN(arrival_date) AS arrival_date,
    MAX(departure_date) AS departure_date,
    ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT NULLIF(reservation_status, '') IGNORE NULLS ORDER BY NULLIF(reservation_status, '')),
      '; '
    ) AS reservation_status,
    ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT NULLIF(reservation_source, '') IGNORE NULLS ORDER BY NULLIF(reservation_source, '')),
      '; '
    ) AS reservation_source,
    ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT NULLIF(site_category, '') IGNORE NULLS ORDER BY NULLIF(site_category, '')),
      '; '
    ) AS site_category,
    ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT NULLIF(site_type, '') IGNORE NULLS ORDER BY NULLIF(site_type, '')),
      '; '
    ) AS site_type,
    ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT NULLIF(site, '') IGNORE NULLS ORDER BY NULLIF(site, '')),
      '; '
    ) AS site,
    IF(
      COUNT(DISTINCT inventory_class) = 1,
      ANY_VALUE(inventory_class),
      'unknown'
    ) AS inventory_class,
    ARRAY_TO_STRING(
      ARRAY_AGG(DISTINCT inventory_match_rule ORDER BY inventory_match_rule),
      '; '
    ) AS inventory_match_rule,
    SUM(
      COALESCE(site_rent, 0) + COALESCE(discount, 0) + COALESCE(tax, 0)
      + COALESCE(occupancy_fee, 0) + COALESCE(locked_site_fee, 0)
      + COALESCE(pet_fee, 0) + COALESCE(reservation_surcharge, 0)
      + COALESCE(cancellation_fee, 0)
    ) AS gross_revenue,
    SUM(
      COALESCE(site_rent, 0) + COALESCE(discount, 0)
      + COALESCE(occupancy_fee, 0) + COALESCE(locked_site_fee, 0)
      + COALESCE(pet_fee, 0) + COALESCE(reservation_surcharge, 0)
      + COALESCE(cancellation_fee, 0)
    ) AS net_revenue,
    SUM(COALESCE(tax, 0)) AS tax,
    SUM(
      COALESCE(occupancy_fee, 0) + COALESCE(locked_site_fee, 0)
      + COALESCE(pet_fee, 0) + COALESCE(reservation_surcharge, 0)
      + COALESCE(cancellation_fee, 0)
    ) AS fees,
    CAST(NULL AS FLOAT64) AS refunds,
    confirmation_id AS transaction_id,
    '' AS invoice_keys,
    MAX(loaded_at) AS source_updated_at
  FROM origin_rows
  GROUP BY property_identifier, confirmation_id
)
SELECT * FROM confirmed
UNION ALL
SELECT originated.*
FROM originated
WHERE NOT EXISTS (
  SELECT 1 FROM confirmed
  WHERE confirmed.property_identifier = originated.property_identifier
    AND confirmed.confirmation_id = originated.confirmation_id
)`;

const canonicalCancellationsSql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "v_campspot_cancellation_canonical"
)} AS
SELECT
  property_identifier,
  confirmation_id,
  arrival_date,
  departure_date,
  booking_date,
  cancellation_date,
  site_category,
  site_type,
  site,
  inventory_class,
  inventory_match_rule,
  cancellation_fee,
  reservation_charges,
  fees,
  discount,
  tax,
  loaded_at AS source_updated_at
FROM ${reportingTable(config, "fact_campspot_cancellation")}
WHERE property_identifier = ${sqlString(requireCampspotPropertyId(config))}
  AND NULLIF(confirmation_id, '') IS NOT NULL
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY property_identifier, confirmation_id
  ORDER BY loaded_at DESC, source_file DESC, insert_id DESC
) = 1`;

const canonicalRefundsSql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "v_campspot_refund_canonical"
)} AS
SELECT
  property_identifier,
  reservation_key,
  reservation_status,
  refund_date,
  refund_type,
  amount,
  loaded_at AS source_updated_at
FROM ${reportingTable(config, "fact_campspot_refund")}
WHERE property_identifier = ${sqlString(requireCampspotPropertyId(config))}
  AND NULLIF(reservation_key, '') IS NOT NULL
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY property_identifier, reservation_key, refund_date, refund_type, amount
  ORDER BY loaded_at DESC, source_file DESC, insert_id DESC
) = 1`;

const canonicalSiteDaySql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "v_campspot_site_day_canonical"
)} AS
SELECT
  property_identifier,
  category,
  site_type,
  site,
  inventory_class,
  inventory_match_rule,
  date,
  total_site_income,
  discounts,
  total_reservation_income,
  unavailable,
  loaded_at AS source_updated_at
FROM ${reportingTable(config, "fact_campspot_site_day")}
WHERE property_identifier = ${sqlString(requireCampspotPropertyId(config))}
  AND date IS NOT NULL
  AND NULLIF(site, '') IS NOT NULL
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY property_identifier, date, site
  ORDER BY loaded_at DESC, source_file DESC, insert_id DESC
) = 1`;

const ga4EventsWildcard = (config) => {
  const dataset = requireGa4Dataset(config);
  return `\`${config.projectId}.${dataset}.events_*\``;
};

const ga4FactsSql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(config, "v_ga4_event_facts")} AS
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS date,
  event_timestamp,
  event_name,
  user_pseudo_id,
  CONCAT(
    COALESCE(user_pseudo_id, 'anonymous'), ':',
    COALESCE(
      CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING),
      CAST(event_timestamp AS STRING)
    )
  ) AS session_key,
  COALESCE(
    collected_traffic_source.manual_source,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source'),
    traffic_source.source,
    '(direct)'
  ) AS source,
  COALESCE(
    collected_traffic_source.manual_medium,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'medium'),
    traffic_source.medium,
    '(none)'
  ) AS medium,
  COALESCE(device.category, 'unknown') AS device_category,
  REGEXP_REPLACE(
    COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'),
      ''
    ),
    r'[?#].*$',
    ''
  ) AS page_location,
  COALESCE(
    ecommerce.transaction_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id'),
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'transaction_id') AS STRING)
  ) AS transaction_id,
  COALESCE(
    ecommerce.purchase_revenue,
    (SELECT value.double_value FROM UNNEST(event_params) WHERE key = 'value'),
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'value') AS FLOAT64),
    0
  ) AS event_value,
  COALESCE(
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'session_engaged') = 1,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_engaged') = '1',
    FALSE
  ) AS is_engaged,
  TIMESTAMP_MICROS(event_timestamp) AS source_updated_at
FROM ${ga4EventsWildcard(config)}
WHERE NOT STARTS_WITH(_TABLE_SUFFIX, 'intraday_')`;

const ga4DailySql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "mart_dashboard_ga4_daily"
)} AS
WITH session_dimensions AS (
  SELECT
    session_key,
    MIN(date) AS date,
    ARRAY_AGG(source ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS source,
    ARRAY_AGG(medium ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS medium,
    ARRAY_AGG(device_category ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS device_category,
    COALESCE(
      ARRAY_AGG(NULLIF(page_location, '') IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)],
      '/'
    ) AS landing_page,
    LOGICAL_OR(is_engaged) AS is_engaged
  FROM ${reportingTable(config, "v_ga4_event_facts")}
  GROUP BY session_key
),
daily AS (
  SELECT
    dimensions.date,
    dimensions.source,
    dimensions.medium,
    dimensions.device_category,
    dimensions.landing_page,
    COUNT(DISTINCT events.user_pseudo_id) AS users,
    COUNT(DISTINCT events.session_key) AS sessions,
    COUNT(DISTINCT IF(dimensions.is_engaged, events.session_key, NULL)) AS engaged_sessions,
    COUNTIF(events.event_name = 'page_view') AS page_views,
    COUNTIF(events.event_name IN ('booking_click', 'reserve_click', 'campspot_booking_click')) AS booking_clicks,
    COUNTIF(events.event_name IN ('begin_checkout', 'checkout_start')) AS checkout_starts,
    COUNTIF(events.event_name = 'purchase') AS purchases,
    SUM(IF(events.event_name = 'purchase', events.event_value, 0)) AS purchase_revenue,
    MAX(events.source_updated_at) AS source_updated_at
  FROM session_dimensions dimensions
  JOIN ${reportingTable(config, "v_ga4_event_facts")} events USING (session_key)
  GROUP BY date, source, medium, device_category, landing_page
),
purchases AS (
  SELECT
    dimensions.date,
    dimensions.source,
    dimensions.medium,
    dimensions.device_category,
    dimensions.landing_page,
    facts.transaction_id,
    facts.event_value,
    facts.source_updated_at
  FROM ${reportingTable(config, "v_ga4_event_facts")} facts
  JOIN session_dimensions dimensions USING (session_key)
  WHERE facts.event_name = 'purchase'
    AND NULLIF(TRIM(facts.transaction_id), '') IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY facts.transaction_id
    ORDER BY facts.event_timestamp DESC
  ) = 1
),
matched AS (
  SELECT
    purchases.date,
    purchases.source,
    purchases.medium,
    purchases.device_category,
    purchases.landing_page,
    COUNTIF(bookings.confirmation_id IS NOT NULL) AS matched_bookings,
    SUM(IF(bookings.confirmation_id IS NOT NULL, COALESCE(bookings.net_revenue, 0), 0)) AS matched_revenue
  FROM purchases
  LEFT JOIN ${reportingTable(
    config,
    "v_campspot_reservation_canonical"
  )} bookings
    ON TRIM(purchases.transaction_id) = TRIM(bookings.transaction_id)
  GROUP BY date, source, medium, device_category, landing_page
)
SELECT
  daily.date,
  daily.source,
  daily.medium,
  daily.device_category,
  daily.landing_page,
  daily.users,
  daily.sessions,
  daily.engaged_sessions,
  daily.page_views,
  daily.booking_clicks,
  daily.checkout_starts,
  daily.purchases,
  daily.purchase_revenue,
  COALESCE(matched.matched_bookings, 0) AS matched_bookings,
  COALESCE(matched.matched_revenue, 0) AS matched_revenue,
  daily.source_updated_at
FROM daily
LEFT JOIN matched
USING (date, source, medium, device_category, landing_page)`;

const searchConsoleDailySql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "mart_dashboard_search_console_daily"
)} AS
WITH export_freshness AS (
  SELECT MAX(publish_time) AS source_updated_at
  FROM ${searchConsoleTable(config, "ExportLog")}
  WHERE REGEXP_CONTAINS(LOWER(COALESCE(namespace, '')), r'url_impression')
)
SELECT
  source.data_date AS date,
  IF(source.is_anonymized_query, '(anonymized)', COALESCE(NULLIF(source.query, ''), '(not provided)')) AS query,
  REGEXP_REPLACE(COALESCE(source.url, ''), r'[?#].*$', '') AS page,
  COALESCE(NULLIF(source.device, ''), 'UNKNOWN') AS device,
  SUM(source.clicks) AS clicks,
  SUM(source.impressions) AS impressions,
  SAFE_DIVIDE(SUM(source.clicks), SUM(source.impressions)) AS ctr,
  SAFE_DIVIDE(SUM(source.sum_top_position), SUM(source.impressions)) + 1 AS average_position,
  ANY_VALUE(export_freshness.source_updated_at) AS source_updated_at
FROM ${searchConsoleTable(config, "searchdata_url_impression")} source
CROSS JOIN export_freshness
GROUP BY date, query, page, device`;

const leadTimeBandSql = (bookingDate, arrivalDate) => `CASE
  WHEN ${bookingDate} IS NULL OR ${arrivalDate} IS NULL THEN 'unknown'
  WHEN DATE_DIFF(${arrivalDate}, ${bookingDate}, DAY) < 0 THEN 'invalid'
  WHEN DATE_DIFF(${arrivalDate}, ${bookingDate}, DAY) <= 7 THEN '0-7 days'
  WHEN DATE_DIFF(${arrivalDate}, ${bookingDate}, DAY) <= 30 THEN '8-30 days'
  WHEN DATE_DIFF(${arrivalDate}, ${bookingDate}, DAY) <= 90 THEN '31-90 days'
  WHEN DATE_DIFF(${arrivalDate}, ${bookingDate}, DAY) <= 180 THEN '91-180 days'
  ELSE '181+ days'
END`;

const stayLengthBandSql = (arrivalDate, departureDate) => `CASE
  WHEN ${arrivalDate} IS NULL OR ${departureDate} IS NULL THEN 'unknown'
  WHEN DATE_DIFF(${departureDate}, ${arrivalDate}, DAY) <= 0 THEN 'invalid'
  WHEN DATE_DIFF(${departureDate}, ${arrivalDate}, DAY) = 1 THEN '1 night'
  WHEN DATE_DIFF(${departureDate}, ${arrivalDate}, DAY) <= 3 THEN '2-3 nights'
  WHEN DATE_DIFF(${departureDate}, ${arrivalDate}, DAY) <= 6 THEN '4-6 nights'
  WHEN DATE_DIFF(${departureDate}, ${arrivalDate}, DAY) <= 13 THEN '7-13 nights'
  ELSE '14+ nights'
END`;

const campspotDailySql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "mart_dashboard_campspot_daily"
)} AS
WITH booking_rows AS (
  SELECT
    COALESCE(arrival_date, booking_date) AS date,
    inventory_class,
    site,
    site_type,
    COALESCE(NULLIF(reservation_status, ''), 'unknown') AS status,
    ${leadTimeBandSql("booking_date", "arrival_date")} AS lead_time_band,
    ${stayLengthBandSql("arrival_date", "departure_date")} AS stay_length_band,
    1 AS reservations,
    0 AS cancellations,
    0 AS occupied_site_nights,
    0 AS available_site_nights,
    COALESCE(gross_revenue, 0) AS gross_revenue,
    0.0 AS refunds,
    COALESCE(net_revenue, 0) AS net_revenue,
    source_updated_at
  FROM ${reportingTable(config, "v_campspot_reservation_canonical")}
  WHERE inventory_class IN ('campground', 'vintage_trailer')
    AND COALESCE(arrival_date, booking_date) IS NOT NULL
),
cancellation_rows AS (
  SELECT
    cancellation_date AS date,
    inventory_class,
    site,
    site_type,
    'cancelled' AS status,
    ${leadTimeBandSql("booking_date", "arrival_date")} AS lead_time_band,
    ${stayLengthBandSql("arrival_date", "departure_date")} AS stay_length_band,
    0 AS reservations,
    1 AS cancellations,
    0 AS occupied_site_nights,
    0 AS available_site_nights,
    0.0 AS gross_revenue,
    0.0 AS refunds,
    0.0 AS net_revenue,
    source_updated_at
  FROM ${reportingTable(config, "v_campspot_cancellation_canonical")}
  WHERE inventory_class IN ('campground', 'vintage_trailer')
    AND cancellation_date IS NOT NULL
),
refund_rows AS (
  SELECT
    refunds.refund_date AS date,
    bookings.inventory_class,
    bookings.site,
    bookings.site_type,
    COALESCE(NULLIF(refunds.reservation_status, ''), 'refunded') AS status,
    ${leadTimeBandSql("bookings.booking_date", "bookings.arrival_date")} AS lead_time_band,
    ${stayLengthBandSql("bookings.arrival_date", "bookings.departure_date")} AS stay_length_band,
    0 AS reservations,
    0 AS cancellations,
    0 AS occupied_site_nights,
    0 AS available_site_nights,
    0.0 AS gross_revenue,
    ABS(COALESCE(refunds.amount, 0)) AS refunds,
    -ABS(COALESCE(refunds.amount, 0)) AS net_revenue,
    refunds.source_updated_at
  FROM ${reportingTable(config, "v_campspot_refund_canonical")} refunds
  JOIN ${reportingTable(config, "v_campspot_reservation_canonical")} bookings
    ON refunds.reservation_key = TO_HEX(SHA256(bookings.confirmation_id))
      OR STRPOS(
        COALESCE(bookings.invoice_keys, ''),
        CONCAT(';', refunds.reservation_key, ';')
      ) > 0
  WHERE bookings.inventory_class IN ('campground', 'vintage_trailer')
    AND refunds.refund_date IS NOT NULL
),
occupancy_rows AS (
  SELECT
    date,
    inventory_class,
    site,
    site_type,
    '' AS status,
    '' AS lead_time_band,
    '' AS stay_length_band,
    0 AS reservations,
    0 AS cancellations,
    IF(
      COALESCE(total_site_income, 0) != 0
        OR COALESCE(total_reservation_income, 0) != 0,
      1,
      0
    ) AS occupied_site_nights,
    IF(
      COALESCE(unavailable, FALSE)
        AND COALESCE(total_site_income, 0) = 0
        AND COALESCE(total_reservation_income, 0) = 0,
      0,
      1
    ) AS available_site_nights,
    0.0 AS gross_revenue,
    0.0 AS refunds,
    0.0 AS net_revenue,
    source_updated_at
  FROM ${reportingTable(config, "v_campspot_site_day_canonical")}
  WHERE inventory_class IN ('campground', 'vintage_trailer')
),
events AS (
  SELECT * FROM booking_rows
  UNION ALL SELECT * FROM cancellation_rows
  UNION ALL SELECT * FROM refund_rows
  UNION ALL SELECT * FROM occupancy_rows
)
SELECT
  date,
  inventory_class,
  FORMAT_DATE('%Y', date) AS season,
  COALESCE(site, '') AS site,
  COALESCE(site_type, '') AS site_type,
  status,
  lead_time_band,
  stay_length_band,
  SUM(reservations) AS reservations,
  SUM(cancellations) AS cancellations,
  SUM(occupied_site_nights) AS occupied_site_nights,
  SUM(available_site_nights) AS available_site_nights,
  SUM(gross_revenue) AS gross_revenue,
  SUM(refunds) AS refunds,
  SUM(net_revenue) AS net_revenue,
  MAX(source_updated_at) AS source_updated_at
FROM events
GROUP BY
  date, inventory_class, season, site, site_type, status, lead_time_band, stay_length_band`;

const bookingPaceViewSql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "mart_dashboard_booking_pace"
)} AS
SELECT
  snapshot_date,
  snapshot_kind,
  stay_date,
  inventory_class,
  site,
  site_type,
  SUM(available_site_nights) AS available_site_nights,
  SUM(booked_site_nights) AS booked_site_nights,
  SUM(reservations) AS reservations,
  SUM(booked_revenue) AS booked_revenue,
  MAX(COALESCE(source_updated_at, snapshot_at)) AS source_updated_at
FROM ${reportingTable(config, "fact_dashboard_booking_pace_snapshot")}
WHERE snapshot_kind = 'observed'
  AND inventory_class IN ('campground', 'vintage_trailer')
GROUP BY snapshot_date, snapshot_kind, stay_date, inventory_class, site, site_type`;

const dataHealthSql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "mart_dashboard_data_health"
)} AS
WITH sources AS (
  SELECT
    'ga4' AS source,
    MAX(source_updated_at) AS last_record_at,
    COUNT(*) AS records_loaded,
    60 AS maximum_lag_hours
  FROM ${reportingTable(config, "mart_dashboard_ga4_daily")}
  UNION ALL
  SELECT
    'search_console',
    MAX(COALESCE(source_updated_at, TIMESTAMP(date, '${config.timeZone}'))),
    COUNT(*),
    96
  FROM ${reportingTable(config, "mart_dashboard_search_console_daily")}
  UNION ALL
  SELECT
    'campspot',
    MAX(loaded_at),
    COUNT(*),
    36
  FROM ${reportingTable(config, "fact_campspot_ingest_file")}
  UNION ALL
  SELECT
    'booking_pace',
    MAX(IF(snapshot_kind = 'observed', snapshot_at, NULL)),
    COUNTIF(snapshot_kind = 'observed'),
    25
  FROM ${reportingTable(config, "fact_dashboard_booking_pace_snapshot")}
),
measured AS (
  SELECT
    *,
    IF(
      last_record_at IS NULL,
      CAST(NULL AS INT64),
      TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_record_at, HOUR)
    ) AS lag_hours
  FROM sources
)
SELECT
  source,
  CASE
    WHEN records_loaded = 0 OR last_record_at IS NULL THEN 'missing'
    WHEN lag_hours > maximum_lag_hours * 2 THEN 'stale'
    WHEN lag_hours > maximum_lag_hours THEN 'warning'
    ELSE 'fresh'
  END AS status,
  last_record_at,
  CURRENT_TIMESTAMP() AS checked_at,
  lag_hours,
  records_loaded,
  IF(
    records_loaded = 0 OR last_record_at IS NULL OR lag_hours > maximum_lag_hours,
    1,
    0
  ) AS issue_count,
  CASE
    WHEN records_loaded = 0 OR last_record_at IS NULL
      THEN CONCAT(source, ' has no loaded records yet.')
    WHEN lag_hours > maximum_lag_hours * 2
      THEN CONCAT(source, ' is stale by ', CAST(lag_hours AS STRING), ' hours.')
    WHEN lag_hours > maximum_lag_hours
      THEN CONCAT(source, ' is later than its expected refresh window.')
    ELSE CONCAT(source, ' is current.')
  END AS message
FROM measured`;

const dataQualitySql = (config) => `
CREATE OR REPLACE VIEW ${reportingTable(
  config,
  "mart_dashboard_data_quality"
)} AS
WITH unknown_inventory AS (
  SELECT COUNT(*) AS issue_count
  FROM (
    SELECT inventory_class FROM ${reportingTable(config, "fact_campspot_reservation")}
    UNION ALL
    SELECT inventory_class FROM ${reportingTable(config, "fact_campspot_reservation_origination")}
    UNION ALL
    SELECT inventory_class FROM ${reportingTable(config, "fact_campspot_reservation_day")}
    UNION ALL
    SELECT inventory_class FROM ${reportingTable(config, "fact_campspot_site_day")}
    UNION ALL
    SELECT inventory_class FROM ${reportingTable(config, "fact_campspot_cancellation")}
  )
  WHERE inventory_class = 'unknown'
),
duplicate_content AS (
  SELECT COUNT(*) AS issue_count
  FROM (
    SELECT content_sha256
    FROM ${reportingTable(config, "fact_campspot_ingest_file")}
    GROUP BY content_sha256
    HAVING COUNT(*) > 1
  )
),
property_scope AS (
  SELECT
    COALESCE(SUM(accepted_source_row_count), 0) AS accepted_rows,
    COALESCE(SUM(excluded_source_row_count), 0) AS excluded_rows
  FROM ${reportingTable(config, "fact_campspot_ingest_file")}
),
wrong_property_stored AS (
  SELECT COUNT(*) AS issue_count
  FROM (
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_reservation")}
    UNION ALL
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_reservation_origination")}
    UNION ALL
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_reservation_day")}
    UNION ALL
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_site_day")}
    UNION ALL
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_occupancy_daily")}
    UNION ALL
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_cancellation")}
    UNION ALL
    SELECT property_identifier FROM ${reportingTable(config, "fact_campspot_refund")}
  )
  WHERE property_identifier != ${sqlString(requireCampspotPropertyId(config))}
),
ga4_purchases AS (
  SELECT
    COUNT(DISTINCT transaction_id) AS purchases,
    COUNT(DISTINCT IF(bookings.confirmation_id IS NULL, transaction_id, NULL)) AS unmatched
  FROM ${reportingTable(config, "v_ga4_event_facts")} ga4
  LEFT JOIN ${reportingTable(config, "v_campspot_reservation_canonical")} bookings
    ON TRIM(ga4.transaction_id) = TRIM(bookings.transaction_id)
  WHERE ga4.event_name = 'purchase'
    AND NULLIF(TRIM(ga4.transaction_id), '') IS NOT NULL
    AND ga4.date >= DATE_SUB(CURRENT_DATE('${config.timeZone}'), INTERVAL 30 DAY)
),
unmatched_refunds AS (
  SELECT COUNTIF(bookings.confirmation_id IS NULL) AS issue_count
  FROM ${reportingTable(config, "v_campspot_refund_canonical")} refunds
  LEFT JOIN ${reportingTable(config, "v_campspot_reservation_canonical")} bookings
    ON refunds.reservation_key = TO_HEX(SHA256(bookings.confirmation_id))
      OR STRPOS(
        COALESCE(bookings.invoice_keys, ''),
        CONCAT(';', refunds.reservation_key, ';')
      ) > 0
  WHERE refunds.refund_date >= DATE_SUB(
    CURRENT_DATE('${config.timeZone}'),
    INTERVAL 365 DAY
  )
),
failed_pipeline AS (
  SELECT COUNTIF(status = 'failed') AS issue_count
  FROM ${reportingTable(config, "fact_dashboard_pipeline_run")}
  WHERE started_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
),
overbooked AS (
  SELECT COUNTIF(booked_site_nights > available_site_nights) AS issue_count
  FROM ${reportingTable(config, "mart_dashboard_booking_pace")}
  WHERE snapshot_kind = 'observed'
    AND snapshot_date >= DATE_SUB(CURRENT_DATE('${config.timeZone}'), INTERVAL 30 DAY)
)
SELECT
  'unknown_inventory' AS issue_key,
  'inventory' AS category,
  'error' AS severity,
  IF(issue_count = 0, 'pass', 'fail') AS status,
  CAST(issue_count AS FLOAT64) AS metric_value,
  0.0 AS threshold_value,
  CONCAT(CAST(issue_count AS STRING), ' Campspot row(s) have unmapped or conflicting inventory.') AS message,
  CURRENT_TIMESTAMP() AS checked_at
FROM unknown_inventory
UNION ALL
SELECT
  'duplicate_campspot_content', 'ingestion', 'error',
  IF(issue_count = 0, 'pass', 'fail'), CAST(issue_count AS FLOAT64), 0.0,
  CONCAT(CAST(issue_count AS STRING), ' duplicate Campspot content hash group(s).'),
  CURRENT_TIMESTAMP()
FROM duplicate_content
UNION ALL
SELECT
  'campspot_property_rows_excluded', 'ingestion', 'warning',
  IF(excluded_rows = 0, 'pass', 'warn'), CAST(excluded_rows AS FLOAT64), 0.0,
  CONCAT(
    CAST(accepted_rows AS STRING), ' Campspot source row(s) accepted and ',
    CAST(excluded_rows AS STRING), ' exact other-property row(s) excluded.'
  ),
  CURRENT_TIMESTAMP()
FROM property_scope
UNION ALL
SELECT
  'campspot_wrong_property_stored', 'isolation', 'error',
  IF(issue_count = 0, 'pass', 'fail'), CAST(issue_count AS FLOAT64), 0.0,
  CONCAT(CAST(issue_count AS STRING), ' non-Brad Campspot row(s) reached private reporting tables.'),
  CURRENT_TIMESTAMP()
FROM wrong_property_stored
UNION ALL
SELECT
  'ga4_transaction_match_rate', 'attribution', 'warning',
  IF(purchases = 0 OR SAFE_DIVIDE(unmatched, purchases) <= 0.2, 'pass', 'warn'),
  SAFE_DIVIDE(purchases - unmatched, purchases), 0.8,
  CONCAT(
    CAST(purchases - unmatched AS STRING), ' of ', CAST(purchases AS STRING),
    ' GA4 transaction IDs matched Campspot confirmations in the last 30 days.'
  ),
  CURRENT_TIMESTAMP()
FROM ga4_purchases
UNION ALL
SELECT
  'unmatched_campspot_refunds', 'attribution', 'warning',
  IF(issue_count = 0, 'pass', 'warn'), CAST(issue_count AS FLOAT64), 0.0,
  CONCAT(
    CAST(issue_count AS STRING),
    ' refund row(s) could not be linked to a confirmation or hashed invoice in the last year.'
  ),
  CURRENT_TIMESTAMP()
FROM unmatched_refunds
UNION ALL
SELECT
  'failed_pipeline_runs_7d', 'pipeline', 'error',
  IF(issue_count = 0, 'pass', 'fail'), CAST(issue_count AS FLOAT64), 0.0,
  CONCAT(CAST(issue_count AS STRING), ' failed dashboard pipeline run(s) in seven days.'),
  CURRENT_TIMESTAMP()
FROM failed_pipeline
UNION ALL
SELECT
  'booking_pace_overbooked_site_days', 'inventory', 'error',
  IF(issue_count = 0, 'pass', 'fail'), CAST(issue_count AS FLOAT64), 0.0,
  CONCAT(CAST(issue_count AS STRING), ' overbooked observed site-day snapshot(s).'),
  CURRENT_TIMESTAMP()
FROM overbooked`;

export const dashboardViewSql = (config) => [
  canonicalReservationsSql(config),
  canonicalCancellationsSql(config),
  canonicalRefundsSql(config),
  canonicalSiteDaySql(config),
  ga4FactsSql(config),
  ga4DailySql(config),
  searchConsoleDailySql(config),
  campspotDailySql(config),
  bookingPaceViewSql(config),
  dataHealthSql(config),
  dataQualitySql(config),
];

export const snapshotSql = (
  config,
  { snapshotDate, snapshotKind = "observed", horizonDays = 395 }
) => `
BEGIN TRANSACTION;

DELETE FROM ${reportingTable(config, "fact_dashboard_booking_pace_snapshot")}
WHERE snapshot_date = DATE ${sqlString(snapshotDate)};

INSERT INTO ${reportingTable(config, "fact_dashboard_booking_pace_snapshot")} (
  snapshot_date,
  snapshot_at,
  snapshot_kind,
  stay_date,
  inventory_class,
  site,
  site_type,
  available_site_nights,
  booked_site_nights,
  reservations,
  booked_revenue,
  source_updated_at
)
WITH latest_reservation_days AS (
  SELECT *
  FROM ${reportingTable(config, "fact_campspot_reservation_day")}
  WHERE property_identifier = ${sqlString(requireCampspotPropertyId(config))}
    AND stay_date BETWEEN DATE ${sqlString(snapshotDate)}
    AND DATE_ADD(DATE ${sqlString(snapshotDate)}, INTERVAL ${Number(
      horizonDays
    )} DAY)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY confirmation_id, stay_date, site
    ORDER BY loaded_at DESC, source_file DESC, insert_id DESC
  ) = 1
),
reservation_days AS (
  SELECT
    stay_date,
    site,
    COUNT(DISTINCT confirmation_id) AS reservations
  FROM latest_reservation_days
  GROUP BY stay_date, site
)
SELECT
  DATE ${sqlString(snapshotDate)} AS snapshot_date,
  CURRENT_TIMESTAMP() AS snapshot_at,
  ${sqlString(snapshotKind)} AS snapshot_kind,
  inventory.date AS stay_date,
  inventory.inventory_class,
  inventory.site,
  inventory.site_type,
  IF(
    COALESCE(inventory.unavailable, FALSE)
      AND COALESCE(inventory.total_site_income, 0) = 0
      AND COALESCE(inventory.total_reservation_income, 0) = 0,
    0,
    1
  ) AS available_site_nights,
  IF(
    COALESCE(inventory.total_site_income, 0) != 0
      OR COALESCE(inventory.total_reservation_income, 0) != 0,
    1,
    0
  ) AS booked_site_nights,
  COALESCE(reservations.reservations, 0) AS reservations,
  COALESCE(
    inventory.total_reservation_income,
    inventory.total_site_income,
    0
  ) AS booked_revenue,
  inventory.source_updated_at
FROM ${reportingTable(config, "v_campspot_site_day_canonical")} inventory
LEFT JOIN reservation_days reservations
  ON reservations.stay_date = inventory.date
  AND reservations.site = inventory.site
WHERE inventory.inventory_class IN ('campground', 'vintage_trailer')
  AND inventory.date BETWEEN DATE ${sqlString(snapshotDate)}
    AND DATE_ADD(DATE ${sqlString(snapshotDate)}, INTERVAL ${Number(
      horizonDays
    )} DAY);

COMMIT TRANSACTION;`;

export const inspectSql = (config) => `
SELECT
  table_name,
  table_type,
  creation_time,
  ddl
FROM \`${config.projectId}.${config.datasetId}.INFORMATION_SCHEMA.TABLES\`
WHERE table_name IN (${[...DASHBOARD_TABLES, ...DASHBOARD_VIEWS]
  .map(sqlString)
  .join(", ")})
ORDER BY table_type, table_name`;

export const validationSql = (config) => `
SELECT
  CONCAT('freshness_', source) AS check_key,
  IF(status = 'fresh', 'pass', IF(status = 'warning', 'warn', 'fail')) AS status,
  message
FROM ${reportingTable(config, "mart_dashboard_data_health")}
UNION ALL
SELECT
  issue_key AS check_key,
  status,
  message
FROM ${reportingTable(config, "mart_dashboard_data_quality")}
ORDER BY check_key`;

const tokenPath = () =>
  process.env.BRADS_BIGQUERY_TOKEN_PATH ||
  path.join(
    os.homedir(),
    ".config",
    "bradsdadsland-dashboard",
    "bradsdadsland-bigquery-oauth.json"
  );

const readRestToken = async () => {
  if (process.env.BRADS_BIGQUERY_ACCESS_TOKEN) {
    return process.env.BRADS_BIGQUERY_ACCESS_TOKEN;
  }
  const filePath = tokenPath();
  if (!fs.existsSync(filePath)) return null;
  const token = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (
    token.access_token &&
    Number(token.expiry_date || 0) > Date.now() + 60_000
  ) {
    return token.access_token;
  }
  if (!token.refresh_token || !token.client_id || !token.client_secret) {
    return token.access_token || null;
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
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`Could not refresh the BigQuery token (${response.status}).`);
  }
  const updated = {
    ...token,
    access_token: payload.access_token,
    expiry_date: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, {
    mode: 0o600,
  });
  return updated.access_token;
};

const decodeValue = (field, raw) => {
  if (raw === null || raw === undefined) return null;
  if (["INT64", "INTEGER"].includes(field.type)) return Number(raw);
  if (["FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"].includes(field.type)) {
    return Number(raw);
  }
  if (["BOOL", "BOOLEAN"].includes(field.type)) return raw === true || raw === "true";
  return raw;
};

const decodeRows = (schema, rows = []) =>
  rows.map((row) =>
    Object.fromEntries(
      (schema?.fields || []).map((field, index) => [
        field.name,
        decodeValue(field, row.f?.[index]?.v),
      ])
    )
  );

const bigQueryError = async (response, action) => {
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Preserve the HTTP status below.
  }
  return new Error(
    `${action} failed (${response.status}): ${
      payload.error?.message || response.statusText
    }`
  );
};

const runBigQueryRest = async ({
  config,
  sql,
  accessToken,
  dryRun = false,
  maxRows = 1000,
}) => {
  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(
      config.projectId
    )}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        location: config.location,
        dryRun,
        maxResults: maxRows,
        timeoutMs: dryRun ? 30_000 : 200_000,
      }),
    }
  );
  if (!response.ok) throw await bigQueryError(response, "BigQuery query");
  let payload = await response.json();
  if (dryRun) return [];
  while (payload.jobComplete === false) {
    const jobId = payload.jobReference?.jobId;
    if (!jobId) throw new Error("BigQuery returned an incomplete job without an ID.");
    const poll = new URL(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(
        config.projectId
      )}/queries/${encodeURIComponent(jobId)}`
    );
    poll.searchParams.set("location", config.location);
    poll.searchParams.set("timeoutMs", "200000");
    poll.searchParams.set("maxResults", String(maxRows));
    const pollResponse = await fetch(poll, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!pollResponse.ok) {
      throw await bigQueryError(pollResponse, "BigQuery query polling");
    }
    payload = await pollResponse.json();
  }
  if (payload.errors?.length) {
    throw new Error(
      `BigQuery query failed: ${payload.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }
  return decodeRows(payload.schema, payload.rows || []);
};

const runBqCli = ({ config, sql, dryRun = false, maxRows = 1000 }) => {
  const result = spawnSync(
    "bq",
    [
      `--project_id=${config.projectId}`,
      `--location=${config.location}`,
      "query",
      "--quiet=true",
      "--use_legacy_sql=false",
      `--max_rows=${maxRows}`,
      dryRun ? "--dry_run=true" : "--format=json",
    ],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr || result.stdout || "BigQuery CLI failed").trim()
    );
  }
  if (dryRun || !result.stdout.trim()) return [];
  return JSON.parse(result.stdout);
};

export const runBqQuery = async (options) => {
  const accessToken = await readRestToken();
  if (accessToken) return runBigQueryRest({ ...options, accessToken });
  return runBqCli(options);
};

const pipelineStartSql = (config, { runId, source, jobName, metadata }) => `
INSERT INTO ${reportingTable(config, "fact_dashboard_pipeline_run")} (
  run_id, source, job_name, started_at, status, metadata_json, recorded_at
) VALUES (
  ${sqlString(runId)}, ${sqlString(source)}, ${sqlString(jobName)},
  CURRENT_TIMESTAMP(), 'running', ${sqlString(JSON.stringify(metadata || {}))},
  CURRENT_TIMESTAMP()
)`;

const pipelineFinishSql = (
  config,
  { runId, status, rowsProcessed, sourceThroughDate, errorSummary }
) => `
UPDATE ${reportingTable(config, "fact_dashboard_pipeline_run")}
SET
  completed_at = CURRENT_TIMESTAMP(),
  status = ${sqlString(status)},
  rows_processed = ${
    rowsProcessed === null || rowsProcessed === undefined
      ? "NULL"
      : Math.max(0, Number(rowsProcessed) || 0)
  },
  source_through_date = ${
    sourceThroughDate ? `DATE ${sqlString(sourceThroughDate)}` : "NULL"
  },
  error_summary = ${
    errorSummary ? sqlString(String(errorSummary).slice(0, 2000)) : "NULL"
  },
  recorded_at = CURRENT_TIMESTAMP()
WHERE run_id = ${sqlString(runId)}`;

export const startDashboardPipelineRun = async ({
  source,
  jobName,
  metadata = {},
  config = getDashboardConfig(),
}) => {
  const runId = crypto.randomUUID();
  await runBqQuery({
    config,
    sql: pipelineStartSql(config, { runId, source, jobName, metadata }),
  });
  return { runId, config };
};

export const finishDashboardPipelineRun = async ({
  runId,
  status,
  rowsProcessed = null,
  sourceThroughDate = null,
  errorSummary = "",
  config = getDashboardConfig(),
}) => {
  if (!runId) throw new Error("Pipeline run ID is required.");
  if (!["succeeded", "failed"].includes(status)) {
    throw new Error("Pipeline status must be succeeded or failed.");
  }
  await runBqQuery({
    config,
    sql: pipelineFinishSql(config, {
      runId,
      status,
      rowsProcessed,
      sourceThroughDate,
      errorSummary,
    }),
  });
  return { runId, status };
};

const deploy = async ({ config, options }) => {
  requireGa4Dataset(config);
  const statements = [...dashboardTableSql(config), ...dashboardViewSql(config)];
  const dryRun = optionEnabled(options["dry-run"]);
  for (const [index, sql] of statements.entries()) {
    await runBqQuery({ config, sql, dryRun });
    process.stderr.write(
      `${dryRun ? "Validated" : "Deployed"} ${index + 1}/${statements.length}\n`
    );
  }
  return {
    command: "deploy",
    dryRun,
    projectId: config.projectId,
    datasetId: config.datasetId,
    ga4DatasetId: config.ga4DatasetId,
    searchConsoleDatasetId: config.searchConsoleDatasetId,
    tables: DASHBOARD_TABLES,
    views: DASHBOARD_VIEWS,
  };
};

const snapshot = async ({ config, options }) => {
  const today = vancouverDate();
  const snapshotDate = assertIsoDate(options.date || today, "snapshot date");
  if (snapshotDate > today) {
    throw new Error("A booking-pace snapshot cannot be dated in the future.");
  }
  if (snapshotDate < today && !optionEnabled(options["allow-historical"])) {
    throw new Error(
      "Historical snapshots are reconstructions; pass --allow-historical=true to label one explicitly."
    );
  }
  const snapshotKind = snapshotDate === today ? "observed" : "reconstructed";
  const horizonDays = Math.max(
    1,
    Math.min(730, Number.parseInt(options["horizon-days"] || "395", 10))
  );
  const dryRun = optionEnabled(options["dry-run"]);
  const sql = snapshotSql(config, {
    snapshotDate,
    snapshotKind,
    horizonDays,
  });
  if (dryRun) {
    await runBqQuery({ config, sql, dryRun: true });
    return { command: "snapshot", dryRun, snapshotDate, snapshotKind, horizonDays };
  }
  const run = await startDashboardPipelineRun({
    source: "campspot",
    jobName: "dashboard_booking_pace_snapshot",
    metadata: { snapshotDate, snapshotKind, horizonDays },
    config,
  });
  try {
    await runBqQuery({ config, sql });
    await finishDashboardPipelineRun({
      ...run,
      status: "succeeded",
      sourceThroughDate: snapshotDate,
    });
  } catch (error) {
    await finishDashboardPipelineRun({
      ...run,
      status: "failed",
      sourceThroughDate: snapshotDate,
      errorSummary: error.message,
    }).catch(() => {});
    throw error;
  }
  return { command: "snapshot", snapshotDate, snapshotKind, horizonDays };
};

const printSql = ({ config, options }) => {
  const target = options.target || "deploy";
  if (target === "snapshot") {
    const date = assertIsoDate(options.date || vancouverDate());
    return snapshotSql(config, {
      snapshotDate: date,
      snapshotKind: date === vancouverDate() ? "observed" : "reconstructed",
      horizonDays: Math.max(1, Number(options["horizon-days"] || 395)),
    });
  }
  if (target === "inspect") return inspectSql(config);
  if (target === "validate") {
    requireGa4Dataset(config);
    return validationSql(config);
  }
  if (target !== "deploy") throw new Error(`Unknown SQL target: ${target}`);
  requireGa4Dataset(config);
  return [...dashboardTableSql(config), ...dashboardViewSql(config)].join(
    ";\n\n"
  );
};

export const main = async (argv = process.argv.slice(2)) => {
  const [command = "", ...rest] = argv;
  if (!COMMANDS.has(command)) {
    throw new Error(
      "Usage: node scripts/dashboard-reporting.mjs <deploy|snapshot|inspect|validate|print-sql> " +
        "[--ga4-dataset=analytics_<property-id>] [--dry-run=true]. " +
        "Project, reporting dataset, Search Console dataset, and location are fixed to Brad's resources."
    );
  }
  const options = parseArgs(rest);
  const config = getDashboardConfig(options);
  if (command === "deploy") return deploy({ config, options });
  if (command === "snapshot") return snapshot({ config, options });
  if (command === "inspect") {
    return runBqQuery({
      config,
      sql: inspectSql(config),
      dryRun: optionEnabled(options["dry-run"]),
    });
  }
  if (command === "validate") {
    requireGa4Dataset(config);
    const dryRun = optionEnabled(options["dry-run"]);
    const rows = await runBqQuery({
      config,
      sql: validationSql(config),
      dryRun,
    });
    if (
      !dryRun &&
      Array.isArray(rows) &&
      rows.some((row) => row.status === "fail")
    ) {
      process.exitCode = 1;
    }
    return rows;
  }
  return printSql({ config, options });
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
