import {
  assertTrustedMutation,
  requireDashboardSession,
  serializeExpiredSessionCookie,
} from "../_lib/dashboard-auth.js";
import {
  allowMethods,
  sendJson,
  withApiErrors,
} from "../_lib/http.js";

const handler = async (request, response) => {
  allowMethods(request, response, ["POST"]);
  requireDashboardSession(request);
  assertTrustedMutation(request);
  return sendJson(
    response,
    200,
    { authenticated: false },
    {
      "Set-Cookie": serializeExpiredSessionCookie(),
      Vary: "Cookie, Origin",
    },
  );
};

export default withApiErrors(handler);
