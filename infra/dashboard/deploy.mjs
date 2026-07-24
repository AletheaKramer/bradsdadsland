#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const FIXED_PROJECT_ID = "focused-clock-498319-f5";
export const FIXED_PROJECT_NUMBER = "1074630920917";
export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";
export const VERCEL_PRODUCTION_SUBJECT =
  "owner:aletheakramers-projects:project:bradsdadsland:environment:production";
export const FIXED_CAMPSPOT_PROPERTY_ID = "1514";
const FIXED_CAMPSPOT_RECIPIENT =
  "data-ingest-bradsdadsland@beachcomberrv.com";
const FIXED_WORKSPACE_DELEGATED_USER = "admin@beachcomberrv.com";
const FIXED_SEARCH_CONSOLE_DATASET = "searchconsole_bradsdadsland";
const KNOWN_BEACHCOMBER_GA4_DATASETS = new Set(["analytics_492144314"]);

const IDENTIFIER = /^[a-z][a-z0-9_-]{0,62}$/;
const IMAGE_TAG = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const REGION = /^[a-z]+-[a-z]+[0-9]$/;
const BUCKET = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;
const GA4_DATASET = /^analytics_[0-9]+$/;
const SAFE_VALUE = /^[^\r\n,]{1,256}$/;

const value = (environment, name, fallback = "") =>
  String(environment[name] || fallback).trim();

const identifier = (input, label) => {
  if (!IDENTIFIER.test(input)) {
    throw new Error(`${label} must be a lower-case Google Cloud identifier.`);
  }
  return input;
};

const safeValue = (input, label) => {
  if (!SAFE_VALUE.test(input)) {
    throw new Error(`${label} contains an unsupported comma or line break.`);
  }
  return input;
};

const optionalSafeValue = (input, label) =>
  input ? safeValue(input, label) : "";
const enabled = (input) =>
  ["1", "true", "yes", "on"].includes(String(input || "").trim().toLowerCase());

export const parseOptions = (argv = process.argv.slice(2)) => {
  const options = {
    dryRun: false,
    json: false,
    skipBuild: false,
    skipMonitoring: false,
    skipSchedules: false,
  };
  for (const argument of argv) {
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--json") options.json = true;
    else if (argument === "--skip-build") options.skipBuild = true;
    else if (argument === "--skip-monitoring") options.skipMonitoring = true;
    else if (argument === "--skip-schedules") options.skipSchedules = true;
    else throw new Error(`Unsupported option: ${argument}`);
  }
  return options;
};

