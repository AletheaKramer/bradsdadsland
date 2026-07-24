# Brad's Dads Land dashboard setup

This runbook completes the external setup that cannot be applied from the repository. The dashboard is intentionally limited to GA4, Search Console, and Campspot.

## Current activation status

The local-time readiness audit, updated on 2026-07-24, found that this implementation is
fail-closed but not yet activation-ready:

- the GTM container returned no published tags or rules; the site therefore
  installs `G-5714F7Y7QK` directly and GTM must not add a second GA4 config tag;
- the only visible `analytics_*` dataset is `analytics_492144314`, whose
  authorized views prove it belongs to Beachcomber; the code explicitly rejects
  it for Brad's;
- `searchconsole_bradsdadsland` is not present yet;
- five Campspot exports reached the Brad alias. The confirmed-reservations file
  contains exact row IDs for both Brad property `1514` and Beachcomber property
  `5884`; the importer now filters exact `1514` rows before aggregation. The
  other four delivered families contain no immutable row ID and remain
  intentionally unimportable;
- the property-1514 inventory draft is checked in with
  `reviewStatus: "pending_owner_confirmation"`, so it cannot activate
  Scheduler; and
- no `bdl-*` service accounts, Brad Cloud Run jobs, schedules, or Brad Vercel
  Workload Identity pool are deployed.

Re-check these dated observations after each external setup step; do not treat
them as permanent state.

## Identity and data boundaries

| Responsibility | Identity or resource |
| --- | --- |
| GTM, GA4, and Search Console administration | `admin@bradsdadsland.com` |
| Campspot report delivery and Gmail delegation | `admin@beachcomberrv.com` |
| Campspot destination | `data-ingest-bradsdadsland@beachcomberrv.com` |
| GCP project / number | `focused-clock-498319-f5` / `1074630920917` |
| BigQuery location | `US` |
| Cloud Run and Scheduler region | `us-west1` |
| Business and Scheduler timezone | `America/Vancouver` |
| Source dataset | `bradsdadsland_reporting` |
| Anonymous serving dataset | `bradsdadsland_dashboard` |

Beachcomber datasets, Cloud Run jobs, state objects, service accounts, and Vercel provider are not reused.

## 1. Publish Google Tag Manager and GA4

The public site contains the standard head and noscript installation for
`GTM-N5S4SZS8` plus one direct Google tag for `G-5714F7Y7QK`. The direct tag is
the single GA4 configuration because the current GTM container has no published
tags or rules. Do not add another GA4 Configuration/Google tag for this
measurement ID inside GTM; doing so would duplicate page views.

Using `admin@bradsdadsland.com`:

1. Open container `GTM-N5S4SZS8` and confirm it does not contain a second GA4 Configuration/Google tag for `G-5714F7Y7QK`.
2. Keep the direct Google tag in `index.html` as the sole GA4 page-view configuration unless a future deployment deliberately migrates it into GTM.
3. Do not create a second GA4 Event tag for `reservation_click`; the site helper sends that event directly through `gtag` and also exposes the privacy-safe data-layer event for debugging.
4. In Campspot's supported analytics/custom-tag integration, install the same Brad's GTM container. Configure the booking-engine events `campspot_search`, `campspot_site_details`, `campspot_shopping_cart`, `begin_checkout`, and `purchase`.
5. Map every `purchase` to the Campspot confirmation reference as `transaction_id`, the booking value as `value`, and `CAD` as `currency`. Do not fire purchase from a button click or page view; it must require Campspot's confirmed-booking state.
6. Configure cross-domain measurement for `bradsdadsland.com` and `campspot.com`. Verify the `_gl` linker parameter reaches `https://www.campspot.com/book/bradsdadsland` and that Campspot is not starting a new referral session.
7. In GTM Preview and GA4 DebugView, run one public-site-to-Campspot test journey. Confirm one page view per navigation, one `reservation_click`, the funnel events in order, one purchase, and no guest name, email, phone, address, or free-form note in event parameters.
8. Publish the container and mark the funnel events that matter as GA4 key events.

The site helper is `src/site/bookingTracking.js`. Normal booking anchors should call `trackReservationClick()` with a fixed placement token such as `header`, `hero`, or `floating-book-now`; a genuinely programmatic control can use `openTrackedBooking()`.

## 2. Enable Google-managed BigQuery exports

### GA4

