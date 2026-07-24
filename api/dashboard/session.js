import {
  getDashboardSession,
  serializeExpiredSessionCookie,
} from "../_lib/dashboard-auth.js";
import {
  allowMethods,
  sendJson,
  withApiErrors,
} from "../_lib/http.js";

const handler = async (request, response) => {
  allowMethods(request, response, ["GET"]);
  const session = getDashboardSession(request);
  const headers = { Vary: "Cookie" };
  if (!session) headers["Set-Cookie"] = serializeExpiredSessionCookie();
  return sendJson(
    response,
    200,
    session
      ? {
          authenticated: true,
          expiresAt: new Date(session.exp * 1000).toISOString(),
        }
      : { authenticated: false },
    headers,
  );
};

export default withApiErrors(handler);
