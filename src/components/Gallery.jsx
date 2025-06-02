import React from "react";
import LightboxGallery from "./LightboxGallery";
import CapeCode1 from "../assets/CapeCode1.jpg";
import CapeCode2 from "../assets/CapeCode2.jpg";
import CapeCode3 from "../assets/CapeCode3.jpg";
import FFF1 from "../assets/FFF1.jpg";
import FFF2 from "../assets/FFF2.jpg";
import FFF3 from "../assets/FFF3.jpg";
import Facilities1 from "../assets/Facilities1.jpg";
import Facilities2 from "../assets/Facilities2.jpg";
import Facilities3 from "../assets/Facilities3.jpg";
import Facilities4 from "../assets/Facilities4.jpg";
import Laundry1 from "../assets/Laundry1.jpg";
import Laundry2 from "../assets/Laundry2.jpg";
import Ocean1 from "../assets/Ocean1.jpg";
import Ocean2 from "../assets/Ocean2.jpg";
import Ocean3 from "../assets/Ocean3.jpg";
import Ocean4 from "../assets/Ocean4.jpg";
import Ocean5 from "../assets/Ocean5.jpg";
import Ocean6 from "../assets/Ocean6.jpg";
import Office1 from "../assets/Office1.jpg";
import Office2 from "../assets/Office2.jpg";
import Office3 from "../assets/Office3.jpg";
import Office4 from "../assets/Office4.jpg";
import Outhouse1 from "../assets/Outhouse1.jpg";
import Outhouse2 from "../assets/Outhouse2.jpg";
import Outhouse3 from "../assets/Outhouse3.jpg";
import Outhouse4 from "../assets/Outhouse4.jpg";
import PoliciesImg from "../assets/Policies.jpg";
import ROFRImg from "../assets/ROFR.jpg";
import Recycling1 from "../assets/Recycling1.jpg";
import Recycling2 from "../assets/Recycling2.jpg";
import Recycling3 from "../assets/Recycling3.jpg";

/* master list wrapped with alt text */
const images = [
  { src: CapeCode1, alt: "Gallery – Cape Code 1" },
  { src: CapeCode2, alt: "Gallery – Cape Code 2" },
  { src: CapeCode3, alt: "Gallery – Cape Code 3" },
  { src: FFF1, alt: "Gallery – FFF 1" },
  { src: FFF2, alt: "Gallery – FFF 2" },
  { src: FFF3, alt: "Gallery – FFF 3" },
  { src: Facilities1, alt: "Gallery – Facilities 1" },
  { src: Facilities2, alt: "Gallery – Facilities 2" },
  { src: Facilities3, alt: "Gallery – Facilities 3" },
  { src: Facilities4, alt: "Gallery – Facilities 4" },
  { src: Laundry1, alt: "Gallery – Laundry 1" },
  { src: Laundry2, alt: "Gallery – Laundry 2" },
  { src: Ocean1, alt: "Gallery – Ocean 1" },
  { src: Ocean2, alt: "Gallery – Ocean 2" },
  { src: Ocean3, alt: "Gallery – Ocean 3" },
  { src: Ocean4, alt: "Gallery – Ocean 4" },
  { src: Ocean5, alt: "Gallery – Ocean 5" },
  { src: Ocean6, alt: "Gallery – Ocean 6" },
  { src: Office1, alt: "Gallery – Office 1" },
  { src: Office2, alt: "Gallery – Office 2" },
  { src: Office3, alt: "Gallery – Office 3" },
  { src: Office4, alt: "Gallery – Office 4" },
  { src: Outhouse1, alt: "Gallery – Outhouse 1" },
  { src: Outhouse2, alt: "Gallery – Outhouse 2" },
  { src: Outhouse3, alt: "Gallery – Outhouse 3" },
  { src: Outhouse4, alt: "Gallery – Outhouse 4" },
  { src: PoliciesImg, alt: "Gallery – Policies" },
  { src: ROFRImg, alt: "Gallery – ROFR" },
  { src: Recycling1, alt: "Gallery – Recycling 1" },
  { src: Recycling2, alt: "Gallery – Recycling 2" },
  { src: Recycling3, alt: "Gallery – Recycling 3" },
];

export default function GalleryPage() {
  return (
    <div className="bg-brownPrimary p-8 max-w-[1500px] mx-auto">
      <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">Gallery</h2>
      <LightboxGallery images={images} />
    </div>
  );
}
