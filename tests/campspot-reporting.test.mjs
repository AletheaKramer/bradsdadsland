import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CAMPSPOT_TABLE_SCHEMAS,
  classifyInventory,
  detectCampspotReportType,
  discoverCampspotReport,
  loadInventoryMap,
  normalizeCampspotReport,
  prohibitedCampspotHeaders,
  scopeCampspotRows,
} from "../scripts/lib/campspot-report.mjs";
import { parseCsv } from "../scripts/lib/csv.mjs";
import {
  allowlistedCampspotReportName,
  buildGmailQuery,
  extractZipCsvEntries,
  validateScopedMessage,
} from "../scripts/campspot-email-ingest.mjs";

const EXPECTED_PARK_ID = "TEST-BDL-001";

const normalizeCsv = (csv, options = {}) =>
  normalizeCampspotReport({
    sourceFile: options.sourceFile || "Jane-Doe-private-report.csv",
    sourceSha256: "a".repeat(64),
    values: parseCsv(csv),
    expectedParkId: EXPECTED_PARK_ID,
    expectedParkName: "Brad's Dads Land",
    inventoryMap: loadInventoryMap(),
  });

test("CSV parser handles quoted commas and escaped quotes", () => {
  assert.deepEqual(parseCsv('A,B\n"one, two","said ""hello"""\n'), [
    ["A", "B"],
    ["one, two", 'said "hello"'],
  ]);
});

test("required Campspot report families are detected by allowlisted headers", () => {
  assert.equal(
    detectCampspotReportType([
      "Property Code",
      "Origination Date",
      "Confirmation",
      "Arrival Date",
      "Departure Date",
      "Site Rent",
    ]),
    "reservation_originations"
  );
  assert.equal(
    detectCampspotReportType([
      "Park ID",
      "Origination Date",
      "Confirmation #",
      "Date",
      "Total Reservation Income",
    ]),
    "reservation_day"
  );
  assert.equal(
    detectCampspotReportType([
      "Park ID",
      "Site",
      "Date",
      "Unavailable",
      "Total Site Income",
    ]),
    "site_day"
  );
  assert.equal(
    detectCampspotReportType([
      "Park ID",
      "Date",
      "Total Occupancy Percent",
      "Arrivals",
      "Departures",
    ]),
    "occupancy_daily"
  );
  assert.equal(
    detectCampspotReportType([
      "Park ID",
      "Cancelation Date",
      "Confirmation",
      "Reservation Charges",
    ]),
    "cancellations"
  );
  assert.equal(
    detectCampspotReportType([
      "Park ID",
      "Refund Date",
      "Refund Type",
      "Invoice Number",
      "Amount",
    ]),
    "refunds"
  );
  assert.equal(
    detectCampspotReportType([
      "Property Code",
      "Origination Date",
      "Confirmation",
      "Reservation Charges",
    ]),
    "confirmed_reservations"
  );
});

test("every scheduled report family normalizes to its dedicated safe table", () => {
  const reports = [
    {
      csv: [
        "Property Code,Origination Date,Confirmation,Arrival Date,Departure Date,Site Rent,Site Type,Site",
        `${EXPECTED_PARK_ID},2026-01-01,O1,2026-07-01,2026-07-03,200,Air Float 1950,11C`,
      ].join("\n"),
      type: "reservation_originations",
      table: "fact_campspot_reservation_origination",
    },
    {
      csv: [
        "Park ID,Origination Date,Confirmation #,Date,Total Reservation Income,Site Type,Site Name",
        `${EXPECTED_PARK_ID},2026-01-01,D1,2026-07-01,100,Air Float 1950,11C`,
      ].join("\n"),
      type: "reservation_day",
      table: "fact_campspot_reservation_day",
    },
    {
      csv: [
        "Park ID,Date,Site,Unavailable,Total Site Income,Site Type",
        `${EXPECTED_PARK_ID},2026-07-01,11C,false,100,Air Float 1950`,
      ].join("\n"),
      type: "site_day",
      table: "fact_campspot_site_day",
    },
    {
      csv: [
        "Park ID,Date,Total Occupancy Percent,Arrivals,Departures",
        `${EXPECTED_PARK_ID},2026-07-01,75%,5,4`,
      ].join("\n"),
      type: "occupancy_daily",
      table: "fact_campspot_occupancy_daily",
    },
    {
      csv: [
        "Park ID,Cancelation Date,Confirmation,Reservation Charges,Type Name,Site/Add-on Name",
        `${EXPECTED_PARK_ID},2026-06-01,C1,100,Air Float 1950,11C`,
      ].join("\n"),
      type: "cancellations",
      table: "fact_campspot_cancellation",
    },
    {
      csv: [
        "Park ID,Refund Date,Refund Type,Invoice Number,Amount",
        `${EXPECTED_PARK_ID},2026-06-02,Refund,INV-1,-100`,
      ].join("\n"),
      type: "refunds",
      table: "fact_campspot_refund",
    },
  ];
  for (const report of reports) {
    const result = normalizeCsv(report.csv);
    assert.equal(result.reportType, report.type);
    assert.equal(result.tableId, report.table);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].source_sha256, "a".repeat(64));
    assert.equal(result.privacy.rawGuestDataRetained, false);
  }
});

