import React, { useState } from "react";
import { Arrow } from "./Icon";

const ImageSlider = ({ images = [] }) => {
  const [current, setCurrent] = useState(0);
  if (!images.length) return null;

  const prevSlide = () =>
    setCurrent((i) => (i - 1 + images.length) % images.length);
  const nextSlide = () =>
    setCurrent((i) => (i + 1) % images.length);

  return (
    <div className="relative">
      {/* Single Image */}
      <div className="w-full h-[400px] overflow-hidden rounded-lg bg-brownPrimary">
        <img
          src={images[current]}
          srcSet={
            images[current].replace(/\.jpg$/, "@400w.jpg 400w") +
            `, ${images[current].replace(/\.jpg$/, "@800w.jpg 800w")}, ${images[current]}`
          }
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
          loading="lazy"
          alt={`Slide ${current + 1}`}
          className="w-full h-full object-contain object-center"
        />
      </div>

      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-beigePrimary bg-opacity-50 p-2 rounded-full text-white"
            aria-label="Previous"
          >
            <Arrow direction="left" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-beigePrimary bg-opacity-50 p-2 rounded-full text-white"
            aria-label="Next"
          >
            <Arrow direction="right" />
          </button>

          {/* Dots */}
          <div className="flex justify-center space-x-2 mt-2">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === current ? "bg-peach" : "bg-beigeSecondary"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageSlider;
