import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  FIXED_GA4_MEASUREMENT_ID,
  FIXED_GCP_PROJECT_ID,
  FIXED_GCP_PROJECT_NUMBER,
  FIXED_GOOGLE_ACCOUNT_EMAIL,
  GOOGLE_EXPORT_SCOPES,
  googleExportsAccessToken,
  googleExportsAuthorizationUrl,
  googleExportsCredentials,
  main,
  setupGoogleManagedExports,
  storeVerifiedGoogleExportsToken,
  writePrivateJson,
} from "../scripts/google-managed-exports.mjs";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mockGoogle = (handler) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const call = {
      url: String(url),
      method: init.method || "GET",
      body: init.body ? JSON.parse(init.body) : null,
      authorization: init.headers?.Authorization,
    };
    calls.push(call);
    return handler(call);
  };
  return { calls, fetchImpl };
};

const signedGoogleIdToken = ({
  clientId = "desktop-client",
  email = FIXED_GOOGLE_ACCOUNT_EMAIL,
  emailVerified = true,
  subject = "google-subject-123",
  now = 1_000_000,
} = {}) => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const kid = "test-google-key";
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", kid, typ: "JWT" });
  const claims = encode({
    iss: "https://accounts.google.com",
    aud: clientId,
    exp: Math.floor(now / 1000) + 3600,
    sub: subject,
    email,
    email_verified: emailVerified,
  });
  const signingInput = `${header}.${claims}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), privateKey)
    .toString("base64url");
  return {
    idToken: `${signingInput}.${signature}`,
    jwk: {
      ...publicKey.export({ format: "jwk" }),
      kid,
      alg: "RS256",
      use: "sig",
    },
  };
};

test("GA4 setup dry-run discovers the exact stream and makes no mutation", async () => {
  const { calls, fetchImpl } = mockGoogle(({ url, method }) => {
    const parsed = new URL(url);
    assert.equal(method, "GET");
    if (parsed.pathname === "/v1beta/accountSummaries") {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              {
                property: "properties/111",
                displayName: "Unrelated property",
                canEdit: true,
              },
              {
                property: "properties/222",
                displayName: "Brad's Dads Land",
                canEdit: true,
              },
            ],
          },
        ],
      });
    }
    if (parsed.pathname === "/v1beta/properties/111/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/111/dataStreams/1",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: "G-NOTBRADS" },
          },
        ],
      });
    }
    if (parsed.pathname === "/v1beta/properties/222/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/222/dataStreams/2",
            displayName: "Brad's website",
            type: "WEB_DATA_STREAM",
            webStreamData: {
              measurementId: FIXED_GA4_MEASUREMENT_ID,
              defaultUri: "https://bradsdadsland.com",
            },
          },
        ],
      });
    }
    if (parsed.pathname === "/v1alpha/properties/222/bigQueryLinks") {
      return jsonResponse({ bigqueryLinks: [] });
    }
    if (parsed.pathname === "/webmasters/v3/sites") {
      return jsonResponse({
        siteEntry: [
          {
            siteUrl: "sc-domain:bradsdadsland.com",
            permissionLevel: "siteOwner",
          },
          {
            siteUrl: "sc-domain:unrelated.example",
            permissionLevel: "siteOwner",
          },
        ],
      });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const result = await setupGoogleManagedExports({
    fetchImpl,
    accessToken: "test-access-token",
    verifiedAccountEmail: FIXED_GOOGLE_ACCOUNT_EMAIL,
  });

  assert.equal(result.mode, "dry-run");
  assert.equal(result.accountEmail, FIXED_GOOGLE_ACCOUNT_EMAIL);
  assert.equal(result.ga4.property, "properties/222");
  assert.equal(result.ga4.dataset, "analytics_222");
  assert.equal(result.ga4.linkStatus, "planned");
  assert.deepEqual(result.ga4.createRequest, {
    project: `projects/${FIXED_GCP_PROJECT_ID}`,
    dailyExportEnabled: true,
    streamingExportEnabled: false,
    includeAdvertisingId: false,
    exportStreams: ["properties/222/dataStreams/2"],
    datasetLocation: "US",
  });
  assert.equal(result.searchConsole.ownerVerified, true);
  assert.deepEqual(result.searchConsole.matches, [
    {
      siteUrl: "sc-domain:bradsdadsland.com",
      permissionLevel: "siteOwner",
    },
  ]);
  assert.equal(
    result.searchConsole.bulkExportActivation,
    "manual_required_no_public_api"
  );
  assert.ok(calls.every(({ method }) => method === "GET"));
  assert.ok(
    calls.every(
      ({ authorization }) => authorization === "Bearer test-access-token"
    )
  );
});

test("explicit apply creates only the fixed daily GA4 link", async () => {
  const { calls, fetchImpl } = mockGoogle(({ url, method, body }) => {
    const parsed = new URL(url);
    if (
      method === "GET" &&
      parsed.pathname === "/v1beta/accountSummaries"
    ) {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              {
                property: "properties/333",
                displayName: "Brad's Dads Land",
              },
            ],
          },
        ],
      });
    }
    if (
      method === "GET" &&
      parsed.pathname === "/v1beta/properties/333/dataStreams"
    ) {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/333/dataStreams/9",
            type: "WEB_DATA_STREAM",
            webStreamData: {
              measurementId: FIXED_GA4_MEASUREMENT_ID,
              defaultUri: "https://bradsdadsland.com",
            },
          },
        ],
      });
    }
    if (
      method === "GET" &&
      parsed.pathname === "/v1alpha/properties/333/bigQueryLinks"
    ) {
      return jsonResponse({ bigqueryLinks: [] });
    }
    if (
      method === "POST" &&
      parsed.pathname === "/v1alpha/properties/333/bigQueryLinks"
    ) {
      assert.deepEqual(body, {
        project: `projects/${FIXED_GCP_PROJECT_ID}`,
        dailyExportEnabled: true,
        streamingExportEnabled: true,
        includeAdvertisingId: false,
        exportStreams: ["properties/333/dataStreams/9"],
        datasetLocation: "US",
      });
      return jsonResponse({
        name: "properties/333/bigQueryLinks/new-link",
        project: `projects/${FIXED_GCP_PROJECT_NUMBER}`,
        dailyExportEnabled: true,
        streamingExportEnabled: true,
        includeAdvertisingId: false,
        exportStreams: ["properties/333/dataStreams/9"],
        datasetLocation: "US",
      });
    }
    if (
      method === "GET" &&
      parsed.pathname === "/webmasters/v3/sites"
    ) {
      return jsonResponse(
        { error: { message: "Search Console scope unavailable" } },
        403
      );
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const result = await setupGoogleManagedExports({
    fetchImpl,
    accessToken: "test-access-token",
    apply: true,
    streaming: true,
    verifiedAccountEmail: FIXED_GOOGLE_ACCOUNT_EMAIL,
    options: {
      project: FIXED_GCP_PROJECT_ID,
      "measurement-id": FIXED_GA4_MEASUREMENT_ID,
      property: "333",
      location: "US",
    },
  });

  assert.equal(result.mode, "apply");
  assert.equal(result.ga4.linkStatus, "created");
  assert.equal(result.ga4.link.project, `projects/${FIXED_GCP_PROJECT_NUMBER}`);
  assert.equal(result.searchConsole.available, false);
  assert.equal(
    calls.filter(({ method }) => method === "POST").length,
    1
  );
});

test("apply proceeds when canEdit is omitted but refuses an explicit false", async () => {
  const { calls, fetchImpl } = mockGoogle(({ url, method }) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/v1beta/accountSummaries") {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              { property: "properties/334", canEdit: false },
            ],
          },
        ],
      });
    }
    if (pathname === "/v1beta/properties/334/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/334/dataStreams/9",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: FIXED_GA4_MEASUREMENT_ID },
          },
        ],
      });
    }
    if (pathname === "/v1alpha/properties/334/bigQueryLinks") {
      return jsonResponse({ bigqueryLinks: [] });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl,
      accessToken: "test-access-token",
      apply: true,
      verifiedAccountEmail: FIXED_GOOGLE_ACCOUNT_EMAIL,
    }),
    /cannot edit/
  );
  assert.ok(calls.every(({ method }) => method === "GET"));
});

test("an existing fixed link is verified idempotently even in apply mode", async () => {
  const { calls, fetchImpl } = mockGoogle(({ url, method }) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/v1beta/accountSummaries") {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              { property: "properties/444", canEdit: true },
            ],
          },
        ],
      });
    }
    if (pathname === "/v1beta/properties/444/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/444/dataStreams/7",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: FIXED_GA4_MEASUREMENT_ID },
          },
        ],
      });
    }
    if (pathname === "/v1alpha/properties/444/bigQueryLinks") {
      return jsonResponse({
        bigqueryLinks: [
          {
            name: "properties/444/bigQueryLinks/existing",
            project: `projects/${FIXED_GCP_PROJECT_NUMBER}`,
            dailyExportEnabled: true,
            streamingExportEnabled: false,
            exportStreams: ["properties/444/dataStreams/7"],
            datasetLocation: "US",
          },
        ],
      });
    }
    if (pathname === "/webmasters/v3/sites") {
      return jsonResponse({ siteEntry: [] });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const result = await setupGoogleManagedExports({
    fetchImpl,
    accessToken: "test-access-token",
    apply: true,
    verifiedAccountEmail: FIXED_GOOGLE_ACCOUNT_EMAIL,
  });
  assert.equal(result.ga4.linkStatus, "verified_existing");
  assert.ok(calls.every(({ method }) => method === "GET"));
});

test("the utility refuses alternate identifiers, property guards, and projects", async () => {
  let calls = 0;
  const neverFetch = async () => {
    calls += 1;
    throw new Error("fetch should not be called");
  };
  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl: neverFetch,
      accessToken: "test-access-token",
      options: { project: "another-project" },
    }),
    /project must remain focused-clock-498319-f5/
  );
  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl: neverFetch,
      accessToken: "test-access-token",
      options: { "measurement-id": "G-ANOTHER" },
    }),
    /measurement ID must remain G-5714F7Y7QK/
  );
  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl: neverFetch,
      accessToken: "test-access-token",
      apply: true,
    }),
    /verified admin@bradsdadsland\.com identity/
  );
  assert.equal(calls, 0);

  const propertyGuardMock = mockGoogle(({ url }) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/v1beta/accountSummaries") {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              { property: "properties/554", canEdit: true },
            ],
          },
        ],
      });
    }
    if (pathname === "/v1beta/properties/554/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/554/dataStreams/1",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: FIXED_GA4_MEASUREMENT_ID },
          },
        ],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl: propertyGuardMock.fetchImpl,
      accessToken: "test-access-token",
      options: { property: "999" },
    }),
    /property guard properties\/999 does not match/
  );

  const { calls: foreignCalls, fetchImpl } = mockGoogle(({ url }) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/v1beta/accountSummaries") {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              { property: "properties/555", canEdit: true },
            ],
          },
        ],
      });
    }
    if (pathname === "/v1beta/properties/555/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/555/dataStreams/1",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: FIXED_GA4_MEASUREMENT_ID },
          },
        ],
      });
    }
    if (pathname === "/v1alpha/properties/555/bigQueryLinks") {
      return jsonResponse({
        bigqueryLinks: [
          {
            name: "properties/555/bigQueryLinks/foreign",
            project: "projects/not-brads-project",
            dailyExportEnabled: true,
          },
        ],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl,
      accessToken: "test-access-token",
      apply: true,
      verifiedAccountEmail: FIXED_GOOGLE_ACCOUNT_EMAIL,
      options: { property: "555" },
    }),
    /non-Brad project/
  );
  assert.ok(foreignCalls.every(({ method }) => method === "GET"));
});

test("a no-match diagnostic reports counts without leaking accessible resources", async () => {
  const { fetchImpl } = mockGoogle(({ url }) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/v1beta/accountSummaries") {
      return jsonResponse({
        accountSummaries: [
          {
            propertySummaries: [
              {
                property: "properties/700001",
                displayName: "Private Beachcomber Analytics",
              },
              {
                property: "properties/700002",
                displayName: "Another Private Property",
              },
            ],
          },
        ],
      });
    }
    if (pathname === "/v1beta/properties/700001/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/700001/dataStreams/1",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: "G-PRIVATE-ONE" },
          },
        ],
      });
    }
    if (pathname === "/v1beta/properties/700002/dataStreams") {
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/700002/dataStreams/2",
            type: "WEB_DATA_STREAM",
            webStreamData: { measurementId: "G-PRIVATE-TWO" },
          },
        ],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  await assert.rejects(
    setupGoogleManagedExports({
      fetchImpl,
      accessToken: "test-access-token",
    }),
    (error) => {
      assert.match(error.message, /Inspected 2 accessible GA4 properties and 2 accessible GA4 web streams/);
      assert.doesNotMatch(error.message, /Beachcomber|700001|700002|G-PRIVATE/);
      return true;
    }
  );
});

test("apply and streaming gates require the explicit =true spelling", async () => {
  await assert.rejects(
    main(["setup", "--apply"], {
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      },
    }),
    /--apply=true/
  );
  await assert.rejects(
    main(["setup", "--streaming=false"], {
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      },
    }),
    /--streaming=true/
  );
  await assert.rejects(
    main(
      [
        "setup",
        "--project=another-project",
        `--project=${FIXED_GCP_PROJECT_ID}`,
      ],
      {
        fetchImpl: async () => {
          throw new Error("fetch should not be called");
        },
      }
    ),
    /--project must be supplied at most once/
  );
});

test("OAuth token material is written under private directory and file modes", (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bdl-google-exports-")
  );
  t.after(() =>
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  );
  const tokenPath = path.join(temporaryDirectory, "auth", "token.json");
  writePrivateJson(tokenPath, { access_token: "not-a-real-token" });

  assert.equal(fs.statSync(path.dirname(tokenPath)).mode & 0o777, 0o700);
  assert.equal(fs.statSync(tokenPath).mode & 0o777, 0o600);
});

test("Google exports OAuth URL forces account selection and requests identity scopes", () => {
  const url = googleExportsAuthorizationUrl({
    clientId: "desktop-client",
    redirectUri: "http://127.0.0.1:34567/oauth2callback",
    state: "state-value",
  });
  assert.equal(
    url.searchParams.get("login_hint"),
    FIXED_GOOGLE_ACCOUNT_EMAIL
  );
  assert.equal(url.searchParams.get("prompt"), "select_account consent");
  assert.deepEqual(
    url.searchParams.get("scope").split(" "),
    [...GOOGLE_EXPORT_SCOPES]
  );
  assert.ok(GOOGLE_EXPORT_SCOPES.includes("openid"));
  assert.ok(GOOGLE_EXPORT_SCOPES.includes("email"));
});

test("a signed exact-account ID token is verified before private storage", async (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bdl-google-identity-")
  );
  t.after(() =>
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  );
  const tokenPath = path.join(temporaryDirectory, "auth", "token.json");
  const now = 1_000_000;
  const { idToken, jwk } = signedGoogleIdToken({ now });
  const fetchImpl = async (url, init) => {
    assert.equal(String(url), "https://www.googleapis.com/oauth2/v3/certs");
    assert.equal(init.method, "GET");
    return jsonResponse({ keys: [jwk] });
  };

  const result = await storeVerifiedGoogleExportsToken({
    fetchImpl,
    payload: {
      access_token: "oauth-access",
      refresh_token: "oauth-refresh",
      id_token: idToken,
      expires_in: 3600,
    },
    client: {
      client_id: "desktop-client",
      client_secret: "desktop-secret",
    },
    tokenPath,
    now,
  });

  assert.equal(result.verifiedEmail, FIXED_GOOGLE_ACCOUNT_EMAIL);
  assert.equal(fs.statSync(tokenPath).mode & 0o777, 0o600);
  const stored = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  assert.equal(stored.id_token, undefined);
  assert.deepEqual(stored.verified_identity, {
    version: 1,
    email: FIXED_GOOGLE_ACCOUNT_EMAIL,
    emailVerified: true,
    subject: "google-subject-123",
  });
});

test("wrong or unverified Google identities are rejected before token storage", async (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bdl-google-wrong-identity-")
  );
  t.after(() =>
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  );
  for (const [name, claims] of [
    ["wrong-email", { email: "admin@beachcomberrv.com" }],
    ["unverified-email", { emailVerified: false }],
  ]) {
    const tokenPath = path.join(temporaryDirectory, name, "token.json");
    const { idToken, jwk } = signedGoogleIdToken(claims);
    await assert.rejects(
      storeVerifiedGoogleExportsToken({
        fetchImpl: async () => jsonResponse({ keys: [jwk] }),
        payload: {
          access_token: "must-not-be-stored",
          id_token: idToken,
        },
        client: {
          client_id: "desktop-client",
          client_secret: "desktop-secret",
        },
        tokenPath,
        now: 1_000_000,
      }),
      /verified admin@bradsdadsland\.com/
    );
    assert.equal(fs.existsSync(tokenPath), false);
  }
});

test("legacy OAuth tokens without verified identity are rejected before fetch", async (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bdl-google-legacy-token-")
  );
  t.after(() =>
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  );
  const tokenPath = path.join(temporaryDirectory, "auth", "token.json");
  writePrivateJson(tokenPath, {
    access_token: "legacy-access",
    expiry_date: Date.now() + 3_600_000,
    refresh_token: "legacy-refresh",
    client_id: "desktop-client",
    client_secret: "desktop-secret",
  });
  let fetchCalls = 0;
  await assert.rejects(
    googleExportsCredentials({
      tokenPath,
      fetchImpl: async () => {
        fetchCalls += 1;
        throw new Error("must not fetch");
      },
    }),
    /not bound to the verified admin@bradsdadsland\.com identity/
  );
  assert.equal(fetchCalls, 0);
});

test("expired OAuth material refreshes through mocked fetch and stays private", async (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bdl-google-refresh-")
  );
  t.after(() =>
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  );
  const tokenPath = path.join(temporaryDirectory, "auth", "token.json");
  writePrivateJson(tokenPath, {
    access_token: "expired",
    expiry_date: 1,
    refresh_token: "refresh-value",
    client_id: "desktop-client",
    client_secret: "desktop-secret",
    scope: "existing-scope",
    verified_identity: {
      version: 1,
      email: FIXED_GOOGLE_ACCOUNT_EMAIL,
      emailVerified: true,
      subject: "google-subject-123",
    },
  });
  const fetchImpl = async (url, init) => {
    assert.equal(url, "https://oauth2.googleapis.com/token");
    assert.equal(init.method, "POST");
    assert.equal(init.body.get("grant_type"), "refresh_token");
    assert.equal(init.body.get("refresh_token"), "refresh-value");
    return jsonResponse({
      access_token: "refreshed-access",
      expires_in: 3600,
    });
  };

  const accessToken = await googleExportsAccessToken({
    fetchImpl,
    tokenPath,
    now: 10_000,
  });
  assert.equal(accessToken, "refreshed-access");
  assert.equal(fs.statSync(tokenPath).mode & 0o777, 0o600);
  const stored = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  assert.equal(stored.refresh_token, "refresh-value");
  assert.equal(stored.client_secret, "desktop-secret");
  assert.equal(stored.expiry_date, 3_610_000);
});

test("the dashboard runbook exposes dry-run/apply commands and keeps Search Console manual", () => {
  const runbook = fs.readFileSync(
    new URL("../docs/dashboard-setup.md", import.meta.url),
    "utf8"
  );
  const packageJson = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  assert.equal(
    packageJson.scripts["dashboard:google-exports"],
    "node scripts/google-managed-exports.mjs setup"
  );
  assert.equal(
    packageJson.scripts["dashboard:google-exports:auth"],
    "node scripts/google-managed-exports.mjs auth"
  );
  assert.match(runbook, /dashboard:google-exports -- --apply=true/);
  assert.match(runbook, /mode `0600`/);
  assert.match(runbook, /no bulk-export activation or status\s+method/);
});
