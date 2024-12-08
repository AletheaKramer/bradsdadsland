import React from "react";
import Gallery from "./Gallery"; // Assuming the gallery component is already in your project
import swingsetImage from "../assets/swingset.jpg";
import sandboxImage from "../assets/sandbox.jpg";
import toiletsImage from "../assets/toilets.jpg";
import showersImage from "../assets/showers.jpg";
import outhouseOneImage from "../assets/outhouse-one.jpg";
import outhouseTwoImage from "../assets/outhouse-two.jpg";
import laundryOneImage from "../assets/laundry-machines-one.jpg"; // Updated filename
import laundryTwoImage from "../assets/laundry-machines-two.jpg"; // Updated filename
import recyclingImage from "../assets/recycling-garbage-freezer.jpg";
import officeStoreImage from "../assets/office-and-store.jpg";
import capeCodImage from "../assets/cape-cod-chair.jpg";
import beachAccessOneImage from "../assets/beach-access-one.jpg";
import beachAccessTwoImage from "../assets/beach-access-two.jpg";
import oceanfrontImage from "../assets/oceanfront.jpg";

const Amenities = () => {
  const sections = [
    {
      title: "Family-Friendly Features",
      description: "Children’s Playground (Fully fenced) with 3 swing sets, 2 rope swings, a tire swing, and a sandbox and tractor at the far end of the campsite.",
      image: swingsetImage,
      reverse: false,
    },
    {
      title: "Sandbox Area",
      description: "A fun sandbox and tractor play area for kids, located at the far end of the campsite, perfect for younger campers.",
      image: sandboxImage,
      reverse: true,
    },
    {
      title: "Restroom Facilities",
      description: "Indoor facilities include 2 flush toilets, ensuring comfort and cleanliness during your stay.",
      image: toiletsImage,
      reverse: false,
    },
    {
      title: "Showers",
      description: "Coin-operated showers include a child-friendly showerhead at 3 feet high and a standard showerhead at 6 feet high.",
      image: showersImage,
      reverse: true,
    },
    {
      title: "Outhouses",
      description: "8 very clean outhouses located conveniently around the campsite to serve all guests.",
      gallery: [outhouseOneImage, outhouseTwoImage], // Use gallery for multiple images
      reverse: false,
    },
    {
      title: "Laundry Facility",
      description: "On-site laundry machines make it easy to stay fresh during extended stays.",
      gallery: [laundryOneImage, laundryTwoImage], // Updated filenames and gallery
      reverse: true,
    },
    {
      title: "Recycling, Garbage & Freezer Room",
      description: "A dedicated recycling and garbage facility with freezer storage options for your convenience.",
      image: recyclingImage,
      reverse: false,
    },
    {
      title: "Reception Office and General Store",
      description: "A welcoming office and store stocked with camping essentials to make your stay comfortable.",
      image: officeStoreImage,
      reverse: true,
    },
    {
      title: "Cape Cod Chairs",
      description: "Relax with our Cape Cod chairs along the waterfront, perfect for unwinding and enjoying the views.",
      image: capeCodImage,
      reverse: false,
    },
    {
      title: "Beach Access",
      description: "Enjoy 1,000 feet of oceanfront and easy access to the beach, providing breathtaking views and relaxation.",
      gallery: [beachAccessOneImage, beachAccessTwoImage], // Added gallery for beach access
      reverse: true,
    },
    {
      title: "Oceanfront Views",
      description: "Immerse yourself in the stunning oceanfront scenery, perfect for creating lasting memories.",
      image: oceanfrontImage,
      reverse: false,
    },
  ];

  return (
    <div className="bg-brownPrimary py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-4xl font-bold text-beigeSecondary mb-12 text-center">Campsite Amenities</h2>
        {sections.map((section, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              section.reverse ? "md:flex-row-reverse" : "md:flex-row"
            } items-center gap-8 mb-16`}
          >
            {/* Text Section */}
            <div className="w-full md:w-1/2">
              <h3 className="text-2xl font-semibold text-beigePrimary mb-4">{section.title}</h3>
              <p className="text-lg text-beigePrimary">{section.description}</p>
            </div>
            {/* Image or Gallery Section */}
            <div className="w-full md:w-1/2">
              {section.gallery ? (
                <Gallery images={section.gallery} />
              ) : (
                <img
                  src={section.image}
                  alt={section.title}
                  className="w-full rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Amenities;
