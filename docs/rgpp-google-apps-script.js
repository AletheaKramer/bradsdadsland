const SPREADSHEET_ID = "REPLACE_WITH_SPREADSHEET_ID";
const SPREADSHEET_URL = "REPLACE_WITH_SPREADSHEET_URL";
const INTERNAL_EMAIL = "contact@bradsdadsland.com";
const BRAND_NAME = "Bradsdadsland Family Campground";
const BRAND_EMAIL = "contact@bradsdadsland.com";
const BRAND_PHONE = "250-650-1310";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const validation = validatePayload_(payload);

    if (!validation.ok) {
      return jsonResponse_(false, validation.message);
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const submissionsSheet = spreadsheet.getSheetByName("Submissions");
    const expandedSheet = spreadsheet.getSheetByName("Expanded Reservations");

    if (!submissionsSheet || !expandedSheet) {
      return jsonResponse_(
        false,
        "Required sheets were not found. Please create the expected tabs first."
      );
    }

    const submissionId = Utilities.getUuid();
    const submittedAt = new Date();
    const guest = payload.guest;
    const reservations = payload.reservations;

    submissionsSheet.appendRow([
      submittedAt,
      submissionId,
      safeSheetValue_(guest.firstName),
      safeSheetValue_(guest.lastName),
      safeSheetValue_(guest.email),
      safeSheetValue_(guest.phone),
      safeSheetValue_(guest.address),
      safeSheetValue_(guest.city),
      safeSheetValue_(guest.stateProvince || ""),
      safeSheetValue_(guest.country || ""),
      safeSheetValue_(guest.postalCode),
      reservations.length,
      JSON.stringify(reservations),
      "New",
    ]);

    reservations.forEach((reservation) => {
      expandedSheet.appendRow([
        submissionId,
        submittedAt,
        safeSheetValue_(`${guest.firstName} ${guest.lastName}`),
        safeSheetValue_(guest.email),
        safeSheetValue_(guest.phone),
        safeSheetValue_(reservation.site),
        reservation.fromDate,
        reservation.toDate,
      ]);
    });

    sendInternalNotification_(guest, reservations, submissionId);
    sendGuestConfirmation_(guest, reservations);

    return jsonResponse_(true, "Submission received");
  } catch (error) {
    return jsonResponse_(
      false,
      error && error.message ? error.message : "Unable to process submission"
    );
  }
}

function validatePayload_(payload) {
  if (!payload || !payload.guest || !Array.isArray(payload.reservations)) {
    return { ok: false, message: "Invalid request payload." };
  }

  if (payload.guest.website && String(payload.guest.website).trim()) {
    return { ok: false, message: "Invalid request payload." };
  }

  if (payload.formStartedAt) {
    const startedAt = new Date(payload.formStartedAt);

    if (!Number.isNaN(startedAt.getTime())) {
      const startedAtMs = startedAt.getTime();
      const nowMs = Date.now();

      if (nowMs - startedAtMs < 4000) {
        return { ok: false, message: "Form submitted too quickly." };
      }
    }
  }

  const guest = payload.guest;
  const requiredGuestFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "city",
    "stateProvince",
    "country",
    "postalCode",
  ];

  for (const field of requiredGuestFields) {
    if (!guest[field] || !String(guest[field]).trim()) {
      return { ok: false, message: `Missing required field: ${field}` };
    }
  }

  if (payload.reservations.length < 1) {
    return {
      ok: false,
      message: "At least one reservation row is required.",
    };
  }

  for (const reservation of payload.reservations) {
    if (
      !reservation.site ||
      !reservation.fromDate ||
      !reservation.toDate
    ) {
      return {
        ok: false,
        message: "Each reservation row must include site, from date, and to date.",
      };
    }
  }

  return { ok: true };
}