export const configFromEnvironment = ({
  environment = process.env,
  dryRun = false,
} = {}) => {
  const project = value(
    environment,
    "BRADS_DASHBOARD_GCP_PROJECT",
    value(environment, "BRADS_GCP_PROJECT", FIXED_PROJECT_ID)
  );
  if (project !== FIXED_PROJECT_ID) {
    throw new Error(
      `BRADS_DASHBOARD_GCP_PROJECT must remain ${FIXED_PROJECT_ID}.`
    );
  }

  const projectNumber = value(
    environment,
    "BRADS_DASHBOARD_GCP_PROJECT_NUMBER",
    FIXED_PROJECT_NUMBER
  );
  if (projectNumber !== FIXED_PROJECT_NUMBER) {
    throw new Error(
      `BRADS_DASHBOARD_GCP_PROJECT_NUMBER must remain ${FIXED_PROJECT_NUMBER}.`
    );
  }

  const region = value(
    environment,
    "BRADS_DASHBOARD_GCP_REGION",
    "us-west1"
  );
  if (!REGION.test(region)) {
    throw new Error("BRADS_DASHBOARD_GCP_REGION is not a valid region.");
  }

  const location = value(
    environment,
    "BRADS_DASHBOARD_BIGQUERY_LOCATION",
    value(environment, "BRADS_BIGQUERY_LOCATION", "US")
  ).toUpperCase();
  if (location !== "US") {
    throw new Error(
      "BRADS_DASHBOARD_BIGQUERY_LOCATION must remain the US multi-region."
    );
  }

  const propertyId = value(environment, "BRADS_CAMPSPOT_PROPERTY_ID");
  const localExpectedPropertyId = value(
    environment,
    "CAMPSPOT_EXPECTED_PARK_ID"
  );
  if (
    propertyId &&
    /^(?:<required|replace(?:[_\s-]+with)?|placeholder(?:[_\s-]|$))/i.test(
      propertyId
    )
  ) {
    throw new Error(
      "BRADS_CAMPSPOT_PROPERTY_ID must be the verified Campspot value, not a placeholder."
    );
  }
  if (propertyId && propertyId !== FIXED_CAMPSPOT_PROPERTY_ID) {
    throw new Error(
      `BRADS_CAMPSPOT_PROPERTY_ID must remain ${FIXED_CAMPSPOT_PROPERTY_ID}.`
    );
  }
  if (
    localExpectedPropertyId &&
    localExpectedPropertyId !== FIXED_CAMPSPOT_PROPERTY_ID
  ) {
    throw new Error(
      `CAMPSPOT_EXPECTED_PARK_ID must remain ${FIXED_CAMPSPOT_PROPERTY_ID}.`
    );
  }
  if (
    propertyId &&
    localExpectedPropertyId &&
    propertyId !== localExpectedPropertyId
  ) {
    throw new Error(
      "CAMPSPOT_EXPECTED_PARK_ID must match BRADS_CAMPSPOT_PROPERTY_ID when both are set."
    );
  }
  if (!propertyId && !dryRun) {
    throw new Error(
      "BRADS_CAMPSPOT_PROPERTY_ID is required for a real deployment."
    );
  }
  const ga4Dataset = value(environment, "BRADS_GA4_DATASET");
  if (!ga4Dataset && !dryRun) {
    throw new Error(
      "BRADS_GA4_DATASET is required for a real deployment after the native GA4 export creates analytics_<property-id>."
    );
  }
  if (ga4Dataset && !GA4_DATASET.test(ga4Dataset)) {
    throw new Error(
      "BRADS_GA4_DATASET must use GA4's analytics_<numeric-property-id> format."
    );
  }
  if (KNOWN_BEACHCOMBER_GA4_DATASETS.has(ga4Dataset)) {
    throw new Error(
      `${ga4Dataset} is Beachcomber's GA4 dataset and cannot be used by Brad's dashboard.`
    );
  }
  const searchConsoleDataset = value(
    environment,
    "BRADS_SEARCH_CONSOLE_DATASET",
    FIXED_SEARCH_CONSOLE_DATASET
  );
  if (searchConsoleDataset !== FIXED_SEARCH_CONSOLE_DATASET) {
    throw new Error(
      `BRADS_SEARCH_CONSOLE_DATASET must remain ${FIXED_SEARCH_CONSOLE_DATASET}.`
    );
  }
  const campspotRecipient = safeValue(
    value(
      environment,
      "CAMPSPOT_EXPECTED_RECIPIENT",
      FIXED_CAMPSPOT_RECIPIENT
    ).toLowerCase(),
    "CAMPSPOT_EXPECTED_RECIPIENT"
  );
  if (campspotRecipient !== FIXED_CAMPSPOT_RECIPIENT) {
    throw new Error(
      `CAMPSPOT_EXPECTED_RECIPIENT must remain ${FIXED_CAMPSPOT_RECIPIENT}.`
    );
  }
  const workspaceDelegatedUser = safeValue(
    value(
      environment,
      "GOOGLE_WORKSPACE_DELEGATED_USER",
      FIXED_WORKSPACE_DELEGATED_USER
    ).toLowerCase(),
    "GOOGLE_WORKSPACE_DELEGATED_USER"
  );
  if (workspaceDelegatedUser !== FIXED_WORKSPACE_DELEGATED_USER) {
    throw new Error(
      `GOOGLE_WORKSPACE_DELEGATED_USER must remain ${FIXED_WORKSPACE_DELEGATED_USER}.`
    );
  }

  const repository = identifier(
    value(
      environment,
      "BRADS_DASHBOARD_AR_REPOSITORY",
      "brads-dashboard"
    ),
    "BRADS_DASHBOARD_AR_REPOSITORY"
  );
  const imageTag = value(
    environment,
    "BRADS_DASHBOARD_IMAGE_TAG",
    "latest"
  );
  if (!IMAGE_TAG.test(imageTag)) {
    throw new Error("BRADS_DASHBOARD_IMAGE_TAG is not a valid image tag.");
  }
  const stateBucket = value(
    environment,
    "BRADS_DASHBOARD_STATE_BUCKET",
    `${project}-brads-dashboard-state`
  );
  if (!BUCKET.test(stateBucket)) {
    throw new Error("BRADS_DASHBOARD_STATE_BUCKET is not a valid bucket name.");
  }

  const serviceAccountEmail = (accountId) =>
    `${accountId}@${project}.iam.gserviceaccount.com`;

  return {
    project,
    projectNumber,
    region,
    schedulerRegion: region,
    bigQueryLocation: location,
    reportingDataset: "bradsdadsland_reporting",
    servingDataset: "bradsdadsland_dashboard",
    ga4Dataset: ga4Dataset || "<required-ga4-dataset>",
    searchConsoleDataset,
    repository,
    imageTag,
    image: `${region}-docker.pkg.dev/${project}/${repository}/brads-dashboard-jobs:${imageTag}`,
    stateBucket,
    stateUri: `gs://${stateBucket}/dashboard/campspot-email-ingest-state.json`,
    campspotPropertyId:
      propertyId || "<required-campspot-property-id>",
    campspotParkName: safeValue(
      value(
        environment,
        "CAMPSPOT_EXPECTED_PARK_NAME",
        "Brad's Dads Land"
      ),
      "CAMPSPOT_EXPECTED_PARK_NAME"
    ),
    campspotRecipient,
    campspotSubjectPrefix: optionalSafeValue(
      value(environment, "CAMPSPOT_SUBJECT_PREFIX"),
      "CAMPSPOT_SUBJECT_PREFIX"
    ),
    campspotActivationApproved: enabled(
      value(environment, "BRADS_CAMPSPOT_ACTIVATION_APPROVED")
    ),
    workspaceDelegatedUser,
    monitoringEmail: safeValue(
      value(
        environment,
        "BRADS_DASHBOARD_MONITORING_EMAIL",
        "admin@beachcomberrv.com"
      ),
      "BRADS_DASHBOARD_MONITORING_EMAIL"
    ),
    jobServiceAccount: serviceAccountEmail("bdl-dashboard-jobs"),
    workspaceServiceAccount: serviceAccountEmail("bdl-workspace-reader"),
    schedulerServiceAccount: serviceAccountEmail(
      "bdl-dashboard-scheduler"
    ),
    readerServiceAccount: serviceAccountEmail("bdl-dashboard-reader"),
    workloadIdentityPool: "vercel-brads-dashboard",
    workloadIdentityProvider: "vercel-brads-production",
    vercelIssuer: "https://oidc.vercel.com/aletheakramers-projects",
    vercelAudience: "https://vercel.com/aletheakramers-projects",
    vercelSubject: VERCEL_PRODUCTION_SUBJECT,
    inventoryMapPath:
      "/app/config/dashboard/campspot-inventory-map.json",
  };
};

