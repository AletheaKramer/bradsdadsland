# Brad's Dads Land dashboard data contract

The private dashboard is intentionally source-first. It reports only GA4, Google
Search Console, Campspot, and pipeline health. Advertising, costs, ROAS, Brevo,
Clarity, and guest profiling are outside this contract.

## Serving views

All API reads come from `focused-clock-498319-f5.bradsdadsland_dashboard`. The
reader service account must not have access to the private reporting dataset or
the GA4/Search Console export datasets.

| View | Grain and meaning |
| --- | --- |
| `mart_dashboard_ga4_daily` | Date × source × medium × device × landing page. Purchases are GA4 events; `matched_*` requires an exact GA4 `transaction_id` → Campspot confirmation match. |
| `mart_dashboard_search_console_daily` | Date × query × page × device. Position is impression-weighted and converted from Search Console's zero-based `sum_top_position`. |
| `mart_dashboard_campspot_daily` | Measure-disjoint operational events. Reservation/revenue rows use arrival date, cancellations/refunds use their event date, and inventory rows use stay date. Every measure can therefore be summed without double-counting. |
| `mart_dashboard_booking_pace` | Snapshot date × future stay date × inventory unit. Only `snapshot_kind = observed` represents history captured on that date; reconstructed rows are labelled. |
| `mart_dashboard_data_health` | One row per source with freshness state and lag. |
| `mart_dashboard_data_quality` | Inventory, deduplication, transaction-match, pipeline, and booking-pace checks. |

`season` is the four-digit year of the Campspot operational date. Campspot
currency is CAD and reporting time is `America/Vancouver`.

The exact serving columns are maintained in
`scripts/dashboard-serving.mjs:SERVING_VIEW_COLUMNS`; serving views use explicit
column lists, never `SELECT *`.

## Privacy and attribution rules

- Campspot CSVs are parsed from memory, including ZIP members. Raw attachments
  are never written by the collector.
- Property scoping happens before report aggregation. Every row must carry a
  nonblank, unambiguous immutable property ID; exact `1514` rows are retained
  and exact other-property rows are counted and excluded. ID-less, conflicting,
  or Brad-empty reports fail closed.
- Ingest metadata records source, accepted, and excluded source-row counts.
  Canonical views enforce property `1514` again and Data Quality fails if a
  different property reaches a private fact table.
- Only allowlisted operational columns reach BigQuery. Names, emails, phone
  numbers, addresses, payment/card details, vehicle data, staff/user names,
  notes, comments, and special requests are discarded.
- Stored source filenames are content-derived report references, not raw
  attachment filenames, so a sender-provided filename cannot introduce PII.
- Reservation confirmation is retained only in the private reporting dataset to
  bridge GA4 `transaction_id`. It is not exposed by any serving view.
- Refund invoice/confirmation references and reservation-side invoice bridges
  are SHA-256 keyed before storage; raw invoice/payment references are discarded.
- Search Console query revenue attribution is prohibited. Search Console remains
  a search-visibility source.
- Campspot is authoritative for reservations/revenue, GA4 for website behavior,
  and Search Console for organic Google search.

## Campspot inventory contract

`config/dashboard/campspot-inventory-map.json` is an exact-label map tied to
property `1514`. It is usable for privacy-safe preview while
`reviewStatus: "pending_owner_confirmation"`, but production schedule activation
requires `reviewStatus: "approved"`.
Unmapped or conflicting units remain `unknown`, are excluded from Campground and
Vintage Trailer totals, emit an `unknown_inventory` health event, and fail data
quality validation. Production must not infer a class from fuzzy labels.

The known Vintage Trailer units 11C–14C and the discovered historical labels
are seeded for owner review. A class is not approved merely because a label
looks like a campsite or trailer; the owner must confirm the complete exact map.
