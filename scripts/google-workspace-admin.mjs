#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  DEFAULT_CAMPSPOT_RECIPIENT,
  optionEnabled,
  parseArgs,
} from "./lib/dashboard-config.mjs";
import {
  googleLoopbackAuthorizationUrl,
  loadDesktopOAuthClient,
} from "./lib/google-oauth.mjs";

const DEFAULT_OWNER = "admin@beachcomberrv.com";
const AUTH_DIR =
  process.env.BRADS_AUTH_DIR ||
  path.join(os.homedir(), ".config", "bradsdadsland-dashboard");
const TOKEN_PATH =
  process.env.BRADS_WORKSPACE_ADMIN_TOKEN_PATH ||
  path.join(AUTH_DIR, "google-workspace-admin-oauth.json");
const BOOTSTRAP_PATH =
  process.env.BRADS_BOOTSTRAP_TOKEN_PATH ||
  path.join(AUTH_DIR, "bradsdadsland-google-oauth-client.json");
const SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/admin.directory.group",
  "https://www.googleapis.com/auth/admin.directory.group.member",
  "https://www.googleapis.com/auth/apps.groups.settings",
]);

const readJson = (filePath, fallback = null) =>
  fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf8"))
    : fallback;

const writeToken = (payload) => {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true, mode: 0o700 });
  fs.writeFileSync(TOKEN_PATH, `${JSON.stringify(payload, null, 2)}\n`, {
    mode: 0o600,
  });
};

