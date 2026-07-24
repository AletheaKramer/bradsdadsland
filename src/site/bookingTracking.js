export const BRADS_BOOKING_URL =
  "https://www.campspot.com/book/bradsdadsland";

const SAFE_TOKEN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PUBLIC_PATHS = new Set([
  "/",
  "/about-us",
  "/amenities",
  "/contact-us",
  "/gallery",
  "/policies",
  "/rgpp",
  "/rgpp/apply",
  "/vintage-trailers",
]);

const browserWindow = () =>
  typeof window === "undefined" ? null : window;

const safeToken = (value, fallback) => {
  const token = String(value || "").trim().toLowerCase();
  return SAFE_TOKEN.test(token) ? token : fallback;
};

const safePath = (value) => {
  const candidate = String(value || "").trim();
  const path =
    candidate.length > 1 && candidate.endsWith("/")
      ? candidate.slice(0, -1)
      : candidate;
  return PUBLIC_PATHS.has(path) ? path : "/";
};

export const createReservationClickEvent = ({
  placement = "unknown",
  pagePath = "/",
} = {}) => ({
  event: "reservation_click",
  booking_provider: "campspot",
  cta_location: safeToken(placement, "unknown"),
  source_page_path: safePath(pagePath),
});

export const trackReservationClick = (
  placement,
  { windowRef = browserWindow() } = {}
) => {
  if (!windowRef) return null;

  const payload = createReservationClickEvent({
    placement,
    pagePath: windowRef.location?.pathname || "/",
  });
  windowRef.dataLayer = windowRef.dataLayer || [];
  windowRef.dataLayer.push(payload);
  if (typeof windowRef.gtag === "function") {
    windowRef.gtag("event", payload.event, {
      booking_provider: payload.booking_provider,
      cta_location: payload.cta_location,
      source_page_path: payload.source_page_path,
    });
  }
  return payload;
};

export const openTrackedBooking = (
  placement,
  {
    bookingUrl = BRADS_BOOKING_URL,
    windowRef = browserWindow(),
  } = {}
) => {
  if (!windowRef) return null;

  trackReservationClick(placement, { windowRef });
  return windowRef.open(bookingUrl, "_blank", "noopener,noreferrer");
};
