export const BOOKING_CONTACT_EMAIL = "contact@bradsdadsland.com";

const bookingSubject = encodeURIComponent("Booking request");

export const BOOKING_CONTACT_MAILTO = `mailto:${BOOKING_CONTACT_EMAIL}?subject=${bookingSubject}`;
