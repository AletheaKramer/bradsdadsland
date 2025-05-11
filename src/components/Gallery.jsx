import React, { useState, useEffect } from "react";
import { Arrow } from "../components/Icon";

import CapeCode1    from "../assets/CapeCode1.jpg";
import CapeCode2    from "../assets/CapeCode2.jpg";
import CapeCode3    from "../assets/CapeCode3.jpg";
import FFF1         from "../assets/FFF1.jpg";
import FFF2         from "../assets/FFF2.jpg";
import FFF3         from "../assets/FFF3.jpg";
import Facilities1  from "../assets/Facilities1.jpg";
import Facilities2  from "../assets/Facilities2.jpg";
import Facilities3  from "../assets/Facilities3.jpg";
import Facilities4  from "../assets/Facilities4.jpg";
import Laundry1     from "../assets/Laundry1.jpg";
import Laundry2     from "../assets/Laundry2.jpg";
import Ocean1       from "../assets/Ocean1.jpg";
import Ocean2       from "../assets/Ocean2.jpg";
import Ocean3       from "../assets/Ocean3.jpg";
import Ocean4       from "../assets/Ocean4.jpg";
import Ocean5       from "../assets/Ocean5.jpg";
import Ocean6       from "../assets/Ocean6.jpg";
import Office1      from "../assets/Office1.jpg";
import Office2      from "../assets/Office2.jpg";
import Office3      from "../assets/Office3.jpg";
import Office4      from "../assets/Office4.jpg";
import Outhouse1    from "../assets/Outhouse1.jpg";
import Outhouse2    from "../assets/Outhouse2.jpg";
import Outhouse3    from "../assets/Outhouse3.jpg";
import Outhouse4    from "../assets/Outhouse4.jpg";
import PoliciesImg  from "../assets/Policies.jpg";
import ROFRImg      from "../assets/ROFR.jpg";
import Recycling1   from "../assets/Recycling1.jpg";
import Recycling2   from "../assets/Recycling2.jpg";
import Recycling3   from "../assets/Recycling3.jpg";

const images = [
  CapeCode1, CapeCode2, CapeCode3,
  FFF1, FFF2, FFF3,
  Facilities1, Facilities2, Facilities3, Facilities4,
  Laundry1, Laundry2,
  Ocean1, Ocean2, Ocean3, Ocean4, Ocean5, Ocean6,
  Office1, Office2, Office3, Office4,
  Outhouse1, Outhouse2, Outhouse3, Outhouse4,
  PoliciesImg, ROFRImg,
  Recycling1, Recycling2, Recycling3,
];

export default function GalleryPage() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (idx) => {
    setCurrentIndex(idx);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const prevImage = () =>
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  const nextImage = () =>
    setCurrentIndex((i) => (i + 1) % images.length);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  return (
    <div className="bg-brownPrimary p-8 max-w-[1500px] mx-auto">
      <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">Gallery</h2>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            loading="lazy"
            alt={`Gallery ${idx + 1}`}
            className="cursor-pointer w-full h-32 object-cover rounded-md"
            onClick={() => openLightbox(idx)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl"
            onClick={closeLightbox}
            aria-label="Close"
          >
            ×
          </button>

          {/* Main image */}
          <div
            className="relative max-w-[90vw] max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[currentIndex]}
              loading="lazy"
              alt={`Gallery ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-md"
            />
            {/* Prev/Next click-zones */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
              onClick={prevImage}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
              onClick={nextImage}
            />
            {/* Indicators */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-4xl opacity-60 hover:opacity-100 transition-opacity">
              <Arrow direction="left" />
            </div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-4xl opacity-60 hover:opacity-100 transition-opacity">
              <Arrow direction="right" />
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="mt-4 flex overflow-x-auto space-x-2">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                loading="lazy"
                alt={`Thumbnail ${idx + 1}`}
                className={`w-20 h-12 object-cover rounded-md cursor-pointer border-2 ${
                  idx === currentIndex ? "border-peach" : "border-transparent"
                }`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