export const jobName = (kind) => `brads-dashboard-${kind}`;

const environmentFlag = (entries) => {
  const serialized = Object.entries(entries)
    .map(([key, entryValue]) => {
      safeValue(String(entryValue), key);
      return `${key}=${entryValue}`;
    })
    .join(",");
  return `--set-env-vars=${serialized}`;
};

export const cloudRunJobArgs = (config, kind) => {
  if (!new Set(["campspot", "snapshot"]).has(kind)) {
    throw new Error(`Unsupported dashboard job: ${kind}`);
  }

  const isCampspot = kind === "campspot";
  const runtimeServiceAccount = isCampspot
    ? config.workspaceServiceAccount
    : config.jobServiceAccount;
  const commonEnvironment = {
    BRADS_GCP_PROJECT: config.project,
    BRADS_REPORTING_DATASET: config.reportingDataset,
    BRADS_SERVING_DATASET: config.servingDataset,
    BRADS_GA4_DATASET: config.ga4Dataset,
    BRADS_SEARCH_CONSOLE_DATASET: config.searchConsoleDataset,
    BRADS_BIGQUERY_LOCATION: config.bigQueryLocation,
    CAMPSPOT_INVENTORY_MAP_PATH: config.inventoryMapPath,
  };
  const jobEnvironment = isCampspot
    ? {
        ...commonEnvironment,
        CAMPSPOT_STATE_GCS_URI: config.stateUri,
        CAMPSPOT_EMAIL_INGEST_MAX: "500",
        CAMPSPOT_EXPECTED_RECIPIENT: config.campspotRecipient,
        ...(config.campspotSubjectPrefix
          ? { CAMPSPOT_SUBJECT_PREFIX: config.campspotSubjectPrefix }
          : {}),
        CAMPSPOT_EXPECTED_PARK_ID: config.campspotPropertyId,
        CAMPSPOT_EXPECTED_PARK_NAME: config.campspotParkName,
        GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL:
          config.workspaceServiceAccount,
        GOOGLE_WORKSPACE_DELEGATED_USER:
          config.workspaceDelegatedUser,
      }
    : commonEnvironment;

  return [
    "run",
    "jobs",
    "deploy",
    jobName(kind),
    `--project=${config.project}`,
    `--region=${config.region}`,
    `--image=${config.image}`,
    `--service-account=${runtimeServiceAccount}`,
    "--tasks=1",
    "--parallelism=1",
    "--max-retries=0",
    "--task-timeout=30m",
    "--cpu=1",
    "--memory=512Mi",
    `--args=${kind}`,
    environmentFlag(jobEnvironment),
    "--clear-secrets",
    `--labels=application=brads-dashboard,component=${kind}`,
    "--quiet",
  ];
};

