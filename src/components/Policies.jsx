import React from "react";
import policiesPageImage from "../assets/PoliciesPage.jpg"; // Updated image file path

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
            src={policiesPageImage}
            alt="Beautiful landscape of Bradsdadsland"
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <h3 className="text-2xl font-semibold mt-6">General Policies:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>Reservations are highly recommended during summer months.</li>
          <li>
            A deposit is required for a guaranteed reservation. During the off-season, 
            the deposit is one night of the basic rate for each site you book. During the Regular 
            and Peak season, the deposit is equal to two nights of the basic rate for each 
            week and each site you book. The deposit equal to one night fee is non-refundable, 
            please be sure before booking and see cancellation policy. Deposit is based on 
            basic site rate and does not include services. Services on a site will be charged 
            as listed below whether you use it or not.
          </li>
          <li>
            Services are available on select sites, inquire for information. Service includes:
            <ul className="list-disc pl-6">
              <li>15 amp Partial service (no sewer)</li>
              <li>30 amp Partial service (no sewer)</li>
              <li>Sewer dump available under fee to registered campers only (on minimum stay of 3 nights).</li>
              <li>Sites with power meters have an additional charge of $0.30/kWh after the first 10kWh.</li>
            </ul>
          </li>
          <li>
            Freezer tote-box service available for $2.00 per night. $20.00 key security deposit required.
          </li>
          <li>
            The first member of a party to arrive must check-in and register with a valid credit card before setting up. 
            The full balance is due for the entire stay prior to setting up in the campsite. It is your responsibility to 
            inform us and pay for any additional fees due as listed below, for extra people and pets, under “Daily Rates per Campsite.”
          </li>
          <li>
            Each pet is charged a base fee of $8/day up to a maximum of 3 pets per site 
            (must be kept on a leash at all times and locations, even within your site, 
            and cleaned after; a full fee will be charged if not complied with - double the base pet fee).
          </li>
          <li>
            The base rate for RV/Tent sites covers 2 adults and 2 children. 
            Anything above is charged additionally regardless of occupancy, up to a maximum of 8 people.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Cancellation Policy:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            Cancellations made **0-13 days prior** to arrival date will be charged a **two-night stay**.
          </li>
          <li>
            Cancellations made **14 days or more prior** to arrival date will be charged a **one-night stay**.
          </li>
          <li>
            We require **14 DAYS NOTICE** to cancel, reschedule, or change your reservation. You may change 
            or transfer your reservation to any other site and/or date available during the same year. 
            Prepayments are **NOT** transferable from year to year.
          </li>
          <li>
            You can cancel or change your reservation online by clicking on your reservation details link 
            provided by email when you book or within the Campspot App. If you request a cancellation or 
            change by email, a **$15 fee will be applied**. No cancellations or changes by phone.
          </li>
          <li>
            If you do not contact us or check-in by **noon the day following your scheduled arrival date**, 
            then your reservation will be automatically cancelled.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Refund Policy:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>
            If you are due a refund, all refunds will be processed in the original form of purchase.
          </li>
          <li>
            You must have a valid credit card on your account for the system to process any refund.
          </li>
          <li>
            You have the choice to keep any refund as a **credit** on your account or have it processed back to the credit card on file.
          </li>
          <li>
            Sometimes the system may send the balance automatically to your account as **User Credit** when 
            the cancellation is made by the office. In that case, you can keep it as a credit or have it refunded back to your card.
          </li>
          <li>
            You can cancel or change your reservation online. Any change or cancellation request **made by email** 
            will be charged a **$15 fee**. **No changes or cancellations by phone.**
          </li>
          <li>
            No refunds on **partial cancellations before, on, or after arrival**.
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-6">Check-in & Check-out Times:</h3>
        <ul className="list-disc list-inside text-lg">
          <li>Check-in: **1:00 PM**</li>
          <li>Check-out: **11:00 AM**</li>
          <li>Glamping and Vintage Trailers Check-in: **4:00 PM**</li>
          <li>Glamping and Vintage Trailers Check-out: **11:00 AM**</li>
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
          one year in advance. ROFR reservations require compliance with the
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
          or <a
                  href="mailto:bradsdadsland@telus.net"
                  className="underline hover:text-beigeSecondary transition" 
                >
                  email
                </a> for inquiries.
          <br />
          We look forward to hosting you!
        </p>
      </div>
    </div>
  );
};

export default Policies;
