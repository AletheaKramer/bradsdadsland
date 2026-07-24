# Dashboard configuration

`campspot-inventory-map.json` is production data governance, not a heuristic
configuration. Add exact Campspot unit IDs or exact site-type labels only after
reviewing a privacy-safe export. Leave `rules` empty in production.

The deployment intentionally has no checked default for:

- `CAMPSPOT_EXPECTED_PARK_ID`, which must come from a delivered Campspot report;
- `BRADS_GA4_DATASET`, which must come from the GA4 BigQuery link's numeric
  property dataset.

Missing either value must block the corresponding deployment or ingestion path.
