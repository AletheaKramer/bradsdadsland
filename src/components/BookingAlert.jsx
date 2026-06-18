import {
  BOOKING_CONTACT_EMAIL,
  BOOKING_CONTACT_MAILTO,
} from "../constants/booking";

const BookingAlert = () => {
  return (
    <aside
      role="status"
      className="mx-auto mt-6 max-w-[1500px] rounded-lg border border-brownPrimary/20 bg-greenSecondary px-4 py-4 text-brownPrimary shadow-sm sm:px-6"
    >
      <div className="flex flex-col gap-3 font-sans md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-relaxed sm:text-base lg:text-lg">
          <strong>Booking system update:</strong> Our online booking system is
          down right now. To book, please email us at{" "}
          <a
            href={BOOKING_CONTACT_MAILTO}
            className="font-semibold underline underline-offset-2 hover:text-beigeSecondary"
          >
            {BOOKING_CONTACT_EMAIL}
          </a>{" "}
          and we will be happy to help.
        </p>

        <a
          href={BOOKING_CONTACT_MAILTO}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brownPrimary px-5 py-2 text-sm font-semibold text-beigePrimary transition hover:bg-beigePrimary hover:text-brownPrimary sm:text-base"
        >
          Email to book
        </a>
      </div>
    </aside>
  );
};

export default BookingAlert;