test("discovery exposes only safe setup metadata before the property ID is known", () => {
  const discovery = discoverCampspotReport({
    values: parseCsv(
      [
        "Property Code,Origination Date,Confirmation,Arrival Date,Departure Date,Site Rent,Site Type,Site,Email,Guest Name",
        "PARK-123,2024-01-05,A1,2024-07-10,2024-07-13,300,Seasonal RV,21A,guest@example.com,Jane Doe",
        "PARK-123,2025-02-10,A2,2025-08-01,2025-08-05,400,Air Float 1950,11C,other@example.com,John Doe",
      ].join("\n")
    ),
    inventoryMap: loadInventoryMap(),
  });
  assert.deepEqual(discovery.propertyIdentifiers, ["PARK-123"]);
  assert.deepEqual(discovery.seasons, ["2024", "2025"]);
  assert.equal(discovery.bookingDateRange.start, "2024-01-05");
  assert.equal(discovery.stayDateRange.end, "2025-08-05");
  assert.deepEqual(
    discovery.inventoryObservations.map((item) => [
      item.propertyIdentifier,
      item.site,
    ]),
    [
      ["PARK-123", "11C"],
      ["PARK-123", "21A"],
    ]
  );
  assert.equal(discovery.prohibitedColumnsDiscarded, 2);
  assert.doesNotMatch(JSON.stringify(discovery), /guest@example|Jane Doe|John Doe/);
});

test("discovery keeps inventory observations separable by immutable property ID", () => {
  const discovery = discoverCampspotReport({
    values: parseCsv(
      [
        "Park ID,Date,Site,Unavailable,Total Site Income,Site Type",
        "1514,2026-07-01,11C,false,100,Air Float 1950",
        "5884,2026-07-01,11C,false,100,Air Float 1950",
        "1514,2026-07-01,21A,false,80,Seasonal RV",
        "5884,2026-07-01,31B,false,90,Pull Through RV",
      ].join("\n")
    ),
    inventoryMap: loadInventoryMap(),
  });

  assert.deepEqual(discovery.propertyIdentifiers, ["1514", "5884"]);
  assert.deepEqual(
    discovery.inventoryObservations.map(
      ({ propertyIdentifier, site, siteType }) => ({
        propertyIdentifier,
        site,
        siteType,
      })
    ),
    [
      { propertyIdentifier: "1514", site: "11C", siteType: "Air Float 1950" },
      { propertyIdentifier: "1514", site: "21A", siteType: "Seasonal RV" },
      { propertyIdentifier: "5884", site: "11C", siteType: "Air Float 1950" },
      { propertyIdentifier: "5884", site: "31B", siteType: "Pull Through RV" },
    ]
  );
});

test("mixed reports are exactly property-scoped before reservation aggregation", () => {
  const result = normalizeCampspotReport({
    sourceFile: "mixed.csv",
    sourceSha256: "c".repeat(64),
    values: parseCsv(
      [
        "Park ID,Property Code,Origination Date,Confirmation,Reservation Charges,Unit Site Name",
        " 1514 ,1514,2026-01-01,SHARED-1,100,11C",
        "5884,5884,2026-01-01,SHARED-1,900,01",
        "1514,1514,2026-01-02,BRAD-2,200,12C",
      ].join("\n")
    ),
    expectedParkId: "1514",
    expectedParkName: "Brad's Dads Land",
    inventoryMap: loadInventoryMap(),
  });

  assert.equal(result.parkValidation, "immutable_property_id_row_filtered");
  assert.deepEqual(result.propertyScope, {
    propertyIdentifier: "1514",
    sourceRowCount: 3,
    acceptedSourceRowCount: 2,
    excludedSourceRowCount: 1,
  });
  assert.equal(result.ingestRow.source_row_count, 3);
  assert.equal(result.ingestRow.accepted_source_row_count, 2);
  assert.equal(result.ingestRow.excluded_source_row_count, 1);
  assert.equal(result.rows.length, 2);
  assert.ok(result.rows.every((row) => row.property_identifier === "1514"));
  assert.equal(
    result.rows.find((row) => row.confirmation_id === "SHARED-1").net_revenue,
    100
  );
  assert.doesNotMatch(JSON.stringify(result.rows), /5884|900/);
});

