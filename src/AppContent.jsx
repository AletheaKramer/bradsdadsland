import React, { useEffect, useState, useRef } from "react";
import heroImage from "./assets/HeroImage.png";
import bradsdadsland from "./assets/logo.gif";
import Nav from "./components/Nav.jsx";
import Campsite from "./components/Campsite";
import GalleryPage from "./components/Gallery";
import Policies from "./components/Policies";
import Amenities from "./components/Amenities";
import ROFR from "./components/ROFR";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { Arrow } from "./components/Icon";
import Footer from "./components/Footer";

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [showHeroButton, setShowHeroButton] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const headerButtonRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeroButton(!entry.isIntersecting);
        setShowScrollToTop(!entry.isIntersecting);
      },
      { rootMargin: "0px", threshold: 0 }
    );
    if (headerButtonRef.current) observer.observe(headerButtonRef.current);
    return () => {
      if (headerButtonRef.current) observer.unobserve(headerButtonRef.current);
    };
  }, []);

  return (
    <div className="w-screen min-h-screen bg-beigePrimary">
      <div className={`p-8 ${isHomePage ? "pb-24" : "pb-12"}`}>
        <div className="max-w-[1500px] mx-auto flex justify-between">
          {/* Logo */}
          <div>
            <Link to="/">
              <img
                src={bradsdadsland}
                alt="Logo"
                className={`w-[250px] lg:w-[400px] ${!isHomePage && "lg:w-[300px]"}`}
              />
            </Link>
            <h1
              className={`font-sans text-xl lg:text-2xl tracking-wide text-brownPrimary ${
                isHomePage ? "mt-4 mb-2" : "mt-2 mb-1"
              }`}
            >
              Camping from days gone by
            </h1>
          </div>

          {/* Nav + Book Now + Notice */}
          <div className="relative flex flex-col items-end">
            <Nav />
            {/* Moved Book Now above the notice */}
            <button
              ref={headerButtonRef}
              className="text-sm md:text-md lg:text-lg xl:text-xl px-4 md:px-6 lg:px-8 py-1 md:py-2 lg:py-3 border border-brownPrimary rounded-full font-sans font-medium text-brownPrimary hover:bg-brownPrimary hover:text-beigePrimary transition whitespace-nowrap"
              onClick={() =>
                window.open("https://www.campspot.com/book/bradsdadsland", "_blank")
              }
            >
              Book Now
            </button>
          <div className="relative flex flex-col items-end">
            <p className="w-full text-right text-xs sm:text-sm md:text-base text-brownPrimary mt-2 mb-1 pr-1">
              Reservations open on January&nbsp;2nd&nbsp;–&nbsp;online only.
            </p>
          </div>


          </div>
        </div>

        {/* Hero on home only */}
        {isHomePage && (
          <div className="relative w-full border rounded-lg overflow-hidden h-[calc(100vh-12rem)] lg:h-[calc(100vh-4rem)]">
            <img
              src={heroImage}
              alt="Main header"
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white">
              <button
                className={`hidden lg:block lg:text-3xl px-8 py-3 border border-beigePrimary rounded-full font-lora font-medium text-beigePrimary transition duration-300 ease-in-out hover:border-4 ${
                  showHeroButton ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={() =>
                  window.open("https://www.campspot.com/book/bradsdadsland", "_blank")
                }
              >
                Book Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Routes */}
      <div className="bg-brownPrimary w-full">
        <div className="max-w-[1500px] mx-auto">
          <Routes>
            <Route path="/" element={<Campsite />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/amenities" element={<Amenities />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/rofr" element={<ROFR />} />
          </Routes>
        </div>
      </div>

      {/* Floating buttons & footer */}
      {showScrollToTop && (
        <div className="hidden lg:block">
          <button
            className="fixed bottom-4 right-4 bg-beigePrimary text-brownPrimary w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <Arrow direction="up" />
          </button>
          <button
            className="fixed bottom-4 right-20 bg-beigePrimary text-brownPrimary w-28 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
            onClick={() =>
              window.open("https://www.campspot.com/book/bradsdadsland", "_blank")
            }
          >
            Book Now
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default AppContent;
