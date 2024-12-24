import React from "react";
import welcomeSignImage from "../assets/welcome-sign.jpg"; // Updated image file path

const Policies = () => {
  return (
    <div className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto font-sans text-beigePrimary">
        <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">
          Bradsdadsland Campground Policies and Information
        </h2>

        <p className="text-lg">
          <strong>Check-in:</strong> 1:00 PM
          <br />
          <strong>Check-out:</strong> 11:00 AM
        </p>
        <p className="text-lg mt-4">
          Bradsdadsland Campground has proudly served guests for over 40 years.
          Please note that larger RVs may have difficulty accessing some sites.
          Call ahead to confirm site suitability if your RV is extra high or
          long.
        </p>

        {/* New Image Section */}
        <div className="mt-6">
          <img
            src={welcomeSignImage}
            alt="Welcome Sign"
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <h3 className="text-2xl font-semibold mt-6">General Policies:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>Reservations recommended during summer months.</li>
          <li>Open online starting April 1 for the following year.</li>
          <li>
            Base rate includes one Primary Camping Party (e.g., a single family
            unit).
          </li>
          <li>
            Provide details at booking: number of vehicles, adults, children,
            and type of accommodations.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">
          Glamping, Vintage T and RV Rentals:
        </h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            50% non-refundable deposit required at booking; balance charged 60
            days before arrival.
          </li>
          <li>Maximum occupancy: 8 people.</li>
          <li>No pets allowed. $50 cleaning fee due on arrival.</li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">RV Units:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            One RV unit allowed per site. Additional RVs incur a fee of 50% of
            the base rate.
          </li>
          <li>
            All equipment must fit on the site or in designated parking areas.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Power and Sewer:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            Power meters include 10 kWh/day with the base rate; additional usage
            charged at current rates.
          </li>
          <li>
            Full-service sites do not include sewer hookups. Sewer service
            available for an additional fee.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">
          Deposit and Cancellation Policy:
        </h3>
        <ul className="list-disc list-inside text-lg">
          <li>A deposit equal to one night's fee is non-refundable.</li>
          <li>
            48 hours’ notice required for cancellations, rescheduling, or
            changes.
          </li>
          <li>A $15 fee applies to all changes.</li>
          <li>Deposits are non-transferable to future years.</li>
          <li>No refunds for partial cancellations after arrival.</li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Check-in and Payment:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            The first member of the group must check in with a valid credit card
            and pay the full balance before setup.
          </li>
          <li>
            Additional fees for extra people, pets, or vehicles must be paid at
            check-in.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Pet Policy:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>Each camping party is limited to one dog.</li>
          <li>No pets allowed in glamping or RV rentals.</li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Additional Services:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            Freezer tote-box service: $2.00/night with a $20.00 key deposit.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">
          Right of First Refusal (ROFR):
        </h3>
        <p className="text-lg">
          Guests returning annually on the same date and site may reserve up to
          two years in advance. ROFR reservations require compliance with the
          cancellation policy.
        </p>

        <h3 className="text-2xl font-semibold mt-6">Ready to book?</h3>
        <p className="text-lg">
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
          or email for inquiries.
          <br />
          We look forward to hosting you!
        </p>
      </div>
    </div>
  );
};

export default Policies;
