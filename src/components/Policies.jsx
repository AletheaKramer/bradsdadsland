import React from "react";
import policies from "../assets/Policies.jpg";

const Policies = () => {
  return (
    <div className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto font-sans text-beigePrimary">
        <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">
          Bradsdadsland Campground Policies and Information
        </h2>

        {/* Image */}
        <div className="mt-4 mb-8">
          <img
            src={policies}
            alt="Beautiful landscape of Bradsdadsland"
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <ol className="list-decimal list-inside text-lg space-y-4">
          <li>
            Reservations are highly recommended during summer months.
          </li>

          <li>
            A deposit is required for a guaranteed reservation. During the off-season, the deposit is one night of the basic rate for each site you book. During the Regular and Peak season, the deposit is equal to two nights of the basic rate for each site you book. The deposit equal to one night fee is non-refundable, please be sure before booking and see cancellation policy. Deposit is based on basic site rate and does not include services. Services on a site will be charged as listed below whether you use it or not.
          </li>

          <li>
            Services are available on select sites, inquire for information. Service includes: 15 amp Partial service (no sewer), 30 amp Partial service (no sewer). Sewer dump available under fee to registered campers only (on minimum stay of 3 nights). Sites with power meters have additional charge of $0.30/kWh after the first 10kWh/day.
          </li>

          <li>
            Freezer tote-box service available for $2.00 per night. $20.00 key security deposit required (maximum of two boxes per site during the peak season).
          </li>

          <li>
            The first member of a party to arrive must check-in and register with a valid credit card before setting up. The full balance is due for the entire stay prior to setting up in the campsite. It is your responsibility to inform us and pay for any additional fees due as listed below, for extra people and pets, under “Daily Rates per Campsite”.
          </li>

          <li>
            Each pet is charged a base fee of $8/day up to the maximum of 3 pets per site (must be kept on a leash at all times and locations, even within your site, and cleaned after; a $100 fee might be charged if not complied with).
          </li>

          <li>
            Quiet time is from 10:00 PM to 7:00 AM. Absolutely no stereo music. A $100 fee may be charged if not complied with.
          </li>

          <li>
            The base rate for RV/Tent sites covers 2 adults and 2 children. Anything above is charged additionally regardless of occupancy, up to the maximum of 8 people.
          </li>

          <li>
            <strong>Cancellation Policy:</strong><br />
            As excited as we are for you to join us, we do understand that cancellations do sometimes occur. If you do need to cancel your reservation, please be aware of the following policies:
            <ul className="list-disc pl-6 mt-2">
              <li>Cancellations made 0–13 days prior to arrival date will be charged a two-night stay.</li>
              <li>Cancellations made 14 days or more prior to arrival will be charged a one-night stay.</li>
              <li>We require 14 DAYS NOTICE to cancel, reschedule, or change your reservation.</li>
              <li>You may change or transfer your reservation to another site/date available during the same year.</li>
              <li>Prepayments are NOT transferable from year to year.</li>
              <li>Cancellation/change requests must be made by email (a $15 fee applies). No changes by phone.</li>
              <li>If you do not contact us or check-in by noon the day after your scheduled arrival, your reservation will be automatically cancelled.</li>
            </ul>
          </li>

          <li>
            <strong>Refund Policy:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Refunds (if applicable) will be processed in the original form of purchase.</li>
              <li>You must have a valid credit card on file to receive a refund.</li>
              <li>You may choose to keep the refund as account credit or have it returned to your card.</li>
              <li>No refunds for partial cancellations before, on, or after arrival.</li>
            </ul>
          </li>

          <li>
            <strong>Check-in & Check-out:</strong><br />
            Check-in is at 1:00 PM and check-out is at 11:00 AM. For Glamping and Vintage Trailers, check-in is at 4:00 PM and check-out is at 11:00 AM.
          </li>
        </ol>

        {/* ROFR Section */}
        <h3 className="text-2xl font-semibold mt-10">Right of First Refusal (ROFR):</h3>
        <p className="text-lg mt-2">
          Guests returning annually on the same date and site may reserve up to one year in advance. ROFR reservations require compliance with the cancellation policy.
        </p>

        {/* Ready to Book Section */}
        <h3 className="text-2xl font-semibold mt-10">Ready to book?</h3>
        <p className="text-lg mt-2">
          <strong>Online Booking:</strong>{" "}
          <a
            href="https://www.campspot.com/book/bradsdadsland"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-beigeSecondary"
          >
            The easiest way to secure your site.
          </a>
          <br />
          <strong>Contact:</strong>{" "}
          <a
            href="tel:+12506501310"
            className="underline hover:text-beigeSecondary"
          >
            250-650-1310
          </a>{" "}
          or{" "}
          <a
            href="mailto:bradsdadsland@telus.net"
            className="underline hover:text-beigeSecondary"
          >
            email
          </a>{" "}
          us for inquiries.
          <br />
          We look forward to hosting you!
        </p>
      </div>
    </div>
  );
};

export default Policies;
