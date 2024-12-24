import React from "react";
import Gallery from "./Gallery";
import swingsetImage from "../assets/swingset.jpg";
import sandboxImage from "../assets/sandbox.jpg";
import toiletsImage from "../assets/toilets.jpg";
import showersImage from "../assets/showers.jpg";
import outhouseOneImage from "../assets/outhouse-one.jpg";
import outhouseTwoImage from "../assets/outhouse-two.jpg";
import laundryOneImage from "../assets/laundry-machines-one.jpg";
import laundryTwoImage from "../assets/laundry-machines-two.jpg";
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
      description:
        "Children's Playground (fully fenced) with 3 swings, a sandbox, and a tractor at the far end of the campsite.",
      images: [swingsetImage],
    },
    {
      title: "Facilities",
      description:
        "Modern indoor facilities including flush toilets, showers, and convenient recycling and garbage facilities.",
      images: [toiletsImage, showersImage, recyclingImage],
    },
    {
      title: "Outhouses & Laundry",
      description:
        "8 clean outhouses located around the campsite, plus on-site laundry facilities for extended stays.",
      images: [
        outhouseOneImage,
        outhouseTwoImage,
        laundryOneImage,
        laundryTwoImage,
      ],
    },
    {
      title: "Reception Office and General Store",
      description:
        "A welcoming office and store stocked with camping essentials to make your stay comfortable.",
      images: [officeStoreImage],
    },
    {
      title: "Cape Cod Chairs",
      description:
        "Relax with our Cape Cod chairs along the waterfront, perfect for unwinding and enjoying the views.",
      images: [capeCodImage],
    },
    {
      title: "Beach Access",
      description:
        "Enjoy 1,000 feet of oceanfront and easy access to the beach, providing breathtaking views and relaxation.",
      images: [beachAccessOneImage, beachAccessTwoImage],
    },
    {
      title: "Oceanfront Views",
      description:
        "Immerse yourself in the stunning oceanfront scenery, perfect for creating lasting memories.",
      images: [oceanfrontImage],
    },
  ];

  return (
    <div className="bg-brownPrimary py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-4xl font-bold text-beigeSecondary mb-12 text-center">
          Campsite Amenities
        </h2>
        {sections.map((section, index) => (
          <div
            key={index}
            className="flex flex-col md:flex-row items-center gap-8 mb-16"
          >
            {/* Text Section */}
            <div className="w-full md:w-1/2">
              <h3 className="text-2xl font-semibold text-beigePrimary mb-4">
                {section.title}
              </h3>
              <p className="text-lg text-beigePrimary">{section.description}</p>
            </div>
            {/* Gallery Section */}
            <div className="w-full md:w-1/2">
              <Gallery images={section.images} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Amenities;
