import React from "react";
import map from "../assets/map.png";
import beach from "../assets/beach.svg";
import freezer from "../assets/freezer.svg";
import laundry from "../assets/laundry.svg";
import outhouse from "../assets/outhouse.svg";
import shower from "../assets/shower.svg";
import playground from "../assets/playground.svg";
import Icon from "./Icon";

const Campsite = () => {
  return (
    <div id="campsite" className="bg-brownPrimary py-24 px-8">
      <div className="flex flex-col lg:flex-row justify-between items-start">
        <div className="lg:w-1/2 pr-8 flex flex-col space-y-8">
          <div>
            <h2 className="text-beigeSecondary text-4xl pb-2">
              Comfort Meets Nature’s Charm
            </h2>
            <h3 className="text-beigePrimary text-4xl">
              Discover a retreat that marries rustic charm with modern
              conveniences
            </h3>
            <p className="text-beigeSecondary text-large mt-8">
              Our campsite is designed to make your stay as comfortable as it is
              memorable, offering fully serviced 50 & 30 amp sites with
              everything you need to unwind and reconnect with nature.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:gap-8 lg:pt-16 pt-4">
            <Icon src={beach} alt="Beach access" label="Beach access" />
            <Icon src={freezer} alt="Freezer access" label="Freezer access" />
            <Icon
              src={laundry}
              alt="Laundry facility"
              label="Laundry facility"
            />
            <Icon
              src={outhouse}
              alt="Clean outhouses"
              label="Clean outhouses"
            />
            <Icon src={shower} alt="Indoor showers" label="Indoor showers" />
            <Icon
              src={playground}
              alt="Children's playground"
              label="Children's playground"
            />
          </div>
        </div>

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