export const schedulerArgs = (
  config,
  kind,
  mode = "create"
) => {
  const schedule = kind === "campspot" ? "*/30 * * * *" : "45 23 * * *";
  return [
    "scheduler",
    "jobs",
    mode,
    "http",
    `${jobName(kind)}-schedule`,
    `--project=${config.project}`,
    `--location=${config.schedulerRegion}`,
    `--schedule=${schedule}`,
    "--time-zone=America/Vancouver",
    `--uri=https://run.googleapis.com/v2/projects/${config.project}/locations/${config.region}/jobs/${jobName(kind)}:run`,
    "--http-method=POST",
    "--headers=Content-Type=application/json",
    "--message-body={}",
    `--oauth-service-account-email=${config.schedulerServiceAccount}`,
    "--oauth-token-scope=https://www.googleapis.com/auth/cloud-platform",
    "--max-retry-attempts=0",
    "--attempt-deadline=1800s",
    "--quiet",
  ];
};

export const logsBasedMetrics = (config) => {
  const jobFilter = [
    'resource.type="cloud_run_job"',
    `resource.labels.job_name=~"^${jobName("(campspot|snapshot)")}$"`,
  ].join("\n");
  return [
    {
      name: "brads_dashboard_job_failures",
      description:
        "Brad's dashboard Cloud Run jobs that emitted a terminal failure.",
      filter: `${jobFilter}\njsonPayload.event="job_failed"`,
    },
    {
      name: "brads_campspot_ingest_success",
      description:
        "Successful Brad's Campspot inbox checks, expected every 30 minutes.",
      filter: [
        'resource.type="cloud_run_job"',
        `resource.labels.job_name="${jobName("campspot")}"`,
        'jsonPayload.event="job_completed"',
        'jsonPayload.command="campspot"',
      ].join("\n"),
    },
    {
      name: "brads_snapshot_stale",
      description:
        "Brad's booking-pace snapshot freshness failures emitted by Data Health.",
      filter: [
        'resource.type="cloud_run_job"',
        'jsonPayload.event="dashboard_data_health_issue"',
        'jsonPayload.issue_type="stale_booking_snapshot"',
      ].join("\n"),
    },
    {
      name: "brads_dashboard_data_health_issues",
      description:
        "Stale source data, rejected or excluded property rows, or unknown inventory.",
      filter: [
        'resource.type="cloud_run_job"',
        'jsonPayload.event="dashboard_data_health_issue"',
        '(jsonPayload.issue_type="stale_ga4" OR jsonPayload.issue_type="stale_search_console" OR jsonPayload.issue_type="stale_campspot" OR jsonPayload.issue_type="rejected_property" OR jsonPayload.issue_type="excluded_property" OR jsonPayload.issue_type="unknown_inventory")',
      ].join("\n"),
    },
  ];
};

const sumAggregation = (alignmentPeriod = "60s") => [
  {
    alignmentPeriod,
    perSeriesAligner: "ALIGN_SUM",
    crossSeriesReducer: "REDUCE_SUM",
  },
];

const thresholdCondition = ({
  displayName,
  metric,
  duration = "0s",
}) => ({
  displayName,
  conditionThreshold: {
    filter: `metric.type="logging.googleapis.com/user/${metric}" AND resource.type="cloud_run_job"`,
    comparison: "COMPARISON_GT",
    thresholdValue: 0,
    duration,
    aggregations: sumAggregation(),
    trigger: { count: 1 },
  },
});

const absenceCondition = ({
  displayName,
  metric,
  duration,
  alignmentPeriod,
}) => ({
  displayName,
  conditionAbsent: {
    filter: `metric.type="logging.googleapis.com/user/${metric}" AND resource.type="cloud_run_job"`,
    duration,
    aggregations: sumAggregation(alignmentPeriod),
    trigger: { count: 1 },
  },
});

export const monitoringPolicies = (notificationChannel = "") => {
  const policy = (displayName, documentation, condition) => ({
    displayName,
    documentation: {
      content: documentation,
      mimeType: "text/markdown",
    },
    conditions: [condition],
    combiner: "OR",
    enabled: true,
    notificationChannels: notificationChannel
      ? [notificationChannel]
      : [],
    userLabels: {
      application: "brads_dashboard",
      managed_by: "repo_deploy",
    },
    alertStrategy: {
      autoClose: "604800s",
      notificationPrompts: ["OPENED", "CLOSED"],
    },
  });

  return [
    policy(
      "[Brad's Dashboard] Managed job failure",
      "A Brad's Campspot ingest or booking snapshot job failed. Inspect the Cloud Run execution and Data Health before retrying.",
      thresholdCondition({
        displayName: "Cloud Run job emitted job_failed",
        metric: "brads_dashboard_job_failures",
      })
    ),
    policy(
      "[Brad's Dashboard] Campspot ingest missing",
      "No successful Brad's Campspot inbox check has been observed for 90 minutes. The normal schedule is every 30 minutes.",
      absenceCondition({
        displayName: "Campspot success absent for 90 minutes",
        metric: "brads_campspot_ingest_success",
        duration: "5400s",
        alignmentPeriod: "1800s",
      })
    ),
    policy(
      "[Brad's Dashboard] Booking snapshot missing",
      "Data Health found no current observed Brad's booking-pace snapshot. The normal schedule is 23:45 America/Vancouver.",
      thresholdCondition({
        displayName: "Booking snapshot freshness check failed",
        metric: "brads_snapshot_stale",
      })
    ),
    policy(
      "[Brad's Dashboard] Data health issue",
      "The Brad's pipeline reported stale source coverage, rejected or excluded non-Brad property rows, or an unmapped Campspot inventory label.",
      thresholdCondition({
        displayName: "Pipeline emitted a data-health issue",
        metric: "brads_dashboard_data_health_issues",
      })
    ),
  ];
};

