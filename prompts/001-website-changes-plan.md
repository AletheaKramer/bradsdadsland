<objective>
Create an implementation plan for updating the Bradsdadsland Family Campground website. The plan should detail every file change needed, organized by task, with specific line references and before/after content. Output the plan as a markdown file at `./PLAN.md`.
</objective>

<context>
This is a React + Vite website using Tailwind CSS and React Router DOM. Read `./CLAUDE.md` if it exists for project conventions.

Key files to examine before planning:
- `./src/components/ROFR.jsx` - Current ROFR program page (being replaced with RGPP content)
- `./src/components/VintageTrailers.jsx` - Vintage trailers page (remove "Two-night minimum" lines)
- `./src/components/Policies.jsx` - Current policies page (being replaced entirely)
- `./src/components/Nav.jsx` - Navigation links (ROFR → RGPP rename)
- `./src/components/Footer.jsx` - Footer links (ROFR references, "Bradsdadsland Campsite" → "Bradsdadsland Family Campground")
- `./src/components/ContactUs.jsx` - Contact component (check for "Bradsdadsland Campsite")
- `./src/AppContent.jsx` - Route definitions (route path change from /rofr to /rgpp)
- `./src/components/Gallery.jsx` - Gallery (ROFR image alt text)
</context>

<changes>

<change id="1" name="Rename ROFR to RGPP (Returning Guest Priority Program)">
Replace the entire ROFR program page content with the new RGPP content. Update all references site-wide.

New RGPP page content to use:

```
Returning Guest Priority Program (RGPP)

Bradsdadsland Family Campground has welcomed families since 1981, and many of our guests return year after year to enjoy the same site and the same summer traditions. The Returning Guest Priority Program (RGPP) is our way of recognizing that loyalty.

RGPP gives eligible returning guests priority access to rebook the same campsite and the same dates they used in previous seasons, before those sites are released to the public.

Eligibility

To qualify for the Returning Guest Priority Program, guests must meet all the following conditions:
- You must have stayed on the same campsite for the same calendar dates for at least two consecutive seasons.
- RGPP is site-specific and date specific. It applies only to the exact site and the exact date range previously used.
- The reservation must be for your personal use. RGPP privileges cannot be transferred to another person, family, or party.

How the Program Works

- Each year, eligible RGPP guests are given a priority on-line booking window.
- RGPP is site-specific and date specific. It applies only to the exact site and the exact date range previously used.
- RGPP is based on calendar dates, not days of the week.
  - Example: July 10-17 remains July 10-17, even if the days of the week change year to year.
- To keep RGPP status, you must use your reservation each year.
- Only registered RGPP member can use the reservation, it is non-transferable.

We look forward to welcoming you into our Returning Guest Priority Program here at Bradsdadsland Family Campground. A tradition, four decades in the making.

[Join the RGPP Group button/link]
```

Files affected:
- `./src/components/ROFR.jsx` → Rename file to `./src/components/RGPP.jsx`, replace all content with new RGPP text
- `./src/components/Nav.jsx` → Change "ROFR" link text to "RGPP", update `to="/rofr"` to `to="/rgpp"`
- `./src/components/Footer.jsx` → Change "Join our ROFR Program" to "Join our RGPP Program", update link path
- `./src/AppContent.jsx` → Update import from ROFR to RGPP, change route path from `/rofr` to `/rgpp`
- `./src/components/Policies.jsx` → Update ROFR section heading and text to reference RGPP instead
- `./src/components/Gallery.jsx` → Update ROFR alt text references
</change>

<change id="2" name="Remove Two-night minimum from Vintage Trailers">
In `./src/components/VintageTrailers.jsx`, remove the "• Two-night minimum" line from all four vintage trailer QUICK FACTS sections (lines ~92, ~132, ~175, ~205).
</change>

<change id="3" name="Update Aljo bed description">
In `./src/components/VintageTrailers.jsx`, in the Aljo 1954 (Site 14C) section, change all references to "a three-quarter bed" to "TWIN BED" (or "a twin bed" for natural reading).
</change>

<change id="4" name="Rename Bradsdadsland Campsite to Bradsdadsland Family Campground">
In `./src/components/Footer.jsx` (and any other files), change "Bradsdadsland Campsite" to "Bradsdadsland Family Campground".
</change>

<change id="5" name="Replace Policies page with new Terms & Conditions">
Replace the entire content of `./src/components/Policies.jsx` with the new Terms & Conditions content. The new content should be titled "Bradsdadsland Family Campground Terms & Conditions" and include these sections:

- Reservations
- Deposits & Payments (off-season: 1 night deposit, regular/peak: 2 nights; 1 night non-refundable)
- Services & Utilities (15 amp, 30 amp partial service, sewer dump fee with 3-night min, power meters 10 kWh/day, $0.30/kWh overage)
- Freezer Tote-Box Service ($2.00/night, $20 key deposit, max 2 boxes in peak)
- Check-In & Registration (valid credit card, full balance due before setup)
- Pets ($8.00/pet/day, max 3 pets, leash required, $100 fee for non-compliance)
- Quiet Hours (10 PM - 7 AM, no stereo music, $100 fee)
- Occupancy Limits (base: 2 adults + 2 children, max 8 per site)
- Cleaning & Site Condition (list of violations, cleaning fee)
- Damage to Property
- Limits of Responsibility
- Late Check-Out (one additional night charge)
- Generators & Noise Equipment (10-11 AM, 2-3 PM, 6-7 PM)
- Cancellation Policy (0-13 days: 2-night charge; 14+ days: 1-night charge; 14 days notice; email only; $15 admin fee; no-show by noon next day)
- Refund Policy (original payment method, credit card on file, email only, $15 fee, no partial cancellation refunds)
- Check-In & Check-Out Times (RV/Tent: 1 PM / 11 AM; Glamping/Vintage: 4 PM / 11 AM)

Keep the same page structure (banner image, Tailwind styling) but replace the policy content entirely.
</change>

</changes>

<output>
Create a detailed implementation plan at `./PLAN.md` with:

1. A summary of all changes
2. For each change: the exact files to modify, what to change (before/after snippets where helpful), and any new files to create
3. An ordered task list showing the recommended sequence of changes
4. Notes on any considerations (e.g., redirecting old /rofr URLs, updating the ROFR.jpg asset filename/alt text, SEO implications of renaming)

This is a PLAN ONLY - do not make any code changes. Output the plan as a markdown document.
</output>

<verification>
The plan should cover every instance found by searching for: "ROFR", "rofr", "Two-night minimum", "three-quarter bed", "Bradsdadsland Campsite" across all source files. Verify no references are missed.
</verification>
