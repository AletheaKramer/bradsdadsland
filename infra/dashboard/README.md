# Brad's dashboard managed jobs

This directory deploys only two unattended workloads:

- `brads-dashboard-campspot` checks the Brad's Campspot report inbox every 30 minutes.
- `brads-dashboard-snapshot` records an observed booking-pace snapshot nightly at 23:45 `America/Vancouver`.

GA4 and Search Console use their Google-managed BigQuery exports. No Ads, email-marketing, or other marketing-source jobs are present.

Preview the complete plan without making a Google Cloud change:

```bash
node infra/dashboard/deploy.mjs --dry-run --json
```

A real deployment requires both immutable source identifiers. The GA4 value is
the native BigQuery dataset name, not measurement ID `G-5714F7Y7QK`:

```bash
: "${BRADS_CAMPSPOT_PROPERTY_ID:?set the verified Brad's Campspot property ID}"
: "${BRADS_GA4_DATASET:?set the Brad's analytics_<numeric> dataset}"
node infra/dashboard/deploy.mjs --dry-run --json
node infra/dashboard/deploy.mjs --skip-schedules --skip-monitoring
```

The Campspot value is fixed to property `1514`; the deployer rejects any other
runtime value.

Use the Brad's dataset created by its native GA4 link; never reuse a Beachcomber
`analytics_*` dataset. Use the first
no-schedule/no-monitoring deployment to obtain the Workspace OAuth client ID,
complete domain-wide delegation, and test both jobs manually. Deferring
monitoring prevents the Campspot absence policy from paging while its trigger is
intentionally disabled. Then enable the managed triggers and monitoring
idempotently only after the multi-season/report-family reconciliation and exact
inventory map have been approved:

```bash
export BRADS_CAMPSPOT_ACTIVATION_APPROVED=true
node infra/dashboard/deploy.mjs --skip-build
```

Schedule activation fails closed unless that explicit attestation is present,
the map `propertyIdentifier` exactly matches runtime property `1514`,
`reviewStatus` is `approved`, and the map contains exact Campground and Vintage
Trailer classifications. The current `pending_owner_confirmation` map still
permits the bootstrap command because it skips schedules and monitoring.

The deployer describes create-only resources before creating them, upserts both Cloud Run Jobs and the Vercel OIDC provider, creates or updates both Scheduler jobs and log metrics, and creates or updates alert policies by display name. `--skip-build` reuses the configured image tag, `--skip-schedules` leaves both triggers untouched, and `--skip-monitoring` is available for an infrastructure-only pass.

The container has no credential files. Its digest-pinned Google Cloud CLI supplies
the `bq` runtime used for privacy-safe staging and MERGE operations, while Node 22
runs the dependency-free job scripts. The Campspot job uses the attached
`bdl-workspace-reader` service account to mint a short-lived, domain-delegated
Gmail read-only token for `admin@beachcomberrv.com`. The Workspace super-admin
step and email-channel verification remain intentionally manual.

See [dashboard-setup.md](../../docs/dashboard-setup.md) and [campspot-scheduled-exports.md](../../docs/campspot-scheduled-exports.md) for the exact setup and rollout checklists.
