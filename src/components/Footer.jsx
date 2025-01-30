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
              <p className="mt-4">
                <a
                  href="mailto:bradsdadsland@telus.net"
                  className="hover:text-beigeSecondary transition" 
                >
                  bradsdadsland@telus.net
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
                  href="https://www.google.com/maps/place/Bradsdadsland+Campsite/data=!4m2!3m1!1s0x0:0x7000770310fbfc89?sa=X&ved=1t:2428&ictx=111"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-beigeSecondary transition"
                >
                  Get Directions
                </a>
              </p>
              <p>
                <a
                  href="https://www.google.com/maps/place/Bradsdadsland+Campsite/@49.532616,-124.7109708,16.53z/data=!4m11!3m10!1s0x548865902f2f9ac5:0x7000770310fbfc89!5m2!4m1!1i2!8m2!3d49.5339837!4d-124.7100764!9m1!1b1!16s%2Fg%2F1tg9mv36?entry=ttu&g_ep=EgoyMDI1MDExNS4wIKXMDSoASAFQAw%3D%3D"
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
