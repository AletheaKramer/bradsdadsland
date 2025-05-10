// src/components/Policies.jsx
import React from "react";
import policiesImage from "../assets/Policies.jpg";

const Policies = () => {
  return (
    <div className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto font-sans text-beigePrimary">
        <div className="mb-6">
          <img
            src={policiesImage}
            alt="Bradsdadsland Campground Policies"
            className="w-full max-h-96 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* Heading below the image */}
        <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">
          Bradsdadsland Campground Policies and Information
        </h2>

        <ol className="list-decimal list-inside text-lg space-y-4">
          <li>
            Reservations are highly recommended during summer months.
          </li>
          <li>
            A deposit is required for a guaranteed reservation. During the off‑season,
            the deposit is one night of the basic rate for each site you book. During
            the Regular and Peak season, the deposit is equal to two nights of the
            basic rate for each site you book. The deposit equal to one night fee is
            non‑refundable, please be sure before booking and see cancellation policy.
            Deposit is based on basic site rate and does not include services.
            Services on a site will be charged as listed below whether you use it or not.
          </li>
          <li>
            Services are available on select sites; inquire for information.
            Service includes: 15 amp Partial service (no sewer), 30 amp Partial
            service (no sewer). Sewer dump available under fee to registered
            campers only (minimum stay of 3 nights). Sites with power meters have
            additional charge of $0.30/kWh after the first 10 kWh/day.
          </li>
          <li>
            Freezer tote‑box service available for $2.00 per night.
            $20.00 key security deposit required (max two boxes per site during peak).
          </li>
          <li>
            The first member of a party to arrive must check‑in and register with a
            valid credit card before setting up. The full balance is due for the
            entire stay prior to setting up. It is your responsibility to inform us
            and pay for any additional fees due as listed below, for extra people
            and pets, under “Daily Rates per Campsite.”
          </li>
          <li>
            Each pet is charged a base fee of $8/day (max 3 pets per site). Pets must
            be kept on leash at all times and cleaned up after; $100 fee may apply
            if not complied with.
          </li>
          <li>
            Quiet time is from 10:00 PM to 7:00 AM. Absolutely no stereo music.
            A $100 fee may be charged if not complied with.
          </li>
          <li>
            The base rate for RV/Tent sites covers 2 adults and 2 children. Anything
            above is charged additionally regardless of occupancy (max 8 people).
          </li>
          <li>
            <strong>Cancellation Policy:</strong><br />
            If you need to cancel, please note:
            <ul className="list-disc pl-6 mt-2">
              <li>Cancellations 0–13 days prior to arrival: charged two‑night stay.</li>
              <li>Cancellations 14+ days prior: charged one‑night stay.</li>
              <li>We require 14 DAYS NOTICE to cancel, reschedule, or change.</li>
              <li>Transfers allowed to another site/date in the same year.</li>
              <li>Prepayments are NOT transferable year‑to‑year.</li>
              <li>Requests by email only (a $15 fee applies). No phone changes.</li>
              <li>No‑show by noon after scheduled arrival: reservation auto‑canceled.</li>
            </ul>
          </li>
          <li>
            <strong>Refund Policy:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Refunds processed to original payment method.</li>
              <li>Valid credit card on file required to receive refund.</li>
              <li>Option for account credit or card return.</li>
              <li>No refunds for partial cancellations.</li>
            </ul>
          </li>
          <li>
            <strong>Check‑in &amp; Check‑out:</strong><br />
            Check‑in at 1:00 PM, check‑out at 11:00 AM. Glamping/Vintage Trailers
            check‑in at 4:00 PM, check‑out at 11:00 AM.
          </li>
        </ol>

        {/* ROFR Section */}
        <h3 className="text-2xl font-semibold mt-10">Right of First Refusal (ROFR):</h3>
        <p className="text-lg mt-2">
          Guests returning annually on the same date and site may reserve up to one year
          in advance. ROFR reservations require compliance with the cancellation policy.
        </p>

        {/* Ready to Book */}
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
            250‑650‑1310
          </a>{" "}
          or{" "}
          <a
            href="mailto:bradsdadsland@telus.net"
            className="underline hover:text-beigeSecondary"
          >
            email us
          </a>
          for inquiries.
          <br />
          We look forward to hosting you!
        </p>
      </div>
    </div>
  );
};

export default Policies;
