# Campspot scheduled exports and multi-season backfill

Use this checklist for Brad's Dads Land only. Never point Beachcomber scheduled reports at this destination.

## 1. Verify the delivery group

The following `beachcomberrv.com` Group is already created:

```text
Group name: Brad's Dads Land Data Ingest
Group address: data-ingest-bradsdadsland@beachcomberrv.com
Owner/member: admin@beachcomberrv.com
```

No Group creation or `ensure` command is part of normal activation. Inspect the
existing Group and correct only a setting that differs from the controls below.

Verify these exact controls:

- Allow anyone on the internet to post so Campspot can deliver.
- Do not allow external members.
- Disable message moderation for Campspot deliveries.
- Deliver every message to `admin@beachcomberrv.com`; do not use digest mode.
- Keep conversation history on for operational audit and replay.
- Do not add Beachcomber ingestion identities, destinations, or forwarding rules.
- Do not depend on a Google Group subject prefix; that setting is not available or retained for this Group.

Send a plain external test email with a harmless CSV attachment and a subject
such as `BDL delivery route test`. Do not include the literal
`Campspot Scheduled Report`, so the collector cannot select the test. Confirm
the `To` or original-recipient header contains the Brad's group address and the
message is visible to `admin@beachcomberrv.com`.

The collector requires the immutable Brad's property ID. It also checks the
expected park name whenever a park-name column is present. The public-posting
group or park name alone is never treated as proof that a report belongs to
Brad's.

`BDL` may be used as a Campspot schedule/subject prefix if the sending configuration can preserve it reliably. In that case, set `CAMPSPOT_SUBJECT_PREFIX=BDL` to add an operational warning when the prefix is missing. It is optional defense-in-depth, not a production prerequisite and never replaces recipient/property validation.

Mailbox discovery may return one of the six exact report names below when that
canonical name appears in a subject or attachment filename. It never returns
arbitrary subject/filename text, and the discovered name is reconciliation
metadata only: it never influences message or property acceptance.

Authenticated Campspot sender enforcement is not yet enabled. Gmail forwarding
headers have not established a stable, documented sender/DKIM identity that can
be safely allowlisted. This remains integrity hardening work; do not guess a
sender domain and do not weaken immutable row-ID validation in its place.

## 2. Verify the existing daily schedules

The Campspot exports are already configured. Compare them with this matrix and add or correct only a missing report, date window, destination, or format.

The privacy-safe mailbox inspection on 2026-07-24 found five deliveries:

| Detected family | Rows | Immutable row property ID |
| --- | ---: | --- |
| reservation originations | 2,637 | missing |
| confirmed reservations | 2,799 | mixed `1514` and `5884` |
| site day | 22,995 | missing |
| occupancy daily | 365 | missing |
| refunds | 21 | missing |

Only the confirmed-reservations file can be property-scoped locally by
filtering exact `1514` rows before aggregation. The 2026-07-24 preview accepted
1,864 Brad source rows, excluded 935 rows from the other property, and produced
1,637 normalized facts. Those facts had no usable site/type label, so every one
remains `unknown` for the Campground versus Vintage Trailer split and cannot
activate class totals.

The other four deliveries remain unimportable. Pause or repair those schedules
and ask Campspot for a property-1514-only/custom export that includes `Park ID`,
`Property ID`, or `Property Code` on every row. A Brad-only schedule selection,
subject, alias, park name, confirmation, invoice, or site label does not replace
that column. The required reservation-day and cancellation families were not
delivered and must also be added with the same immutable-ID requirement.

For every schedule:

```text
Destination: data-ingest-bradsdadsland@beachcomberrv.com
Format: CSV
Frequency: Daily
Begin date: Already active, or on/before the current date
Optional schedule label: BDL - <exact report name> - <window>
```

Keep a valid existing daily delivery time. When adding or repairing a schedule,
choose the earliest daily delivery Campspot permits. Use rolling windows so
later cancellations, refunds, and corrected statuses replace prior values. Do
not rename a working schedule solely to add the optional `BDL` label.

| Exact Campspot report | Required window(s) | Dashboard use |
| --- | --- | --- |
| `Reservation Originations with Invoice Charges` | Previous 6 months | Booking date, confirmation, status, stay dates, booked revenue |
| `Reservation Details by Day and Organization` | Previous 6 months **and** widest available upcoming window | Reservation-day detail and current/future booking inventory |
| `Daily Revenue and Occupancy by Site Report` | Previous 6 months **and** widest available upcoming window | Site-day revenue and occupancy |
| `Daily Occupancy, Arrivals, and Departures` | Previous 6 months **and** widest available upcoming window | Daily occupancy, arrivals, and departures |
| `Cancelations` | Previous 6 months | Cancellations and cancelled value; retain Campspot's one-`l` report spelling if shown |
| `Confirmed Reservations with Refunds` | Previous 6 months | Confirmed reservations and refunds |

