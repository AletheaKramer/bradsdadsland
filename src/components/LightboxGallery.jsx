import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Arrow } from "../components/Icon";

/**
 * Re-usable gallery grid + lightbox.
 * @param images [{ src, alt }]
 */
const LightboxGallery = ({ images }) => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const openBox = (i) => {
    setIdx(i);
    setOpen(true);
  };
  const closeBox = useCallback(() => setOpen(false), []);
  const prev = useCallback(
    () => setIdx((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(
    () => setIdx((i) => (i + 1) % images.length),
    [images.length]
  );

  /* keyboard nav */
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") closeBox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [closeBox, next, open, prev]);

  return (
    <>
      {/* grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map(({ src, alt }, i) => (
          <img
            key={i}
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full h-32 object-cover rounded-md cursor-pointer"
            onClick={() => openBox(i)}
          />
        ))}
      </div>

      {/* lightbox */}
      {open && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center"
          onClick={closeBox}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl"
            aria-label="Close"
            onClick={closeBox}
          >
            ×
          </button>

          <div
            className="relative max-w-[90vw] max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[idx].src}
              alt={images[idx].alt}
              className="max-w-full max-h-full object-contain rounded-md"
              loading="lazy"
            />
            {/* click-zones */}
            <div className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" onClick={prev} />
            <div className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" onClick={next} />
            {/* arrows */}
            <button
              type="button"
              className="absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 text-white opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-full px-3 py-2"
              aria-label="Previous image"
              onClick={prev}
            >
              <Arrow direction="left" className="text-6xl sm:text-7xl leading-none" />
            </button>
            <button
              type="button"
              className="absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 text-white opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-full px-3 py-2"
              aria-label="Next image"
              onClick={next}
            >
              <Arrow direction="right" className="text-6xl sm:text-7xl leading-none" />
            </button>
          </div>

          {/* thumb strip */}
          <div className="mt-4 flex overflow-x-auto space-x-2 px-4">
            {images.map(({ src, alt }, i) => (
              <img
                key={i}
                src={src}
                alt={alt}
                loading="lazy"
                className={`w-20 h-12 object-cover rounded-md cursor-pointer border-2 ${
                  i === idx ? "border-peach" : "border-transparent"
                }`}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

LightboxGallery.propTypes = {
  images: PropTypes.arrayOf(
    PropTypes.shape({ src: PropTypes.string.isRequired, alt: PropTypes.string.isRequired })
  ).isRequired,
};

export default LightboxGallery;
