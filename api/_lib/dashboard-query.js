import {
  getBigQueryConfig,
  namedParameter,
  queryBigQuery,
  quoteTable,
} from "./bigquery.js";
import { HttpError } from "./http.js";

export const VIEWS = Object.freeze({
  ga4: "mart_dashboard_ga4_daily",
  searchConsole: "mart_dashboard_search_console_daily",
  campspot: "mart_dashboard_campspot_daily",
  bookingPace: "mart_dashboard_booking_pace",
  health: "mart_dashboard_data_health",
  quality: "mart_dashboard_data_quality",
});

export const DASHBOARD_VIEWS = Object.freeze([
  "ga4",
  "search-console",
  "campspot-campground",
  "campspot-vintage",
  "health",
]);

const ALLOWED_KEYS = new Set([
  "view",
  "start",
  "end",
  "season",
  "device",
  "source",
  "medium",
  "landingPage",
  "query",
  "page",
  "site",
  "siteType",
  "status",
  "leadTime",
  "stayLength",
  "reload",
]);
const FILTERS_BY_VIEW = Object.freeze({
  ga4: new Set(["device", "source", "medium", "landingPage"]),
  "search-console": new Set(["device", "query", "page"]),
  "campspot-campground": new Set([
    "season",
    "site",
    "siteType",
    "status",
    "leadTime",
    "stayLength",
  ]),
  "campspot-vintage": new Set([
    "season",
    "site",
    "siteType",
    "status",
    "leadTime",
    "stayLength",
  ]),
  health: new Set(),
});
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEASON_PATTERN = /^(?:20\d{2}|all)$/;
const MAX_FILTER_LENGTH = 180;
const MAX_STANDARD_RANGE_DAYS = 2192;
const MAX_CAMPSPOT_RANGE_DAYS = 10_959;
const DATA_CACHE_MS = 2 * 60 * 1000;
const DATA_CACHE_ENTRIES = 100;
const dataCache = new Map();
const pendingRequests = new Map();

const queryObject = (request) => {
  if (request?.query && typeof request.query === "object") return request.query;
  const parsed = new URL(request?.url || "/", "https://dashboard.invalid");
  return Object.fromEntries(parsed.searchParams.entries());
};

const queryValue = (value, key) => {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new HttpError(
        400,
        "invalid_filter",
        `Use only one ${key} filter.`,
      );
    }
    return value[0];
  }
  return value;
};

const filterValue = (query, key) => {
  const raw = queryValue(query[key], key);
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return null;
  }
  const value = String(raw).trim();
  const hasControlCharacter = [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (value.length > MAX_FILTER_LENGTH || hasControlCharacter) {
    throw new HttpError(
      400,
      "invalid_filter",
      `${key} is not a valid filter value.`,
    );
  }
  return value;
};

const parseDate = (value, key) => {
  if (!DATE_PATTERN.test(String(value || ""))) {
    throw new HttpError(
      400,
      "invalid_date",
      `${key} must use YYYY-MM-DD.`,
    );
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(
      400,
      "invalid_date",
      `${key} is not a valid calendar date.`,
    );
  }
  return value;
};

const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const vancouverDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const defaultRange = (view, today, season) => {
  if (view === "health") return { start: today, end: today };
  if (view.startsWith("campspot-")) {
    if (season === "all") {
      return {
        start: "2000-01-01",
        end: `${today.slice(0, 4)}-12-31`,
      };
    }
    const year = season || today.slice(0, 4);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: addDays(today, -89), end: today };
};

