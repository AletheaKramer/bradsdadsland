import { requireDashboardSession } from "../_lib/dashboard-auth.js";
import { withBigQueryOidcToken } from "../_lib/bigquery.js";
import {
  getDashboardData,
  parseDashboardRequest,
} from "../_lib/dashboard-query.js";
import {
  allowMethods,
  getHeader,
  sendJson,
  withApiErrors,
} from "../_lib/http.js";

const handler = async (request, response) => {
  allowMethods(request, response, ["GET"]);
  requireDashboardSession(request);
  const filters = parseDashboardRequest(request);
  const payload = await withBigQueryOidcToken(
    getHeader(request, "x-vercel-oidc-token"),
    () => getDashboardData(filters),
  );
  return sendJson(response, 200, payload, { Vary: "Cookie" });
};

export default withApiErrors(handler);
