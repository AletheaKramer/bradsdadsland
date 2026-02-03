import React from "react";
import rgppImage from "../assets/ROFR.jpg";

const RGPP = () => (
  <div className="bg-brownPrimary min-h-screen p-8 text-beigePrimary font-sans">
    {/* Banner image */}
    <img
      src={rgppImage}
      alt="Returning Guest Priority Program"
      className="w-full max-h-96 object-cover mb-6 rounded-lg"
    />

    <h2 className="text-4xl font-bold mb-6">Returning Guest Priority Program (RGPP)</h2>

    <p className="text-lg mb-4">
      Bradsdadsland Family Campground has welcomed families since 1981, and many
      of our guests return year after year to enjoy the same site and the same
      summer traditions. The Returning Guest Priority Program (RGPP) is our way
      of recognizing that loyalty.
    </p>

    <p className="text-lg mb-4">
      RGPP gives eligible returning guests priority access to rebook the same
      campsite and the same dates they used in previous seasons, before those
      sites are released to the public.
    </p>

    <h3 className="text-2xl font-semibold mb-4">Eligibility</h3>
    <p className="text-lg mb-2">
      To qualify for the Returning Guest Priority Program, guests must meet all
      the following conditions:
    </p>
    <ul className="list-disc list-inside mb-4">
      <li>
        You must have stayed on the same campsite for the same calendar dates
        for at least two consecutive seasons.
      </li>
      <li>
        RGPP is site-specific and date specific. It applies only to the exact
        site and the exact date range previously used.
      </li>
      <li>
        The reservation must be for your personal use. RGPP privileges cannot be
        transferred to another person, family, or party.
      </li>
    </ul>

    <h3 className="text-2xl font-semibold mb-4">How the Program Works</h3>
    <ul className="list-disc list-inside mb-4">
      <li>
        Each year, eligible RGPP guests are given a priority on-line booking
        window.
      </li>
      <li>
        RGPP is site-specific and date specific. It applies only to the exact
        site and the exact date range previously used.
      </li>
      <li>
        RGPP is based on calendar dates, not days of the week.
        <br />
        <span className="ml-6">
          Example: July 10–17 remains July 10–17, even if the days of the week
          change year to year.
        </span>
      </li>
      <li>
        To keep RGPP status, you must use your reservation each year.
      </li>
      <li>
        Only registered RGPP member can use the reservation, it is
        non-transferable.
      </li>
    </ul>

    <p className="text-lg mb-6">
      We look forward to welcoming you into our Returning Guest Priority Program
      here at Bradsdadsland Family Campground. A tradition, four decades in the
      making.
    </p>

    <a
      href="https://drive.google.com/file/d/1CftrxuCX4tX364bHl_uwa52y7X8wLgF1/view?usp=sharing"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-beigePrimary text-brownPrimary hover:bg-beigeSecondary px-6 py-3 rounded-full font-medium transition"
    >
      Join the RGPP Group
    </a>
  </div>
);

export default RGPP;