export const parseDashboardRequest = (request, now = new Date()) => {
  const query = queryObject(request);
  for (const key of Object.keys(query)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new HttpError(
        400,
        "unknown_filter",
        `${key} is not a supported dashboard filter.`,
      );
    }
  }

  const view = filterValue(query, "view") || "ga4";
  if (!DASHBOARD_VIEWS.includes(view)) {
    throw new HttpError(
      400,
      "invalid_view",
      "Choose a valid dashboard view.",
    );
  }
  const reloadValue = filterValue(query, "reload");
  if (reloadValue && reloadValue !== "true") {
    throw new HttpError(
      400,
      "invalid_reload",
      "reload must be true when supplied.",
    );
  }

  const supportedFilters = FILTERS_BY_VIEW[view];
  const values = {};
  for (const key of [
    "season",
    "device",
    "source",
    "medium",
    "landingPage",
    "query",
    "page",
    "site",
    "siteType",
    "status",
    "leadTime",
    "stayLength",
  ]) {
    values[key] = filterValue(query, key);
    if (values[key] && !supportedFilters.has(key)) {
      throw new HttpError(
        400,
        "unsupported_filter",
        `${key} is not available for this view.`,
      );
    }
  }
  if (values.season && !SEASON_PATTERN.test(values.season)) {
    throw new HttpError(
      400,
      "invalid_season",
      "Choose a four-digit season or all.",
    );
  }

  const startValue = filterValue(query, "start");
  const endValue = filterValue(query, "end");
  if ((startValue && !endValue) || (!startValue && endValue)) {
    throw new HttpError(
      400,
      "date_range_required",
      "Choose both a start date and an end date.",
    );
  }
  if (view === "health" && (startValue || endValue)) {
    throw new HttpError(
      400,
      "unsupported_filter",
      "Date filters are not available for Data Health.",
    );
  }

  const today = vancouverDate(now);
  const range =
    startValue && endValue
      ? {
          start: parseDate(startValue, "start"),
          end: parseDate(endValue, "end"),
        }
      : defaultRange(view, today, values.season);
  const rangeDays = Math.round(
    (new Date(`${range.end}T12:00:00.000Z`) -
      new Date(`${range.start}T12:00:00.000Z`)) /
      86_400_000,
  );
  if (rangeDays < 0) {
    throw new HttpError(
      400,
      "invalid_date_range",
      "The end date must be on or after the start date.",
    );
  }
  const maximumRange = view.startsWith("campspot-")
    ? MAX_CAMPSPOT_RANGE_DAYS
    : MAX_STANDARD_RANGE_DAYS;
  if (rangeDays >= maximumRange) {
    throw new HttpError(
      400,
      "date_range_too_large",
      view.startsWith("campspot-")
        ? "Choose a Campspot range of thirty years or less."
        : "Choose a range of six years or less.",
    );
  }
  if (!view.startsWith("campspot-") && view !== "health" && range.end > today) {
    throw new HttpError(
      400,
      "future_date",
      "GA4 and Search Console ranges cannot end in the future.",
    );
  }
  if (view.startsWith("campspot-") && range.end > addDays(today, 730)) {
    throw new HttpError(
      400,
      "future_date",
      "Campspot ranges cannot extend more than two years ahead.",
    );
  }

  return {
    view,
    start: range.start,
    end: range.end,
    season: values.season,
    device: values.device,
    source: values.source,
    medium: values.medium,
    landingPage: values.landingPage,
    query: values.query,
    page: values.page,
    site: values.site,
    siteType: values.siteType,
    status: values.status,
    leadTime: values.leadTime,
    stayLength: values.stayLength,
    reload: reloadValue === "true",
  };
};

const table = (viewName) => {
  const { projectId, datasetId } = getBigQueryConfig();
  return quoteTable(projectId, datasetId, viewName);
};

const number = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const summaryMetric = (id, label, value, format, description = "") => ({
  id,
  label,
  value: number(value),
  format,
  ...(description ? { description } : {}),
});

const freshness = (updatedAt, view) => {
  if (!updatedAt) {
    return {
      status: "missing",
      updatedAt: null,
      label: "Waiting for source data",
    };
  }
  const updatedMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedMs)) {
    return { status: "unknown", updatedAt: null, label: "Freshness unknown" };
  }
  const hours = Math.max(0, (Date.now() - updatedMs) / 3_600_000);
  const threshold = view === "search-console" ? 96 : view === "ga4" ? 72 : 36;
  return {
    status: hours > threshold ? "stale" : "fresh",
    updatedAt: new Date(updatedMs).toISOString(),
    ageHours: Math.round(hours * 10) / 10,
    label: hours > threshold ? "Source may be delayed" : "Source is current",
  };
};

const baseEnvelope = (filters, sourceFreshness) => ({
  version: 1,
  view: filters.view,
  range: {
    start: filters.start,
    end: filters.end,
    season: filters.season || null,
  },
  generatedAt: new Date().toISOString(),
  freshness: sourceFreshness,
  summary: [],
  trends: [],
  trendGranularity: "day",
  breakdowns: [],
  filterOptions: {},
  detailRows: [],
  issues: [],
  empty: true,
});

const ga4Parameters = (filters) => [
  namedParameter("start", "DATE", filters.start),
  namedParameter("end", "DATE", filters.end),
  namedParameter("device", "STRING", filters.device),
  namedParameter("source", "STRING", filters.source),
  namedParameter("medium", "STRING", filters.medium),
  namedParameter("landingPage", "STRING", filters.landingPage),
];

const GA4_WHERE = `
  date BETWEEN @start AND @end
  AND (@device IS NULL OR device_category = @device)
  AND (@source IS NULL OR source = @source)
  AND (@medium IS NULL OR medium = @medium)
  AND (@landingPage IS NULL OR landing_page = @landingPage)
`;

