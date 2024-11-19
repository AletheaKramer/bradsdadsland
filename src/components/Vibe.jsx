import React from "react";

import Stairs from "../assets/stairs.png";
import Frontgate from "../assets/frontgate.png";

const Vibe = () => {
  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4 pr-8 p-4 lg:pr-12 lg:p-4">
        <img
          src={Stairs}
          alt="Stairs"
          className="object-cover w-full lg:w-4/12 rounded-[2rem]"
        ></img>
        <img
          src={Frontgate}
          alt="Stairs"
          className="object-cover w-full lg:w-8/12 rounded-[2rem]"
        ></img>
      </div>
    </div>
  );
};

export default Vibe;
