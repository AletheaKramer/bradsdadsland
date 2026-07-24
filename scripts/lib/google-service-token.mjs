const IAM_CREDENTIALS_HOST = "iamcredentials.googleapis.com";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

const requiredText = (value, label) => {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const responseError = async (response, label) => {
  const text = await response.text();
  let detail = text;
  try {
    const payload = JSON.parse(text);
    detail =
      payload.error?.message ||
      payload.error_description ||
      payload.error ||
      text;
  } catch {
    // The bounded plain text is useful when the endpoint did not return JSON.
  }
  return new Error(
    `${label} failed (${response.status}): ${String(detail || "unknown error").slice(
      0,
      500
    )}`
  );
};

export const googleServiceJwtClaims = ({
  serviceAccountEmail,
  subject = "",
  scopes,
  now = Date.now(),
}) => {
  const issuer = requiredText(
    serviceAccountEmail,
    "Google service account email"
  );
  if (!EMAIL_PATTERN.test(issuer)) {
    throw new Error("Google service account email is invalid.");
  }
  const normalizedScopes = [
    ...new Set((scopes || []).map((scope) => String(scope || "").trim()).filter(Boolean)),
  ];
  if (!normalizedScopes.length) {
    throw new Error("At least one Google OAuth scope is required.");
  }
  const delegatedSubject = String(subject || "").trim();
  if (delegatedSubject && !EMAIL_PATTERN.test(delegatedSubject)) {
    throw new Error("Google Workspace delegated subject is invalid.");
  }
  const issuedAt = Math.floor(Number(now) / 1000);
  return {
    iss: issuer,
    scope: normalizedScopes.join(" "),
    aud: OAUTH_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
    ...(delegatedSubject ? { sub: delegatedSubject } : {}),
  };
};

export const scopedGoogleServiceAccessToken = async ({
  cloudAccessToken,
  serviceAccountEmail,
  subject = "",
  scopes,
  fetchImpl = fetch,
  now = Date.now(),
}) => {
  const signerToken = requiredText(
    cloudAccessToken,
    "Cloud service identity access token"
  );
  const claims = googleServiceJwtClaims({
    serviceAccountEmail,
    subject,
    scopes,
    now,
  });
  const response = await fetchImpl(
    `https://${IAM_CREDENTIALS_HOST}/v1/projects/-/serviceAccounts/${encodeURIComponent(
      claims.iss
    )}:signJwt`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${signerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: JSON.stringify(claims) }),
    }
  );
  if (!response.ok) throw await responseError(response, "Google IAM JWT signing");
  const signed = await response.json();
  const signedJwt = requiredText(signed.signedJwt, "Signed Google service JWT");
  const tokenResponse = await fetchImpl(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });
  if (!tokenResponse.ok) {
    throw await responseError(tokenResponse, "Google service OAuth exchange");
  }
  const token = await tokenResponse.json();
  return {
    accessToken: requiredText(token.access_token, "Google service access token"),
    expiresIn: Number(token.expires_in || 3600),
    scope: String(token.scope || claims.scope),
  };
};