function sendInternalNotification_(guest, reservations, submissionId) {
  const subject = `New RGPP sign-up: ${guest.firstName} ${guest.lastName}`;
  const reservationSummary = buildReservationSummary_(reservations);
  const reservationRows = reservationSummary.sortedReservations
    .map(
      (reservation, index) =>
        `<tr>
          <td style="padding:10px;border:1px solid #d7c8b4;">${index + 1}</td>
          <td style="padding:10px;border:1px solid #d7c8b4;">${escapeHtml_(String(reservation.year))}</td>
          <td style="padding:10px;border:1px solid #d7c8b4;">${escapeHtml_(reservation.site)}</td>
          <td style="padding:10px;border:1px solid #d7c8b4;">${escapeHtml_(reservation.dateRangeLabel)}</td>
          <td style="padding:10px;border:1px solid #d7c8b4;">${escapeHtml_(reservation.fullDateRangeLabel)}</td>
        </tr>`
    )
    .join("");

  const htmlBody = `
    <div style="font-family:Georgia, serif;background:#f5efe5;padding:32px;color:#4a3729;">
      <div style="max-width:720px;margin:0 auto;background:#fffaf4;border-radius:20px;overflow:hidden;border:1px solid #e6d7c3;">
        <div style="background:#5b4332;color:#f5efe5;padding:28px 32px;">
          <div style="font-size:13px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">Bradsdadsland RGPP</div>
          <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;">New RGPP sign-up received</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 18px;font-size:16px;">A new Returning Guest Priority Program submission has been received.</p>
          <p style="margin:0 0 8px;"><strong>Submission ID:</strong> ${escapeHtml_(submissionId)}</p>
          <p style="margin:0 0 8px;"><strong>Name:</strong> ${escapeHtml_(guest.firstName)} ${escapeHtml_(guest.lastName)}</p>
          <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml_(guest.email)}</p>
          <p style="margin:0 0 8px;"><strong>Phone:</strong> ${escapeHtml_(guest.phone)}</p>
          <p style="margin:0 0 8px;"><strong>Address:</strong> ${escapeHtml_(guest.address)}, ${escapeHtml_(guest.city)}, ${escapeHtml_(guest.stateProvince || "")}, ${escapeHtml_(guest.country || "")}, ${escapeHtml_(guest.postalCode)}</p>

          <h2 style="margin:28px 0 14px;font-size:22px;">Quick Review</h2>
          <div style="border:1px solid #d7c8b4;border-radius:16px;background:#fbf5ec;padding:18px 20px;">
            <p style="margin:0 0 10px;"><strong>Submitted stays:</strong> ${reservationSummary.count}</p>
            <p style="margin:0 0 10px;"><strong>Same site across all submitted stays:</strong> ${escapeHtml_(reservationSummary.sameSiteLabel)}</p>
            <p style="margin:0 0 10px;"><strong>Same month/day date range across all submitted stays:</strong> ${escapeHtml_(reservationSummary.sameDateRangeLabel)}</p>
            <p style="margin:0 0 10px;"><strong>Consecutive years present:</strong> ${escapeHtml_(reservationSummary.hasConsecutiveYearsLabel)}</p>
            <p style="margin:0 0 10px;"><strong>Years submitted:</strong> ${escapeHtml_(reservationSummary.yearsLabel)}</p>
            <p style="margin:0;"><strong>Review note:</strong> ${escapeHtml_(reservationSummary.reviewNote)}</p>
          </div>

          <h2 style="margin:28px 0 14px;font-size:22px;">Reservation History</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:10px;border:1px solid #d7c8b4;background:#f0e4d6;">Stay</th>
                <th style="text-align:left;padding:10px;border:1px solid #d7c8b4;background:#f0e4d6;">Year</th>
                <th style="text-align:left;padding:10px;border:1px solid #d7c8b4;background:#f0e4d6;">Site</th>
                <th style="text-align:left;padding:10px;border:1px solid #d7c8b4;background:#f0e4d6;">Recurring date range</th>
                <th style="text-align:left;padding:10px;border:1px solid #d7c8b4;background:#f0e4d6;">Full dates submitted</th>
              </tr>
            </thead>
            <tbody>${reservationRows}</tbody>
          </table>

          <p style="margin:28px 0 0;">
            <a href="${SPREADSHEET_URL}" style="display:inline-block;background:#5b4332;color:#f5efe5;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">
              Open RGPP submissions sheet
            </a>
          </p>
          <p style="margin:16px 0 0;font-size:13px;color:#7b6654;">If the button does not work, use this link: ${SPREADSHEET_URL}</p>
        </div>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: INTERNAL_EMAIL,
    subject,
    htmlBody,
  });
}

function sendGuestConfirmation_(guest, reservations) {
  const subject = "We received your RGPP sign-up";
  const reservationList = reservations
    .map(
      (reservation) =>
        `<li style="margin:0 0 8px;">Site ${escapeHtml_(reservation.site)}: ${escapeHtml_(reservation.fromDate)} to ${escapeHtml_(reservation.toDate)}</li>`
    )
    .join("");

  const htmlBody = `
    <div style="margin:0;padding:0;background:#f3ece2;font-family:Georgia, serif;color:#4a3729;">
      <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
        <div style="background:#fffaf4;border:1px solid #e4d6c1;border-radius:24px;overflow:hidden;">
          <div style="background:#5b4332;padding:28px 32px;color:#f7efe5;">
            <div style="font-size:13px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.85;">${BRAND_NAME}</div>
            <h1 style="margin:12px 0 0;font-size:32px;line-height:1.2;">Thank you for signing up for the RGPP</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:17px;">Hello ${escapeHtml_(guest.firstName)},</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              We’ve received your Returning Guest Priority Program sign-up. A member of our staff will be in touch as soon as possible.
            </p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Here is a copy of the reservation history you submitted:
            </p>
            <ul style="padding-left:20px;margin:0 0 20px;font-size:16px;line-height:1.6;">
              ${reservationList}
            </ul>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              If you need to reach us in the meantime, contact us at
              <a href="mailto:${BRAND_EMAIL}" style="color:#5b4332;">${BRAND_EMAIL}</a>
              or call
              <a href="tel:${BRAND_PHONE.replace(/[^+\d]/g, "")}" style="color:#5b4332;">${BRAND_PHONE}</a>.
            </p>
            <p style="margin:24px 0 0;font-size:16px;line-height:1.7;">
              Warmly,<br />${BRAND_NAME}
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: guest.email,
    subject,
    htmlBody,
  });
}