The repository utility supports Google's Desktop OAuth loopback flow and stores
its refreshable token as
`~/.config/bradsdadsland-dashboard/bradsdadsland-google-exports-oauth.json`
(or under `BRADS_AUTH_DIR`) with mode `0600`. Any OAuth client used here must
allow `admin@bradsdadsland.com`. The Desktop client currently available in
`focused-clock-498319-f5` is restricted to the Beachcomber Workspace and cannot
authorize that Brad account; do not substitute
`admin@beachcomberrv.com`. Use a Brad-controlled External Desktop client, or
use the one-time keyless linker procedure below.

The auth command forces Google's account chooser, requests `openid` and
`email`, and cryptographically verifies the returned ID token before storing
credentials. Legacy tokens without that verified identity marker are rejected.
Before an OAuth apply run, `admin@bradsdadsland.com` must be Editor or above on
the GA4 property and have
Google's required IAM access to `focused-clock-498319-f5`
(`resourcemanager.projects.get`, `getIamPolicy`, and `setIamPolicy`, plus
`serviceusage.services.get` and `enable`; Project Owner is a superset). The
Google Analytics Admin API and BigQuery API must be enabled:

```bash
npm run dashboard:google-exports:auth -- \
  --client=/protected/path/to/bradsdadsland-google-oauth-client.json
```

Run the read-only setup preview first:

```bash
npm run dashboard:google-exports
```

It enumerates accessible GA4 properties and web streams, accepts exactly
measurement ID `G-5714F7Y7QK`, lists existing BigQuery links, and refuses any
property or project conflict. A no-match report includes only the accessible
property and web-stream counts so unrelated Google property details are not
printed. If no link exists, review the fixed create request and apply it
explicitly:

```bash
npm run dashboard:google-exports -- --apply=true
```

Daily export and the `US` location are mandatory. Only request streaming when
the account and project support it:

```bash
npm run dashboard:google-exports -- --apply=true --streaming=true
```

The Beachcomber Google Cloud organization currently blocks adding
`admin@bradsdadsland.com` to project IAM. The approved one-time alternative is
a keyless service account named
`bdl-ga4-linker@focused-clock-498319-f5.iam.gserviceaccount.com`:

1. Give that exact service account `Editor` on the Brad GA4 property only.
2. Give it only the five Cloud permissions listed above through the narrow
   custom role `bradsGa4BigQueryLinker`.
3. Impersonate it without a key, run the same exact measurement-ID discovery
   and dry-run checks, then create the fixed daily/US link.
4. Verify the new link and native `analytics_<PROPERTY_ID>` dataset.
5. Remove its GA4 property access, Cloud role binding, and impersonation
   binding. Delete the temporary service account after the audit log is
   retained. Do not relax the organization-wide domain restriction.

The utility creates a link only when absent; it does not silently patch an
existing link. It is fixed to `focused-clock-498319-f5`, scopes export to the
matched Brad web stream, excludes advertising identifiers, and reports the
resulting native `analytics_<PROPERTY_ID>` dataset name.

1. Confirm that `analytics_<PROPERTY_ID>.events_YYYYMMDD` appears after Google
   begins the export.
2. Grant the identity that runs `dashboard:deploy-serving` source-table read
   access plus permission to update this Brad's dataset access policy (normally
   dataset-level BigQuery Data Owner while authorized views are reconciled).
   Do not grant the Vercel runtime reader direct access to the GA4 dataset.

GA4 BigQuery history begins when the link is enabled. It does not backfill older events.

### Search Console

Using `admin@bradsdadsland.com`:

1. Review the read-only Search Console site-access report included in
   `npm run dashboard:google-exports` and confirm the DNS-domain property for
   `bradsdadsland.com` reports `siteOwner`.
2. In Search Console bulk data export, select project `focused-clock-498319-f5`, dataset `searchconsole_bradsdadsland`, and location `US`.
3. Confirm `search-console-data-export@system.gserviceaccount.com` retains the
   two project roles Google requires for creating its destination dataset:
   BigQuery Job User and BigQuery Data Editor. Both bindings were already
   present on 2026-07-24; do not add duplicates or broaden them.
4. Confirm the first successful row in `searchconsole_bradsdadsland.ExportLog`, then confirm search query and URL impression tables receive data.
5. Give the serving-view deployment identity the same temporary source-table
   read and dataset-access-policy update permissions described for GA4. The
   Vercel runtime reader must not receive direct Search Console access.

Search Console bulk-export history also begins at enablement; do not invent pre-export query history or attach Campspot revenue to search queries.
Google's public Search Console API has no bulk-export activation or status
method, so the repository utility intentionally reports access only. Starting
the export remains a one-time Search Console owner action.

## 3. Prepare and validate Campspot

