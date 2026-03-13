import { Link } from "react-router-dom";
import rgppImage from "../assets/ROFR.jpg";

const RGPP = () => (
  <div className="bg-brownPrimary min-h-screen px-4 py-10 text-beigePrimary font-sans sm:px-8 sm:py-16 md:py-24">
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.28)] md:rounded-[2.25rem]">
        <img
          src={rgppImage}
          alt="Returning Guest Priority Program"
          className="h-48 w-full object-cover sm:h-64 md:h-80"
        />
      </div>

      <section className="rounded-[1.75rem] bg-[linear-gradient(180deg,_#5a4332_0%,_#473528_100%)] p-6 shadow-2xl sm:p-8 md:rounded-[2.25rem] md:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-beigeSecondary/75 sm:text-sm sm:tracking-[0.32em]">
          Returning Guest Priority Program (RGPP)
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-beigeSecondary sm:text-4xl md:text-5xl">
          Reserve your returning guest priority.
        </h2>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-beigePrimary/90 sm:text-lg">
          <p>
            Bradsdadsland Family Campground has welcomed families since 1981,
            and many of our guests return year after year to enjoy the same
            site and the same summer traditions. The Returning Guest Priority
            Program (RGPP) is our way of recognizing that loyalty.
          </p>

          <p>
            RGPP gives eligible returning guests priority access to rebook the
            same campsite and the same dates they used in previous seasons,
            before those sites are released to the public.
          </p>
        </div>

        <div className="mt-8">
          <Link
            to="/rgpp/apply"
            className="inline-flex items-center justify-center rounded-full bg-beigePrimary px-6 py-3.5 text-base font-medium text-brownPrimary transition hover:bg-beigeSecondary sm:px-7 sm:text-lg"
          >
            Sign Up
          </Link>
        </div>
      </section>

      <section
        id="eligibility"
        className="rounded-[1.75rem] bg-[linear-gradient(180deg,_#fff8f0_0%,_#f0e2d2_100%)] p-6 text-brownPrimary shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-8 md:rounded-[2.25rem] md:p-10"
      >
        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-semibold md:text-3xl">Eligibility</h3>
            <p className="mt-3 text-base leading-relaxed text-brownPrimary/78 sm:text-lg">
              To qualify for the Returning Guest Priority Program, guests must
              meet all the following conditions:
            </p>
            <ul className="mt-5 list-disc space-y-3 pl-6 text-base leading-relaxed sm:text-lg">
              <li>
                You must have stayed on the same campsite for the same calendar
                dates for at least two consecutive seasons.
              </li>
              <li>
                RGPP is site-specific and date specific. It applies only to the
                exact site and the exact date range previously used.
              </li>
              <li>
                The reservation must be for your personal use. RGPP privileges
                cannot be transferred to another person, family, or party.
              </li>
            </ul>
          </div>

          <div className="border-t border-brownPrimary/12 pt-8">
            <h3 className="text-2xl font-semibold md:text-3xl">
              How the Program Works
            </h3>
            <ul className="mt-5 list-disc space-y-3 pl-6 text-base leading-relaxed sm:text-lg">
              <li>
                Each year, eligible RGPP guests are given a priority online
                booking window.
              </li>
              <li>
                RGPP is site-specific and date specific. It applies only to the
                exact site and the exact date range previously used.
              </li>
              <li>
                RGPP is based on calendar dates, not days of the week.
                Example: July 10-17 remains July 10-17, even if the days of the
                week change year to year.
              </li>
              <li>
                To keep RGPP status, you must use your reservation each year.
              </li>
              <li>
                Only the registered RGPP member can use the reservation. It is
                non-transferable.
              </li>
            </ul>
          </div>

          <div className="border-t border-brownPrimary/12 pt-8">
            <Link
              to="/rgpp/apply"
              className="inline-flex items-center justify-center rounded-full bg-brownPrimary px-6 py-3.5 text-base font-medium text-beigePrimary transition hover:bg-[#4c392b] sm:text-lg"
            >
              Continue To Sign Up
            </Link>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export default RGPP;
