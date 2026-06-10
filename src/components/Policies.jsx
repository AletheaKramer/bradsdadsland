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
            We&apos;re delighted you&apos;re considering a stay with us. Our goal is to
            provide a clean, peaceful, and family-friendly place where guests can
            relax, connect with nature, and enjoy their time away. These Terms &amp;
            Conditions help set clear expectations so everyone can have a positive
            experience.
          </p>
          <p>
            By making a reservation, you agree to these Terms &amp; Conditions, any
            posted campground policies, and reasonable staff directions.
          </p>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Being Good Neighbours
            </h3>
            <p className="mt-2">
              One of the things that makes Bradsdadsland special is the friendly,
              respectful atmosphere created by our guests. We ask everyone to be
              considerate of fellow campers, staff, wildlife, and the natural
              environment throughout their stay.
            </p>
            <p className="mt-2">
              If a concern arises, we&apos;ll do our best to resolve it through a
              conversation. In rare situations where behaviour continues to
              negatively affect other guests or campground operations, we may ask a
              guest to leave the campground without refund.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Reservations
            </h3>
            <p className="mt-2">
              Reservations are strongly recommended, especially during the summer
              season, to ensure availability.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Deposits &amp; Payments
            </h3>
            <p className="mt-2">
              A one-night deposit is required to confirm and guarantee all
              reservations.
            </p>
            <p className="mt-2">
              The remaining balance for your stay is due upon arrival and prior to
              site setup. Guests are responsible for ensuring that all people, pets,
              and additional services are included on their reservation. Applicable
              fees will be charged according to rates listed at the time of booking
              or otherwise communicated by the campground.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Services &amp; Utilities
            </h3>
            <p className="mt-2">
              Services are available on select sites. Please inquire for
              availability.
            </p>
            <p className="mt-2">Available services may include:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>15-amp power and water (no sewer)</li>
              <li>30-amp power and water (no sewer)</li>
            </ul>
            <p className="mt-2">
              A sewer dump station is available for guests staying three nights or
              longer for a fee of $20.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Freezer Tote-Box Service
            </h3>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Freezer tote-boxes are available for $2 per night.</li>
              <li>
                A $20 key deposit is required and will be refunded upon return of
                the key.
              </li>
              <li>
                During peak season, a maximum of two tote-boxes per site is
                permitted.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Check-In &amp; Registration
            </h3>
            <p className="mt-2">
              To help us get you settled in smoothly, the first member of each
              party to arrive should check in before setting up on site.
            </p>
            <p className="mt-2">
              A valid credit card is required for registration.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">Pets</h3>
            <p className="mt-2">
              We are proud to be a pet-friendly campground and appreciate
              everyone&apos;s help in keeping the campground clean, safe, and enjoyable
              for all guests.
            </p>
            <p className="mt-2">
              Pet fee: $8 per pet, per stay (maximum three pets per site).
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                Pets must remain on a leash at all times, including within
                campsites.
              </li>
              <li>Please clean up after your pets promptly.</li>
              <li>Pets should not disturb other guests or wildlife.</li>
            </ul>
            <p className="mt-2">
              If a pet-related concern arises, we will do our best to work with you
              to resolve the situation. If the issue cannot be resolved, we may ask
              that the pet be removed from the campground or, in rare cases, ask
              the guest to leave.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Quiet Hours
            </h3>
            <p className="mt-2">
              One of the things guests appreciate most about Bradsdadsland is the
              peaceful atmosphere.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Quiet hours are observed from 10:00 PM to 7:00 AM.</li>
              <li>Stereo music is not permitted within the campground.</li>
              <li>
                We ask that children and families help keep noise to a minimum
                before 9:00 AM and after 8:00 PM out of consideration for fellow
                campers.
              </li>
            </ul>
            <p className="mt-2">
              If excessive noise continues after a reminder, guests may be asked to
              leave the campground without refund.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Occupancy
            </h3>
            <p className="mt-2">
              The base rate for RV and tent sites includes up to four guests.
            </p>
            <p className="mt-2">
              A maximum of eight guests are permitted per site. Additional guests
              are welcome at a rate of $8 per person, per night.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Site Care &amp; Cleanliness
            </h3>
            <p className="mt-2">
              We take pride in maintaining a clean and welcoming campground and ask
              guests to leave their site as they found it.
            </p>
            <p className="mt-2">Please:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Leave your site tidy upon departure.</li>
              <li>Remove all garbage from your campsite.</li>
              <li>Burn only firewood in fire pits.</li>
              <li>Use outhouses as intended (toilet paper only).</li>
              <li>Help keep recycling and common areas clean and organized.</li>
            </ul>
            <p className="mt-2">
              Sites requiring excessive cleanup may be subject to a $25 cleaning
              fee. Repeated disregard for campground guidelines may result in
              future reservations being declined.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Damage to Property
            </h3>
            <p className="mt-2">
              Guests are responsible for any damage caused to campground
              facilities, equipment, buildings, or grounds during their stay.
            </p>
            <p className="mt-2">
              Repair or replacement costs may be charged based on the nature and
              extent of the damage.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Late Check-Out
            </h3>
            <p className="mt-2">
              If you&apos;d like a little extra time on departure day, please check
              with us about late check-out availability.
            </p>
            <p className="mt-2">
              To ensure incoming guests can enjoy a smooth arrival, sites must be
              vacated by the designated check-out time unless prior arrangements
              have been made. Additional charges may apply if staff are required to
              clear or prepare a site after the scheduled departure time.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Generators &amp; Noise-Producing Equipment
            </h3>
            <p className="mt-2">
              To help maintain a peaceful environment for all guests, generators
              and noisy air-conditioning units may only be operated during the
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
              <li>
                Cancellations made more than 48 hours before arrival are subject to
                a $15 cancellation fee.
              </li>
              <li>
                Cancellations made within 48 hours of arrival will forfeit the
                one-night deposit.
              </li>
            </ul>
            <p className="mt-2">
              Reservations will be considered a no-show and automatically cancelled
              if we have not heard from you and you have not checked in by 12:00 PM
              on the day following your scheduled arrival date.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold text-beigeSecondary">
              Refund Policy
            </h3>
            <p className="mt-2">
              When applicable, refunds will be processed to the original method of
              payment unless the guest requests an account credit.
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
              Limits of Responsibility
            </h3>
            <p className="mt-2">
              Bradsdadsland Family Campground is an outdoor, shared-use
              environment.
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
            250-650-1310
          </a>{" "}
          with any questions.
          <br />
          We look forward to welcoming you to Bradsdadsland Family Campground.
        </p>
      </div>
    </div>
  );
};

export default Policies;
