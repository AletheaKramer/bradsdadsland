import React from "react";

const Nav = () => {
  return (
    <nav className="flex justify-between items-center mb-8">
      <div className="flex space-x-16 font-sans font-medium text-brownPrimary">
        <a href="#campsite" className="hover:text-beigeSecondary text-xl">
          Campsite
        </a>
        <a href="#rates" className="hover:text-beigeSecondary text-xl">
          Rates
        </a>
        <a href="#policies" className="hover:text-beigeSecondary text-xl">
          Policies
        </a>
        <a href="#contact" className="hover:text-beigeSecondary text-xl">
          Contact
        </a>
      </div>
    </nav>
  );
};

export default Nav;
