import PropTypes from "prop-types";

const Icon = ({ src, alt, label }) => {
  return (
    <div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="bg-beigePrimary m-1 min-w-8 mr-2 lg:m-2 p-2 sm:p-4 rounded-full shadow-md">
          <img
            src={src}
            alt={alt}
            className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8"
          />
        </div>
        <p className="text-beigeSecondary leading-3 text-sm sm:text-base md:text-lg">
          {label}
        </p>
      </div>
    </div>
  );
};

export const Arrow = ({ direction = "up", className = "text-2xl" }) => {
  const arrows = {
    up: "↑",
    left: "←",
    right: "→",
  };

  return (
    <span
      className={className}
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {arrows[direction]}
    </span>
  );
};

Icon.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

Arrow.propTypes = {
  direction: PropTypes.oneOf(["up", "left", "right"]),
  className: PropTypes.string,
};

export default Icon;
