# Brad's Dads Land dashboard operations

## Account boundaries

- GTM `GTM-N5S4SZS8`, GA4 `G-5714F7Y7QK`, the GA4 BigQuery link, and Search
  Console are owned/administered through `admin@bradsdadsland.com`.
- Campspot scheduled-report mail is read through
  `data-ingest-bradsdadsland@beachcomberrv.com`, owned and delegated through
  `admin@beachcomberrv.com`.
- The Google Group exists and accepts external Campspot mail. Google Groups does
  not reliably expose a retained email subject prefix, so `BDL` is optional
  defense-in-depth only.

The collector's hard boundaries are the exact recipient and the immutable
Campspot property/park ID embedded in report rows.
Brad's configured ID is `1514`; `BRADS_CAMPSPOT_PROPERTY_ID` is mandatory for
the managed deployment and is passed to the job as
`CAMPSPOT_EXPECTED_PARK_ID`. Every real pull/import requires one nonblank,
unambiguous immutable ID per source row. It filters exact `1514` rows before
aggregation and rejects blank, conflicting, ID-less, or Brad-empty reports.

## Activation gates

1. Enable the GA4 native BigQuery export. Record its numeric dataset as
   `BRADS_GA4_DATASET=analytics_<property-id>`; do not infer it from measurement
   ID `G-5714F7Y7QK`.
2. Confirm Search Console bulk export writes to
   `searchconsole_bradsdadsland`.
3. Confirm Campspot property `1514` directly in the Brad administration context
   or with Campspot support. Keep both Campspot property environment variables
   fixed to that value.
4. Run a privacy-safe preview. Review only the resulting operational rows, then
   add every campground unit explicitly to
   `config/dashboard/campspot-inventory-map.json`.
5. If a report was loaded before its map was complete, re-import it once with
   `--force=true`; the idempotent MERGE updates its inventory classification.
6. Deploy reporting and serving objects, run validation, and require zero
   `unknown_inventory` failures before enabling dashboard Campspot totals.

The checked-in inventory map is tied to property `1514` but its current
`reviewStatus` is `pending_owner_confirmation`. Final Scheduler activation
requires an exact property match and `reviewStatus: "approved"` in addition to
the explicit reconciliation attestation.

## Campspot report schedules

The reports are already scheduled. Verify the existing schedules against
[the exact report/window matrix](../../docs/campspot-scheduled-exports.md)
instead of recreating or renaming working schedules. Every selected delivery
must retain `data-ingest-bradsdadsland@beachcomberrv.com` in the recipient
headers, the literal `Campspot Scheduled Report` in the subject, and an
immutable property ID on every data row. Exact allowlisted report names shown
by discovery are reconciliation metadata only and never authorize a file.
Required
families cover:

- confirmed reservations / rent roll;
- reservation originations with invoice charges;
- reservation details by day;
- site-day revenue and availability;
- daily occupancy, arrivals, and departures;
- cancellations; and
- refunds.

Use a rolling six-month lookback and Campspot's widest future-stay window.
Export historical data in calendar-year chunks for every available season.
Forward booking-pace comparisons begin only after nightly observed snapshots
exist.

## Commands

Local preview and historical load:

```sh
node scripts/campspot-email-ingest.mjs discover --max=200 --days=30

node scripts/campspot-email-ingest.mjs inspect \
  --input=/path/to/report.csv \
  --park-id="$BRADS_CAMPSPOT_PROPERTY_ID"

node scripts/campspot-email-ingest.mjs import \
  --input=/path/to/all-seasons \
  --park-id="$BRADS_CAMPSPOT_PROPERTY_ID" \
  --load=true
```

Gmail pull and warehouse deployment:

```sh
node scripts/campspot-email-ingest.mjs pull --load=true

node scripts/dashboard-reporting.mjs deploy \
  --ga4-dataset="$BRADS_GA4_DATASET"

node scripts/dashboard-serving.mjs deploy \
  --ga4-dataset="$BRADS_GA4_DATASET" \
  --viewer-service-account="$BRADS_DASHBOARD_READER_SERVICE_ACCOUNT"

node scripts/dashboard-reporting.mjs validate \
  --ga4-dataset="$BRADS_GA4_DATASET"
```

The Group already exists. Normal activation may inspect it but must not create
or repair it:

```sh
node scripts/google-workspace-admin.mjs inspect
```

The `ensure` command remains a mutating repair utility and should be run only
after a specific Group mismatch has been reviewed. It is not part of dashboard
activation. Local OAuth bootstrap credentials must be passed with `--client` or
`BRADS_BOOTSTRAP_TOKEN_PATH`; the scripts never search Beachcomber credential
paths. OAuth tokens default to
`~/.config/bradsdadsland-dashboard/`, outside the repository; OAuth client and
token files must never be committed.

## Cloud jobs and monitoring

- `node scripts/cloud-dashboard-jobs.mjs campspot` runs every 30 minutes.
- `node scripts/cloud-dashboard-jobs.mjs snapshot` runs at 23:45
  `America/Vancouver`.
- `node scripts/cloud-dashboard-jobs.mjs validate` checks warehouse and serving
  contracts.

Cloud jobs emit `job_completed`, `job_failed`, and
`dashboard_data_health_issue`. Alert issue types are `stale_ga4`,
`stale_search_console`, `stale_campspot`, `stale_booking_snapshot`,
`rejected_property`, `excluded_property`, and `unknown_inventory`.
The Gmail deduplication state is stored separately in the configured
`CAMPSPOT_STATE_GCS_URI`; BigQuery MERGE keys remain idempotent if that state is
lost.