export const deploymentPlan = (config) => ({
  project: config.project,
  projectNumber: config.projectNumber,
  region: config.region,
  bigQueryLocation: config.bigQueryLocation,
  APIs: [
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "gmail.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "sts.googleapis.com",
  ],
  serviceAccounts: {
    jobs: config.jobServiceAccount,
    workspaceReader: config.workspaceServiceAccount,
    scheduler: config.schedulerServiceAccount,
    dashboardReader: config.readerServiceAccount,
  },
  datasets: {
    reporting: config.reportingDataset,
    serving: config.servingDataset,
    ga4: config.ga4Dataset,
    searchConsole: config.searchConsoleDataset,
  },
  state: {
    bucket: config.stateBucket,
    object: config.stateUri,
  },
  activation: {
    campspotReconciliationAttested: config.campspotActivationApproved,
    schedulesRequireReviewedCampgroundAndVintageMap: true,
  },
  image: config.image,
  build: [
    "gcloud",
    "builds",
    "submit",
    `--project=${config.project}`,
    "--config=infra/dashboard/cloudbuild.yaml",
    `--substitutions=_IMAGE=${config.image}`,
    "--quiet",
    ".",
  ],
  jobs: ["campspot", "snapshot"].map((kind) => ({
    name: jobName(kind),
    command: ["gcloud", ...cloudRunJobArgs(config, kind)],
  })),
  schedules: ["campspot", "snapshot"].map((kind) => ({
    name: `${jobName(kind)}-schedule`,
    timeZone: "America/Vancouver",
    cron: kind === "campspot" ? "*/30 * * * *" : "45 23 * * *",
    createCommand: ["gcloud", ...schedulerArgs(config, kind, "create")],
    updateCommand: ["gcloud", ...schedulerArgs(config, kind, "update")],
  })),
  workspaceDomainDelegation: {
    delegatedUser: config.workspaceDelegatedUser,
    serviceAccount: config.workspaceServiceAccount,
    oauthClientId: "<printed-after-service-account-creation>",
    scope: GMAIL_READONLY_SCOPE,
    manualAdminConsoleStepRequired: true,
  },
  workloadIdentity: {
    pool: config.workloadIdentityPool,
    provider: config.workloadIdentityProvider,
    issuer: config.vercelIssuer,
    audience: config.vercelAudience,
    subject: config.vercelSubject,
  },
  monitoring: {
    email: config.monitoringEmail,
    metrics: logsBasedMetrics(config),
    policies: monitoringPolicies(),
    emailVerificationRequired: true,
  },
});

const execute = (
  command,
  args,
  { capture = false, allowFailure = false } = {}
) => {
  const result = spawnSync(command, args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      String(
        result.stderr ||
          result.stdout ||
          `${command} failed with exit code ${result.status}`
      ).trim()
    );
  }
  return result;
};

const exists = (command, args) =>
  execute(command, args, {
    capture: true,
    allowFailure: true,
  }).status === 0;

const ensureServiceAccount = (config, accountId, displayName) => {
  const email = `${accountId}@${config.project}.iam.gserviceaccount.com`;
  if (
    exists("gcloud", [
      "iam",
      "service-accounts",
      "describe",
      email,
      `--project=${config.project}`,
      "--quiet",
    ])
  ) {
    return;
  }
  execute("gcloud", [
    "iam",
    "service-accounts",
    "create",
    accountId,
    `--project=${config.project}`,
    `--display-name=${displayName}`,
    "--quiet",
  ]);
};

const ensureRepository = (config) => {
  const describe = [
    "artifacts",
    "repositories",
    "describe",
    config.repository,
    `--project=${config.project}`,
    `--location=${config.region}`,
    "--quiet",
  ];
  if (exists("gcloud", describe)) return;
  execute("gcloud", [
    "artifacts",
    "repositories",
    "create",
    config.repository,
    `--project=${config.project}`,
    `--location=${config.region}`,
    "--repository-format=docker",
    "--description=Brad's Dads Land dashboard managed job images",
    "--quiet",
  ]);
};

