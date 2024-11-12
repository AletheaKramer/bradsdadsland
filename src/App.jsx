import React from "react";
import heroImage from "./assets/views.jpg";
import bradsdadsland from "./assets/logo.gif";
import Nav from "./components/Nav.jsx";
import Campsite from "./components/Campsite";

function App() {
  return (
    <div>
      <div className="p-8 pb-24 bg-beigePrimary min-h-screen">
        <div className="flex justify-between sticky">
          <div>
            <img src={bradsdadsland} alt="Logo" className="w-[500px]" />
            <h1 className="font-sans text-4xl w-72 ml-4 mb-8 mt-4 tracking-wider text-brownPrimary">
              Camping from days gone by
            </h1>
          </div>

          <div className="relative">
            <Nav />
            <button className="absolute bottom-0 right-0 mb-8 text-4xl px-10 py-4 border border-brownPrimary rounded-full font-sans font-medium text-brownPrimary hover:bg-brownPrimary hover:text-beigePrimary transition">
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
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white"></div>
        </div>
      </div>
      <Campsite />
    </div>
  );
}

export default App;