Complete [the scheduled-export and multi-season backfill checklist](./campspot-scheduled-exports.md).
The configured immutable property ID is `1514`. Exact property scoping happens
before report-specific normalization: every source row must contain one
nonblank immutable ID, populated ID fields must agree, and comparison is exact
after trimming. Mixed files retain only `1514`; blank, conflicting, ID-less, or
Brad-empty files fail closed. Recipient, subject, schedule name, park name, and
site label never substitute for the immutable row ID.

1. Confirm property `1514` directly in Campspot administration or with Campspot
   support, then keep both `BRADS_CAMPSPOT_PROPERTY_ID` and
   `CAMPSPOT_EXPECTED_PARK_ID` set to `1514`.
2. Review every site/type label and explicitly classify it in `config/dashboard/campspot-inventory-map.json` as `campground` or `vintage_trailer`.
3. Leave unknown labels unmapped until reviewed. The importer retains them as
   `unknown`, excludes them from both inventory-class totals, and fails Data
   Health instead of guessing a class.
4. Reconcile each imported season and inventory class before enabling scheduled loads.

The first privacy-safe backfill plus an exact, reviewed inventory map is a
required activation gate. Final schedule activation requires the map's
`propertyIdentifier` to equal `1514` and `reviewStatus` to equal `approved`.
The current `pending_owner_confirmation` value deliberately allows only the
no-schedule/no-monitoring bootstrap. Do not enable Cloud Scheduler or the
production Campspot views while it remains pending.

## 4. Deploy isolated Google Cloud resources

Authenticate `gcloud` and `bq` as a GCP administrator. A structure-only dry run
works before either source identifier is known and makes no Google Cloud change:

```bash
node infra/dashboard/deploy.mjs --dry-run --json
```

After both identifiers have been discovered and verified, export the actual
values, check that the current shell received them, and repeat the dry run:

```bash
: "${BRADS_CAMPSPOT_PROPERTY_ID:?set the verified Brad's Campspot property ID}"
: "${BRADS_GA4_DATASET:?set the Brad's analytics_<numeric> dataset}"
node infra/dashboard/deploy.mjs --dry-run --json
```

The same two variables are mandatory for a real deployment. Measurement ID
`G-5714F7Y7QK` is not accepted as the BigQuery dataset. Do not use an existing
Beachcomber `analytics_*` dataset.

The real deploy creates or updates:

- `bdl-dashboard-jobs`, `bdl-workspace-reader`, `bdl-dashboard-scheduler`, and `bdl-dashboard-reader`;
- the private `focused-clock-498319-f5-brads-dashboard-state` bucket and its one deduplication object path;
- the `brads-dashboard` Artifact Registry repository and one shared managed-job image;
- the Campspot and snapshot Cloud Run Jobs and their Scheduler triggers;
- a separate Vercel Workload Identity pool/provider and exact-subject reader binding;
- Campspot/job/data-health log metrics, alert policies, and an email channel.

Run:

```bash
node infra/dashboard/deploy.mjs --skip-schedules --skip-monitoring
```

This creates and deploys the resources but deliberately leaves both Scheduler triggers untouched while Workspace delegation is completed and the jobs are smoke-tested. No service-account key is created or stored.
Monitoring is also deferred so the 90-minute Campspot absence policy cannot
page while the schedule is intentionally disabled. The final `--skip-build`
pass enables both schedules and monitoring.

This first pass is infrastructure bootstrap, not Campspot activation. It may be
used to obtain the Workspace OAuth client ID before the historical inventory map
is complete, but neither Scheduler nor the private dashboard may be enabled
until the backfill and inventory reconciliation gates pass.
The final pass additionally fails unless
`BRADS_CAMPSPOT_ACTIVATION_APPROVED=true`, the checked-in map contains exact
Campground and Vintage Trailer classifications, its property is exactly
`1514`, and its review status is `approved`.

Before the first build, confirm the Cloud Build execution identity selected by
the project can write build logs and push to the same-project `brads-dashboard`
Artifact Registry repository. Under restrictive organization policies, use a
dedicated build identity with only those permissions instead of broadening a
default account.

### Workspace domain-wide delegation

The deploy output prints the numeric OAuth client ID for `bdl-workspace-reader@focused-clock-498319-f5.iam.gserviceaccount.com`. A `beachcomberrv.com` Workspace super administrator must then:

1. Open Admin console → Security → Access and data control → API Controls.
2. Open **Manage Domain Wide Delegation** and select **Add new**.
3. Enter the numeric client ID, not the service-account email and not a Google Group.
4. Authorize exactly `https://www.googleapis.com/auth/gmail.readonly`.
5. Do not add Gmail modify/send, Drive, Sheets, Admin SDK, or any other scope.

