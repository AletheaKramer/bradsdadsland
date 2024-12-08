import React from "react";
import { Link } from "react-router-dom";

const Nav = () => {
  return (
    <nav className="flex justify-between items-center mb-8 hidden md:flex">
      <div className="flex space-x-16 font-sans font-medium text-brownPrimary">
        <Link to="/" className="hover:text-beigeSecondary text-lg">
          Campsite
        </Link>
        <Link to="/pricing" className="hover:text-beigeSecondary text-lg">
          Pricing
        </Link>
        <a href="/policies" className="hover:text-beigeSecondary text-lg">
          Policies
        </a>
        <a href="/#contact" className="hover:text-beigeSecondary text-lg">
          Contact
        </a>
      </div>
    </nav>
  );
};

export default Nav;