const buildGa4Data = (filters, summaryRows, trendRows, breakdownRows) => {
  const row = summaryRows[0] || {};
  const response = baseEnvelope(
    filters,
    freshness(row.source_updated_at, filters.view),
  );
  response.summary = [
    summaryMetric("users", "Users", row.users, "integer"),
    summaryMetric("sessions", "Sessions", row.sessions, "integer"),
    summaryMetric(
      "engagementRate",
      "Engagement rate",
      row.engagement_rate,
      "percent",
    ),
    summaryMetric("bookingClicks", "Booking clicks", row.booking_clicks, "integer"),
    summaryMetric("checkoutStarts", "Checkout starts", row.checkout_starts, "integer"),
    summaryMetric("purchases", "GA4 purchases", row.purchases, "integer"),
    summaryMetric(
      "matchedBookings",
      "Matched Campspot bookings",
      row.matched_bookings,
      "integer",
      "GA4 transactions matched to Campspot confirmation references.",
    ),
    summaryMetric(
      "matchedRevenue",
      "Matched Campspot revenue",
      row.matched_revenue,
      "currency",
    ),
  ];
  response.trends = trendRows.map((trend) => ({
    date: trend.date,
    users: number(trend.users),
    sessions: number(trend.sessions),
    bookingClicks: number(trend.booking_clicks),
    checkoutStarts: number(trend.checkout_starts),
    purchases: number(trend.purchases),
  }));

  const breakdownDefinitions = {
    source_medium: {
      id: "sourceMedium",
      label: "Traffic source",
      columns: [
        { key: "label", label: "Source / medium", format: "text" },
        { key: "users", label: "Users", format: "integer" },
        { key: "sessions", label: "Sessions", format: "integer" },
        { key: "purchases", label: "Purchases", format: "integer" },
      ],
    },
    device: {
      id: "device",
      label: "Device",
      columns: [
        { key: "label", label: "Device", format: "text" },
        { key: "users", label: "Users", format: "integer" },
        { key: "sessions", label: "Sessions", format: "integer" },
        { key: "purchases", label: "Purchases", format: "integer" },
      ],
    },
    landing_page: {
      id: "landingPage",
      label: "Landing pages",
      columns: [
        { key: "label", label: "Landing page", format: "text" },
        { key: "users", label: "Users", format: "integer" },
        { key: "sessions", label: "Sessions", format: "integer" },
        { key: "purchases", label: "Purchases", format: "integer" },
      ],
    },
  };
  response.breakdowns = Object.entries(breakdownDefinitions).map(
    ([kind, definition]) => ({
      ...definition,
      rows: breakdownRows
        .filter((item) => item.dimension === kind)
        .map((item) => ({
          key: item.key || item.label,
          label: item.label || "Unassigned",
          users: number(item.users),
          sessions: number(item.sessions),
          purchases: number(item.purchases),
        })),
    }),
  );
  response.filterOptions = {
    device: response.breakdowns
      .find((item) => item.id === "device")
      .rows.map((item) => item.label),
    sourceMedium: response.breakdowns
      .find((item) => item.id === "sourceMedium")
      .rows.map((item) => item.label),
  };
  response.empty = number(row.sessions) === 0 || number(row.sessions) === null;
  if (response.empty) {
    response.issues.push({
      severity: "info",
      message: "No GA4 rows matched this range and filter set.",
    });
  }
  return response;
};

