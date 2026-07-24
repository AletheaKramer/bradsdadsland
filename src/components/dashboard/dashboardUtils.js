const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const VIEW_DEFINITIONS = Object.freeze([
  {
    id: "ga4",
    shortLabel: "GA4",
    label: "Website & booking journey",
    eyebrow: "Google Analytics 4",
    description:
      "Traffic, engagement, booking actions, and transactions matched back to Campspot.",
  },
  {
    id: "search-console",
    shortLabel: "Search",
    label: "Organic search visibility",
    eyebrow: "Google Search Console",
    description:
      "How people find Brad’s Dads Land through Google, from search demand to landing pages.",
  },
  {
    id: "campspot-campground",
    shortLabel: "Campground",
    label: "Campground operations",
    eyebrow: "Campspot · Campground",
    description:
      "Reservations, occupancy, cancellations, revenue, and booking pace for campground sites.",
  },
  {
    id: "campspot-vintage",
    shortLabel: "Trailers",
    label: "Vintage trailer operations",
    eyebrow: "Campspot · Vintage trailers",
    description:
      "The same operational view, isolated to Brad’s vintage trailer inventory.",
  },
  {
    id: "health",
    shortLabel: "Health",
    label: "Data health",
    eyebrow: "Pipeline monitoring",
    description:
      "Freshness, coverage, rejected inventory, and data-quality checks across every source.",
  },
]);

export const viewDefinition = (view) =>
  VIEW_DEFINITIONS.find((item) => item.id === view) || VIEW_DEFINITIONS[0];

export const vancouverToday = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const defaultFilters = (view = "ga4", now = new Date()) => {
  const safeView = VIEW_DEFINITIONS.some((item) => item.id === view)
    ? view
    : "ga4";
  const today = vancouverToday(now);
  if (safeView === "health") return { view: safeView };
  if (safeView.startsWith("campspot-")) {
    const season = today.slice(0, 4);
    return {
      view: safeView,
      season,
      start: `${season}-01-01`,
      end: `${season}-12-31`,
    };
  }
  return {
    view: safeView,
    start: addDays(today, -89),
    end: today,
  };
};

const URL_FILTER_KEYS = Object.freeze([
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
]);

export const filtersFromLocation = (location = window.location) => {
  const params = new URLSearchParams(location.search);
  const view = params.get("view") || "ga4";
  const defaults = defaultFilters(view);
  const filters = { ...defaults };
  for (const key of URL_FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  if (
    filters.view !== "health" &&
    (!DATE_PATTERN.test(filters.start || "") ||
      !DATE_PATTERN.test(filters.end || ""))
  ) {
    return defaults;
  }
  return filters;
};

export const filtersToSearch = (filters) => {
  const params = new URLSearchParams();
  params.set("view", filters.view || "ga4");
  for (const key of URL_FILTER_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return `?${params.toString()}`;
};

export const sourceQuery = (filters, { reload = false } = {}) => {
  const params = new URLSearchParams(filtersToSearch(filters).slice(1));
  if (reload) params.set("reload", "true");
  return params.toString();
};

const INTEGER_FORMATTER = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 0,
});
const DECIMAL_FORMATTER = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});
const PERCENT_FORMATTER = new Intl.NumberFormat("en-CA", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatValue = (value, format = "text") => {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "text") return String(value);
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  switch (format) {
    case "integer":
      return INTEGER_FORMATTER.format(number);
    case "decimal":
      return DECIMAL_FORMATTER.format(number);
    case "currency":
      return CURRENCY_FORMATTER.format(number);
    case "percent":
      return PERCENT_FORMATTER.format(number);
    default:
      return String(value);
  }
};

export const formatDate = (value, options = {}) => {
  if (!value) return "Not available";
  const date = new Date(
    DATE_PATTERN.test(value) ? `${value}T12:00:00.000Z` : value,
  );
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: options.year === false ? undefined : "numeric",
    timeZone: "America/Vancouver",
  }).format(date);
};

export const freshnessText = (freshness) => {
  if (!freshness?.updatedAt) return freshness?.label || "Waiting for source data";
  if (Number.isFinite(freshness.ageHours)) {
    if (freshness.ageHours < 1) return "Updated less than an hour ago";
    if (freshness.ageHours < 48) {
      const hours = Math.round(freshness.ageHours);
      return `Updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    return `Updated ${Math.round(freshness.ageHours / 24)} days ago`;
  }
  return `Updated ${formatDate(freshness.updatedAt)}`;
};

// Spreadsheet applications may interpret cells beginning with these characters
// as formulas. Prefixing with an apostrophe preserves the text without executing it.
export const neutralizeSpreadsheetFormula = (value) => {
  const text = String(value ?? "");
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
};

export const safeCsvCell = (value) => {
  const text = neutralizeSpreadsheetFormula(value).replaceAll('"', '""');
  return `"${text}"`;
};

const csvRow = (values) => values.map(safeCsvCell).join(",");

export const dashboardToCsv = (data) => {
  const rows = [
    csvRow(["Brad's Dads Land dashboard"]),
    csvRow(["View", data?.view || ""]),
    csvRow(["Start", data?.range?.start || ""]),
    csvRow(["End", data?.range?.end || ""]),
    csvRow(["Generated", data?.generatedAt || ""]),
    "",
    csvRow(["Summary"]),
    csvRow(["Metric", "Value", "Format"]),
    ...(data?.summary || []).map((metric) =>
      csvRow([metric.label, metric.value ?? "", metric.format]),
    ),
  ];

  if (data?.trends?.length) {
    const keys = Object.keys(data.trends[0]);
    rows.push(
      "",
      csvRow(["Trend"]),
      csvRow(keys),
      ...data.trends.map((row) => csvRow(keys.map((key) => row[key] ?? ""))),
    );
  }

  for (const breakdown of data?.breakdowns || []) {
    const columns = breakdown.columns || [];
    rows.push(
      "",
      csvRow([breakdown.label]),
      csvRow(columns.map((column) => column.label)),
      ...(breakdown.rows || []).map((row) =>
        csvRow(columns.map((column) => row[column.key] ?? "")),
      ),
    );
  }

  if (data?.sources?.length) {
    rows.push(
      "",
      csvRow(["Data health"]),
      csvRow([
        "Source",
        "Status",
        "Last record",
        "Lag hours",
        "Rows loaded",
        "Message",
      ]),
      ...data.sources.map((source) =>
        csvRow([
          source.source,
          source.status,
          source.lastRecordAt,
          source.lagHours,
          source.recordsLoaded,
          source.message,
        ]),
      ),
    );
  }
  return `${rows.join("\r\n")}\r\n`;
};

export const downloadDashboardCsv = (data) => {
  const csv = dashboardToCsv(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = data?.range?.end || vancouverToday();
  anchor.href = url;
  anchor.download = `bradsdadsland-${data?.view || "dashboard"}-${date}.csv`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
