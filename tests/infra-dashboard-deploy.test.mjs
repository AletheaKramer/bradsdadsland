import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  FIXED_PROJECT_ID,
  FIXED_CAMPSPOT_PROPERTY_ID,
  GMAIL_READONLY_SCOPE,
  VERCEL_PRODUCTION_SUBJECT,
  cloudRunJobArgs,
  configFromEnvironment,
  deploymentPlan,
  logsBasedMetrics,
  monitoringPolicies,
  parseOptions,
  schedulerArgs,
  assertInventoryMapActivationReady,
  assertScheduleActivationReady,
} from "../infra/dashboard/deploy.mjs";

const config = configFromEnvironment({
  environment: {},
  dryRun: true,
});

test("deployment stays in Brad's isolated project and source set", () => {
  const plan = deploymentPlan(config);
  assert.equal(plan.project, FIXED_PROJECT_ID);
  assert.equal(plan.bigQueryLocation, "US");
  assert.deepEqual(
    plan.jobs.map(({ name }) => name),
    ["brads-dashboard-campspot", "brads-dashboard-snapshot"]
  );
  assert.deepEqual(
    plan.schedules.map(({ cron, timeZone }) => ({ cron, timeZone })),
    [
      { cron: "*/30 * * * *", timeZone: "America/Vancouver" },
      { cron: "45 23 * * *", timeZone: "America/Vancouver" },
    ]
  );
  assert.doesNotMatch(
    JSON.stringify(plan),
    /google.?ads|meta.?ads|reddit|brevo|clarity|beachcomber_marketing_reporting/i
  );
});

test("deployment options support safe preview and staged schedule activation", () => {
  assert.deepEqual(
    parseOptions([
      "--dry-run",
      "--json",
      "--skip-build",
      "--skip-monitoring",
      "--skip-schedules",
    ]),
    {
      dryRun: true,
      json: true,
      skipBuild: true,
      skipMonitoring: true,
      skipSchedules: true,
    }
  );
  assert.equal(
    deploymentPlan(config).activation.campspotReconciliationAttested,
    false
  );
});

test("schedule activation requires explicit reconciliation and approved matching inventory metadata", () => {
  assert.throws(
    () => assertScheduleActivationReady(config),
    /BRADS_CAMPSPOT_ACTIVATION_APPROVED=true/
  );
  const approved = configFromEnvironment({
    environment: {
      BRADS_CAMPSPOT_PROPERTY_ID: FIXED_CAMPSPOT_PROPERTY_ID,
      BRADS_GA4_DATASET: "analytics_123456789",
      BRADS_CAMPSPOT_ACTIVATION_APPROVED: "true",
    },
    dryRun: false,
  });
  assert.throws(
    () => assertScheduleActivationReady(approved),
    /reviewStatus must be "approved"/
  );
  assert.throws(
    () =>
      assertInventoryMapActivationReady(approved, {
        propertyIdentifier: "5884",
        reviewStatus: "approved",
        exactSites: {
          A1: "campground",
          "11C": "vintage_trailer",
        },
      }),
    /propertyIdentifier must exactly match/
  );
  assert.doesNotThrow(() =>
    assertInventoryMapActivationReady(approved, {
      propertyIdentifier: FIXED_CAMPSPOT_PROPERTY_ID,
      reviewStatus: "approved",
      exactSites: {
        A1: "campground",
        "11C": "vintage_trailer",
      },
    })
  );
});

test("Campspot job enforces recipient, property, state, and keyless Gmail delegation", () => {
  const campspot = cloudRunJobArgs(config, "campspot").join("\n");
  assert.match(
    campspot,
    /CAMPSPOT_EXPECTED_RECIPIENT=data-ingest-bradsdadsland@beachcomberrv\.com/
  );
  assert.doesNotMatch(campspot, /CAMPSPOT_SUBJECT_PREFIX=/);
  assert.match(
    campspot,
    /CAMPSPOT_EXPECTED_PARK_ID=<required-campspot-property-id>/
  );
  assert.match(campspot, /BRADS_GA4_DATASET=<required-ga4-dataset>/);
  assert.match(
    campspot,
    /BRADS_SEARCH_CONSOLE_DATASET=searchconsole_bradsdadsland/
  );
  assert.match(
    campspot,
    /GOOGLE_WORKSPACE_DELEGATED_USER=admin@beachcomberrv\.com/
  );
  assert.match(
    campspot,
    /CAMPSPOT_STATE_GCS_URI=gs:\/\/focused-clock-498319-f5-brads-dashboard-state\/dashboard\/campspot-email-ingest-state\.json/
  );
  assert.match(
    campspot,
    /CAMPSPOT_INVENTORY_MAP_PATH=\/app\/config\/dashboard\/campspot-inventory-map\.json/
  );
  assert.doesNotMatch(
    campspot,
    /CAMPSPOT_GMAIL_(?:OAUTH|SECRET)|OAUTH_JSON|REFRESH_TOKEN/i
  );
});