test("property scoping rejects blank, conflicting, inexact, and ID-less rows", () => {
  const scopedRow = (row) => scopeCampspotRows([row], { expectedParkId: "1514" });

  assert.throws(
    () => scopedRow({ "Park ID": "", "Property Code": "" }),
    /no immutable Park ID/i
  );
  assert.throws(
    () => scopedRow({ "Park ID": "1514", "Property Code": "5884" }),
    /conflicting immutable Park\/Property IDs/i
  );
  assert.throws(
    () => scopedRow({ "Park ID": "1514", "Park-ID": "5884" }),
    /conflicting immutable Park\/Property IDs/i
  );
  assert.throws(
    () => scopedRow({ "Park ID": "15-14" }),
    /no rows matched the expected immutable property ID/i
  );
  assert.throws(
    () => scopedRow({ "Park Name": "Brad's Dads Land" }),
    /no immutable Park ID/i
  );
  assert.throws(
    () => scopedRow({ "Park ID": "5884" }),
    /no rows matched the expected immutable property ID/i
  );
});

test("discovery never exposes a property-header value that fails strict ID validation", () => {
  const discovery = discoverCampspotReport({
    values: parseCsv(
      [
        "Property ID,Date,Site,Unavailable,Total Site Income,Site Type",
        "guest@example.com,2026-07-01,11C,false,100,Air Float 1950",
      ].join("\n")
    ),
    inventoryMap: loadInventoryMap(),
  });

  assert.deepEqual(discovery.propertyIdentifiers, []);
  assert.equal(discovery.inventoryObservations[0].propertyIdentifier, "");
  assert.doesNotMatch(JSON.stringify(discovery), /guest@example\.com/);
});

test("normalization discards guest PII and maps reviewed vintage inventory", () => {
  const result = normalizeCsv(
    [
      "Property Code,Origination Date,Confirmation,Reservation Charges,Arrival Date,Departure Date,Unit Site Type,Unit Site Name,Email,Guest Name,Phone,Address,Notes,Tax,Invoice Number",
      `${EXPECTED_PARK_ID},07/01/2026,ABC123,500,08/10/2026,08/13/2026,Air Float 1950,11C,guest@example.com,Jane Doe,555-1111,1 Main St,late arrival,25,INV-42`,
    ].join("\n")
  );
  assert.equal(result.reportType, "confirmed_reservations");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].inventory_class, "vintage_trailer");
  assert.equal(result.rows[0].transaction_id, "ABC123");
  assert.doesNotMatch(result.rows[0].invoice_keys, /INV-42/);
  assert.match(result.rows[0].invoice_keys, /^;[a-f0-9]{64};$/);
  assert.equal(result.parkValidation, "immutable_property_id_verified");
  assert.equal(
    result.rows[0].source_file,
    "confirmed_reservations-aaaaaaaaaaaaaaaa.csv"
  );
  assert.doesNotMatch(result.rows[0].source_file, /Jane|Doe|private/i);
  assert.deepEqual(
    Object.keys(result.rows[0]).filter((key) =>
      /email|guest|phone|address|note|vehicle|payment/i.test(key)
    ),
    []
  );
  assert.equal(result.privacy.rawGuestDataRetained, false);
  assert.deepEqual(
    new Set(result.prohibitedHeaders),
    new Set(["Email", "Guest Name", "Phone", "Address", "Notes"])
  );
});

test("unknown inventory is retained for quality checks but not guessed", () => {
  const inventoryMap = loadInventoryMap();
  assert.deepEqual(
    classifyInventory(
      { site: "99Z", siteType: "New Experimental Cabin", category: "Lodging" },
      inventoryMap
    ),
    { inventoryClass: "unknown", matchRule: "unmapped" }
  );
  const result = normalizeCsv(
    [
      "Property Code,Origination Date,Confirmation,Arrival Date,Departure Date,Site Rent,Site Type,Site",
      `${EXPECTED_PARK_ID},2026-07-01,NEW1,2026-08-01,2026-08-02,100,New Type,99Z`,
    ].join("\n")
  );
  assert.equal(result.unknownInventoryRows, 1);
  assert.equal(result.rows[0].inventory_class, "unknown");
  assert.deepEqual(result.inventoryObservations, [
    {
      site: "99Z",
      siteType: "New Type",
      category: "",
      inventoryClass: "unknown",
      matchRule: "unmapped",
    },
  ]);
});

