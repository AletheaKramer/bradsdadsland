import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardToCsv,
  defaultFilters,
  filtersToSearch,
  neutralizeSpreadsheetFormula,
  safeCsvCell,
} from "../src/components/dashboard/dashboardUtils.js";

test("dashboard URL state contains only applied source filters", () => {
  assert.deepEqual(
    defaultFilters("campspot-vintage", new Date("2026-07-23T18:00:00Z")),
    {
      view: "campspot-vintage",
      season: "2026",
      start: "2026-01-01",
      end: "2026-12-31",
    },
  );
  const search = filtersToSearch({
    view: "ga4",
    start: "2026-07-01",
    end: "2026-07-23",
    source: "google",
    ignored: "never included",
  });
  assert.equal(
    search,
    "?view=ga4&start=2026-07-01&end=2026-07-23&source=google",
  );
});

test("CSV export neutralizes spreadsheet formulas in every text cell", () => {
  assert.equal(neutralizeSpreadsheetFormula("=HYPERLINK(\"bad\")"), "'=HYPERLINK(\"bad\")");
  assert.equal(neutralizeSpreadsheetFormula("  @SUM(1,1)"), "'  @SUM(1,1)");
  assert.equal(neutralizeSpreadsheetFormula("ordinary text"), "ordinary text");
  assert.equal(safeCsvCell('+cmd|" /C calc"!A0'), '"\'+cmd|"" /C calc""!A0"');

  const csv = dashboardToCsv({
    view: "search-console",
    range: { start: "2026-07-01", end: "2026-07-23" },
    summary: [],
    trends: [],
    breakdowns: [
      {
        label: "Queries",
        columns: [{ key: "label", label: "Query" }],
        rows: [{ label: "=1+1" }],
      },
    ],
  });
  assert.match(csv, /"'=1\+1"/);
  assert.doesNotMatch(csv, /\r\n"=1\+1"/);
});