const queryGa4 = async (filters) => {
  const sourceTable = table(VIEWS.ga4);
  const parameters = ga4Parameters(filters);
  const [summaryRows, trendRows, breakdownRows] = await Promise.all([
    queryBigQuery({
      query: `
        SELECT
          COALESCE(SUM(users), 0) AS users,
          COALESCE(SUM(sessions), 0) AS sessions,
          COALESCE(SUM(engaged_sessions), 0) AS engaged_sessions,
          SAFE_DIVIDE(SUM(engaged_sessions), NULLIF(SUM(sessions), 0)) AS engagement_rate,
          COALESCE(SUM(page_views), 0) AS page_views,
          COALESCE(SUM(booking_clicks), 0) AS booking_clicks,
          COALESCE(SUM(checkout_starts), 0) AS checkout_starts,
          COALESCE(SUM(purchases), 0) AS purchases,
          COALESCE(SUM(purchase_revenue), 0) AS purchase_revenue,
          COALESCE(SUM(matched_bookings), 0) AS matched_bookings,
          COALESCE(SUM(matched_revenue), 0) AS matched_revenue,
          MAX(source_updated_at) AS source_updated_at
        FROM ${sourceTable}
        WHERE ${GA4_WHERE}
      `,
      parameters,
      maxResults: 1,
    }),
    queryBigQuery({
      query: `
        SELECT
          date,
          SUM(users) AS users,
          SUM(sessions) AS sessions,
          SUM(booking_clicks) AS booking_clicks,
          SUM(checkout_starts) AS checkout_starts,
          SUM(purchases) AS purchases
        FROM ${sourceTable}
        WHERE ${GA4_WHERE}
        GROUP BY date
        ORDER BY date
      `,
      parameters,
      maxResults: 2200,
    }),
    queryBigQuery({
      query: `
        WITH filtered AS (
          SELECT source, medium, device_category, landing_page, users, sessions, purchases
          FROM ${sourceTable}
          WHERE ${GA4_WHERE}
        ),
        dimensions AS (
          SELECT
            'source_medium' AS dimension,
            CONCAT(COALESCE(NULLIF(source, ''), 'Unassigned'), ' / ', COALESCE(NULLIF(medium, ''), 'Unassigned')) AS label,
            CONCAT(COALESCE(source, ''), '|', COALESCE(medium, '')) AS key,
            SUM(users) AS users,
            SUM(sessions) AS sessions,
            SUM(purchases) AS purchases
          FROM filtered
          GROUP BY source, medium
          UNION ALL
          SELECT
            'device', COALESCE(NULLIF(device_category, ''), 'Unassigned'), COALESCE(device_category, ''),
            SUM(users), SUM(sessions), SUM(purchases)
          FROM filtered
          GROUP BY device_category
          UNION ALL
          SELECT
            'landing_page', COALESCE(NULLIF(landing_page, ''), 'Unassigned'), COALESCE(landing_page, ''),
            SUM(users), SUM(sessions), SUM(purchases)
          FROM filtered
          GROUP BY landing_page
        )
        SELECT dimension, label, key, users, sessions, purchases
        FROM dimensions
        QUALIFY ROW_NUMBER() OVER (PARTITION BY dimension ORDER BY sessions DESC, label) <= 40
        ORDER BY dimension, sessions DESC, label
      `,
      parameters,
      maxResults: 120,
    }),
  ]);
  return buildGa4Data(filters, summaryRows, trendRows, breakdownRows);
};

const searchParameters = (filters) => [
  namedParameter("start", "DATE", filters.start),
  namedParameter("end", "DATE", filters.end),
  namedParameter("device", "STRING", filters.device),
  namedParameter("searchQuery", "STRING", filters.query),
  namedParameter("page", "STRING", filters.page),
];

const SEARCH_WHERE = `
  date BETWEEN @start AND @end
  AND (@device IS NULL OR device = @device)
  AND (@searchQuery IS NULL OR query = @searchQuery)
  AND (@page IS NULL OR page = @page)
`;

const buildSearchData = (filters, summaryRows, trendRows, breakdownRows) => {
  const row = summaryRows[0] || {};
  const response = baseEnvelope(
    filters,
    freshness(row.source_updated_at, filters.view),
  );
  response.summary = [
    summaryMetric("clicks", "Clicks", row.clicks, "integer"),
    summaryMetric("impressions", "Impressions", row.impressions, "integer"),
    summaryMetric("ctr", "Click-through rate", row.ctr, "percent"),
    summaryMetric(
      "averagePosition",
      "Average position",
      row.average_position,
      "decimal",
    ),
  ];
  response.trends = trendRows.map((trend) => ({
    date: trend.date,
    clicks: number(trend.clicks),
    impressions: number(trend.impressions),
    ctr: number(trend.ctr),
    averagePosition: number(trend.average_position),
  }));
  const definitions = {
    query: {
      id: "queries",
      label: "Search queries",
      firstColumn: "Query",
    },
    page: {
      id: "pages",
      label: "Search pages",
      firstColumn: "Page",
    },
    device: {
      id: "device",
      label: "Device",
      firstColumn: "Device",
    },
  };
  response.breakdowns = Object.entries(definitions).map(([kind, definition]) => ({
    id: definition.id,
    label: definition.label,
    columns: [
      { key: "label", label: definition.firstColumn, format: "text" },
      { key: "clicks", label: "Clicks", format: "integer" },
      { key: "impressions", label: "Impressions", format: "integer" },
      { key: "ctr", label: "CTR", format: "percent" },
      { key: "averagePosition", label: "Position", format: "decimal" },
    ],
    rows: breakdownRows
      .filter((item) => item.dimension === kind)
      .map((item) => ({
        key: item.key || item.label,
        label: item.label || "Unassigned",
        clicks: number(item.clicks),
        impressions: number(item.impressions),
        ctr: number(item.ctr),
        averagePosition: number(item.average_position),
      })),
  }));
  response.filterOptions = {
    device: response.breakdowns
      .find((item) => item.id === "device")
      .rows.map((item) => item.label),
  };
  response.empty =
    number(row.impressions) === 0 || number(row.impressions) === null;
  if (response.empty) {
    response.issues.push({
      severity: "info",
      message: "No Search Console rows matched this range and filter set.",
    });
  }
  return response;
};