const accessToken = async () => {
  const token = readJson(TOKEN_PATH);
  if (!token) {
    throw new Error(
      `Missing Workspace admin token at ${TOKEN_PATH}. Run google-workspace-admin.mjs auth first.`
    );
  }
  if (
    token.access_token &&
    Number(token.expiry_date || 0) > Date.now() + 60_000
  ) {
    return token.access_token;
  }
  if (!token.refresh_token || !token.client_id || !token.client_secret) {
    throw new Error("Workspace admin OAuth token cannot be refreshed.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: token.client_id,
      client_secret: token.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Workspace token refresh failed (${response.status}): ${
        payload.error_description || payload.error || "unknown error"
      }`
    );
  }
  const updated = {
    ...token,
    access_token: payload.access_token,
    expiry_date: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  writeToken(updated);
  return updated.access_token;
};

const request = async (
  url,
  { method = "GET", body, allowNotFound = false } = {}
) => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allowNotFound && response.status === 404) return null;
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text.slice(0, 500) };
  }
  if (!response.ok) {
    throw new Error(
      `${method} ${new URL(url).host} failed (${response.status}): ${String(
        payload.error?.message || payload.raw || "unknown error"
      ).slice(0, 500)}`
    );
  }
  return payload;
};

const groupUrl = (groupEmail) =>
  `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(
    groupEmail
  )}`;

const memberUrl = (groupEmail, memberEmail = "") =>
  `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(
    groupEmail
  )}/members${memberEmail ? `/${encodeURIComponent(memberEmail)}` : ""}`;

const settingsUrl = (groupEmail) =>
  `https://groupssettings.googleapis.com/groups/v1/groups/${encodeURIComponent(
    groupEmail
  )}`;

const inspect = async ({ groupEmail, ownerEmail }) => {
  const group = await request(groupUrl(groupEmail), { allowNotFound: true });
  if (!group) {
    return {
      exists: false,
      groupEmail,
      ownerEmail,
      externallyPostable: false,
      ownerConfirmed: false,
    };
  }
  const [owner, settings] = await Promise.all([
    request(memberUrl(groupEmail, ownerEmail), { allowNotFound: true }),
    request(settingsUrl(groupEmail), { allowNotFound: true }),
  ]);
  return {
    exists: true,
    groupEmail: group.email,
    name: group.name,
    ownerEmail,
    ownerConfirmed: owner?.role === "OWNER",
    memberType: owner?.type || null,
    externallyPostable: settings?.whoCanPostMessage === "ANYONE_CAN_POST",
    settings: settings
      ? {
          whoCanPostMessage: settings.whoCanPostMessage,
          allowExternalMembers: settings.allowExternalMembers,
          whoCanViewGroup: settings.whoCanViewGroup,
          whoCanViewMembership: settings.whoCanViewMembership,
          whoCanJoin: settings.whoCanJoin,
          archiveOnly: settings.archiveOnly,
        }
      : null,
  };
};

const ensure = async ({ groupEmail, ownerEmail }) => {
  let group = await request(groupUrl(groupEmail), { allowNotFound: true });
  const changes = [];
  if (!group) {
    group = await request(
      "https://admin.googleapis.com/admin/directory/v1/groups",
      {
        method: "POST",
        body: {
          email: groupEmail,
          name: "Brad's Dads Land Campspot Data Ingest",
          description:
            "External Campspot scheduled-report recipient. Delivers to the Beachcomber admin owner for the Brad's private dashboard pipeline.",
        },
      }
    );
    changes.push("group_created");
  }
  const owner = await request(memberUrl(groupEmail, ownerEmail), {
    allowNotFound: true,
  });
  if (!owner) {
    await request(memberUrl(groupEmail), {
      method: "POST",
      body: { email: ownerEmail, role: "OWNER" },
    });
    changes.push("owner_added");
  } else if (owner.role !== "OWNER") {
    await request(memberUrl(groupEmail, ownerEmail), {
      method: "PUT",
      body: { email: ownerEmail, role: "OWNER" },
    });
    changes.push("owner_promoted");
  }
  const settings = await request(settingsUrl(groupEmail), {
    allowNotFound: true,
  });
  const desiredSettings = {
    whoCanPostMessage: "ANYONE_CAN_POST",
    allowExternalMembers: "false",
    whoCanJoin: "INVITED_CAN_JOIN",
    whoCanViewGroup: "ALL_MEMBERS_CAN_VIEW",
    whoCanViewMembership: "ALL_MEMBERS_CAN_VIEW",
  };
  if (
    !settings ||
    Object.entries(desiredSettings).some(
      ([key, value]) => String(settings[key]) !== String(value)
    )
  ) {
    await request(settingsUrl(groupEmail), {
      method: "PATCH",
      body: desiredSettings,
    });
    changes.push("external_delivery_settings_updated");
  }
  return {
    changes,
    state: await inspect({ groupEmail, ownerEmail }),
    note:
      "Google Groups Settings has no reliable emailSubjectPrefix field; ingestion uses exact recipient and immutable Campspot property ID instead.",
  };
};

const auth = async (options) => {
  const bootstrap = options.client
    ? loadDesktopOAuthClient(path.resolve(options.client))
    : readJson(BOOTSTRAP_PATH);
  if (!bootstrap?.client_id || !bootstrap?.client_secret) {
    throw new Error(
      `Pass --client=/path/to/desktop-oauth.json or configure ${BOOTSTRAP_PATH}.`
    );
  }
  const oauthState = crypto.randomBytes(32).toString("hex");
  const server = http.createServer();
  const codePromise = new Promise((resolve, reject) => {
    server.on("request", (incoming, response) => {
      const url = new URL(incoming.url, `http://${incoming.headers.host}`);
      if (url.pathname !== "/oauth2callback") {
        response.writeHead(404).end("Not found");
        return;
      }
      if (url.searchParams.get("state") !== oauthState) {
        response.writeHead(400).end("OAuth state mismatch.");
        reject(new Error("OAuth state mismatch."));
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (!code || error) {
        response.writeHead(400).end("Workspace authorization failed.");
        reject(new Error(error || "No authorization code returned."));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("Workspace admin authorization completed. You may close this tab.");
      resolve(code);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}/oauth2callback`;
  const url = googleLoopbackAuthorizationUrl({
    clientId: bootstrap.client_id,
    redirectUri,
    scopes: SCOPES,
    state: oauthState,
  });
  process.stdout.write(`Open as ${DEFAULT_OWNER}:\n${url}\n`);
  if (process.platform === "darwin" && !optionEnabled(options["no-open"])) {
    spawnSync("open", [url.toString()], { stdio: "ignore" });
  }
  try {
    const code = await codePromise;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: bootstrap.client_id,
        client_secret: bootstrap.client_secret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await response.json();
    if (!response.ok) {
      throw new Error(
        `OAuth exchange failed (${response.status}): ${
          token.error_description || token.error
        }`
      );
    }
    writeToken({
      ...token,
      client_id: bootstrap.client_id,
      client_secret: bootstrap.client_secret,
      expiry_date: Date.now() + Number(token.expires_in || 3600) * 1000,
    });
    return { authorized: true, tokenPath: TOKEN_PATH, scopes: SCOPES };
  } finally {
    server.close();
  }
};

export const main = async (argv = process.argv.slice(2)) => {
  const [command = "inspect", ...rest] = argv;
  const options = parseArgs(rest);
  const config = {
    groupEmail:
      options.group ||
      process.env.CAMPSPOT_EXPECTED_RECIPIENT ||
      DEFAULT_CAMPSPOT_RECIPIENT,
    ownerEmail: options.owner || process.env.CAMPSPOT_GROUP_OWNER || DEFAULT_OWNER,
  };
  if (command === "inspect") return inspect(config);
  if (command === "ensure") return ensure(config);
  if (command === "auth") return auth(options);
  throw new Error(
    "Usage: node scripts/google-workspace-admin.mjs <inspect|ensure|auth> " +
      `[--group=${DEFAULT_CAMPSPOT_RECIPIENT}] [--owner=${DEFAULT_OWNER}] [--client=/path/to/desktop-oauth.json]`
  );
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    const result = await main();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
