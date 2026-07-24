import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import loginHandler from "../api/dashboard/login.js";
import logoutHandler from "../api/dashboard/logout.js";
import sessionHandler from "../api/dashboard/session.js";
import { generateDashboardPasswordHash } from "../api/_lib/generate-password-hash.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const responseMock = () => ({
  headers: {},
  statusCode: 0,
  payload: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return payload;
  },
});

const sameOriginHeaders = Object.freeze({
  host: "bradsdadsland.com",
  origin: "https://bradsdadsland.com",
  "sec-fetch-site": "same-origin",
  "x-forwarded-proto": "https",
  "content-type": "application/json",
  "x-real-ip": "192.0.2.44",
});

test("dashboard login, session, and logout enforce the secure cookie boundary", {
  concurrency: false,
}, async () => {
  const previousHash = process.env.DASHBOARD_PASSWORD_HASH;
  const previousSecret = process.env.DASHBOARD_SESSION_SECRET;
  const previousOrigins = process.env.DASHBOARD_ALLOWED_ORIGINS;
  try {
    const password = "integration test password for Brad";
    process.env.DASHBOARD_PASSWORD_HASH =
      await generateDashboardPasswordHash(password);
    process.env.DASHBOARD_SESSION_SECRET = "i".repeat(64);
    process.env.DASHBOARD_ALLOWED_ORIGINS =
      "https://bradsdadsland.com,https://www.bradsdadsland.com";

    const loginResponse = responseMock();
    await loginHandler(
      {
        method: "POST",
        headers: sameOriginHeaders,
        body: { password },
      },
      loginResponse,
    );
    assert.equal(loginResponse.statusCode, 200);
    assert.equal(loginResponse.payload.authenticated, true);
    assert.match(
      loginResponse.headers["Set-Cookie"],
      /^__Host-bdl_dashboard=[A-Za-z0-9_.-]+; Path=\/; Max-Age=\d+; HttpOnly; Secure; SameSite=Strict$/,
    );
    assert.match(loginResponse.headers["Cache-Control"], /no-store/);
    assert.equal(loginResponse.headers["X-Frame-Options"], "DENY");

    const cookie = loginResponse.headers["Set-Cookie"].split(";")[0];
    const sessionResponse = responseMock();
    await sessionHandler(
      { method: "GET", headers: { cookie } },
      sessionResponse,
    );
    assert.equal(sessionResponse.statusCode, 200);
    assert.equal(sessionResponse.payload.authenticated, true);

    const logoutResponse = responseMock();
    await logoutHandler(
      {
        method: "POST",
        headers: { ...sameOriginHeaders, cookie },
      },
      logoutResponse,
    );
    assert.equal(logoutResponse.statusCode, 200);
    assert.equal(logoutResponse.payload.authenticated, false);
    assert.match(logoutResponse.headers["Set-Cookie"], /Max-Age=0/);

    const rejectedResponse = responseMock();
    await loginHandler(
      {
        method: "POST",
        headers: {
          ...sameOriginHeaders,
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
        body: { password },
      },
      rejectedResponse,
    );
    assert.equal(rejectedResponse.statusCode, 403);
    assert.equal(rejectedResponse.payload.error.code, "untrusted_origin");
    assert.equal(rejectedResponse.headers["Set-Cookie"], undefined);
  } finally {
    if (previousHash === undefined) delete process.env.DASHBOARD_PASSWORD_HASH;
    else process.env.DASHBOARD_PASSWORD_HASH = previousHash;
    if (previousSecret === undefined) delete process.env.DASHBOARD_SESSION_SECRET;
    else process.env.DASHBOARD_SESSION_SECRET = previousSecret;
    if (previousOrigins === undefined) delete process.env.DASHBOARD_ALLOWED_ORIGINS;
    else process.env.DASHBOARD_ALLOWED_ORIGINS = previousOrigins;
  }
});

test("Vite and Vercel keep the private dashboard ahead of the public SPA", () => {
  const vite = read("vite.config.js");
  const vercel = JSON.parse(read("vercel.json"));
  assert.match(vite, /dashboard:\s*['"]dashboard\.html['"]/);
  assert.match(vite, /main:\s*['"]index\.html['"]/);

  const dashboardRewrite = vercel.rewrites.findIndex(
    (rule) => rule.source === "/dashboard" && rule.destination === "/dashboard.html",
  );
  const nestedDashboardRewrite = vercel.rewrites.findIndex(
    (rule) =>
      rule.source === "/dashboard/:path*" &&
      rule.destination === "/dashboard.html",
  );
  const spaRewrite = vercel.rewrites.findIndex(
    (rule) => rule.destination === "/index.html",
  );
  assert.ok(dashboardRewrite >= 0 && dashboardRewrite < spaRewrite);
  assert.ok(nestedDashboardRewrite >= 0 && nestedDashboardRewrite < spaRewrite);
  assert.equal(vercel.functions["api/dashboard/data.js"].maxDuration, 60);
});

test("dashboard routes carry a strict no-store browser security policy", () => {
  const vercel = JSON.parse(read("vercel.json"));
  for (const route of ["/dashboard", "/dashboard/:path*"]) {
    const headerRule = vercel.headers.find((entry) => entry.source === route);
    assert.ok(headerRule, `${route} must have explicit headers`);
    const headers = Object.fromEntries(
      headerRule.headers.map(({ key, value }) => [key, value]),
    );
    assert.match(headers["Cache-Control"], /no-store/);
    assert.match(headers["Content-Security-Policy"], /script-src 'self'/);
    assert.match(headers["Content-Security-Policy"], /style-src 'self'/);
    assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
    assert.doesNotMatch(headers["Content-Security-Policy"], /unsafe-inline/);
    assert.equal(headers["Cross-Origin-Opener-Policy"], "same-origin");
    assert.equal(headers["Cross-Origin-Resource-Policy"], "same-origin");
    assert.equal(headers["X-Frame-Options"], "DENY");
    assert.match(headers["X-Robots-Tag"], /noindex/);
    assert.match(headers["Strict-Transport-Security"], /max-age=31536000/);
  }
});

test("the private entry is untracked and remains outside public navigation", () => {
  const dashboardHtml = read("dashboard.html");
  const publicApp = read("src/AppContent.jsx");
  const publicNavigation = read("src/components/Nav.jsx");
  assert.doesNotMatch(dashboardHtml, /googletagmanager|GTM-|gtag\(/i);
  assert.match(dashboardHtml, /noindex, nofollow, noarchive, nosnippet/);
  assert.doesNotMatch(publicApp, /components\/dashboard|dashboard-main/i);
  assert.doesNotMatch(publicNavigation, /\/dashboard/);
});

test("API query text stays on fixed anonymous marts and observed pace", () => {
  const source = read("api/_lib/dashboard-query.js");
  for (const view of [
    "mart_dashboard_ga4_daily",
    "mart_dashboard_search_console_daily",
    "mart_dashboard_campspot_daily",
    "mart_dashboard_booking_pace",
    "mart_dashboard_data_health",
    "mart_dashboard_data_quality",
  ]) {
    assert.match(source, new RegExp(`"${view}"`));
  }
  assert.match(source, /snapshot_kind = 'observed'/);
  assert.doesNotMatch(source, /SELECT\s+\*/i);
  assert.doesNotMatch(
    source,
    /fact_campspot|v_campspot|analytics_\*|searchdata_url_impression/i,
  );
});
