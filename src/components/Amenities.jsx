import React from "react";
import Gallery from "./Gallery";
import familyFeaturesImage from "../assets/FFF1.jpg";
import FF2 from "../assets/FFF2.jpg";
import FF3 from "../assets/FFF3.jpg";
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
import facilities1 from "../assets/Facilities1.jpg";
import facilities2 from "../assets/Facilities2.jpg";
import facilities3 from "../assets/Facilities3.jpg";
import facilities4 from "../assets/Facilities4.jpg";
import recycling1 from "../assets/Recycling1.jpg";
import recycling2 from "../assets/Recycling2.jpg";
import recycling3 from "../assets/Recycling3.jpg";
import outhouse1 from "../assets/Outhouse1.jpg";
import outhouse2 from "../assets/Outhouse2.jpg";
import outhouse3 from "../assets/Outhouse3.jpg";
import outhouse4 from "../assets/Outhouse4.jpg";
import laundry1 from "../assets/Laundry1.jpg";
import laundry2 from "../assets/Laundry2.jpg";
import capecod1 from "../assets/CapeCode1.jpg";
import capecod2 from "../assets/CapeCode2.jpg";
import capecod3 from "../assets/CapeCode3.jpg";
import Ocean1 from "../assets/Ocean1.jpg";
import Ocean2 from "../assets/Ocean2.jpg";
import Ocean3 from "../assets/Ocean3.jpg";
import Ocean4 from "../assets/Ocean4.jpg";
import Ocean5 from "../assets/Ocean5.jpg";
import Ocean6 from "../assets/Ocean6.jpg";

const Amenities = () => {
  const sections = [
    {
      title: "Family-Friendly Features",
      description:
        "Children's playground with 3 swings, 3 toddler swings, 1 tire swing, sand box, and tractor at the far end of the campsite.",
      images: [familyFeaturesImage, FF2, FF3],
    },
    {
      title: "Facilities",
      description:
        "Modern indoor facilities including flush toilets, coin-operated showers, and convenient recycling and garbage facilities.",
      images: [facilities1, facilities2, facilities3, facilities4],
    },
    {
      title: "Outhouses",
      description:
        "Six new outhouses located in the middle of the campground with sinks and a sink dedicated to dishes. Two other outhouses are located next to the laundry.",
      images: [
        outhouse1,
        outhouse2,
        outhouse3,
        outhouse4,
      ],
    },
    {
      title: "Laundry",
      description:
        "Coin-operated machines, chairs to wait, and free books inside.",
      images: [
        laundry1,
        laundry2,
      ],
    },
    {
      title: "Recycling and Garbage",
      description:
        "Recycling building with proper separation of all items, including compost.",
      images: [
        recycling1, 
        recycling2, 
        recycling3,
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
        "Relax with our Cape Cod chairs facing west, along the waterfront, perfect for unwinding, enjoying the ocean view, and a fantastic sunset.",
      images: [capecod1, capecod2, capecod3],
    },
    {
      title: "Oceanfront Views and Beach Access",
      description:
        "Enjoy 300m of ocean views (wonderful Lambert Channel) from the campground and 2 accesses to the beach. Alternatively, for those with mobility difficulties and wishing to access the beach, you can use your vehicle to access Phipps Point, which is only 450m from the campground.",
      images: [Ocean1, Ocean2, Ocean3, Ocean4, Ocean5, Ocean6],
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
