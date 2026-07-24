import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_SERVING_VIEWS,
  dashboardTableSql,
  dashboardViewSql,
  snapshotSql,
} from "../scripts/dashboard-reporting.mjs";
import {
  SERVING_VIEW_COLUMNS,
  reconcileAuthorizedViewAccess,
  servingViewSql,
} from "../scripts/dashboard-serving.mjs";
import { getDashboardConfig } from "../scripts/lib/dashboard-config.mjs";

const config = getDashboardConfig({
  "ga4-dataset": "analytics_123456789",
  "park-id": "1514",
});

test("source-first reporting SQL includes only GA4, Search Console, Campspot, and health", () => {
  const sql = [...dashboardTableSql(config), ...dashboardViewSql(config)].join(
    "\n"
  );
  for (const required of [
    "analytics_123456789.events_*",
    "searchconsole_bradsdadsland.searchdata_url_impression",
    "fact_campspot_reservation",
    "mart_dashboard_data_health",
    "mart_dashboard_data_quality",
    "transaction_id",
    "accepted_source_row_count",
    "campspot_property_rows_excluded",
    "campspot_wrong_property_stored",
  ]) {
    assert.match(sql, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(
    sql,
    /google_ads|meta_ads|reddit_ads|brevo|clarity|marketing_cost|roas/i
  );
  assert.match(sql, /property_identifier = '1514'/);
});

test("serving view columns match the stable API contract", () => {
  assert.deepEqual(SERVING_VIEW_COLUMNS.mart_dashboard_ga4_daily, [
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
  ]);
  assert.deepEqual(SERVING_VIEW_COLUMNS.mart_dashboard_campspot_daily, [
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
  ]);
  assert.deepEqual(
    Object.keys(SERVING_VIEW_COLUMNS).sort(),
    [...DASHBOARD_SERVING_VIEWS].sort()
  );
});

test("serving SQL selects explicit privacy-safe columns instead of wildcard rows", () => {
  const sql = servingViewSql(config).join("\n");
  assert.doesNotMatch(sql, /SELECT\s+\*/i);
  assert.doesNotMatch(
    sql,
    /confirmation_id|transaction_id|email|phone|address|guest_name/i
  );
  assert.match(sql, /bradsdadsland_dashboard/);
});

test("authorized view reconciliation is idempotent and preserves unrelated ACLs", () => {
  const existing = [{ role: "OWNER", specialGroup: "projectOwners" }];
  const once = reconcileAuthorizedViewAccess(existing, {
    projectId: config.projectId,
    datasetId: config.datasetId,
    tableIds: ["v_ga4_event_facts"],
  });
  const twice = reconcileAuthorizedViewAccess(once, {
    projectId: config.projectId,
    datasetId: config.datasetId,
    tableIds: ["v_ga4_event_facts"],
  });
  assert.equal(once.length, 2);
  assert.deepEqual(twice, once);
  assert.deepEqual(twice[0], existing[0]);
});

test("snapshot SQL separates observed and reconstructed history and dedupes before grouping", () => {
  const sql = snapshotSql(config, {
    snapshotDate: "2026-07-23",
    snapshotKind: "observed",
    horizonDays: 395,
  });
  assert.match(sql, /'observed' AS snapshot_kind/);
  assert.match(sql, /latest_reservation_days AS/);
  assert.ok(
    sql.indexOf("QUALIFY ROW_NUMBER()") <
      sql.indexOf("\nreservation_days AS")
  );
  assert.match(sql, /inventory_class IN \('campground', 'vintage_trailer'\)/);
  assert.match(sql, /property_identifier = '1514'/);
});

test("GA4 dataset remains explicitly configurable because the numeric property ID is unknown", () => {
  const missing = getDashboardConfig({});
  assert.equal(missing.ga4DatasetId, "");
  assert.equal(config.ga4DatasetId, "analytics_123456789");
});

test("reporting config cannot be redirected into Beachcomber or another project", () => {
  assert.throws(
    () => getDashboardConfig({ project: "some-other-project" }),
    /project ID must remain focused-clock-498319-f5/
  );
  assert.throws(
    () =>
      getDashboardConfig({
        "source-dataset": "beachcomber_marketing_reporting",
      }),
    /reporting dataset ID must remain bradsdadsland_reporting/
  );
  assert.throws(
    () =>
      getDashboardConfig({
        "serving-dataset": "beachcomber_dashboard",
      }),
    /serving dataset ID must remain bradsdadsland_dashboard/
  );
  assert.throws(
    () =>
      getDashboardConfig({
        "search-console-dataset": "searchconsole_beachcomberrv",
      }),
    /Search Console dataset ID must remain searchconsole_bradsdadsland/
  );
  assert.throws(
    () =>
      getDashboardConfig({
        "ga4-dataset": "analytics_492144314",
      }),
    /Beachcomber's GA4 dataset/
  );
  assert.throws(
    () => getDashboardConfig({ "ga4-dataset": "G-5714F7Y7QK" }),
    /analytics_<numeric-property-id>/
  );
  assert.throws(
    () => getDashboardConfig({ "park-id": "5884" }),
    /Campspot property ID must remain 1514/
  );
});
