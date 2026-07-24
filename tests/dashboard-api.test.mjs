import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLoginAllowed,
  assertTrustedMutation,
  createSession,
  DASHBOARD_COOKIE_NAME,
  getDashboardSession,
  recordFailedLogin,
  resetLoginLimiter,
  verifyDashboardPassword,
  verifySessionToken,
} from "../api/_lib/dashboard-auth.js";
import { queryBigQuery, quoteTable } from "../api/_lib/bigquery.js";
import {
  buildCampspotData,
  buildGa4Data,
  parseDashboardRequest,
  VIEWS,
} from "../api/_lib/dashboard-query.js";
import { generateDashboardPasswordHash } from "../api/_lib/generate-password-hash.js";

test(
  "Brad's dashboard uses an isolated signed session and scrypt password",
  { concurrency: false },
  async (t) => {
    const previousHash = process.env.DASHBOARD_PASSWORD_HASH;
    const previousSecret = process.env.DASHBOARD_SESSION_SECRET;
    try {
      const password = "a long test passphrase for Brad";
      process.env.DASHBOARD_PASSWORD_HASH =
        await generateDashboardPasswordHash(password);
      process.env.DASHBOARD_SESSION_SECRET = "s".repeat(64);

      assert.equal(await verifyDashboardPassword(password), true);
      assert.equal(await verifyDashboardPassword("incorrect password"), false);

      const now = Date.parse("2026-07-23T18:00:00.000Z");
      const session = createSession(now);
      assert.equal(DASHBOARD_COOKIE_NAME, "__Host-bdl_dashboard");
      assert.equal(verifySessionToken(session.token, now + 1000).aud, "bradsdadsland-dashboard");
      assert.equal(
        verifySessionToken(session.token, Date.parse(session.expiresAt)),
        null,
      );
      t.mock.method(Date, "now", () => now + 1000);
      assert.equal(
        getDashboardSession({
          headers: { cookie: `${DASHBOARD_COOKIE_NAME}=${session.token}` },
        }).aud,
        "bradsdadsland-dashboard",
      );
    } finally {
      if (previousHash === undefined) delete process.env.DASHBOARD_PASSWORD_HASH;
      else process.env.DASHBOARD_PASSWORD_HASH = previousHash;
      if (previousSecret === undefined) {
        delete process.env.DASHBOARD_SESSION_SECRET;
      } else {
        process.env.DASHBOARD_SESSION_SECRET = previousSecret;
      }
    }
  },
);

test("mutations require the exact dashboard origin", () => {
  const request = {
    headers: {
      host: "bradsdadsland.com",
      origin: "https://bradsdadsland.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-proto": "https",
    },
  };
  assert.doesNotThrow(() => assertTrustedMutation(request));
  assert.throws(
    () =>
      assertTrustedMutation({
        ...request,
        headers: {
          ...request.headers,
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    (error) => error.status === 403 && error.code === "untrusted_origin",
  );
});

test("the best-effort login limiter blocks repeated failures", () => {
  resetLoginLimiter();
  const request = { headers: { "x-real-ip": "192.0.2.10" } };
  const now = Date.parse("2026-07-23T18:00:00.000Z");
  for (let count = 0; count < 5; count += 1) {
    recordFailedLogin(request, now);
  }
  assert.throws(
    () => assertLoginAllowed(request, now + 1),
    (error) =>
      error.status === 429 && Boolean(error.headers["Retry-After"]),
  );
  resetLoginLimiter();
});

test("dashboard filters are view-specific, strict, and multi-season", () => {
  const now = new Date("2026-07-23T18:00:00.000Z");
  assert.deepEqual(
    parseDashboardRequest(
      {
        query: {
          view: "campspot-campground",
          season: "all",
          siteType: "Unserviced",
        },
      },
      now,
    ),
    {
      view: "campspot-campground",
      start: "2000-01-01",
      end: "2026-12-31",
      season: "all",
      device: null,
      source: null,
      medium: null,
      landingPage: null,
      query: null,
      page: null,
      site: null,
      siteType: "Unserviced",
      status: null,
      leadTime: null,
      stayLength: null,
      reload: false,
    },
  );
  assert.throws(
    () =>
      parseDashboardRequest({
        query: { view: "search-console", source: "google" },
      }),
    (error) => error.code === "unsupported_filter",
  );
  assert.throws(
    () => parseDashboardRequest({ query: { view: "marketing" } }),
    (error) => error.code === "invalid_view",
  );
  assert.throws(
    () => parseDashboardRequest({ query: { view: "ga4", adSpend: "10" } }),
    (error) => error.code === "unknown_filter",
  );
  assert.deepEqual(VIEWS, {
    ga4: "mart_dashboard_ga4_daily",
    searchConsole: "mart_dashboard_search_console_daily",
    campspot: "mart_dashboard_campspot_daily",
    bookingPace: "mart_dashboard_booking_pace",
    health: "mart_dashboard_data_health",
    quality: "mart_dashboard_data_quality",
  });
});

test("serving payload builders expose aggregate allowlisted fields only", () => {
  const filters = {
    view: "campspot-campground",
    start: "2026-01-01",
    end: "2026-12-31",
    season: "2026",
  };
  const response = buildCampspotData(
    filters,
    [
      {
        reservations: 4,
        cancellations: 1,
        occupied_site_nights: 12,
        available_site_nights: 20,
        occupancy_rate: 0.6,
        gross_revenue: 1200,
        refunds: 100,
        net_revenue: 1100,
        source_updated_at: "2026-07-23T17:00:00.000Z",
        guest_email: "private@example.com",
        confirmation_number: "BDL-PRIVATE",
      },
    ],
    [],
    [],
    [],
  );
  assert.equal(response.summary.find((metric) => metric.id === "netRevenue").value, 1100);
  assert.doesNotMatch(
    JSON.stringify(response),
    /private@example|BDL-PRIVATE|guest_email|confirmation_number/i,
  );

  const ga4 = buildGa4Data(
    { view: "ga4", start: "2026-07-01", end: "2026-07-23" },
    [{ sessions: 10, source_updated_at: "2026-07-23T17:00:00.000Z" }],
    [],
    [],
  );
  assert.equal(ga4.summary.find((metric) => metric.id === "sessions").value, 10);
});

test("BigQuery helper accepts only quoted identifiers and one read-only statement", async () => {
  assert.equal(
    quoteTable(
      "focused-clock-498319-f5",
      "bradsdadsland_dashboard",
      "mart_dashboard_ga4_daily",
    ),
    "`focused-clock-498319-f5.bradsdadsland_dashboard.mart_dashboard_ga4_daily`",
  );
  assert.throws(
    () => quoteTable("project`; DROP TABLE guests", "dataset", "view"),
    (error) => error.status === 503,
  );
  await assert.rejects(
    queryBigQuery({ query: "DELETE FROM `project.dataset.table` WHERE TRUE" }),
    (error) => error.status === 503,
  );
  await assert.rejects(
    queryBigQuery({ query: "SELECT 1; SELECT 2" }),
    (error) => error.status === 503,
  );
});
