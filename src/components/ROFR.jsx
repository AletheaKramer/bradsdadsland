import React from "react";
import rofrImage from "../assets/ROFR.jpg";

const ROFR = () => (
  <div className="bg-beigePrimary max-w-[1500px] mx-auto font-sans p-8 text-brownPrimary">
    {/* Top banner image */}
    <img
      src={rofrImage}
      alt="Right of First Refusal Program"
      className="w-full max-h-96 object-cover mb-6 rounded-lg"
    />

    <h2 className="text-4xl font-bold mb-6">
      Right of First Refusal Program (Join our ROFR)
    </h2>

    <p className="text-lg mb-4">
      Bradsdadsland Campground has been a beloved destination since 1981, and
      over the decades, we've cultivated a strong and loyal community. The
      Right of First Refusal (ROFR) program allows our loyal guests the chance
      to reserve their summer spot at the most family-friendly facility on
      Hornby Island before the general public.
    </p>

    <p className="text-lg mb-4">
      To be eligible for ROFR, guests must have used the same site and dates
      for at least two consecutive years. If you meet this requirement, you
      can book your reservation for the following year before it becomes
      available to the public. This is limited to the same site and same
      dates used in previous years.
    </p>

    <h3 className="text-2xl font-semibold mb-4">How it works:</h3>
    <ul className="list-disc list-inside mb-4">
      <li>
        To maintain your ROFR eligibility, you must use your reservation each
        year.
      </li>
      <li>
        After the summer season, eligible guests need to express interest in
        staying enrolled by submitting their request via email between
        September 10th and December 20th of the prior year. Please note:
        reservations cannot be made via phone or in-person at the office.
      </li>
      <li>
        After processing, all sites will become available to the public on
        January 2nd for the current year.
      </li>
    </ul>

    <h3 className="text-2xl font-semibold mb-4">Important Notes:</h3>
    <ul className="list-disc list-inside mb-4">
      <li>
        You must email us to express interest if you want to keep your ROFR
        active. If you miss a year, you can still maintain your ROFR by
        notifying us in advance via email.
      </li>
      <li>
        If we don’t receive your request after skipping a year, your site will
        be made available to others. You cannot skip two consecutive years
        within a five-year period or you will lose your ROFR.
      </li>
      <li>
        ROFR is based on loyalty and consistency, meaning it cannot be
        transferred to a third party. If you do not use your reservation
        personally, it will count as a missed reservation.
      </li>
    </ul>

    <h3 className="text-2xl font-semibold mb-4">Keeping Your Information Updated:</h3>
    <p className="text-lg mb-4">
      To ensure your reservation is processed correctly, please update your
      email, phone number, and credit card information whenever you check in.
    </p>

    <h3 className="text-2xl font-semibold mb-4">Clarification on ROFR Rules:</h3>
    <p className="text-lg mb-4">
      In the past, there have been occasional adjustments to reservations,
      such as moving dates to accommodate days of the week. This caused
      confusion and led to the loss of ROFR for some guests. Please note that
      the ROFR is based on the same site and the same date, not the exact days
      of the week. To ensure fairness, no exceptions will be granted, so we ask
      that you respect this rule.
    </p>

    <p className="text-lg">
      We encourage ROFR holders to extend their stays, but this must be done
      online through our website when it becomes available to the public—not
      during the ROFR period.
    </p>
  </div>
);

export default ROFR;
