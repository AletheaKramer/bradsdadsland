import fs from "node:fs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export const desktopOAuthClient = (payload, source = "OAuth client JSON") => {
  if (!payload?.installed) {
    if (payload?.web) {
      throw new Error(
        `${source} is a Web application OAuth client. Download a Desktop app OAuth client JSON for the local loopback flow.`
      );
    }
    throw new Error(`${source} is not a Google Desktop app OAuth client JSON.`);
  }
  const { client_id: clientId, client_secret: clientSecret } = payload.installed;
  if (!clientId || !clientSecret) {
    throw new Error(
      `${source} is missing installed.client_id or installed.client_secret.`
    );
  }
  return { client_id: clientId, client_secret: clientSecret };
};

export const loadDesktopOAuthClient = (filePath) => {
  if (!filePath) throw new Error("A Desktop app OAuth client JSON path is required.");
  return desktopOAuthClient(
    JSON.parse(fs.readFileSync(filePath, "utf8")),
    filePath
  );
};

export const googleLoopbackAuthorizationUrl = ({
  clientId,
  redirectUri,
  scopes,
  state,
  loginHint,
  prompt = "consent",
}) => {
  if (!clientId || !redirectUri || !scopes?.length) {
    throw new Error("OAuth client ID, redirect URI, and scopes are required.");
  }
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", prompt);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  if (state) url.searchParams.set("state", state);
  return url;
};