test("property ID is mandatory and mismatches fail closed", () => {
  const csv = [
    "Property Code,Origination Date,Confirmation,Arrival Date,Departure Date,Site Rent,Site Type,Site",
    "OTHER-PARK,2026-07-01,X1,2026-08-01,2026-08-02,100,RV Site,A1",
  ].join("\n");
  assert.throws(
    () => normalizeCsv(csv),
    /no rows matched the expected immutable property ID/i
  );
  assert.throws(
    () =>
      normalizeCampspotReport({
        sourceFile: "report.csv",
        sourceSha256: "b".repeat(64),
        values: parseCsv(csv),
        expectedParkId: "",
        inventoryMap: loadInventoryMap(),
      }),
    /CAMPSPOT_EXPECTED_PARK_ID/
  );
});

test("every stored Campspot fact retains a required immutable property identifier", () => {
  for (const [tableId, schema] of Object.entries(CAMPSPOT_TABLE_SCHEMAS)) {
    const propertyField = schema.find(([name]) => name === "property_identifier");
    assert.ok(propertyField, `${tableId} must retain property_identifier`);
    assert.equal(propertyField[2], "REQUIRED");
  }
});

test("prohibited header detection is conservative and operational fields remain allowed", () => {
  assert.deepEqual(
    prohibitedCampspotHeaders([
      "Confirmation",
      "Guest Email",
      "Credit Card Number",
      "Vehicle Plate",
      "Special Requests",
      "Site",
    ]),
    ["Guest Email", "Credit Card Number", "Vehicle Plate", "Special Requests"]
  );
});

test("Gmail scope requires exact recipient while BDL prefix is optional", () => {
  const query = buildGmailQuery({ days: 14 });
  assert.match(
    query,
    /to:"data-ingest-bradsdadsland@beachcomberrv\.com"/
  );
  assert.match(query, /subject:"Campspot Scheduled Report"/);
  assert.doesNotMatch(query, /subject:"BDL"/);

  const message = {
    id: "message-1",
    payload: {
      headers: [
        { name: "To", value: "data-ingest-bradsdadsland@beachcomberrv.com" },
        { name: "Subject", value: "Campspot Scheduled Report: Reservations" },
      ],
    },
  };
  assert.equal(
    validateScopedMessage(message, { subjectPrefix: "BDL" }).prefixMatched,
    false
  );
  assert.throws(
    () =>
      validateScopedMessage({
        ...message,
        payload: {
          headers: [
            { name: "To", value: "somewhere@example.com" },
            { name: "Subject", value: "Campspot Scheduled Report" },
          ],
        },
      }),
    /expected recipient/
  );
  assert.throws(
    () =>
      validateScopedMessage({
        ...message,
        payload: {
          headers: [
            {
              name: "To",
              value:
                "data-ingest-bradsdadsland@beachcomberrv.com.attacker.test",
            },
            { name: "Subject", value: "Campspot Scheduled Report" },
          ],
        },
      }),
    /expected recipient/
  );
});

test("discovery exposes only canonical allowlisted Campspot report names", () => {
  assert.equal(
    allowlistedCampspotReportName(
      "Campspot Scheduled Report: Reservation Details by Day and Organization"
    ),
    "Reservation Details by Day and Organization"
  );
  assert.equal(
    allowlistedCampspotReportName(
      "scheduled-report.csv",
      "BDL - Confirmed Reservations with Refunds - 2026-07-24.csv"
    ),
    "Confirmed Reservations with Refunds"
  );
  for (const unrecognized of [
    "Campspot Scheduled Report: Guest Details and Payment Cards",
    "CancelationsPlus.csv",
    "../../<script>alert('x')</script>.csv",
    "Confirmed Reservation with Refunds.csv",
  ]) {
    assert.equal(allowlistedCampspotReportName(unrecognized), null);
  }
  assert.equal(
    allowlistedCampspotReportName(
      "<b>Cancelations</b><script>private filename</script>"
    ),
    "Cancelations"
  );
});

const storedZip = (filename, data) => {
  const name = Buffer.from(filename);
  const payload = Buffer.from(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt32LE(0, 14);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt32LE(payload.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(payload.length, 20);
  central.writeUInt32LE(payload.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(local.length + name.length + payload.length, 16);
  return Buffer.concat([local, name, payload, central, name, end]);
};

test("ZIP CSV extraction stays in memory and ignores non-CSV members", () => {
  const archive = storedZip("reports/reservations.csv", "A,B\n1,2\n");
  const entries = extractZipCsvEntries(archive);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].filename, "reservations.csv");
  assert.equal(entries[0].data.toString("utf8"), "A,B\n1,2\n");
});

test("checked inventory map contains no fuzzy production rules", () => {
  const mapPath = path.resolve(
    "config",
    "dashboard",
    "campspot-inventory-map.json"
  );
  const parsed = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  assert.deepEqual(parsed.rules, []);
  assert.equal(parsed.propertyIdentifier, "1514");
  assert.equal(parsed.reviewStatus, "pending_owner_confirmation");
  assert.equal(parsed.exactSites["11C"], "vintage_trailer");
});
