import React, { useState } from "react";

import Stairs from "../assets/stairs.png";
import Frontgate from "../assets/frontgate.png";
import { Arrow } from "./Icon";

const Gallery = () => {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: showMore ? "translateX(-100%)" : "translateX(0)" }}
      >
        {/* First set of images */}
        <div className="flex-none w-full">
          <div className="flex flex-col lg:flex-row gap-4 pr-8 p-4 lg:pr-12 lg:p-4">
            <img
              src={Stairs}
              alt="Stairs"
              className="object-cover w-full lg:w-4/12 rounded-[2rem]"
            />
            <img
              src={Frontgate}
              alt="Front gate"
              className="object-cover w-full lg:w-8/12 rounded-[2rem]"
            />
          </div>
        </div>

        {/* Second set of images */}
        <div className="flex-none w-full">
          <div className="flex flex-col lg:flex-row gap-4 pr-8 p-4 lg:pr-12 lg:p-4">
            <img
              src={Stairs}
              alt="Stairs"
              className="object-cover w-full lg:w-4/12 rounded-[2rem]"
            />
            <img
              src={Frontgate}
              alt="Front gate"
              className="object-cover w-full lg:w-8/12 rounded-[2rem]"
            />
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="absolute top-1/2 -translate-y-1/2 right-12 lg:right-16">
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-12 h-12 rounded-full bg-beigePrimary text-brownPrimary shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
          aria-label={showMore ? "Previous" : "Next"}
        >
          <Arrow direction={showMore ? "left" : "right"} />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        <div
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${
            !showMore ? "bg-beigePrimary" : "bg-beigePrimary/50"
          }`}
        />
        <div
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${
            showMore ? "bg-beigePrimary" : "bg-beigePrimary/50"
          }`}
        />
      </div>
    </div>
  );
};

export default Gallery;
