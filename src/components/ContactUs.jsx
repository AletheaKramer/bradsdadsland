import React from "react";
import contactImage from "../assets/zephi-contact-us.jpg"; // Import the image

const ContactUs = () => {
  return (
    <div className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto font-sans text-beigePrimary">
        <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">Contact Us</h2>
        
        <p className="text-lg">
          <strong>Email:</strong> <a href="mailto:bradsdadsland@telus.net" className="underline hover:text-beigeSecondary">bradsdadsland@telus.net</a>
        </p>
        <p className="text-lg mt-2">2105 Shingle Spit Road</p>
        <p className="text-lg">Hornby Island, BC Canada</p>
        <p className="text-lg">V0R 1Z0</p>
        <p className="text-lg mt-4">
          <strong>Online Reservations:</strong> <a href="tel:+12503350757" className="underline hover:text-beigeSecondary">(250) 335-0757</a>
        </p>
        <p className="text-lg">
          <strong>Office:</strong> <a href="tel:+12506501310" className="underline hover:text-beigeSecondary">(250) 650-1310</a>
        </p>

        {/* Image Section */}
        <div className="mt-8">
          <img
            src={contactImage}
            alt="Contact Us"
            className="w-full rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