const querySearchConsole = async (filters) => {
  const sourceTable = table(VIEWS.searchConsole);
  const parameters = searchParameters(filters);
  const [summaryRows, trendRows, breakdownRows] = await Promise.all([
    queryBigQuery({
      query: `
        SELECT
          COALESCE(SUM(clicks), 0) AS clicks,
          COALESCE(SUM(impressions), 0) AS impressions,
          SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
          SAFE_DIVIDE(SUM(average_position * impressions), NULLIF(SUM(impressions), 0)) AS average_position,
          MAX(source_updated_at) AS source_updated_at
        FROM ${sourceTable}
        WHERE ${SEARCH_WHERE}
      `,
      parameters,
      maxResults: 1,
    }),
    queryBigQuery({
      query: `
        SELECT
          date,
          SUM(clicks) AS clicks,
          SUM(impressions) AS impressions,
          SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
          SAFE_DIVIDE(SUM(average_position * impressions), NULLIF(SUM(impressions), 0)) AS average_position
        FROM ${sourceTable}
        WHERE ${SEARCH_WHERE}
        GROUP BY date
        ORDER BY date
      `,
      parameters,
      maxResults: 2200,
    }),
    queryBigQuery({
      query: `
        WITH filtered AS (
          SELECT query, page, device, clicks, impressions, average_position
          FROM ${sourceTable}
          WHERE ${SEARCH_WHERE}
        ),
        dimensions AS (
          SELECT
            'query' AS dimension, COALESCE(NULLIF(query, ''), 'Unreported') AS label, COALESCE(query, '') AS key,
            SUM(clicks) AS clicks, SUM(impressions) AS impressions,
            SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
            SAFE_DIVIDE(SUM(average_position * impressions), NULLIF(SUM(impressions), 0)) AS average_position
          FROM filtered
          GROUP BY query
          UNION ALL
          SELECT
            'page', COALESCE(NULLIF(page, ''), 'Unreported'), COALESCE(page, ''),
            SUM(clicks), SUM(impressions),
            SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)),
            SAFE_DIVIDE(SUM(average_position * impressions), NULLIF(SUM(impressions), 0))
          FROM filtered
          GROUP BY page
          UNION ALL
          SELECT
            'device', COALESCE(NULLIF(device, ''), 'Unreported'), COALESCE(device, ''),
            SUM(clicks), SUM(impressions),
            SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)),
            SAFE_DIVIDE(SUM(average_position * impressions), NULLIF(SUM(impressions), 0))
          FROM filtered
          GROUP BY device
        )
        SELECT dimension, label, key, clicks, impressions, ctr, average_position
        FROM dimensions
        QUALIFY ROW_NUMBER() OVER (PARTITION BY dimension ORDER BY clicks DESC, impressions DESC, label) <= 40
        ORDER BY dimension, clicks DESC, impressions DESC, label
      `,
      parameters,
      maxResults: 120,
    }),
  ]);
  return buildSearchData(filters, summaryRows, trendRows, breakdownRows);
};

const campspotClass = (view) =>
  view === "campspot-vintage" ? "vintage_trailer" : "campground";

const campspotParameters = (filters) => [
  namedParameter("start", "DATE", filters.start),
  namedParameter("end", "DATE", filters.end),
  namedParameter("inventoryClass", "STRING", campspotClass(filters.view)),
  namedParameter(
    "season",
    "STRING",
    filters.season && filters.season !== "all" ? filters.season : null,
  ),
  namedParameter("site", "STRING", filters.site),
  namedParameter("siteType", "STRING", filters.siteType),
  namedParameter("status", "STRING", filters.status),
  namedParameter("leadTime", "STRING", filters.leadTime),
  namedParameter("stayLength", "STRING", filters.stayLength),
];

const CAMPSPOT_WHERE = `
  date BETWEEN @start AND @end
  AND inventory_class = @inventoryClass
  AND (@season IS NULL OR season = @season)
  AND (@site IS NULL OR site = @site)
  AND (@siteType IS NULL OR site_type = @siteType)
  AND (@status IS NULL OR status = @status)
  AND (@leadTime IS NULL OR lead_time_band = @leadTime)
  AND (@stayLength IS NULL OR stay_length_band = @stayLength)
`;

