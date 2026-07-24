import {
  assertLoginAllowed,
  assertTrustedMutation,
  clearLoginFailures,
  createSession,
  recordFailedLogin,
  serializeSessionCookie,
  verifyDashboardPassword,
} from "../_lib/dashboard-auth.js";
import {
  allowMethods,
  HttpError,
  readJsonBody,
  sendJson,
  withApiErrors,
} from "../_lib/http.js";

const handler = async (request, response) => {
  allowMethods(request, response, ["POST"]);
  assertTrustedMutation(request);
  assertLoginAllowed(request);

  const body = await readJsonBody(request);
  if (typeof body.password !== "string") {
    throw new HttpError(
      400,
      "password_required",
      "Enter the dashboard password.",
    );
  }
  const accepted = await verifyDashboardPassword(body.password);
  if (!accepted) {
    recordFailedLogin(request);
    throw new HttpError(401, "invalid_credentials", "The password is incorrect.");
  }

  clearLoginFailures(request);
  const session = createSession();
  return sendJson(
    response,
    200,
    { authenticated: true, expiresAt: session.expiresAt },
    {
      "Set-Cookie": serializeSessionCookie(session),
      Vary: "Cookie, Origin",
    },
  );
};

export default withApiErrors(handler);
