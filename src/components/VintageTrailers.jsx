import React from "react";
import LightboxGallery from "./LightboxGallery";

import heroBanner from "../assets/airfloat1950-1.png";

/* ---------- image imports ---------- */
/* Air Float 1950 */
import air1 from "../assets/airfloat1950-1.png";
import air2 from "../assets/airfloat1950-2.png";
import air3 from "../assets/airfloat1950-3.png";
import air4 from "../assets/airfloat1950-4.png";
import air5 from "../assets/airfloat1950-5.png";
import air6 from "../assets/airfloat1950-6.png";
import air7 from "../assets/airfloat1950-7.png";
import air8 from "../assets/airfloat1950-8.png";
import air9 from "../assets/airfloat1950-9.png";

/* Boles–Aero 1955 */
import bol1 from "../assets/bolesaero-1.png";
import bol2 from "../assets/bolesaero-2.png";
import bol3 from "../assets/bolesaero-3.png";
import bol4 from "../assets/bolesaero-4.png";
import bol5 from "../assets/bolesaero-5.png";
import bol6 from "../assets/bolesaero-6.png";
import bol7 from "../assets/bolesaero-7.png";
import bol8 from "../assets/bolesaero-8.png";
import bol9 from "../assets/bolesaero-9.png";
import bol10 from "../assets/bolesaero-10.png";
import bol11 from "../assets/bolesaero-11.png";
import bol12 from "../assets/bolesaero-12.png";
import bol13 from "../assets/bolesaero-13.png";
import bol14 from "../assets/bolesaero-14.png";
import bol15 from "../assets/bolesaero-15.png";

/* Shasta 1962 */
import sha1 from "../assets/shasta-1.png";
import sha2 from "../assets/shasta-2.png";
import sha3 from "../assets/shasta-3.png";
import sha4 from "../assets/shasta-4.png";
import sha5 from "../assets/shasta-5.png";
import sha6 from "../assets/shasta-6.png";
import sha7 from "../assets/shasta-7.png";
import sha8 from "../assets/shasta-8.png";
import sha9 from "../assets/shasta-9.png";
import sha10 from "../assets/shasta-10.png";
import sha11 from "../assets/shasta-11.png";

/* Aljo 1954 */
import alj1 from "../assets/aljo-1.png";
import alj2 from "../assets/aljo-2.png";
import alj3 from "../assets/aljo-3.png";
import alj4 from "../assets/aljo-4.png";
import alj5 from "../assets/aljo-5.png";

/* ---------- helpers ---------- */
const build = (arr, name) =>
  arr.map((src, i) => ({ src, alt: `Vintage Trailer – ${name} – Image ${i + 1}` }));

