import React from "react";

const Nav = () => {
  return (
    <nav className="flex justify-between items-center mb-8 hidden md:flex">
      <div className="flex space-x-16 font-sans font-medium text-brownPrimary">
        <a href="#campsite" className="hover:text-beigeSecondary text-lg">
          Campsite
        </a>
        <a href="#rates" className="hover:text-beigeSecondary text-lg">
          Rates
        </a>
        <a href="#policies" className="hover:text-beigeSecondary text-lg">
          Policies
        </a>
        <a href="#contact" className="hover:text-beigeSecondary text-lg">
          Contact
        </a>
      </div>
    </nav>
  );
};

export default Nav;
