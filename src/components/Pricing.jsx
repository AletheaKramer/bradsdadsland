import React from "react";

const Pricing = () => {
  return (
    <div id="pricing-info" className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto">
        <h2 className="text-beigeSecondary text-4xl pb-4">How Pricing Works</h2>

        <h3 className="text-beigePrimary text-2xl mt-6">Base Rate:</h3>
        <p className="text-beigePrimary text-lg">
          Each campsite is rented on a per-night basis, with prices ranging from
          $75 to $95 depending on the campsite’s location.
        </p>

        <h3 className="text-beigePrimary text-2xl mt-6">Primary Camping Party:</h3>
        <p className="text-beigePrimary text-lg">
          The first family (the “primary camping party”) pays the full nightly
          rate (e.g., $75-$95 per night).
        </p>

        <h3 className="text-beigePrimary text-2xl mt-6">Additional Camping Parties:</h3>
        <ul className="list-disc list-inside text-beigePrimary text-lg">
          <li>
            If a second family joins the primary party on the same site, that
            additional family pays half the base rate.
          </li>
          <li>
            If a third family also joins the same site, they too pay half the base
            rate.
          </li>
        </ul>

        <h3 className="text-beigePrimary text-2xl mt-6">
          Occupancy Limits & Requirements:
        </h3>
        <p className="text-beigePrimary text-lg">
          Maximum total of 8 people per campsite (across all camping parties
          combined).<br />
          Information needed at the time of booking includes:
        </p>
        <ul className="list-disc list-inside text-beigePrimary text-lg">
          <li>Number of vehicles</li>
          <li>Number of adults</li>
          <li>Number of children</li>
          <li>Number and type of accommodations (tents, trailers, etc.)</li>
        </ul>

        <h3 className="text-beigePrimary text-2xl mt-6">Pet Policy:</h3>
        <p className="text-beigePrimary text-lg">
          Each camping party is limited to one dog.
        </p>

        <h3 className="text-beigePrimary text-2xl mt-6">
          Definition of a “Camping Party”:
        </h3>
        <p className="text-beigePrimary text-lg">
          Currently, a “camping party” is understood to be an individual family
          unit. A more formal definition may be established in the future.
        </p>

        <h3 className="text-beigePrimary text-2xl mt-6">Example Scenario:</h3>
        <p className="text-beigePrimary text-lg">
          <strong>Primary Family:</strong> Pays full rate (e.g., $85 per night)
          <br />
          <strong>Second Family:</strong> Pays half rate (e.g., $42.50 per night)
          <br />
          <strong>Third Family:</strong> Pays half rate (e.g., $42.50 per night)
          <br />
          <strong>Total:</strong> $85 + $42.50 + $42.50 = $170 per night, as long
          as the total number of people does not exceed 8 and all other conditions
          (vehicles, accommodations, pets) are met.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
