/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import logoUrl from "../../assets/bradsdadsland.png";
import {
  defaultFilters,
  downloadDashboardCsv,
  filtersFromLocation,
  filtersToSearch,
  formatDate,
  formatValue,
  freshnessText,
  sourceQuery,
  VIEW_DEFINITIONS,
  viewDefinition,
} from "./dashboardUtils.js";

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = new Error(
      body?.error?.message || "The dashboard could not complete this request.",
    );
    error.code = body?.error?.code || "request_failed";
    error.status = response.status;
    throw error;
  }
  return body;
};

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <path
      d="M4 10h12m-5-5 5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <path
      d="M15.1 6.1A6 6 0 1 0 16 12M15.2 3v3.5h-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <path
      d="M10 3v9m-3.5-3L10 12.5 13.5 9M4 15.5h12"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const LoginScreen = ({ onAuthenticated }) => {
  const inputRef = useRef(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await requestJson("/api/dashboard/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bdl-login">
      <section className="bdl-login__card" aria-labelledby="dashboard-login-title">
        <div className="bdl-login__brand">
          <img src={logoUrl} alt="Brad’s Dads Land" />
          <span>Owner dashboard</span>
        </div>
        <div className="bdl-login__intro">
          <p className="bdl-eyebrow">Private reporting</p>
          <h1 id="dashboard-login-title">A clear view of the season.</h1>
          <p>
            GA4, Google Search, and Campspot reporting in one private,
            source-first dashboard.
          </p>
        </div>
        <form className="bdl-login__form" onSubmit={submit}>
          <label htmlFor="dashboard-password">Dashboard password</label>
          <input
            ref={inputRef}
            id="dashboard-password"
            name="password"
            type="password"
            value={password}
            autoComplete="current-password"
            maxLength={1024}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? (
            <p className="bdl-form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="bdl-button bdl-button--primary" type="submit" disabled={busy}>
            <span>{busy ? "Signing in…" : "Open dashboard"}</span>
            <ArrowIcon />
          </button>
        </form>
        <p className="bdl-login__privacy">
          Aggregate business reporting only. Guest contact and payment details
          are not stored here.
        </p>
      </section>
      <aside className="bdl-login__aside" aria-label="Dashboard data sources">
        <p>Three trusted sources</p>
        <ol>
          <li>
            <span>01</span>
            <strong>Google Analytics</strong>
            <small>Website and booking journey</small>
          </li>
          <li>
            <span>02</span>
            <strong>Search Console</strong>
            <small>Organic search visibility</small>
          </li>
          <li>
            <span>03</span>
            <strong>Campspot</strong>
            <small>Reservations and operations</small>
          </li>
        </ol>
      </aside>
    </main>
  );
};

const LoadingScreen = () => (
  <main className="bdl-session-loading" aria-live="polite">
    <div className="bdl-loader" aria-hidden="true" />
    <p>Opening the owner dashboard…</p>
  </main>
);

const Field = ({ label, htmlFor, hint, children, className = "" }) => (
  <div className={`bdl-field ${className}`}>
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {hint ? <small>{hint}</small> : null}
  </div>
);

const OptionInput = ({ id, label, value, options, onChange, placeholder }) => (
  <Field label={label} htmlFor={id}>
    <input
      id={id}
      list={`${id}-options`}
      value={value || ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
    <datalist id={`${id}-options`}>
      {[...new Set(options || [])].map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  </Field>
);

const seasonOptions = (today = new Date()) => {
  const current = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Vancouver",
      year: "numeric",
    }).format(today),
  );
  return Array.from({ length: 6 }, (_, index) => String(current - index));
};

const FilterBar = ({ filters, data, onApply, onReset }) => {
  const [draft, setDraft] = useState(filters);
  const isCampspot = filters.view.startsWith("campspot-");

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  if (filters.view === "health") return null;

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const changeSeason = (season) => {
    if (season === "all") {
      setDraft((current) => ({
        ...current,
        season,
        start: "2000-01-01",
        end: `${seasonOptions()[0]}-12-31`,
      }));
      return;
    }
    setDraft((current) => ({
      ...current,
      season,
      start: `${season}-01-01`,
      end: `${season}-12-31`,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(
      Object.entries(draft).filter(([, value]) => Boolean(value)),
    );
    onApply(next);
  };

  return (
    <form className="bdl-filters" onSubmit={submit}>
      <div className="bdl-filters__heading">
        <div>
          <p className="bdl-eyebrow">Refine this view</p>
          <h2>Filters</h2>
        </div>
        <button className="bdl-text-button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="bdl-filters__grid">
        {isCampspot ? (
          <Field label="Season" htmlFor="filter-season">
            <select
              id="filter-season"
              value={draft.season || ""}
              onChange={(event) => changeSeason(event.target.value)}
            >
              {seasonOptions().map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
              <option value="all">All available seasons</option>
            </select>
          </Field>
        ) : null}
        <Field label="Start" htmlFor="filter-start">
          <input
            id="filter-start"
            type="date"
            required
            value={draft.start || ""}
            onChange={(event) => update("start", event.target.value)}
          />
        </Field>
        <Field label="End" htmlFor="filter-end">
          <input
            id="filter-end"
            type="date"
            required
            value={draft.end || ""}
            onChange={(event) => update("end", event.target.value)}
          />
        </Field>

        {filters.view === "ga4" ? (
          <>
            <OptionInput
              id="filter-device"
              label="Device"
              value={draft.device}
              options={data?.filterOptions?.device || ["desktop", "mobile", "tablet"]}
              placeholder="All devices"
              onChange={(value) => update("device", value)}
            />
            <Field label="Source" htmlFor="filter-source">
              <input
                id="filter-source"
                value={draft.source || ""}
                placeholder="All sources"
                onChange={(event) => update("source", event.target.value)}
              />
            </Field>
            <Field label="Medium" htmlFor="filter-medium">
              <input
                id="filter-medium"
                value={draft.medium || ""}
                placeholder="All media"
                onChange={(event) => update("medium", event.target.value)}
              />
            </Field>
            <OptionInput
              id="filter-landing"
              label="Landing page"
              value={draft.landingPage}
              options={
                data?.breakdowns
                  ?.find((item) => item.id === "landingPage")
                  ?.rows.map((row) => row.label) || []
              }
              placeholder="All landing pages"
              onChange={(value) => update("landingPage", value)}
            />
          </>
        ) : null}

        {filters.view === "search-console" ? (
          <>
            <OptionInput
              id="filter-search-device"
              label="Device"
              value={draft.device}
              options={data?.filterOptions?.device || ["DESKTOP", "MOBILE", "TABLET"]}
              placeholder="All devices"
              onChange={(value) => update("device", value)}
            />
            <OptionInput
              id="filter-query"
              label="Search query"
              value={draft.query}
              options={
                data?.breakdowns
                  ?.find((item) => item.id === "queries")
                  ?.rows.map((row) => row.label) || []
              }
              placeholder="All queries"
              onChange={(value) => update("query", value)}
            />
            <OptionInput
              id="filter-page"
              label="Search page"
              value={draft.page}
              options={
                data?.breakdowns
                  ?.find((item) => item.id === "pages")
                  ?.rows.map((row) => row.label) || []
              }
              placeholder="All pages"
              onChange={(value) => update("page", value)}
            />
          </>
        ) : null}

        {isCampspot ? (
          <>
            <OptionInput
              id="filter-site-type"
              label="Site type"
              value={draft.siteType}
              options={data?.filterOptions?.siteType}
              placeholder="All site types"
              onChange={(value) => update("siteType", value)}
            />
            <OptionInput
              id="filter-site"
              label="Site"
              value={draft.site}
              options={data?.filterOptions?.site}
              placeholder="All sites"
              onChange={(value) => update("site", value)}
            />
            <OptionInput
              id="filter-status"
              label="Status"
              value={draft.status}
              options={data?.filterOptions?.status}
              placeholder="All statuses"
              onChange={(value) => update("status", value)}
            />
            <OptionInput
              id="filter-lead-time"
              label="Lead time"
              value={draft.leadTime}
              options={data?.filterOptions?.leadTime}
              placeholder="Any lead time"
              onChange={(value) => update("leadTime", value)}
            />
            <OptionInput
              id="filter-stay-length"
              label="Stay length"
              value={draft.stayLength}
              options={data?.filterOptions?.stayLength}
              placeholder="Any stay length"
              onChange={(value) => update("stayLength", value)}
            />
          </>
        ) : null}
      </div>
      <div className="bdl-filters__actions">
        <button className="bdl-button bdl-button--dark" type="submit">
          Apply filters
        </button>
      </div>
    </form>
  );
};

const SummaryGrid = ({ metrics, loading }) => (
  <section className="bdl-summary" aria-label="Key metrics" aria-busy={loading}>
    {(loading ? Array.from({ length: 6 }) : metrics || []).map((metric, index) =>
      loading ? (
        <div className="bdl-metric bdl-skeleton" key={index} aria-hidden="true">
          <span />
          <strong />
        </div>
      ) : (
        <article className="bdl-metric" key={metric.id}>
          <p>{metric.label}</p>
          <strong>{formatValue(metric.value, metric.format)}</strong>
          {metric.description ? <small>{metric.description}</small> : null}
        </article>
      ),
    )}
  </section>
);

const trendDefinition = (view) => {
  if (view === "ga4") {
    return { key: "sessions", label: "Sessions", format: "integer" };
  }
  if (view === "search-console") {
    return { key: "impressions", label: "Impressions", format: "integer" };
  }
  return { key: "occupancy", label: "Occupancy", format: "percent" };
};

const TrendChart = ({ view, rows, granularity = "day" }) => {
  const definition = trendDefinition(view);
  const points = (rows || [])
    .map((row) => ({ date: row.date, value: Number(row[definition.key]) }))
    .filter((row) => Number.isFinite(row.value));
  if (points.length < 2) return null;

  const values = points.map((point) => point.value);
  const maximum = Math.max(...values);
  const minimum = Math.min(...values);
  const span = maximum - minimum || 1;
  const width = 900;
  const height = 240;
  const inset = 12;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: inset + (index / (points.length - 1)) * (width - inset * 2),
    y: inset + ((maximum - point.value) / span) * (height - inset * 2),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${inset},${height} ${line} ${width - inset},${height}`;
  const latest = points.at(-1);

  return (
    <figure className="bdl-trend">
      <figcaption>
        <div>
          <p className="bdl-eyebrow">
            {granularity === "month" ? "Monthly trend" : "Daily trend"}
          </p>
          <h2>{definition.label}</h2>
        </div>
        <strong>{formatValue(latest.value, definition.format)}</strong>
      </figcaption>
      <div
        className="bdl-trend__plot"
        role="img"
        aria-label={`${definition.label} from ${formatDate(points[0].date)} to ${formatDate(latest.date)}`}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#abc5a9" stopOpacity=".65" />
              <stop offset="100%" stopColor="#abc5a9" stopOpacity=".04" />
            </linearGradient>
          </defs>
          <line x1="0" x2={width} y1={height - 1} y2={height - 1} />
          <polygon points={area} fill="url(#trend-fill)" />
          <polyline points={line} />
        </svg>
      </div>
      <div className="bdl-trend__dates">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(latest.date)}</span>
      </div>
    </figure>
  );
};

const BreakdownTable = ({ breakdown }) => (
  <section className="bdl-table-card">
    <div className="bdl-table-card__heading">
      <h2>{breakdown.label}</h2>
      <span>{breakdown.rows?.length || 0} rows</span>
    </div>
    {breakdown.rows?.length ? (
      <div className="bdl-table-scroll">
        <table>
          <thead>
            <tr>
              {breakdown.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={column.format !== "text" ? "bdl-numeric" : ""}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((row) => (
              <tr key={row.key || row.label}>
                {breakdown.columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.format !== "text" ? "bdl-numeric" : ""}
                  >
                    {formatValue(row[column.key], column.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="bdl-table-empty">No rows in this breakdown.</p>
    )}
  </section>
);

const PacePanel = ({ pace }) => {
  if (!pace?.rows?.length) return null;
  const bookedNights = pace.rows.reduce(
    (total, row) => total + (row.bookedSiteNights || 0),
    0,
  );
  const availableNights = pace.rows.reduce(
    (total, row) => total + (row.availableSiteNights || 0),
    0,
  );
  const revenue = pace.rows.reduce(
    (total, row) => total + (row.bookedRevenue || 0),
    0,
  );
  return (
    <section className="bdl-pace">
      <div>
        <p className="bdl-eyebrow">Latest on-books snapshot</p>
        <h2>Forward booking pace</h2>
        <p>
          Captured {formatDate(pace.snapshotDate)}. Comparisons become available
          as daily snapshots accumulate.
        </p>
      </div>
      <dl>
        <div>
          <dt>Booked nights</dt>
          <dd>{formatValue(bookedNights, "integer")}</dd>
        </div>
        <div>
          <dt>On-books occupancy</dt>
          <dd>
            {formatValue(
              availableNights ? bookedNights / availableNights : null,
              "percent",
            )}
          </dd>
        </div>
        <div>
          <dt>Booked revenue</dt>
          <dd>{formatValue(revenue, "currency")}</dd>
        </div>
      </dl>
    </section>
  );
};

const HealthPanel = ({ data }) => (
  <div className="bdl-health-grid">
    <section className="bdl-table-card">
      <div className="bdl-table-card__heading">
        <h2>Source freshness</h2>
        <span>{data.sources?.length || 0} sources</span>
      </div>
      {data.sources?.length ? (
        <div className="bdl-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col">Latest record</th>
                <th scope="col" className="bdl-numeric">
                  Rows loaded
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((source) => (
                <tr key={source.source}>
                  <td>{source.source}</td>
                  <td>
                    <span
                      className={`bdl-status bdl-status--${String(source.status).toLowerCase()}`}
                    >
                      {source.status}
                    </span>
                  </td>
                  <td>{formatDate(source.lastRecordAt)}</td>
                  <td className="bdl-numeric">
                    {formatValue(source.recordsLoaded, "integer")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="bdl-table-empty">No source checks are available yet.</p>
      )}
    </section>
    <section className="bdl-quality">
      <div className="bdl-table-card__heading">
        <h2>Quality checks</h2>
        <span>{data.quality?.length || 0} checks</span>
      </div>
      {data.quality?.length ? (
        <ul>
          {data.quality.map((issue) => (
            <li key={issue.key}>
              <span
                className={`bdl-severity bdl-severity--${issue.severity || "info"}`}
              />
              <div>
                <strong>{issue.category}</strong>
                <p>{issue.message || issue.status}</p>
              </div>
              <small>{issue.status}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bdl-table-empty">No quality checks are available yet.</p>
      )}
    </section>
  </div>
);

const IssueBanner = ({ issues }) => {
  if (!issues?.length) return null;
  return (
    <section className="bdl-issues" aria-label="Data notes">
      {issues.map((issue, index) => (
        <div
          className={`bdl-issue bdl-issue--${issue.severity || "info"}`}
          key={`${issue.message}-${index}`}
        >
          <span aria-hidden="true" />
          <p>{issue.message}</p>
        </div>
      ))}
    </section>
  );
};

const EmptyState = ({ error }) => (
  <section className="bdl-empty" role={error ? "alert" : "status"}>
    <span aria-hidden="true">∿</span>
    <p className="bdl-eyebrow">{error ? "Live data unavailable" : "No rows yet"}</p>
    <h2>{error ? "The source connection needs a look." : "This view is waiting for data."}</h2>
    <p>
      {error
        ? error
        : "Try another date range or filter. The dashboard never fills gaps with placeholder metrics."}
    </p>
  </section>
);

const OwnerDashboard = ({ session, onExpired, onLogout }) => {
  const initialFilters = useMemo(() => filtersFromLocation(), []);
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const requestId = useRef(0);
  const definition = viewDefinition(filters.view);

  const loadData = useCallback(
    async (reload = false) => {
      const id = ++requestId.current;
      setLoading(true);
      setError("");
      try {
        const payload = await requestJson(
          `/api/dashboard/data?${sourceQuery(filters, { reload })}`,
        );
        if (requestId.current === id) setData(payload);
      } catch (requestError) {
        if (requestError.status === 401) {
          onExpired();
          return;
        }
        if (requestId.current === id) {
          setData(null);
          setError(requestError.message);
        }
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    },
    [filters, onExpired],
  );

  useEffect(() => {
    window.history.replaceState(null, "", filtersToSearch(filters));
    loadData(false);
  }, [filters, loadData]);

  useEffect(() => {
    const onPopState = () => setFilters(filtersFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const chooseView = (view) => {
    if (view === filters.view) return;
    const next = defaultFilters(view);
    window.history.pushState(null, "", filtersToSearch(next));
    setFilters(next);
    setData(null);
  };

  const applyFilters = (next) => {
    window.history.pushState(null, "", filtersToSearch(next));
    setFilters(next);
  };

  const resetFilters = () => {
    const next = defaultFilters(filters.view);
    window.history.pushState(null, "", filtersToSearch(next));
    setFilters(next);
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await requestJson("/api/dashboard/logout", { method: "POST" });
    } catch {
      // The local session is still cleared in the UI; an expired cookie is
      // also removed by the next session check.
    } finally {
      setLoggingOut(false);
      onLogout();
    }
  };

  return (
    <div className="bdl-dashboard">
      <header className="bdl-header">
        <a className="bdl-header__brand" href="/" aria-label="Brad’s Dads Land home">
          <img src={logoUrl} alt="" />
          <span>Owner dashboard</span>
        </a>
        <div className="bdl-header__actions">
          <span className="bdl-private-badge">Private</span>
          <button
            className="bdl-text-button"
            type="button"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <nav className="bdl-source-nav" aria-label="Dashboard sources">
        {VIEW_DEFINITIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={filters.view === item.id ? "page" : undefined}
            onClick={() => chooseView(item.id)}
          >
            <span>{item.shortLabel}</span>
            <small>{item.eyebrow}</small>
          </button>
        ))}
      </nav>

      <main className="bdl-main">
        <section className="bdl-hero" aria-labelledby="dashboard-view-title">
          <div>
            <p className="bdl-eyebrow">{definition.eyebrow}</p>
            <h1 id="dashboard-view-title">{definition.label}</h1>
            <p>{definition.description}</p>
          </div>
          <div className="bdl-hero__tools">
            {data?.freshness ? (
              <div className={`bdl-freshness bdl-freshness--${data.freshness.status}`}>
                <span aria-hidden="true" />
                <div>
                  <strong>{data.freshness.label}</strong>
                  <small>{freshnessText(data.freshness)}</small>
                </div>
              </div>
            ) : null}
            <div className="bdl-tool-buttons">
              <button
                className="bdl-icon-button"
                type="button"
                onClick={() => loadData(true)}
                disabled={loading}
              >
                <RefreshIcon />
                <span>{loading ? "Loading…" : "Reload data"}</span>
              </button>
              <button
                className="bdl-icon-button"
                type="button"
                onClick={() => downloadDashboardCsv(data)}
                disabled={!data}
              >
                <DownloadIcon />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </section>

        {filters.view !== "health" ? (
          <p className="bdl-range">
            {formatDate(filters.start)} – {formatDate(filters.end)}
            {filters.season ? <span>Season {filters.season}</span> : null}
          </p>
        ) : null}

        <FilterBar
          filters={filters}
          data={data}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <SummaryGrid metrics={data?.summary} loading={loading && !data} />

        {error ? <EmptyState error={error} /> : null}
        {!error && !loading && data?.empty ? <EmptyState /> : null}
        {!error && data ? <IssueBanner issues={data.issues} /> : null}

        {!error && data && filters.view !== "health" ? (
          <>
            <TrendChart
              view={filters.view}
              rows={data.trends}
              granularity={data.trendGranularity}
            />
            <PacePanel pace={data.bookingPace} />
            <div className="bdl-breakdowns">
              {(data.breakdowns || []).map((breakdown) => (
                <BreakdownTable key={breakdown.id} breakdown={breakdown} />
              ))}
            </div>
          </>
        ) : null}

        {!error && data && filters.view === "health" ? (
          <HealthPanel data={data} />
        ) : null}

        <footer className="bdl-dashboard-footer">
          <p>
            Sources stay authoritative: GA4 for web behaviour, Search Console
            for Google visibility, and Campspot for reservations and revenue.
          </p>
          <span>
            Session ends{" "}
            {session?.expiresAt
              ? new Intl.DateTimeFormat("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(session.expiresAt))
              : "automatically"}
          </span>
        </footer>
      </main>
    </div>
  );
};

const Dashboard = () => {
  const [sessionState, setSessionState] = useState({
    status: "checking",
    session: null,
  });

  useEffect(() => {
    let active = true;
    requestJson("/api/dashboard/session")
      .then((session) => {
        if (!active) return;
        setSessionState({
          status: session.authenticated ? "authenticated" : "anonymous",
          session: session.authenticated ? session : null,
        });
      })
      .catch(() => {
        if (active) setSessionState({ status: "anonymous", session: null });
      });
    return () => {
      active = false;
    };
  }, []);

  if (sessionState.status === "checking") return <LoadingScreen />;
  if (sessionState.status === "anonymous") {
    return (
      <LoginScreen
        onAuthenticated={(session) =>
          setSessionState({ status: "authenticated", session })
        }
      />
    );
  }
  return (
    <OwnerDashboard
      session={sessionState.session}
      onExpired={() => setSessionState({ status: "anonymous", session: null })}
      onLogout={() => setSessionState({ status: "anonymous", session: null })}
    />
  );
};

export default Dashboard;
