import React, { useState } from "react";
import { Link } from "react-router-dom";

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="relative mb-8">
      {/* Hamburger button - visible only on mobile */}
      <button
        className="md:hidden p-2 text-brownPrimary"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Desktop menu */}
      <div className="hidden md:flex justify-between items-center">
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
      </div>

      {/* Mobile dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-beigePrimary shadow-lg z-50 md:hidden">
          <div className="p-6">
            <div className="space-y-6">
              <Link
                to="/"
                className="block text-xl font-sans text-brownPrimary hover:text-beigeSecondary"
                onClick={() => setIsOpen(false)}
              >
                Campsite
              </Link>
              <Link
                to="/pricing"
                className="block text-xl font-sans text-brownPrimary hover:text-beigeSecondary"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <a
                href="/policies"
                className="block text-xl font-sans text-brownPrimary hover:text-beigeSecondary"
                onClick={() => setIsOpen(false)}
              >
                Policies
              </a>
              <a
                href="/#contact"
                className="block text-xl font-sans text-brownPrimary hover:text-beigeSecondary"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Nav;