const buildCampspotData = (
  filters,
  summaryRows,
  trendRows,
  breakdownRows,
  paceRows,
) => {
  const row = summaryRows[0] || {};
  const updatedAt = [
    row.source_updated_at,
    ...paceRows.map((pace) => pace.source_updated_at),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);
  const response = baseEnvelope(
    filters,
    freshness(updatedAt, filters.view),
  );
  response.summary = [
    summaryMetric("reservations", "Reservations", row.reservations, "integer"),
    summaryMetric("cancellations", "Cancellations", row.cancellations, "integer"),
    summaryMetric(
      "occupancy",
      "Occupancy",
      row.occupancy_rate,
      "percent",
    ),
    summaryMetric(
      "occupiedNights",
      "Occupied site nights",
      row.occupied_site_nights,
      "integer",
    ),
    summaryMetric("grossRevenue", "Gross revenue", row.gross_revenue, "currency"),
    summaryMetric("refunds", "Refunds", row.refunds, "currency"),
    summaryMetric("netRevenue", "Net revenue", row.net_revenue, "currency"),
  ];
  response.trends = trendRows.map((trend) => ({
    date: trend.date,
    reservations: number(trend.reservations),
    cancellations: number(trend.cancellations),
    occupancy: number(trend.occupancy_rate),
    netRevenue: number(trend.net_revenue),
  }));
  response.trendGranularity = filters.season === "all" ? "month" : "day";
  response.bookingPace = {
    snapshotDate: paceRows[0]?.snapshot_date || null,
    rows: paceRows.map((pace) => ({
      date: pace.stay_date,
      availableSiteNights: number(pace.available_site_nights),
      bookedSiteNights: number(pace.booked_site_nights),
      reservations: number(pace.reservations),
      bookedRevenue: number(pace.booked_revenue),
    })),
  };
  const definitions = {
    season: { id: "season", label: "Seasons", firstColumn: "Season" },
    site_type: {
      id: "siteType",
      label: "Site types",
      firstColumn: "Site type",
    },
    site: { id: "site", label: "Sites", firstColumn: "Site" },
    status: {
      id: "status",
      label: "Reservation status",
      firstColumn: "Status",
    },
    lead_time: {
      id: "leadTime",
      label: "Booking lead time",
      firstColumn: "Lead time",
    },
    stay_length: {
      id: "stayLength",
      label: "Length of stay",
      firstColumn: "Stay length",
    },
  };
  response.breakdowns = Object.entries(definitions).map(([kind, definition]) => ({
    id: definition.id,
    label: definition.label,
    columns: [
      { key: "label", label: definition.firstColumn, format: "text" },
      { key: "reservations", label: "Reservations", format: "integer" },
      { key: "occupancy", label: "Occupancy", format: "percent" },
      { key: "netRevenue", label: "Net revenue", format: "currency" },
    ],
    rows: breakdownRows
      .filter((item) => item.dimension === kind)
      .map((item) => ({
        key: item.key || item.label,
        label: item.label || "Unassigned",
        reservations: number(item.reservations),
        occupancy: number(item.occupancy_rate),
        netRevenue: number(item.net_revenue),
      })),
  }));
  response.filterOptions = Object.fromEntries(
    response.breakdowns.map((breakdown) => [
      breakdown.id,
      breakdown.rows.map((item) => item.label),
    ]),
  );
  response.empty =
    number(row.reservations) === 0 &&
    number(row.occupied_site_nights) === 0 &&
    number(row.net_revenue) === 0;
  if (response.empty) {
    response.issues.push({
      severity: "info",
      message: "No Campspot rows matched this range and filter set.",
    });
  }
  return response;
};

