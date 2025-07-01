import React from "react";
import AboutUsImage from "../assets/IsaacAndHeather.png";

const AboutUs = () => {
  return (
    <div className="bg-brownPrimary py-24 px-8">
      <div className="max-w-[1500px] mx-auto font-sans text-beigePrimary">
        <div className="mb-6">
          <img
            src={AboutUsImage}
            alt="Bradsdadsland Campground Founders"
            className="w-full max-h-96 object-cover rounded-lg shadow-lg"
          />
        </div>

        <h2 className="text-4xl font-bold mb-10 text-beigeSecondary">About Us</h2>
        <p className="text-lg mb-6 italic">
          The story of Bradsdadsland, as told by owner and founder Issac Kramer
        </p>

        {/* How we got named */}
        <h3 className="text-2xl font-semibold mt-8 mb-4">How we got named</h3>
        <p className="text-lg mb-4">
          In 1980 I was a young man in my very early 30’s, spending my summer weekends,
          after working five 10 hour days on the carpentry crew expanding the Mac Blo pulp mill
          in Campbell River, at the Pink House (but now no longer pink, it’s the property adjacent
          and just west of Carbrea Winery) on Hornby Island, partying with Dudes, Erin, Blair and
          anybody else who dropped in, long into the early hours.
        </p>
        <p className="text-lg mb-4">
          This one morning Blair Strachan and I went after one of these weekend drunks to the
          Thatch (Hornby Island Resort) for breakfast. On the way back, I stopped at what is now
          the campsite, to show Blair the property my father had just bought. The place was at
          that time a narrow lover’s lane winding through a cathedral of kissing alder branches
          above, with just a rare sea view in places, very thick bush pretty well everywhere else,
          wild and free.
        </p>
        <p className="text-lg mb-4">
          When we got back to the Pink House (so named because someone back then had the bright
          idea of repainting the original old farm house day glo pink), the rest of the party
          contingent were just rousing themselves, and somebody asked us where we had been.
          Blair then proceeded to relate our morning, and when he got to explaining how we had
          stopped to look at my dad’s new property, out of his mouth spilled his best try at
          describing the who and the what of it, Brad’s dad’s land.
        </p>
        <p className="text-lg mb-4">
          Everybody laughed, and I said out loud to no one in particular, if I ever need a name
          for the place, that’s what it’s going to be.
        </p>

        {/* How we got started */}
        <h3 className="text-2xl font-semibold mt-10 mb-4">How we got started</h3>
        <p className="text-lg mb-4">
          I was always one who needed to keep pretty busy, and what better way to do that then
          to clear five acres of brush thicker than the hair on a dog’s back, all by hand. Well,
          I am exaggerating a bit, I had the help of a chainsaw and a 1949 Ford 9N farm tractor.
          As far as I was concerned, this was the glorious hands on life. This was also at a time
          when the idea of going back to the land was still pretty popular.
        </p>
        <p className="text-lg mb-4">
          Not ever having much predilection for farming, I thought I would try my hand at making
          the place pretty enough for people to want to stay. The first year, we had all of ten
          guests the whole summer long. The second year, a few more. It was maybe in the fifth
          year, I went down to the Comox airport to pick up my father for his annual visit from
          Montreal, and after our dinner meal in the trailer (which is still there underneath the
          prettier shiplap and shingles of the office building), we walked along the front driveway
          up to the play-ground, past about twelve parties of very contented campers finishing
          their August long weekend dinner meals around their campfires. At the playground, my
          father turned to me, and he said, “you know, this might work”. I don’t know that I’d
          ever heard more heartwarming words.
        </p>

        {/* Who we are now */}
        <h3 className="text-2xl font-semibold mt-10 mb-4">Who we are now</h3>
        <p className="text-lg mb-4">
          Well wouldn’t you know it, I met my wife Heather at the campsite, camping. Now 25 years
          later, she still tolerates me, and there’s our children Zoe, Zephi, Alethea and Avrum
          as well. In summer, we live in the little varnished house by the front gate.
        </p>
        <p className="text-lg mb-4">
          It’s hard to take in, that I’ve been loving Bradsdadsland for some 45 years now. Sure
          it’s different than it was, more mature, more an everyday part of our lives. But it’s
          still as good as ever, still the highlight of the yearly rhythm of our family life.
        </p>
        <p className="text-lg mb-4">
          Welcome to Bradsdadsland. I hope it helps to round out your family life as much as it
          has helped to round out ours.
        </p>

        <p className="text-lg font-semibold mt-6">The Kramers, Roberta and João</p>
      </div>
    </div>
  );
};

export default AboutUs;
