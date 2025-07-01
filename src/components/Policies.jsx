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
          <li>Reservations are highly recommended during summer months.</li>
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
            Guests are required to leave their campsite in a clean and orderly condition upon departure. Failure to comply—including, but not limited to: leaving garbage or personal items on the site, placing waste of any kind (excluding firewood) in the fire pit, disposing of non-toilet paper items in the outhouses, or leaving excess mess in or around the recycling area—<strong>may, at the sole discretion of the campground operator</strong>, result in a cleaning fee. The amount of such fee will be determined by the operator and added to the guest’s final invoice without prior notice.
          </li>
          <li>
            Any damage, defacement, or destruction of campground property—whether intentional, negligent, or accidental—<strong>shall result in a damage fee, the amount of which will be determined solely by the campground operator</strong>, based on the extent of the damage and the costs of repair or replacement. Guests agree to accept the operator’s assessment as final and binding.
          </li>
          <li>
            Check-out must occur no later than the designated time provided in your reservation confirmation. <strong>Failure to vacate the site by the specified time will automatically result in an additional night’s charge, without exception</strong>, and does not exempt the guest from the obligation to promptly vacate the site for incoming guests. The campground operator reserves the right to remove any property left on-site after the check-out time and is not liable for any loss or damage resulting from such removal.
          </li>
          <li>
            Use of generators and air conditioning units that emit noticeable sound is permitted only during the following time windows: 10:00 AM to 11:00 AM, 2:00 PM to 3:00 PM, and 6:00 PM to 7:00 PM. <strong>Use outside of these hours constitutes a violation of campground policy and may result in penalties, including but not limited to fines, eviction without refund, or restrictions on future bookings</strong>. The operator retains full discretion in determining whether a device is considered noisy.
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