test("Campspot subject prefix is optional defense-in-depth", () => {
  const prefixed = configFromEnvironment({
    environment: { CAMPSPOT_SUBJECT_PREFIX: "BDL" },
    dryRun: true,
  });
  assert.match(
    cloudRunJobArgs(prefixed, "campspot").join("\n"),
    /CAMPSPOT_SUBJECT_PREFIX=BDL/
  );
});

test("deployment cannot be redirected to another inbox or delegated user", () => {
  assert.throws(
    () =>
      configFromEnvironment({
        environment: { CAMPSPOT_EXPECTED_RECIPIENT: "other@example.com" },
        dryRun: true,
      }),
    /CAMPSPOT_EXPECTED_RECIPIENT must remain/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: { GOOGLE_WORKSPACE_DELEGATED_USER: "other@example.com" },
        dryRun: true,
      }),
    /GOOGLE_WORKSPACE_DELEGATED_USER must remain/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: { BRADS_SEARCH_CONSOLE_DATASET: "shared_marketing" },
        dryRun: true,
      }),
    /BRADS_SEARCH_CONSOLE_DATASET must remain/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: {
          BRADS_CAMPSPOT_PROPERTY_ID: FIXED_CAMPSPOT_PROPERTY_ID,
          CAMPSPOT_EXPECTED_PARK_ID: "5884",
        },
        dryRun: true,
      }),
    /CAMPSPOT_EXPECTED_PARK_ID must remain 1514/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: { BRADS_CAMPSPOT_PROPERTY_ID: "5884" },
        dryRun: true,
      }),
    /BRADS_CAMPSPOT_PROPERTY_ID must remain 1514/
  );
});

test("real deployment requires verified Campspot and native GA4 identifiers", () => {
  assert.throws(
    () => configFromEnvironment({ environment: {}, dryRun: false }),
    /BRADS_CAMPSPOT_PROPERTY_ID is required/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: {
          CAMPSPOT_EXPECTED_PARK_ID: FIXED_CAMPSPOT_PROPERTY_ID,
          BRADS_GA4_DATASET: "analytics_123456789",
        },
        dryRun: false,
      }),
    /BRADS_CAMPSPOT_PROPERTY_ID is required/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: {
          BRADS_CAMPSPOT_PROPERTY_ID: FIXED_CAMPSPOT_PROPERTY_ID,
        },
        dryRun: false,
      }),
    /BRADS_GA4_DATASET is required/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: {
          BRADS_CAMPSPOT_PROPERTY_ID: "REPLACE_WITH_VERIFIED_PROPERTY_ID",
          BRADS_GA4_DATASET: "analytics_123456789",
        },
        dryRun: false,
      }),
    /verified Campspot value, not a placeholder/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: {
          BRADS_CAMPSPOT_PROPERTY_ID: FIXED_CAMPSPOT_PROPERTY_ID,
          BRADS_GA4_DATASET: "G-5714F7Y7QK",
        },
        dryRun: false,
      }),
    /analytics_<numeric-property-id>/
  );
  assert.throws(
    () =>
      configFromEnvironment({
        environment: {
          BRADS_CAMPSPOT_PROPERTY_ID: FIXED_CAMPSPOT_PROPERTY_ID,
          BRADS_GA4_DATASET: "analytics_492144314",
        },
        dryRun: false,
      }),
    /Beachcomber's GA4 dataset/
  );
  assert.equal(
    configFromEnvironment({
      environment: {
        BRADS_CAMPSPOT_PROPERTY_ID: FIXED_CAMPSPOT_PROPERTY_ID,
        BRADS_GA4_DATASET: "analytics_123456789",
      },
      dryRun: false,
    }).campspotPropertyId,
    FIXED_CAMPSPOT_PROPERTY_ID
  );
});

