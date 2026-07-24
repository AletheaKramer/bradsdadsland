import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BRADS_BOOKING_URL,
  createReservationClickEvent,
  openTrackedBooking,
  trackReservationClick,
} from "../src/site/bookingTracking.js";

const indexHtml = fs.readFileSync(
  new URL("../index.html", import.meta.url),
  "utf8"
);

test("GTM is installed once in the head and once as the first body fallback", () => {
  assert.equal(
    (indexHtml.match(/googletagmanager\.com\/gtm\.js/g) || []).length,
    1
  );
  assert.equal(
    (indexHtml.match(/googletagmanager\.com\/ns\.html\?id=GTM-N5S4SZS8/g) || [])
      .length,
    1
  );
  assert.equal((indexHtml.match(/GTM-N5S4SZS8/g) || []).length, 2);
  assert.match(
    indexHtml,
    /<head>\s*<!-- Google Tag Manager -->[\s\S]*?GTM-N5S4SZS8/
  );
  assert.match(
    indexHtml,
    /<body>\s*<!-- Google Tag Manager \(noscript\) -->/
  );
});

test("the GA4 Google tag is installed exactly once", () => {
  assert.equal(
    (indexHtml.match(/googletagmanager\.com\/gtag\/js\?id=G-5714F7Y7QK/g) || [])
      .length,
    1
  );
  assert.equal(
    (indexHtml.match(/gtag\s*\(\s*["']config["']\s*,\s*["']G-5714F7Y7QK["']/g) || [])
      .length,
    1
  );
});

test("reservation clicks push a privacy-safe event before opening Campspot", () => {
  const calls = [];
  const windowRef = {
    dataLayer: [],
    location: {
      pathname: "/vintage-trailers",
      search: "?guest_email=private@example.com",
    },
    open(...args) {
      calls.push(args);
      return { opened: true };
    },
  };

  const opened = openTrackedBooking("floating-book-now", { windowRef });

  assert.deepEqual(opened, { opened: true });
  assert.deepEqual(windowRef.dataLayer, [
    {
      event: "reservation_click",
      booking_provider: "campspot",
      cta_location: "floating-book-now",
      source_page_path: "/vintage-trailers",
    },
  ]);
  assert.deepEqual(calls, [
    [BRADS_BOOKING_URL, "_blank", "noopener,noreferrer"],
  ]);
  assert.doesNotMatch(
    JSON.stringify(windowRef.dataLayer),
    /private@example|guest_email|https?:|[?&#]/
  );
});

test("reservation click fields are allowlisted and invalid values fall back", () => {
  assert.deepEqual(
    createReservationClickEvent({
      placement: "guest@example.com",
      pagePath: "/guest@example.com",
    }),
    {
      event: "reservation_click",
      booking_provider: "campspot",
      cta_location: "unknown",
      source_page_path: "/",
    }
  );

  const windowRef = { location: { pathname: "/" } };
  assert.deepEqual(trackReservationClick("header", { windowRef }), {
    event: "reservation_click",
    booking_provider: "campspot",
    cta_location: "header",
    source_page_path: "/",
  });
  assert.equal(windowRef.dataLayer.length, 1);
});

test("reservation clicks are also sent through the installed Google tag", () => {
  const calls = [];
  const windowRef = {
    dataLayer: [],
    gtag(...args) {
      calls.push(args);
    },
    location: { pathname: "/policies" },
  };

  trackReservationClick("policies", { windowRef });

  assert.deepEqual(calls, [
    [
      "event",
      "reservation_click",
      {
        booking_provider: "campspot",
        cta_location: "policies",
        source_page_path: "/policies",
      },
    ],
  ]);
});

test("every current public Campspot CTA uses the shared click tracker", () => {
  const sources = [
    "../src/AppContent.jsx",
    "../src/components/Policies.jsx",
    "../src/components/VintageTrailers.jsx",
  ]
    .map((relativePath) =>
      fs.readFileSync(new URL(relativePath, import.meta.url), "utf8")
    )
    .join("\n");

  for (const placement of [
    "header",
    "hero",
    "floating-book-now",
    "policies",
    "vintage-trailers",
  ]) {
    assert.match(
      sources,
      new RegExp(`trackReservationClick\\("${placement}"\\)`)
    );
  }
  assert.doesNotMatch(sources, /window\.open\([^)]*campspot/i);
});
