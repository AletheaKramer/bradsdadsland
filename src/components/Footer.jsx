import React from "react";

const Footer = () => {
  return (
    <footer className="bg-beigePrimary text-brownPrimary py-12 px-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <div className="space-y-2">
              <p>Bradsdadsland Campsite</p>
              <p>2105 Shingle Spit Rd</p>
              <p>Hornby Island, BC V0R 1Z0</p>
              <p className="mt-4">
                <a
                  href="tel:+12503350757"
                  className="hover:text-beigeSecondary transition"
                >
                  (250) 650-1310
                </a>
              </p>
            </div>
          </div>

          {/* Hours/Season */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Camping Options</h3>
            <div className="space-y-2">
              <p>Tenting</p>
              <p>RV Camping</p>
              <p>Snowbird Accommodation</p>
              <p>Family-Friendly Environment</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <p>
                <a
                  href="https://www.google.com/maps/place/Bradsdadsland+Campsite/@49.5174017,-124.6419995,17z/data=!3m1!4b1!4m6!3m5!1s0x5487f1f0a3f0bb7b:0x8f3a798b90b1f5b7!8m2!3d49.5173982!4d-124.6394246!16s%2Fg%2F11h_yt_43h?entry=ttu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-beigeSecondary transition"
                >
                  Get Directions
                </a>
              </p>
              <p>
                <a
                  href="https://www.google.com/maps/place/Bradsdadsland+Campsite/@49.5334248,-124.7103867,16.96z/data=!4m9!3m8!1s0x548865902f2f9ac5:0x7000770310fbfc89!5m2!4m1!1i2!8m2!3d49.5339837!4d-124.7100764!16s%2Fg%2F1tg9mv36?entry=ttu&g_ep=EgoyMDI1MDExNS4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-beigeSecondary transition"
                >
                  Google Reviews
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brownPrimary/20 text-center text-sm">
          <p>
            © {new Date().getFullYear()} Bradsdadsland Campsite. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