test("Scheduler uses authenticated Cloud Run Jobs API calls with no retries", () => {
  for (const kind of ["campspot", "snapshot"]) {
    const args = schedulerArgs(config, kind).join("\n");
    assert.match(args, /--oauth-service-account-email=bdl-dashboard-scheduler/);
    assert.match(
      args,
      /--oauth-token-scope=https:\/\/www\.googleapis\.com\/auth\/cloud-platform/
    );
    assert.match(args, /--max-retry-attempts=0/);
    assert.match(args, /--time-zone=America\/Vancouver/);
  }
});

test("Workspace and Vercel trust are exact and least privilege", () => {
  const plan = deploymentPlan(config);
  assert.deepEqual(plan.workspaceDomainDelegation, {
    delegatedUser: "admin@beachcomberrv.com",
    serviceAccount:
      "bdl-workspace-reader@focused-clock-498319-f5.iam.gserviceaccount.com",
    oauthClientId: "<printed-after-service-account-creation>",
    scope: GMAIL_READONLY_SCOPE,
    manualAdminConsoleStepRequired: true,
  });
  assert.equal(plan.workloadIdentity.subject, VERCEL_PRODUCTION_SUBJECT);
  assert.equal(
    plan.workloadIdentity.issuer,
    "https://oidc.vercel.com/aletheakramers-projects"
  );
  assert.equal(
    plan.workloadIdentity.audience,
    "https://vercel.com/aletheakramers-projects"
  );
  assert.equal(plan.workloadIdentity.pool, "vercel-brads-dashboard");
  assert.equal(plan.workloadIdentity.provider, "vercel-brads-production");
});

test("activation runbooks keep previews valid and defer alerts with schedules", () => {
  const setup = fs.readFileSync(
    new URL("../docs/dashboard-setup.md", import.meta.url),
    "utf8"
  );
  const campspot = fs.readFileSync(
    new URL("../docs/campspot-scheduled-exports.md", import.meta.url),
    "utf8"
  );
  const readme = fs.readFileSync(
    new URL("../infra/dashboard/README.md", import.meta.url),
    "utf8"
  );
  const operations = fs.readFileSync(
    new URL("../marketing/analytics/dashboard-operations.md", import.meta.url),
    "utf8"
  );
  const workspaceAdmin = fs.readFileSync(
    new URL("../scripts/google-workspace-admin.mjs", import.meta.url),
    "utf8"
  );
  const campspotIngest = fs.readFileSync(
    new URL("../scripts/campspot-email-ingest.mjs", import.meta.url),
    "utf8"
  );

  for (const runbook of [setup, readme]) {
    assert.doesNotMatch(
      runbook,
      /analytics_REPLACE_WITH_NUMERIC_PROPERTY_ID/
    );
    assert.match(
      runbook,
      /deploy\.mjs --skip-schedules --skip-monitoring/
    );
  }
  assert.match(setup, /current GTM container has no published\s+tags or rules/);
  assert.match(setup, /single GA4 configuration/);
  assert.match(setup, /duplicate page views/);
  assert.match(setup, /analytics_492144314/);
  assert.match(setup, /roles\/cloudscheduler\.serviceAgent/);
  assert.doesNotMatch(campspot, /Begin date: Today/);
  assert.match(campspot, /literal `Campspot Scheduled Report`/);
  assert.match(campspot, /No Group creation or `ensure` command/);
  assert.doesNotMatch(
    operations,
    /google-workspace-admin\.mjs ensure\s*$/m
  );
  assert.match(workspaceAdmin, /allowExternalMembers: "false"/);
  for (const localAdminSource of [workspaceAdmin, campspotIngest]) {
    assert.doesNotMatch(localAdminSource, /beachcomberrv-ga4-oauth/);
    assert.match(
      localAdminSource,
      /bradsdadsland-google-oauth-client\.json/
    );
  }
});

