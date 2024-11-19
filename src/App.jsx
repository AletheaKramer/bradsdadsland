import React, { useEffect, useState, useRef } from "react";
import heroImage from "./assets/views.jpg";
import bradsdadsland from "./assets/logo.gif";
import Nav from "./components/Nav.jsx";
import Campsite from "./components/Campsite";
import Vibe from "./components/Vibe.jsx";

function App() {
  const [showHeroButton, setShowHeroButton] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const headerButtonRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeroButton(!entry.isIntersecting);
        setShowScrollToTop(entry.isIntersecting === false);
      },
      {
        rootMargin: "0px",
        threshold: 0,
      }
    );

    if (headerButtonRef.current) {
      observer.observe(headerButtonRef.current);
    }

    return () => {
      if (headerButtonRef.current) {
        observer.unobserve(headerButtonRef.current);
      }
    };
  }, []);

  return (
    <div className="w-screen min-h-screen bg-beigePrimary">
      <div className="p-8 pb-24">
        <div className="max-w-[1500px] mx-auto">
          <div className="flex justify-between">
            <div>
              <img
                src={bradsdadsland}
                alt="Logo"
                className="w-[250px] lg:w-[400px]"
              />
              <h1 className="font-sans text-xl w-40 lg:text-2xl lg:w-56 ml-4 mb-8 mt-4 tracking-wide text-brownPrimary">
                Camping from days gone by
              </h1>
            </div>

            <div className="relative">
              <Nav />
              <button
                ref={headerButtonRef}
                className="absolute bottom-0 right-0 mb-8 text-sm md:text-md lg:text-lg xl:text-xl px-4 md:px-6 lg:px-8 py-1 md:py-2 lg:py-3 border border-brownPrimary rounded-full font-sans font-medium text-brownPrimary hover:bg-brownPrimary hover:text-beigePrimary transition whitespace-nowrap"
                onClick={() =>
                  window.open(
                    "https://www.campspot.com/book/bradsdadsland",
                    "_blank"
                  )
                }
              >
                Book Now
              </button>
            </div>
          </div>

          <div className="relative w-full border rounded-lg overflow-hidden h-[calc(100vh-12rem)] lg:h-[calc(100vh-4rem)]">
            <img
              src={heroImage}
              alt="Main header"
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white">
              <button
                className={`hidden lg:block lg:text-3xl px-8 py-3 border border-beigePrimary rounded-full font-lora font-medium text-beigePrimary transition duration-300 ease-in-out hover:border-4 ${
                  showHeroButton
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
                onClick={() =>
                  window.open(
                    "https://www.campspot.com/book/bradsdadsland",
                    "_blank"
                  )
                }
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-brownPrimary w-full">
        <div className="max-w-[1500px] mx-auto">
          <Campsite />
        </div>
      </div>

      <div className="bg-brownPrimary w-full">
        <div className="max-w-[1500px] mx-auto">
          <Vibe />
        </div>
      </div>

      {showScrollToTop && (
        <div>
          <button
            className="fixed bottom-4 right-4 bg-beigePrimary text-brownPrimary w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            ↑
          </button>
          <button
            className="fixed bottom-4 right-20 bg-beigePrimary text-brownPrimary w-28 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-peach hover:text-white transition"
            onClick={() =>
              window.open(
                "https://www.campspot.com/book/bradsdadsland",
                "_blank"
              )
            }
          >
            Book Now
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
