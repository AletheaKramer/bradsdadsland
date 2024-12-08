import React, { useState } from "react";

// Props: Accept an array of image URLs
const Gallery = ({ images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleToggle = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {/* Dynamically render image sets */}
        {images.map((image, index) => (
          <div key={index} className="flex-none w-full">
            <div className="flex flex-col lg:flex-row gap-4 pr-8 p-4 lg:pr-12 lg:p-4">
              <img
                src={image}
                alt={`Gallery Image ${index + 1}`}
                className="object-cover w-full lg:w-8/12 rounded-[2rem]"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Button */}
      <div className="absolute top-1/2 transform -translate-y-1/2 right-4 lg:right-12">
        <button
          onClick={handleToggle}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-beigePrimary text-brownPrimary shadow-lg hover:bg-peach hover:text-white transition-transform active:scale-90"
          aria-label="Toggle Navigation"
        >
          {/* Flipping Arrow Icon */}
          <span
            className={`text-3xl font-bold transform transition-transform duration-300 ${
              currentIndex === 1 ? "rotate-180" : ""
            }`}
          >
            >
          </span>
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              currentIndex === index ? "bg-beigePrimary" : "bg-beigePrimary/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Gallery;