function jsonResponse_(ok, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok, message })
  ).setMimeType(ContentService.MimeType.JSON);
}

function buildReservationSummary_(reservations) {
  const sortedReservations = [...reservations]
    .map((reservation) => {
      const fromParts = parseIsoDateParts_(reservation.fromDate);
      const toParts = parseIsoDateParts_(reservation.toDate);

      return {
        site: String(reservation.site || "").trim(),
        fromDate: reservation.fromDate,
        toDate: reservation.toDate,
        year: fromParts.year,
        fromMonth: fromParts.month,
        fromDay: fromParts.day,
        toMonth: toParts.month,
        toDay: toParts.day,
        dateRangeLabel: `${formatMonthDayLabel_(fromParts.month, fromParts.day)} to ${formatMonthDayLabel_(toParts.month, toParts.day)}`,
        fullDateRangeLabel: `${formatFullDateLabel_(reservation.fromDate)} to ${formatFullDateLabel_(reservation.toDate)}`,
      };
    })
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));

  const siteSet = uniqueValues_(sortedReservations.map((reservation) => reservation.site));
  const dateRangeSet = uniqueValues_(
    sortedReservations.map(
      (reservation) =>
        `${reservation.fromMonth}-${reservation.fromDay}:${reservation.toMonth}-${reservation.toDay}`
    )
  );
  const years = uniqueValues_(
    sortedReservations.map((reservation) => reservation.year).filter(Boolean)
  ).sort((a, b) => a - b);

  const hasConsecutiveYears = years.some((year, index) => {
    return index > 0 && year - years[index - 1] === 1;
  });

  const sameSite = siteSet.length === 1;
  const sameDateRange = dateRangeSet.length === 1;
  const likelyEligible = sortedReservations.length >= 2 && sameSite && sameDateRange && hasConsecutiveYears;

  return {
    count: sortedReservations.length,
    sortedReservations,
    sameSiteLabel: sameSite ? `Yes, site ${siteSet[0]}` : `No, multiple sites submitted (${siteSet.join(", ")})`,
    sameDateRangeLabel: sameDateRange
      ? `Yes, ${sortedReservations[0].dateRangeLabel}`
      : "No, multiple date ranges submitted",
    hasConsecutiveYearsLabel: hasConsecutiveYears ? "Yes" : "No",
    yearsLabel: years.length ? years.join(", ") : "Unknown",
    reviewNote: likelyEligible
      ? "Submitted stays appear to match the same site and same date range across consecutive years."
      : "Review the stay details carefully. The submission does not clearly show the same site and date range across consecutive years.",
  };
}

function parseIsoDateParts_(isoDate) {
  const parts = String(isoDate || "").split("-").map(Number);

  return {
    year: parts[0] || 0,
    month: parts[1] || 0,
    day: parts[2] || 0,
  };
}

function formatMonthDayLabel_(month, day) {
  if (!month || !day) {
    return "Unknown";
  }

  return Utilities.formatDate(
    new Date(Date.UTC(2000, month - 1, day)),
    Session.getScriptTimeZone(),
    "MMM d"
  );
}

function formatFullDateLabel_(isoDate) {
  const parts = parseIsoDateParts_(isoDate);

  if (!parts.year || !parts.month || !parts.day) {
    return String(isoDate || "");
  }

  return Utilities.formatDate(
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day)),
    Session.getScriptTimeZone(),
    "MMM d, yyyy"
  );
}

function uniqueValues_(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function safeSheetValue_(value) {
  const stringValue = String(value == null ? "" : value);

  if (/^[=+\-@]/.test(stringValue)) {
    return `'${stringValue}`;
  }

  return stringValue;
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
