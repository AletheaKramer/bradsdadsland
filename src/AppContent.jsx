import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, useLocation, Link }   from "react-router-dom";
import { Helmet }                             from "react-helmet";

import heroImage       from "./assets/HeroImage.png";
import logoGif         from "./assets/logo.gif";
import faviconPng      from "./assets/bdl-favicon.png";

import Nav             from "./components/Nav.jsx";
import Campsite        from "./components/Campsite";
import GalleryPage     from "./components/Gallery";
import Policies        from "./components/Policies";
import Amenities       from "./components/Amenities";
import ROFR            from "./components/ROFR";
import VintageTrailers from "./components/VintageTrailers";
import Footer          from "./components/Footer";
import AboutUs         from "./components/AboutUs"
import { Arrow }       from "./components/Icon";

function AppContent() {
  const location             = useLocation();
  const isHomePage           = location.pathname === "/";

  const [showHeroBtn,  setShowHeroBtn]  = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const headerBtnRef = useRef(null);

  /* ───── Observe the header “Book Now” so we know when to show the cluster ─── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const headerVisible = entry.isIntersecting;
        setShowHeroBtn(!headerVisible);     // fade-in hero button (desktop only)
        setShowScrollTop(!headerVisible);   // gate bottom-right cluster
      },
      { threshold: 0 }
    );

    if (headerBtnRef.current) observer.observe(headerBtnRef.current);
    return () => {
      if (headerBtnRef.current) observer.unobserve(headerBtnRef.current);
    };
  }, []);

  /* ──────────────────────────── render ──────────────────────────── */
  return (
    <div className="w-screen min-h-screen bg-beigePrimary">
      {/* favicon */}
      <Helmet>
        <link rel="icon" type="image/png" href={faviconPng} />
      </Helmet>

      {/* ─────────── Header / Hero ─────────── */}
      <div className={`p-8 ${isHomePage ? "pb-24" : "pb-12"}`}>
        <div className="max-w-[1500px] mx-auto flex justify-between">
          {/* Logo + tagline */}
          <div>
            <Link to="/">
              <img
                src={logoGif}
                alt="Bradsdadsland logo"
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

          {/* Nav + header Book Now */}
          <div className="relative flex flex-col items-end">
            <Nav />

            <button
              ref={headerBtnRef}
              className="text-sm md:text-md lg:text-lg xl:text-xl
                         px-4 md:px-6 lg:px-8 py-1 md:py-2 lg:py-3
                         border border-brownPrimary rounded-full
                         font-sans font-medium
                         text-brownPrimary hover:bg-brownPrimary hover:text-beigePrimary
                         transition whitespace-nowrap"
              onClick={() =>
                window.open("https://www.campspot.com/book/bradsdadsland", "_blank")
              }
            >
              Book&nbsp;Now
            </button>

            <p className="w-full text-right text-xs sm:text-sm md:text-base text-brownPrimary mt-2 mb-1 pr-1">
              Reservations open January&nbsp;2 — online only
            </p>
          </div>
        </div>

        {/* Hero (home only) */}
        {isHomePage && (
          <div className="relative w-full border rounded-lg overflow-hidden
                          h-[calc(100vh-12rem)] lg:h-[calc(100vh-4rem)]">
            <img
              src={heroImage}
              alt="Main header"
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center
                            bg-black bg-opacity-40 text-white">
              <button
                className={`hidden lg:block lg:text-3xl px-8 py-3
                            border border-beigePrimary rounded-full font-lora font-medium
                            text-beigePrimary transition duration-300 ease-in-out hover:border-4
                            ${showHeroBtn ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() =>
                  window.open("https://www.campspot.com/book/bradsdadsland", "_blank")
                }
              >
                Book&nbsp;Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────── Routes ─────────── */}
      <div className="bg-brownPrimary w-full">
        <div className="max-w-[1500px] mx-auto">
          <Routes>
            <Route path="/"                 element={<Campsite />} />
            <Route path="/gallery"          element={<GalleryPage />} />
            <Route path="/amenities"        element={<Amenities />} />
            <Route path="/policies"         element={<Policies />} />
            <Route path="/rofr"             element={<ROFR />} />
            <Route path="/vintage-trailers" element={<VintageTrailers />} />
            <Route path="/about-us"         element={<AboutUs />} />
          </Routes>
        </div>
      </div>

      {/* ─────────── Floating action buttons (appear after scroll) ─────────── */}
      {showScrollTop && (
        <div className="fixed bottom-4 right-4 flex items-center gap-4 lg:gap-6 z-50">
          {/* Book Now — left */}
          <button
            className="px-5 lg:px-7 h-12 rounded-full shadow-lg
                       flex items-center justify-center font-medium
                       bg-beigePrimary text-brownPrimary
                       hover:bg-brownPrimary hover:text-beigePrimary transition"
            onClick={() =>
              window.open("https://www.campspot.com/book/bradsdadsland", "_blank")
            }
          >
            Book&nbsp;Now
          </button>

          {/* Up-arrow — right */}
          <button
            className="w-12 h-12 rounded-full shadow-lg
                       flex items-center justify-center
                       bg-beigePrimary text-brownPrimary
                       hover:bg-peach hover:text-white transition"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
          >
            <Arrow direction="up" />
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default AppContent;