If Campspot caps an upcoming window at six months, create adjacent upcoming schedules until the full bookable season is covered. Do not create Ads, marketing-cost, Brevo, or unrelated Campspot schedules.

For each existing or newly saved schedule:

1. Confirm **Send to**, **Download Type**, **Begin Date**, and **Next Run Date** in Campspot.
2. Run it once.
3. Confirm the delivered recipient headers retain `data-ingest-bradsdadsland@beachcomberrv.com`.
4. Confirm the delivered subject contains the literal `Campspot Scheduled Report`;
   this fixed phrase is part of the Gmail selection query. A `BDL` prefix is not.
5. Open the CSV header locally and require an immutable `Park ID`, `Property
   ID`, or `Property Code` field.
6. Inspect every row through the privacy-safe preview. Each row must have one
   nonblank ID, populated supported ID fields must agree, and Brad rows must
   equal `1514` after trimming. A mixed file may exclude exact other-property
   rows; a blank, conflicting, ID-less, or Brad-empty file must fail.
7. Confirm the preview's accepted/excluded source-row counts. Treat any
   exclusion as a Data Health warning and correct the schedule before final
   activation.

## 3. Backfill every available season

Scheduled reports give rolling coverage; they do not replace a historical backfill.

1. List every complete and partial season available in Campspot, from the first Campspot year through the current year.
2. For each required report above, export one calendar year at a time. If Campspot limits a report to six months, export January–June and July–December separately.
3. For stay-grain reports, use stay date as the range. For originations, cancellations, and refunds, use the corresponding event date exposed by Campspot.
4. Export CSV, retain the exact report name in the filename, and add the closed date range, for example `BDL Reservation Details by Day and Organization 2024-01-01 2024-12-31.csv`.
5. Deliver the files through the Brad's group or run the local importer from a protected workstation. Never put raw exports in Git, the web app, the serving dataset, or a broadly accessible bucket.
6. Load oldest to newest. Message ID and extracted CSV SHA-256 make retransmission safe; source keys and load times let newer overlapping extracts supersede older rows.
7. For the current season, also export the widest future-stay range available.

Historical loads support realized multi-season comparisons immediately. Booking-pace pickup and year-over-year pace comparisons begin only after matching **observed** nightly snapshots exist; do not label reconstructed history as observed.

## 4. Inventory classification gate

From all backfill files, produce the union of category, site type, and site/unit labels. Update `config/dashboard/campspot-inventory-map.json` so every known sellable unit maps explicitly to exactly one class:

- `campground`
- `vintage_trailer`

Do not infer the class from a fuzzy substring in production. A new or changed
label is retained as `unknown`, remains out of both inventory-class totals,
emits `unknown_inventory`, and fails Data Health until the checked-in map is
reviewed.

Completing this exact map from the first privacy-safe backfill is a production
activation gate. A no-schedule/no-monitoring infrastructure bootstrap may run
to create the Workspace identity, but do not enable either Scheduler or the
private dashboard until the map and season reconciliation have passed.
The checked-in map must also have `propertyIdentifier: "1514"` and
`reviewStatus: "approved"`. Its current
`pending_owner_confirmation` status is an intentional activation blocker.

## 5. Reconciliation checklist

For every season, and separately for Campground and Vintage Trailers:

- Reconcile unique confirmations/bookings.
- Reconcile gross and net booked revenue.
- Reconcile refunds, cancellation count, and cancelled value.
- Reconcile occupied site/unit nights and available inventory.
- Spot-check arrivals, departures, length of stay, and booking lead time.
- Confirm overlapping exports do not duplicate confirmations or site-days.
- Confirm a Beachcomber park ID or wrong recipient is rejected.
- Confirm a mixed exact-ID report accepts only `1514`, reports accepted and
  excluded counts, and stores no `5884` row.
- Confirm blank, conflicting, ID-less, and Brad-empty reports are rejected.
- Confirm an unknown inventory label is retained as `unknown`, excluded from
  both inventory-class totals, and reported as a Data Health failure.
- If the optional subject-prefix check is enabled, confirm an unprefixed message emits `campspot_subject_prefix_missing` while recipient and property validation still decide whether the file is accepted.
- Confirm guest names, raw emails, phones, postal addresses, payment details, vehicle data, and notes do not appear in BigQuery reporting or serving tables.

Record any source limitation by report, season, date range, and inventory class. Do not silently convert a missing report into zero activity.