const ensureBucket = (config) => {
  const bucketExists = exists("gcloud", [
    "storage",
    "buckets",
    "describe",
    `gs://${config.stateBucket}`,
    `--project=${config.project}`,
    "--quiet",
  ]);
  if (!bucketExists) {
    execute("gcloud", [
      "storage",
      "buckets",
      "create",
      `gs://${config.stateBucket}`,
      `--project=${config.project}`,
      `--location=${config.bigQueryLocation}`,
      "--uniform-bucket-level-access",
      "--public-access-prevention",
      "--quiet",
    ]);
  }
  execute("gcloud", [
    "storage",
    "buckets",
    "update",
    `gs://${config.stateBucket}`,
    "--uniform-bucket-level-access",
    "--public-access-prevention",
    "--quiet",
  ]);
};

const ensureDataset = (config, dataset, description) => {
  if (
    exists("bq", [
      `--project_id=${config.project}`,
      "show",
      "--dataset",
      `${config.project}:${dataset}`,
    ])
  ) {
    return;
  }
  execute("bq", [
    `--project_id=${config.project}`,
    `--location=${config.bigQueryLocation}`,
    "mk",
    "--dataset",
    `--description=${description}`,
    `${config.project}:${dataset}`,
  ]);
};

const addProjectRole = (config, serviceAccount, role) =>
  execute("gcloud", [
    "projects",
    "add-iam-policy-binding",
    config.project,
    `--member=serviceAccount:${serviceAccount}`,
    `--role=${role}`,
    "--condition=None",
    "--quiet",
  ]);

const addDatasetRole = (config, dataset, serviceAccount, role) =>
  execute("bq", [
    `--project_id=${config.project}`,
    "add-iam-policy-binding",
    `--member=serviceAccount:${serviceAccount}`,
    `--role=${role}`,
    "--dataset",
    `${config.project}:${dataset}`,
  ]);

const ensureWorkloadIdentity = (config) => {
  const poolDescribe = [
    "iam",
    "workload-identity-pools",
    "describe",
    config.workloadIdentityPool,
    "--location=global",
    `--project=${config.project}`,
    "--quiet",
  ];
  if (!exists("gcloud", poolDescribe)) {
    execute("gcloud", [
      "iam",
      "workload-identity-pools",
      "create",
      config.workloadIdentityPool,
      "--location=global",
      `--project=${config.project}`,
      "--display-name=Brad's Vercel dashboard",
      "--description=Production-only Brad's Dads Land Vercel OIDC",
      "--quiet",
    ]);
  }

  const providerBase = [
    config.workloadIdentityProvider,
    `--workload-identity-pool=${config.workloadIdentityPool}`,
    "--location=global",
    `--project=${config.project}`,
  ];
  const providerSettings = [
    `--issuer-uri=${config.vercelIssuer}`,
    `--allowed-audiences=${config.vercelAudience}`,
    "--attribute-mapping=google.subject=assertion.sub,attribute.environment=assertion.environment,attribute.owner=assertion.owner,attribute.project=assertion.project",
    `--attribute-condition=assertion.sub == '${config.vercelSubject}'`,
    "--display-name=Brad's Vercel production",
    "--description=Exact production subject for the bradsdadsland Vercel project",
    "--quiet",
  ];
  const providerDescribe = [
    "iam",
    "workload-identity-pools",
    "providers",
    "describe",
    ...providerBase,
    "--quiet",
  ];
  const providerMode = exists("gcloud", providerDescribe)
    ? "update-oidc"
    : "create-oidc";
  execute("gcloud", [
    "iam",
    "workload-identity-pools",
    "providers",
    providerMode,
    ...providerBase,
    ...providerSettings,
  ]);

  const principal = [
    `principal://iam.googleapis.com/projects/${config.projectNumber}`,
    "locations/global/workloadIdentityPools",
    `${config.workloadIdentityPool}/subject/${config.vercelSubject}`,
  ].join("/");
  execute("gcloud", [
    "iam",
    "service-accounts",
    "add-iam-policy-binding",
    config.readerServiceAccount,
    `--project=${config.project}`,
    `--member=${principal}`,
    "--role=roles/iam.workloadIdentityUser",
    "--condition=None",
    "--quiet",
  ]);
};

