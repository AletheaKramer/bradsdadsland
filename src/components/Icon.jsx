import React from "react";

const Icon = ({ src, alt, label }) => {
  return (
    <div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="bg-beigePrimary m-1 lg:m-2 p-2 sm:p-4 rounded-full shadow-md">
          <img
            src={src}
            alt={alt}
            className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8"
          />
        </div>
        <p className="text-beigeSecondary text-sm sm:text-base md:text-lg">
          {label}
        </p>
      </div>
    </div>
  );
};

export default Icon;
