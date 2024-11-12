import React, { useEffect, useState, useRef } from "react";
import heroImage from "./assets/views.jpg";
import bradsdadsland from "./assets/logo.gif";
import Nav from "./components/Nav.jsx";
import Campsite from "./components/Campsite";

function App() {
  const [showHeroButton, setShowHeroButton] = useState(false);
  const headerButtonRef = useRef(null); // Reference to the header "Book Now" button

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeroButton(!entry.isIntersecting);
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
    <div>
      <div className="p-8 pb-24 bg-beigePrimary min-h-screen">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex justify-between">
            <div>
              <img src={bradsdadsland} alt="Logo" className="w-[500px]" />
              <h1 className="font-sans text-4xl w-72 ml-4 mb-8 mt-4 tracking-wider text-brownPrimary">
                Camping from days gone by
              </h1>
            </div>

            <div className="relative">
              <Nav />
              <button
                ref={headerButtonRef}
                className="absolute bottom-0 right-0 mb-8 text-4xl px-10 py-4 border border-brownPrimary rounded-full font-sans font-medium text-brownPrimary hover:bg-brownPrimary hover:text-beigePrimary transition"
              >
                Book Now
              </button>
            </div>
          </div>

          <div
            className="relative w-full mx-auto border rounded-lg overflow-hidden"
            style={{ height: "calc(100vh - 4rem)" }}
          >
            <img
              src={heroImage}
              alt="Main header"
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white">
              <button
                className={`text-4xl px-10 py-4 border border-beigePrimary rounded-full font-lora font-medium text-5xl text-beigePrimary transition duration-300 ease-in-out hover:border-4 ${
                  showHeroButton
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-brownPrimary">
        <div className="max-w-[2000px] mx-auto">
          <Campsite />
        </div>
      </div>
    </div>
  );
}

export default App;
