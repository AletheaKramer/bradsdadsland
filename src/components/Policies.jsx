import React from "react";
import { Link } from "react-router-dom";
import policiesImage from "../assets/Policies.jpg";

const Policies = () => {
  return (
    <div className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto font-sans text-beigePrimary">
        <div className="mb-6">
          <img
            src={policiesImage}
            alt="Bradsdadsland Campground Policies"
            className="w-full max-h-96 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* Heading below the image */}
        <h2 className="text-4xl font-bold mb-6 text-beigeSecondary">
          Terms &amp; Conditions
        </h2>

        <div className="space-y-8 text-lg leading-relaxed">
          <p>
            We&apos;re delighted you&apos;re considering a stay at Bradsdadsland Family
            Campground. Our aim is to provide a clean, peaceful, and family-friendly
            place where guests can relax and enjoy the outdoors. These Terms &amp;
            Conditions help set clear expectations so everyone has a great experience.
          </p>
          <p>
            By making a reservation, you agree to comply with these Terms &amp;
            Conditions, all posted campground policies, and staff instructions.
          </p>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Reservations
            </h3>
            <p className="mt-2">
              Reservations are strongly recommended, particularly during the summer
              months, to ensure availability.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Deposits &amp; Payments
            </h3>
            <p className="mt-2">
              A deposit is required to confirm and guarantee all reservations.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                Off-Season: Deposit equals one night of the basic site rate per
                site booked.
              </li>
              <li>
                Regular &amp; Peak Seasons: Deposit equals two nights of the basic
                site rate per site booked.
              </li>
              <li>
                The portion of the deposit equal to one night&apos;s site fee is
                non-refundable.
              </li>
              <li>
                Deposits apply to the basic site rate only and do not include
                additional services.
              </li>
              <li>Services are charged as listed, whether used or not.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Services &amp; Utilities
            </h3>
            <p className="mt-2">
              Services are available on select sites. Please inquire for details.
            </p>
            <p className="mt-2">Available services may include:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>15-amp partial service + water (no sewer)</li>
              <li>30-amp partial service + water (no sewer)</li>
            </ul>
            <p className="mt-2">A sewer dump is available:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>For registered campers only</li>
              <li>For a fee</li>
              <li>With a minimum stay of three nights</li>
            </ul>
            <p className="mt-2">
              Sites equipped with power meters include 10 kWh per day. Usage beyond
              this allowance is billed at $0.30 per kWh.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Freezer Tote-Box Service
            </h3>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Freezer tote-boxes are available for $2.00 per night.</li>
              <li>A $20.00 key security deposit is required.</li>
              <li>
                During Peak Season, a maximum of two tote-boxes per site is
                permitted.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Check-In &amp; Registration
            </h3>
            <p className="mt-2">The first member of each party to arrive must:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Check in and register before setting up on the site</li>
              <li>Use a valid credit card</li>
            </ul>
            <p className="mt-2">
              The full balance for the entire stay is due prior to site setup.
            </p>
            <p className="mt-2">Guests are responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                Informing the campground of additional people, pets, or services
              </li>
              <li>
                Paying all applicable fees as listed at the time of booking through
                Campspot or otherwise communicated by the campground
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">Pets</h3>
            <p className="mt-2">
              Bradsdadsland is known as a clean, quiet, and pet-friendly
              campground, and we appreciate your help in keeping it that way.
            </p>
            <p className="mt-2">
              Pets are charged $8.00 per pet per day, up to three pets per site.
            </p>
            <p className="mt-2">All pets must:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Be leashed at all times, including within campsites</li>
              <li>Be cleaned up after promptly</li>
              <li>Not disturb other guests</li>
            </ul>
            <p className="mt-2">
              If pet-related issues arise and are not resolved when brought to your
              attention, we may ask that the pet be removed or that you leave the
              campground.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Quiet Hours
            </h3>
            <p className="mt-2">
              A peaceful, family-friendly atmosphere is part of what makes
              Bradsdadsland special.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Quiet hours are observed from 10:00 PM to 7:00 AM.</li>
              <li>Stereo music is not permitted at any time.</li>
            </ul>
            <p className="mt-2">
              If noise concerns are not corrected when requested, we may ask you to
              leave the campground.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Occupancy Limits
            </h3>
            <p className="mt-2">
              The base rate for RV and tent sites includes:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Two adults</li>
              <li>Two children</li>
            </ul>
            <p className="mt-2">Additional occupants are charged accordingly:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Regardless of age</li>
              <li>Up to a maximum of eight people per site</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Cleaning &amp; Site Condition
            </h3>
            <p className="mt-2">
              We take pride in maintaining a clean and well-cared-for campground,
              and we ask guests to do the same.
            </p>
            <p className="mt-2">Guests are expected to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Leave their site tidy upon departure</li>
              <li>Remove all garbage from the site</li>
              <li>Keep fire pits free of waste (firewood only)</li>
              <li>Use outhouses properly (toilet paper only)</li>
              <li>Keep recycling areas orderly</li>
            </ul>
            <p className="mt-2">
              Sites left in poor condition for campground guidelines may result in
              being charged a fee of $25, and repeated disregard may result in being
              asked not to return.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Damage to Property
            </h3>
            <p className="mt-2">
              Guests are responsible for any damage to campground property,
              facilities, or equipment.
            </p>
            <p className="mt-2">
              Damage charges may be applied based on the nature and extent of the
              damage.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Limits of Responsibility
            </h3>
            <p className="mt-2">
              Bradsdadsland Family Campground is an outdoor, shared-use environment.
            </p>
            <p className="mt-2">Guests are responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Their own safety</li>
              <li>The supervision of children and dependents</li>
              <li>The care of personal property at all times</li>
            </ul>
            <p className="mt-2">The campground is not responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Loss, theft, or damage to personal belongings</li>
              <li>Vehicles, trailers, or recreational equipment</li>
            </ul>
            <p className="mt-2">
              Campground facilities, amenities, and natural areas are used at the
              guest&apos;s own risk, as outdoor conditions may change due to weather,
              wildlife, terrain, or normal campground activity.
            </p>
            <p className="mt-2">
              Guests are expected to follow all posted rules, campground policies,
              and staff instructions.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Late Check-Out
            </h3>
            <p className="mt-2">
              If you need a little extra time, late check-out is available at $25
              per hour, subject to availability. We want every arriving guest to
              have a warm welcome and a smooth check-in, so sites need to be fully
              vacated in time for the next guests to come in. If we need to clear
              a site, move belongings, or move vehicles to prepare for incoming
              guests, an additional charge will apply.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Generators &amp; Noise-Producing Equipment
            </h3>
            <p className="mt-2">
              Generators and noisy air conditioners may be operated only during the
              following hours:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>10:00 AM - 11:00 AM</li>
              <li>2:00 PM - 3:00 PM</li>
              <li>6:00 PM - 7:00 PM</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Cancellation Policy
            </h3>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>0-13 days prior to arrival: Charged the equivalent of two nights</li>
              <li>
                14 days or more prior to arrival: Charged the equivalent of one
                night
              </li>
              <li>
                A minimum of 14 days&apos; notice is required to cancel, reschedule,
                or modify a reservation.
              </li>
              <li>
                Reservations may be changed or transferred to another available
                site and/or date within the same calendar year only.
              </li>
              <li>Prepayments are not transferable between years.</li>
              <li>All cancellation or change requests must:</li>
            </ul>
            <ul className="list-disc pl-12 mt-2 space-y-2">
              <li>Be submitted by email</li>
              <li>Include a $15 administration fee</li>
            </ul>
            <p className="mt-2">No cancellations or changes are accepted by phone.</p>
            <p className="mt-2">
              Failure to contact the campground or check in by 12:00 noon on the
              day following the scheduled arrival date will result in the
              reservation being treated as a no-show and automatically cancelled.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Refund Policy
            </h3>
            <p className="mt-2">
              If applicable, refunds are processed to the original form of payment,
              unless held as an account credit at the guest&apos;s request.
            </p>
            <p className="mt-2">
              A valid credit card must be on file for any refund to be processed.
            </p>
            <p className="mt-2">No refunds are issued for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Partial cancellations</li>
              <li>Early departures after arrival</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Check-In &amp; Check-Out Times
            </h3>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>RV &amp; Tent Sites: Check-in 1:00 PM / Check-out 11:00 AM</li>
              <li>
                Glamping &amp; Vintage Trailers: Check-in 4:00 PM / Check-out
                11:00 AM
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Returning Guest Priority Program (RGPP)
            </h3>
            <p className="mt-2">
              Guests returning annually on the same date and site may reserve up
              to one year in advance. RGPP reservations require compliance with
              the cancellation policy.
            </p>
            <p className="mt-2">
              <Link
                to="/rgpp"
                className="underline hover:text-beigeSecondary"
              >
                Learn more about the RGPP program.
              </Link>
            </p>
          </section>
        </div>

        {/* Ready to Book */}
        <h3 className="text-2xl font-semibold mt-10">Ready to book?</h3>
        <p className="text-lg mt-2">
          <strong>Online Booking:</strong>{" "}
          <a
            href="https://www.campspot.com/book/bradsdadsland"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-beigeSecondary"
          >
            The easiest way to secure your site.
          </a>
          <br />
          <strong>Contact:</strong>{" "}
          <a
            href="tel:+12506501310"
            className="underline hover:text-beigeSecondary"
          >
            250‑650‑1310
          </a>{" "}
          or{" "}
          <a
            href="mailto:contact@bradsdadsland.com"
            className="underline hover:text-beigeSecondary"
          >
            email us
          </a>{" "}
          or{" "}
          for inquiries.
          <br />
          We look forward to hosting you!
        </p>
      </div>
    </div>
  );
};

export default Policies;