const ensureRuntimeIam = (config) => {
  for (const serviceAccount of [
    config.jobServiceAccount,
    config.workspaceServiceAccount,
    config.readerServiceAccount,
  ]) {
    addProjectRole(
      config,
      serviceAccount,
      "roles/bigquery.jobUser"
    );
  }

  for (const serviceAccount of [
    config.jobServiceAccount,
    config.workspaceServiceAccount,
  ]) {
    addDatasetRole(
      config,
      config.reportingDataset,
      serviceAccount,
      "roles/bigquery.dataEditor"
    );
  }
  addDatasetRole(
    config,
    config.servingDataset,
    config.readerServiceAccount,
    "roles/bigquery.dataViewer"
  );

  execute("gcloud", [
    "storage",
    "buckets",
    "add-iam-policy-binding",
    `gs://${config.stateBucket}`,
    `--project=${config.project}`,
    `--member=serviceAccount:${config.workspaceServiceAccount}`,
    "--role=roles/storage.objectUser",
    "--condition=None",
    "--quiet",
  ]);
  execute("gcloud", [
    "iam",
    "service-accounts",
    "add-iam-policy-binding",
    config.workspaceServiceAccount,
    `--project=${config.project}`,
    `--member=serviceAccount:${config.workspaceServiceAccount}`,
    "--role=roles/iam.serviceAccountTokenCreator",
    "--condition=None",
    "--quiet",
  ]);
};

const ensureScheduler = (config, kind) => {
  const schedulerName = `${jobName(kind)}-schedule`;
  const schedulerExists = exists("gcloud", [
    "scheduler",
    "jobs",
    "describe",
    schedulerName,
    `--project=${config.project}`,
    `--location=${config.schedulerRegion}`,
    "--quiet",
  ]);
  execute(
    "gcloud",
    schedulerArgs(
      config,
      kind,
      schedulerExists ? "update" : "create"
    )
  );
};

const ensureLogMetric = (config, metric) => {
  const metricExists = exists("gcloud", [
    "logging",
    "metrics",
    "describe",
    metric.name,
    `--project=${config.project}`,
    "--quiet",
  ]);
  execute("gcloud", [
    "logging",
    "metrics",
    metricExists ? "update" : "create",
    metric.name,
    `--project=${config.project}`,
    `--description=${metric.description}`,
    `--log-filter=${metric.filter}`,
    "--quiet",
  ]);
};

