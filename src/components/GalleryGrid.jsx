import React from "react";
import PropTypes from "prop-types";

const GalleryGrid = ({ images }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {images.map(({ src, alt }, idx) => (
      <img
        key={idx}
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-32 object-cover rounded-md"
      />
    ))}
  </div>
);

GalleryGrid.propTypes = {
  images: PropTypes.arrayOf(
    PropTypes.shape({ src: PropTypes.string, alt: PropTypes.string })
  ).isRequired,
};

export default GalleryGrid;