const queryCampspot = async (filters) => {
  const sourceTable = table(VIEWS.campspot);
  const paceTable = table(VIEWS.bookingPace);
  const parameters = campspotParameters(filters);
  const trendDate =
    filters.season === "all" ? "DATE_TRUNC(date, MONTH)" : "date";
  const paceParameters = [
    namedParameter("start", "DATE", filters.start),
    namedParameter("end", "DATE", filters.end),
    namedParameter("inventoryClass", "STRING", campspotClass(filters.view)),
    namedParameter("site", "STRING", filters.site),
    namedParameter("siteType", "STRING", filters.siteType),
  ];
  const [summaryRows, trendRows, breakdownRows, paceRows] = await Promise.all([
    queryBigQuery({
      query: `
        SELECT
          COALESCE(SUM(reservations), 0) AS reservations,
          COALESCE(SUM(cancellations), 0) AS cancellations,
          COALESCE(SUM(occupied_site_nights), 0) AS occupied_site_nights,
          COALESCE(SUM(available_site_nights), 0) AS available_site_nights,
          SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)) AS occupancy_rate,
          COALESCE(SUM(gross_revenue), 0) AS gross_revenue,
          COALESCE(SUM(refunds), 0) AS refunds,
          COALESCE(SUM(net_revenue), 0) AS net_revenue,
          MAX(source_updated_at) AS source_updated_at
        FROM ${sourceTable}
        WHERE ${CAMPSPOT_WHERE}
      `,
      parameters,
      maxResults: 1,
    }),
    queryBigQuery({
      query: `
        SELECT
          ${trendDate} AS date,
          SUM(reservations) AS reservations,
          SUM(cancellations) AS cancellations,
          SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)) AS occupancy_rate,
          SUM(net_revenue) AS net_revenue
        FROM ${sourceTable}
        WHERE ${CAMPSPOT_WHERE}
        GROUP BY 1
        ORDER BY date
      `,
      parameters,
      maxResults: 2200,
    }),
    queryBigQuery({
      query: `
        WITH filtered AS (
          SELECT season, site, site_type, status, lead_time_band, stay_length_band,
            reservations, occupied_site_nights, available_site_nights, net_revenue
          FROM ${sourceTable}
          WHERE ${CAMPSPOT_WHERE}
        ),
        dimensions AS (
          SELECT 'season' AS dimension, COALESCE(NULLIF(season, ''), 'Unassigned') AS label, COALESCE(season, '') AS key,
            SUM(reservations) AS reservations,
            SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)) AS occupancy_rate,
            SUM(net_revenue) AS net_revenue FROM filtered GROUP BY season
          UNION ALL
          SELECT 'site_type', COALESCE(NULLIF(site_type, ''), 'Unassigned'), COALESCE(site_type, ''),
            SUM(reservations), SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)), SUM(net_revenue)
            FROM filtered GROUP BY site_type
          UNION ALL
          SELECT 'site', COALESCE(NULLIF(site, ''), 'Unassigned'), COALESCE(site, ''),
            SUM(reservations), SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)), SUM(net_revenue)
            FROM filtered GROUP BY site
          UNION ALL
          SELECT 'status', COALESCE(NULLIF(status, ''), 'Unassigned'), COALESCE(status, ''),
            SUM(reservations), SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)), SUM(net_revenue)
            FROM filtered GROUP BY status
          UNION ALL
          SELECT 'lead_time', COALESCE(NULLIF(lead_time_band, ''), 'Unassigned'), COALESCE(lead_time_band, ''),
            SUM(reservations), SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)), SUM(net_revenue)
            FROM filtered GROUP BY lead_time_band
          UNION ALL
          SELECT 'stay_length', COALESCE(NULLIF(stay_length_band, ''), 'Unassigned'), COALESCE(stay_length_band, ''),
            SUM(reservations), SAFE_DIVIDE(SUM(occupied_site_nights), NULLIF(SUM(available_site_nights), 0)), SUM(net_revenue)
            FROM filtered GROUP BY stay_length_band
        )
        SELECT dimension, label, key, reservations, occupancy_rate, net_revenue
        FROM dimensions
        QUALIFY ROW_NUMBER() OVER (PARTITION BY dimension ORDER BY reservations DESC, label) <= 60
        ORDER BY dimension, reservations DESC, label
      `,
      parameters,
      maxResults: 360,
    }),
    queryBigQuery({
      query: `
        SELECT
          snapshot_date,
          stay_date,
          SUM(available_site_nights) AS available_site_nights,
          SUM(booked_site_nights) AS booked_site_nights,
          SUM(reservations) AS reservations,
          SUM(booked_revenue) AS booked_revenue,
          MAX(source_updated_at) AS source_updated_at
        FROM ${paceTable}
        WHERE stay_date BETWEEN @start AND @end
          AND snapshot_kind = 'observed'
          AND inventory_class = @inventoryClass
          AND (@site IS NULL OR site = @site)
          AND (@siteType IS NULL OR site_type = @siteType)
        GROUP BY snapshot_date, stay_date
        QUALIFY snapshot_date = MAX(snapshot_date) OVER ()
        ORDER BY stay_date
      `,
      parameters: paceParameters,
      maxResults: 2200,
    }),
  ]);
  return buildCampspotData(
    filters,
    summaryRows,
    trendRows,
    breakdownRows,
    paceRows,
  );
};