/* ---------- trailer data ---------- */
const trailers = [
  {
    name: "Air Float 1950 (Site 11C)",
    features: [
      "15-Amp",
      "30-Amp",
      "Electricity",
      "Fire Pit",
      "Picnic Table",
      "Water Hook-Up",
    ],
    description: `Lovingly restored by vintage trailer enthusiasts Lew and Leslie of Maple Ridge, BC, the varnished wood-paneled 1950 Air Float RV captures the romance of classic camping. Imagine spending summer in our cape cod chairs along the waterfront, with sunset colors and modern facilities infused with Hornby Island vibes—a perfect backdrop for your family holiday. 

SLEEPS
• 2 adults in a double bed
• Optional child-sized tent (max 1.6 m × 2 m)

INSIDE THE TRAILER
• Mini-fridge
• Sink
• Heater & fan
• Picnic table
• Fire ring

Ground sheets, pillows, and pillowcases are supplied; please bring blankets, sleeping bags, and towels.

QUICK FACTS
• One small-car parking stall (larger vehicles redirected by staff)
• Showers, freezer room, tuck store & laundromat nearby
• No pets or stereo music
• Quiet hours 10 pm – 7 am
• $25 cleaning fee + $300 damage deposit
• Check-in 4 pm · Check-out 11 am
• Two-night minimum
• Max 2 guests (adults or children)`,
    images: build(
      [air1, air2, air3, air4, air5, air6, air7, air8, air9],
      "Air Float 1950"
    ),
  },
  {
    name: "Boles-Aero 1955 (Site 13C)",
    features: [
      "30-Amp",
      "Electricity",
      "15-Amp",
      "Fire Pit",
      "Picnic Table",
      "Water Hook-Up",
    ],
    description: `Painstakingly renewed by Port Moody, BC couple Keith & Barb, the 1955 Boles-Aero in site 13C pairs mid-century style with modern comforts.

SLEEPS
• 2 adults in a double bed
• Dinette converts to a bed for 1 child
• Optional child-sized tent (max 1.6 m × 2 m)

INSIDE THE TRAILER
• Mini-fridge
• Sink
• Heater & fan
• Dinette
• Picnic table
• Fire ring

Ground sheets, pillows, and pillowcases provided; please bring blankets, sleeping bags, and towels.

QUICK FACTS
• One small-car parking stall (larger vehicles redirected by staff)
• Showers, freezer room, tuck store & laundromat nearby
• No pets or stereo music
• Quiet hours 10 pm – 7 am
• $25 cleaning fee + $300 damage deposit
• Check-in 4 pm · Check-out 11 am
• Two-night minimum`,
    images: build(
      [
        bol1, bol2, bol3, bol4, bol5,
        bol6, bol7, bol8, bol9, bol10,
        bol11, bol12, bol13, bol14, bol15,
      ],
      "Boles-Aero 1955"
    ),
  },
  {
    name: "Shasta 1962 (Site 12C)",
    features: [
      "15-Amp",
      "30-Amp",
      "Electricity",
      "Fire Pit",
      "Picnic Table",
      "Water Hook-Up",
    ],
    description: `With its signature wings, the 1962 Shasta—rescued by Lew & Leslie of Maple Ridge, BC—adds a splash of retro fun to site 12C.

SLEEPS
• 2 adults in a double bed
• Upper bunk for 1 child
• Optional child-sized tent (max 1.6 m × 2 m)

INSIDE THE TRAILER
• Mini-fridge
• Sink
• Heater & fan
• Dinette
• Picnic table
• Fire ring

Ground sheets, pillows, and pillowcases supplied; please bring blankets, sleeping bags, and towels.

QUICK FACTS
• One small-car parking stall (larger vehicles redirected by staff)
• Showers, freezer room, tuck store & laundromat nearby
• No pets or stereo music
• Quiet hours 10 pm – 7 am
• $25 cleaning fee + $300 damage deposit
• Check-in 4 pm · Check-out 11 am
• Two-night minimum`,
    images: build(
      [sha1, sha2, sha3, sha4, sha5, sha6, sha7, sha8, sha9, sha10, sha11],
      "Shasta 1962"
    ),
  },
  {
    name: "Aljo 1954 (Site 14C)",
    features: ["Picnic Table", "Fire Pit", "Electricity", "Water Hook-Up"],
    description: `Hand-finished by prairie craftsmen Brian & Brenda of Gribbs, SK, our cozy 1954 Aljo in site 14C offers a warm-wood interior in a compact footprint.

SLEEPS
• Sleeps two adults: pick separate nests - a three-quarter bed and a convertible dinette — or, depending on the love, cuddle up together in the three-quarter bed
• Optional child-sized tent (max 1.6 m × 2 m)

INSIDE THE TRAILER
• Cooler
• Sink
• Heater & fan
• Picnic table
• Fire ring

Ground sheets, pillows, and pillowcases supplied; please bring blankets, sleeping bags, and towels.

QUICK FACTS
• One small-car parking stall (larger vehicles redirected by staff)
• Showers, freezer room, tuck store & laundromat nearby
• No pets or stereo music
• Quiet hours 10 pm – 7 am
• $25 cleaning fee + $300 damage deposit
• Check-in 4 pm · Check-out 11 am
• Two-night minimum`,
    images: build([alj1, alj2, alj3, alj4, alj5], "Aljo 1954"),
  },
];

/* ---------- component ---------- */
const VintageTrailers = () => (
  <>
    {/* Hero */}
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-beigePrimary py-8">
      <div className="max-w-[1500px] mx-auto px-4">
        <div className="w-full h-80 lg:h-[26rem] relative overflow-hidden rounded-lg shadow-md">
          <img
            src={heroBanner}
            alt="Vintage trailer along the Hornby waterfront"
            className="object-cover w-full h-full opacity-80"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-beigePrimary mb-6">
              Vintage Trailers – Camping with indoor comfort
            </h1>
            <a
              href="https://www.campspot.com/book/bradsdadsland"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-beigePrimary text-brownPrimary hover:bg-brownPrimary hover:text-beigePrimary px-6 py-3 rounded-full font-medium transition"
            >
              Check Availability
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* Trailer sections */}
    <article className="max-w-[1500px] mx-auto px-4 py-12 text-beigePrimary font-sans">
      {trailers.map(({ name, description, features, images }) => (
        <section key={name} className="mb-20">
          <h2 className="text-3xl font-semibold mb-4">{name}</h2>
          <p className="mb-6 whitespace-pre-line leading-relaxed">{description}</p>

          <h3 className="text-2xl font-medium mb-2">Features</h3>
          <ul className="list-disc list-inside mb-8 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <h3 className="text-2xl font-medium mb-4">Gallery</h3>
          <LightboxGallery images={images} />
        </section>
      ))}
    </article>
  </>
);

export default VintageTrailers;