test("monitoring covers failure, source absence, and data-health signals", () => {
  const metrics = logsBasedMetrics(config);
  assert.deepEqual(
    metrics.map(({ name }) => name),
    [
      "brads_dashboard_job_failures",
      "brads_campspot_ingest_success",
      "brads_snapshot_stale",
      "brads_dashboard_data_health_issues",
    ]
  );
  const policies = monitoringPolicies(
    "projects/focused-clock-498319-f5/notificationChannels/123"
  );
  assert.equal(policies.length, 4);
  assert.match(JSON.stringify(policies), /5400s/);
  assert.doesNotMatch(JSON.stringify(policies), /93600s/);
  assert.doesNotMatch(JSON.stringify(policies), /disableMetricValidation/);
  assert.match(JSON.stringify(metrics), /stale_booking_snapshot/);
  assert.match(JSON.stringify(metrics), /stale_ga4/);
  assert.match(JSON.stringify(metrics), /stale_search_console/);
  assert.match(JSON.stringify(metrics), /stale_campspot/);
  assert.match(JSON.stringify(metrics), /rejected_property/);
  assert.match(JSON.stringify(metrics), /excluded_property/);
  assert.match(JSON.stringify(metrics), /unknown_inventory/);
  assert.ok(
    policies.every(
      ({ notificationChannels }) => notificationChannels.length === 1
    )
  );
});

test("Cloud build context includes only runtime code and its inventory config", () => {
  const dockerfile = fs.readFileSync(
    new URL("../infra/dashboard/Dockerfile", import.meta.url),
    "utf8"
  );
  const dockerIgnore = fs.readFileSync(
    new URL("../.dockerignore", import.meta.url),
    "utf8"
  );
  const gcloudIgnore = fs.readFileSync(
    new URL("../.gcloudignore", import.meta.url),
    "utf8"
  );
  const deploySource = fs.readFileSync(
    new URL("../infra/dashboard/deploy.mjs", import.meta.url),
    "utf8"
  );
  const jobSource = fs.readFileSync(
    new URL("../scripts/cloud-dashboard-jobs.mjs", import.meta.url),
    "utf8"
  );

  assert.match(
    dockerfile,
    /COPY scripts\/cloud-dashboard-jobs\.mjs \.\/scripts\/cloud-dashboard-jobs\.mjs/
  );
  assert.match(dockerfile, /COPY scripts\/lib\/ \.\/scripts\/lib\//);
  assert.doesNotMatch(dockerfile, /COPY scripts\/ \.\/scripts\//);
  assert.doesNotMatch(dockerfile, /google-workspace-admin/);
  assert.match(
    dockerfile,
    /COPY config\/dashboard\/campspot-inventory-map\.json \.\/config\/dashboard\/campspot-inventory-map\.json/
  );
  assert.match(
    dockerfile,
    /google-cloud-cli:577\.0\.0-stable@sha256:[a-f0-9]{64}/
  );
  assert.match(
    dockerfile,
    /COPY --from=node-runtime \/usr\/local\/bin\/node \/usr\/local\/bin\/node/
  );
  assert.match(dockerfile, /bq version/);
  assert.match(
    dockerfile,
    /ENTRYPOINT \["node", "scripts\/cloud-dashboard-jobs\.mjs"\]/
  );
  assert.match(
    deploySource,
    /"buckets",\s+"update",[\s\S]*?"--uniform-bucket-level-access",\s+"--public-access-prevention"/
  );
  assert.match(deploySource, /--format=value\(oauth2ClientId\)/);
  assert.doesNotMatch(deploySource, /--format=value\(uniqueId\)/);
  assert.match(
    jobSource,
    /row\.check_key === "freshness_campspot"[\s\S]*?issueType = "stale_campspot"/
  );
  for (const ignoreFile of [dockerIgnore, gcloudIgnore]) {
    assert.match(ignoreFile, /^\*\*/m);
    assert.match(ignoreFile, /!scripts\/cloud-dashboard-jobs\.mjs/);
    assert.match(ignoreFile, /!scripts\/lib\/\*\*/);
    assert.doesNotMatch(ignoreFile, /!scripts\/\*\*/);
    assert.doesNotMatch(ignoreFile, /google-workspace-admin/);
    assert.match(ignoreFile, /!config\/dashboard\/campspot-inventory-map\.json/);
    assert.doesNotMatch(ignoreFile, /!\.env/);
  }
});