const monitoringRequest = async ({
  token,
  path: requestPath,
  method = "GET",
  body,
}) => {
  const response = await fetch(
    `https://monitoring.googleapis.com/v3/${requestPath}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(
      `Cloud Monitoring ${method} ${requestPath} failed (${response.status}): ${text.slice(0, 500)}`
    );
  }
  return payload;
};

const monitoringAccessToken = () => {
  const result = execute(
    "gcloud",
    ["auth", "print-access-token", "--quiet"],
    { capture: true }
  );
  const token = result.stdout.trim();
  if (!token) throw new Error("gcloud returned no access token.");
  return token;
};

const ensureNotificationChannel = async (config, token) => {
  const parent = `projects/${config.project}`;
  const channels = await monitoringRequest({
    token,
    path: `${parent}/notificationChannels`,
  });
  const existing = (channels.notificationChannels || []).find(
    (channel) =>
      channel.type === "email" &&
      channel.labels?.email_address === config.monitoringEmail
  );
  if (existing) return existing.name;

  const created = await monitoringRequest({
    token,
    path: `${parent}/notificationChannels`,
    method: "POST",
    body: {
      type: "email",
      displayName: "Brad's dashboard alerts",
      description:
        "Cloud Run and data-health alerts for Brad's Dads Land.",
      labels: { email_address: config.monitoringEmail },
      enabled: true,
      userLabels: { application: "brads_dashboard" },
    },
  });
  if (created.verificationStatus === "UNVERIFIED") {
    await monitoringRequest({
      token,
      path: `${created.name}:sendVerificationCode`,
      method: "POST",
      body: {},
    });
  }
  return created.name;
};

const ensureAlertPolicy = async (config, token, desiredPolicy) => {
  const parent = `projects/${config.project}`;
  const filter = encodeURIComponent(
    `display_name="${desiredPolicy.displayName}"`
  );
  const current = await monitoringRequest({
    token,
    path: `${parent}/alertPolicies?filter=${filter}`,
  });
  const existing = (current.alertPolicies || []).find(
    (policy) => policy.displayName === desiredPolicy.displayName
  );
  if (!existing) {
    await monitoringRequest({
      token,
      path: `${parent}/alertPolicies`,
      method: "POST",
      body: desiredPolicy,
    });
    return;
  }

  const updateMask = encodeURIComponent(
    [
      "displayName",
      "documentation",
      "conditions",
      "combiner",
      "enabled",
      "notificationChannels",
      "userLabels",
      "alertStrategy",
    ].join(",")
  );
  await monitoringRequest({
    token,
    path: `${existing.name}?updateMask=${updateMask}`,
    method: "PATCH",
    body: { ...desiredPolicy, name: existing.name },
  });
};

const ensureMonitoring = async (config) => {
  for (const metric of logsBasedMetrics(config)) {
    ensureLogMetric(config, metric);
  }
  const token = monitoringAccessToken();
  const channel = await ensureNotificationChannel(config, token);
  for (const policy of monitoringPolicies(channel)) {
    await ensureAlertPolicy(config, token, policy);
  }
  return channel;
};

export const assertInventoryMapActivationReady = (config, inventoryMap) => {
  if (
    String(inventoryMap.propertyIdentifier || "").trim() !==
    config.campspotPropertyId
  ) {
    throw new Error(
      "Cannot enable schedules: the inventory map propertyIdentifier must exactly match BRADS_CAMPSPOT_PROPERTY_ID."
    );
  }
  if (inventoryMap.reviewStatus !== "approved") {
    throw new Error(
      'Cannot enable schedules: the inventory map reviewStatus must be "approved".'
    );
  }
  const exactClasses = [
    ...Object.values(inventoryMap.exactSites || {}),
    ...Object.values(inventoryMap.exactSiteTypes || {}),
  ];
  for (const requiredClass of ["campground", "vintage_trailer"]) {
    if (!exactClasses.includes(requiredClass)) {
      throw new Error(
        `Cannot enable schedules: the reviewed inventory map has no exact ${requiredClass} classification.`
      );
    }
  }
};

export const assertScheduleActivationReady = (config) => {
  if (!config.campspotActivationApproved) {
    throw new Error(
      "BRADS_CAMPSPOT_ACTIVATION_APPROVED=true is required to enable schedules after the multi-season backfill and inventory reconciliation are complete."
    );
  }
  const mapPath = path.join(
    REPOSITORY_ROOT,
    "config",
    "dashboard",
    "campspot-inventory-map.json"
  );
  const inventoryMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  assertInventoryMapActivationReady(config, inventoryMap);
};

export const deploy = async (
  config,
  {
    skipBuild = false,
    skipMonitoring = false,
    skipSchedules = false,
  } = {}
) => {
  if (!skipSchedules) assertScheduleActivationReady(config);
  const plan = deploymentPlan(config);
  execute("gcloud", [
    "services",
    "enable",
    ...plan.APIs,
    `--project=${config.project}`,
    "--quiet",
  ]);

  ensureServiceAccount(
    config,
    "bdl-dashboard-jobs",
    "Brad's dashboard jobs"
  );
  ensureServiceAccount(
    config,
    "bdl-workspace-reader",
    "Brad's Campspot Gmail reader"
  );
  ensureServiceAccount(
    config,
    "bdl-dashboard-scheduler",
    "Brad's dashboard scheduler"
  );
  ensureServiceAccount(
    config,
    "bdl-dashboard-reader",
    "Brad's dashboard read only"
  );
  ensureRepository(config);
  ensureBucket(config);
  ensureDataset(
    config,
    config.reportingDataset,
    "Privacy-safe Brad's source and reporting tables"
  );
  ensureDataset(
    config,
    config.servingDataset,
    "Anonymous read-only Brad's dashboard serving views"
  );
  ensureRuntimeIam(config);
  ensureWorkloadIdentity(config);

  if (!skipBuild) {
    execute("gcloud", plan.build.slice(1));
  }

  for (const kind of ["campspot", "snapshot"]) {
    execute("gcloud", cloudRunJobArgs(config, kind));
    execute("gcloud", [
      "run",
      "jobs",
      "add-iam-policy-binding",
      jobName(kind),
      `--project=${config.project}`,
      `--region=${config.region}`,
      `--member=serviceAccount:${config.schedulerServiceAccount}`,
      "--role=roles/run.invoker",
      "--condition=None",
      "--quiet",
    ]);
    if (!skipSchedules) ensureScheduler(config, kind);
  }

  const monitoringChannel = skipMonitoring
    ? ""
    : await ensureMonitoring(config);
  const oauthClient = execute(
    "gcloud",
    [
      "iam",
      "service-accounts",
      "describe",
      config.workspaceServiceAccount,
      `--project=${config.project}`,
      "--format=value(oauth2ClientId)",
      "--quiet",
    ],
    { capture: true }
  ).stdout.trim();
  if (!/^\d{6,30}$/.test(oauthClient)) {
    throw new Error(
      "Google Cloud did not return the Workspace service account's OAuth 2 client ID."
    );
  }

  return {
    ...plan,
    monitoringChannel,
    workspaceDomainDelegation: {
      ...plan.workspaceDomainDelegation,
      oauthClientId: oauthClient,
    },
  };
};

export const main = async ({
  argv = process.argv.slice(2),
  environment = process.env,
} = {}) => {
  const options = parseOptions(argv);
  const config = configFromEnvironment({
    environment,
    dryRun: options.dryRun,
  });
  const result = options.dryRun
    ? deploymentPlan(config)
    : await deploy(config, options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
};

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