The job always supplies `admin@beachcomberrv.com` as the delegated subject. Authorization can take several minutes and, rarely, up to 24 hours to propagate.

### Production-only Vercel identity

The deployer creates pool `vercel-brads-dashboard` and provider `vercel-brads-production` with:

```text
Issuer:   https://oidc.vercel.com/aletheakramers-projects
Audience: https://vercel.com/aletheakramers-projects
Subject:  owner:aletheakramers-projects:project:bradsdadsland:environment:production
```

The provider maps `google.subject`, `attribute.owner`, `attribute.project`, and `attribute.environment`, and its condition requires the exact subject above. Only that exact principal receives Workload Identity User on `bdl-dashboard-reader`; the reader receives BigQuery Job User plus Data Viewer on `bradsdadsland_dashboard` only.

In Vercel Project Settings → Security, enable **Secure Backend Access with OIDC
Federation**, select **Team** issuer mode, and save. Vercel then provides the
token to Functions in the `x-vercel-oidc-token` request header; the dashboard
API exchanges it for a short-lived Google credential. See Vercel's
[OIDC guide](https://vercel.com/docs/oidc) and
[token reference](https://vercel.com/docs/oidc/reference).

Set the matching server-only Vercel environment variables from `.env.example`
for **Production only** in the `bradsdadsland` project. Leave
`DASHBOARD_BIGQUERY_SERVICE_ACCOUNT_JSON` unset; do not configure a
service-account JSON key.

### Monitoring verification

After the final `--skip-build` deployment, open the verification email sent to
`admin@beachcomberrv.com` for the new Cloud Monitoring channel. Then confirm
these four policies are enabled:

- managed job failure;
- no successful Campspot check for 90 minutes;
- Data Health reports the observed booking snapshot outside its 26-hour refresh window;
- stale GA4/Search Console/Campspot data, rejected property data, or unknown inventory.

## 5. Production acceptance

1. With `BRADS_GA4_DATASET` and the source variables from `.env.example` set,
   deploy the reporting schema and anonymous serving views:

   ```bash
   npm run dashboard:deploy-schema
   BRADS_DASHBOARD_READER_SERVICE_ACCOUNT=bdl-dashboard-reader@focused-clock-498319-f5.iam.gserviceaccount.com npm run dashboard:deploy-serving
   ```

2. Import the reviewed historical files oldest-to-newest from their protected
   workstation location. Preview without `--load=true` first, then run:

   ```bash
   node scripts/campspot-email-ingest.mjs import \
     --input=/protected/path/to/brads-backfill \
     --load=true \
     --park-id="$BRADS_CAMPSPOT_PROPERTY_ID" \
     --park-name="Brad's Dads Land"
   ```

3. After Workspace domain-wide delegation is active, execute
   `brads-dashboard-campspot` once and confirm a Brad's-only report imports, the
   GCS state object is created, and a second run is a harmless dedupe:

   ```bash
   gcloud run jobs execute brads-dashboard-campspot \
     --project=focused-clock-498319-f5 --region=us-west1 --wait
   ```

4. Execute the snapshot once before midnight and confirm it records one observed
   `America/Vancouver` snapshot:

   ```bash
   gcloud run jobs execute brads-dashboard-snapshot \
     --project=focused-clock-498319-f5 --region=us-west1 --wait
   ```

5. Query the serving dataset as `bdl-dashboard-reader` and prove it can read
   only anonymous serving views, not source tables or Beachcomber datasets.
6. Inspect the four `bdl-*` service-account policies and the Brad Workload
   Identity pool. The deployer is additive, so confirm no unexpected
   pre-existing principal or role remains.
7. Confirm the Google-managed Cloud Scheduler service agent
   `service-1074630920917@gcp-sa-cloudscheduler.iam.gserviceaccount.com`
   retains `roles/cloudscheduler.serviceAgent`. The dedicated
   `bdl-dashboard-scheduler` account should have Run Invoker only on the two
   Brad jobs.
8. After signing off the multi-season/report-family reconciliation, run:

   ```bash
   export BRADS_CAMPSPOT_ACTIVATION_APPROVED=true
   node infra/dashboard/deploy.mjs --skip-build
   ```

   This creates/updates both triggers and monitoring. Verify their cron,
   timezone, alert policies, and email channel.
9. Make one authenticated request from the Vercel Production deployment and
   confirm WIF succeeds for the exact production subject. Do not log or copy the
   raw OIDC token.
10. Keep the dashboard private until GA4, Search Console, both Campspot inventory
   classes, attribution-match coverage, and Data Health reconcile.
11. Let both jobs run unattended for seven days before considering the rollout
   complete.