const buildHealthData = (filters, healthRows, qualityRows) => {
  const mostRecent = healthRows
    .map((row) => row.checked_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  const response = baseEnvelope(filters, freshness(mostRecent, "health"));
  response.sources = healthRows.map((row) => ({
    source: row.source,
    status: row.status || "unknown",
    lastRecordAt: row.last_record_at || null,
    checkedAt: row.checked_at || null,
    lagHours: number(row.lag_hours),
    recordsLoaded: number(row.records_loaded),
    issueCount: number(row.issue_count),
    message: row.message || "",
  }));
  response.quality = qualityRows.map((row) => ({
    key: row.issue_key,
    category: row.category,
    severity: row.severity,
    status: row.status,
    metricValue: number(row.metric_value),
    thresholdValue: number(row.threshold_value),
    message: row.message || "",
    checkedAt: row.checked_at || null,
  }));
  const healthy = response.sources.filter((source) =>
    ["fresh", "healthy", "ok"].includes(String(source.status).toLowerCase()),
  ).length;
  const openQuality = response.quality.filter(
    (issue) => !["resolved", "ok", "pass"].includes(String(issue.status).toLowerCase()),
  );
  response.summary = [
    summaryMetric("sources", "Sources monitored", response.sources.length, "integer"),
    summaryMetric("healthySources", "Sources current", healthy, "integer"),
    summaryMetric("openIssues", "Open quality issues", openQuality.length, "integer"),
    summaryMetric(
      "recordsLoaded",
      "Rows in latest loads",
      response.sources.reduce(
        (total, source) => total + (source.recordsLoaded || 0),
        0,
      ),
      "integer",
    ),
  ];
  response.issues = [
    ...response.sources
      .filter(
        (source) =>
          !["fresh", "healthy", "ok"].includes(
            String(source.status).toLowerCase(),
          ),
      )
      .map((source) => ({
        severity: source.status === "failed" ? "error" : "warning",
        message:
          source.message ||
          `${source.source || "A source"} needs attention.`,
      })),
    ...openQuality.map((issue) => ({
      severity: issue.severity || "warning",
      message: issue.message || `${issue.category} needs attention.`,
    })),
  ];
  response.empty = response.sources.length === 0;
  if (response.empty) {
    response.issues.push({
      severity: "info",
      message: "Health checks have not produced a snapshot yet.",
    });
  }
  return response;
};

const queryHealth = async (filters) => {
  const healthTable = table(VIEWS.health);
  const qualityTable = table(VIEWS.quality);
  const [healthRows, qualityRows] = await Promise.all([
    queryBigQuery({
      query: `
        SELECT source, status, last_record_at, checked_at, lag_hours,
          records_loaded, issue_count, message
        FROM ${healthTable}
        ORDER BY source
      `,
      maxResults: 100,
    }),
    queryBigQuery({
      query: `
        SELECT issue_key, category, severity, status, metric_value,
          threshold_value, message, checked_at
        FROM ${qualityTable}
        ORDER BY
          CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
          category,
          issue_key
      `,
      maxResults: 500,
    }),
  ]);
  return buildHealthData(filters, healthRows, qualityRows);
};

const loadDashboardData = (filters) => {
  switch (filters.view) {
    case "ga4":
      return queryGa4(filters);
    case "search-console":
      return querySearchConsole(filters);
    case "campspot-campground":
    case "campspot-vintage":
      return queryCampspot(filters);
    case "health":
      return queryHealth(filters);
    default:
      throw new HttpError(400, "invalid_view", "Choose a valid dashboard view.");
  }
};

const cacheKey = (filters) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(filters)
        .filter(([key]) => key !== "reload")
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of dataCache) {
    if (entry.expiresAt <= now) dataCache.delete(key);
  }
  while (dataCache.size >= DATA_CACHE_ENTRIES) {
    const oldest = dataCache.keys().next().value;
    if (oldest === undefined) break;
    dataCache.delete(oldest);
  }
};

export const getDashboardData = async (filters) => {
  const key = cacheKey(filters);
  const cached = dataCache.get(key);
  if (!filters.reload && cached?.expiresAt > Date.now()) return cached.value;

  if (!filters.reload && pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  const request = loadDashboardData(filters);
  pendingRequests.set(key, request);
  try {
    const value = await request;
    pruneCache();
    dataCache.set(key, {
      value,
      expiresAt: Date.now() + DATA_CACHE_MS,
    });
    return value;
  } finally {
    if (pendingRequests.get(key) === request) pendingRequests.delete(key);
  }
};

export const resetDashboardCache = () => {
  dataCache.clear();
  pendingRequests.clear();
};

export {
  buildCampspotData,
  buildGa4Data,
  buildHealthData,
  buildSearchData,
};
