import React from "react";
import ImageSlider from "./ImageSlider";

import family1     from "../assets/FFF1.jpg";
import family2     from "../assets/FFF2.jpg";
import family3     from "../assets/FFF3.jpg";

import facilities1 from "../assets/Facilities1.jpg";
import facilities2 from "../assets/Facilities2.jpg";
import facilities3 from "../assets/Facilities3.jpg";
import facilities4 from "../assets/Facilities4.jpg";

import outhouse1   from "../assets/Outhouse1.jpg";
import outhouse2   from "../assets/Outhouse2.jpg";
import outhouse3   from "../assets/Outhouse3.jpg";
import outhouse4   from "../assets/Outhouse4.jpg";

import laundry1    from "../assets/Laundry1.jpg";
import laundry2    from "../assets/Laundry2.jpg";

import recycling1  from "../assets/Recycling1.jpg";
import recycling2  from "../assets/Recycling2.jpg";
import recycling3  from "../assets/Recycling3.jpg";

import capecod1    from "../assets/CapeCode1.jpg";
import capecod2    from "../assets/CapeCode2.jpg";
import capecod3    from "../assets/CapeCode3.jpg";

import ocean1      from "../assets/Ocean1.jpg";
import ocean2      from "../assets/Ocean2.jpg";
import ocean3      from "../assets/Ocean3.jpg";
import ocean4      from "../assets/Ocean4.jpg";
import ocean5      from "../assets/Ocean5.jpg";
import ocean6      from "../assets/Ocean6.jpg";

import Office1      from "../assets/Office1.jpg";
import Office2      from "../assets/Office2.jpg";
import Office3      from "../assets/Office3.jpg";
import Office4      from "../assets/Office4.jpg";

const sections = [
  {
    title: "Family‑Friendly Features",
    description:
      "Children's playground with 3 swings, 3 toddler swings, 1 tire swing, sand box, and tractor at the far end of the campsite.",
    images: [family1, family2, family3],
  },
  {
    title: "Facilities",
    description:
      "Modern indoor facilities including flush toilets, coin‑operated showers, and convenient recycling and garbage facilities.",
    images: [facilities1, facilities2, facilities3, facilities4],
  },
  {
    title: "Outhouses",
    description:
      "Six new outhouses located in the middle of the campground with sinks and a sink dedicated to dishes. Two other outhouses are located next to the laundry.",
    images: [outhouse1, outhouse2, outhouse3, outhouse4],
  },
  {
    title: "Laundry",
    description: "Coin‑operated machines, chairs to wait, and free books inside.",
    images: [laundry1, laundry2],
  },
  {
    title: "Recycling and Garbage",
    description:
      "Recycling building with proper separation of all items, including compost.",
    images: [recycling1, recycling2, recycling3],
  },
  {
    title: "Reception Office and General Store",
    description:
      "A welcoming office and store stocked with camping essentials to make your stay comfortable.",
    images: [Office1, Office2, Office3, Office4],
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
    images: [ocean1, ocean2, ocean3, ocean4, ocean5, ocean6],
  },
];

export default function Amenities() {
  return (
    <div className="bg-brownPrimary py-16 px-6">
      <div className="max-w-[1200px] mx-auto font-sans text-beigePrimary">
        <h2 className="text-4xl font-bold text-beigeSecondary mb-12 text-center">
          Campsite Amenities
        </h2>

        {sections.map((section, idx) => (
          <div
            key={idx}
            className="flex flex-col md:flex-row items-center gap-8 mb-16"
          >
            {/* Text */}
            <div className="w-full md:w-1/2">
              <h3 className="text-2xl font-semibold text-beigeSecondary mb-4">
                {section.title}
              </h3>
              <p className="text-lg">{section.description}</p>
            </div>

            {/* Slider */}
            <div className="w-full md:w-1/2">
              <ImageSlider images={section.images} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
