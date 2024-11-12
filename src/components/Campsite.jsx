import React from "react";
import map from "../assets/map.png";
import beach from "../assets/beach.svg";
import freezer from "../assets/freezer.svg";
import laundry from "../assets/laundry.svg";
import outhouse from "../assets/outhouse.svg";
import shower from "../assets/shower.svg";
import playground from "../assets/playground.svg";

const Campsite = () => {
  return (
    <div id="campsite" className="bg-brownPrimary py-24 px-8">
      <div className="flex flex-col lg:flex-row justify-between items-start">
        {/* Text and Icon Section */}
        <div className="lg:w-1/2 flex flex-col space-y-8">
          {/* Heading and Description */}
          <div>
            <h2 className="text-beigeSecondary text-5xl pb-2">
              Comfort Meets Nature’s Charm
            </h2>
            <h3 className="text-beigePrimary text-5xl">
              Discover a retreat that marries rustic charm with modern
              conveniences
            </h3>
            <p className="text-beigeSecondary text-xl mt-8">
              Our campsite is designed to make your stay as comfortable as it is
              memorable, offering fully serviced 50 & 30 amp sites with
              everything you need to unwind and reconnect with nature.
            </p>
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-2 gap-8 pt-16">
            {/* Icon Item */}
            <div className="flex items-center space-x-4">
              <div className="bg-beigePrimary p-4 rounded-full shadow-md">
                <img src={beach} alt="Beach access" className="w-8 h-8" />
              </div>
              <p className="text-beigeSecondary text-xl">Beach access</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-beigePrimary p-4 rounded-full shadow-md">
                <img src={freezer} alt="Freezer room" className="w-8 h-8" />
              </div>
              <p className="text-beigeSecondary text-xl">Freezer room</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-beigePrimary p-4 rounded-full shadow-md">
                <img src={laundry} alt="Laundry facility" className="w-8 h-8" />
              </div>
              <p className="text-beigeSecondary text-xl">Laundry facility</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-beigePrimary p-4 rounded-full shadow-md">
                <img src={outhouse} alt="Clean outhouses" className="w-8 h-8" />
              </div>
              <p className="text-beigeSecondary text-xl">Clean outhouses</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-beigePrimary p-4 rounded-full shadow-md">
                <img
                  src={shower}
                  alt="Child-friendly showers"
                  className="w-8 h-8"
                />
              </div>
              <p className="text-beigeSecondary text-xl">
                Child-friendly showers
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-beigePrimary p-4 rounded-full shadow-md">
                <img
                  src={playground}
                  alt="Children's playground"
                  className="w-8 h-8"
                />
              </div>
              <p className="text-beigeSecondary text-xl">
                Children's playground
              </p>
            </div>
          </div>
        </div>

        {/* Map Image */}
        <img
          src={map}
          alt="map"
          className="object-cover w-full lg:w-1/2 mt-8 lg:mt-0"
        />
      </div>
    </div>
  );
};

export default Campsite;
