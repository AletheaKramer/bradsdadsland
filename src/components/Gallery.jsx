import React, { useState } from "react";
import { Arrow } from "./Icon";

const Gallery = ({ images = [] }) => {
  const [showMore, setShowMore] = useState(false);
  const hasMultipleImages = images.length > 1;

  // For exactly two images, show one full-width image at a time
  if (images.length === 2) {
    return (
      <div className="relative overflow-hidden max-w-[1000px] mx-auto">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: showMore ? "translateX(-100%)" : "translateX(0)",
          }}
        >
          {/* First Image */}
          <div className="flex-none w-full">
            <div className="flex flex-col lg:flex-row gap-4 p-4">
              <img
                src={images[0]}
                alt="Gallery image 1"
                className="object-cover w-full rounded-[2rem] h-[400px]"
              />
            </div>
          </div>

          {/* Second Image */}
          <div className="flex-none w-full">
            <div className="flex flex-col lg:flex-row gap-4 p-4">
              <img
                src={images[1]}
                alt="Gallery image 2"
                className="object-cover w-full rounded-[2rem] h-[400px]"
              />
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 right-12 lg:right-16">
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-12 h-12 rounded-full bg-beigePrimary text-brownPrimary shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
            aria-label={showMore ? "Previous" : "Next"}
          >
            <Arrow direction={showMore ? "left" : "right"} />
          </button>
        </div>

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
  }

  // For all other cases (1, 3, 4, or more images)
  const renderImageSet = (imageSet) => {
    if (!imageSet?.length) return null;

    return (
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {imageSet.map((image, idx) => (
          <img
            key={idx}
            src={image}
            alt={`Gallery image ${idx + 1}`}
            className={`object-cover w-full rounded-[2rem] h-[400px] ${
              imageSet.length === 1
                ? "lg:w-full"
                : idx === 0
                ? "lg:w-4/12"
                : "lg:w-8/12"
            }`}
          />
        ))}
      </div>
    );
  };

  // Split images into pairs for 3+ images
  const firstSet = images.slice(0, 2);
  const secondSet = images.slice(2);
  const hasSecondSet = secondSet.length > 0;

  return (
    <div className="relative overflow-hidden max-w-[1000px] mx-auto">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: showMore ? "translateX(-100%)" : "translateX(0)" }}
      >
        {/* First set of images */}
        <div className="flex-none w-full">{renderImageSet(firstSet)}</div>

        {/* Second set of images */}
        {hasSecondSet && (
          <div className="flex-none w-full">{renderImageSet(secondSet)}</div>
        )}
      </div>

      {/* Navigation button - only show if there's more than one set */}
      {hasSecondSet && (
        <div className="absolute top-1/2 -translate-y-1/2 right-12 lg:right-16">
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-12 h-12 rounded-full bg-beigePrimary text-brownPrimary shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
            aria-label={showMore ? "Previous" : "Next"}
          >
            <Arrow direction={showMore ? "left" : "right"} />
          </button>
        </div>
      )}

      {/* Dots indicator - only show if there's a second set */}
      {hasSecondSet && (
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
      )}
    </div>
  );
};

export default Gallery;
