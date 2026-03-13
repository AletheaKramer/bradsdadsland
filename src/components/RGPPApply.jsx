import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import rgppImage from "../assets/ROFR.jpg";

const MIN_REQUIRED_STAYS = 2;
const DEFAULT_ROW_COUNT = MIN_REQUIRED_STAYS;
const MIN_SUBMIT_DELAY_MS = 4000;
const RESUBMIT_COOLDOWN_MS = 30000;
const SUBMIT_LOCK_KEY = "rgpp-last-submit-at";
const COUNTRY_OPTIONS = ["Canada", "United States", "Other"];
const PHONE_COUNTRY_CODES = [
  { value: "+1", label: "+1", countries: ["Canada", "United States"] },
  { value: "+44", label: "+44", countries: ["United Kingdom"] },
  { value: "+61", label: "+61", countries: ["Australia"] },
  { value: "+64", label: "+64", countries: ["New Zealand"] },
  { value: "+49", label: "+49", countries: ["Germany"] },
  { value: "+33", label: "+33", countries: ["France"] },
  { value: "+34", label: "+34", countries: ["Spain"] },
];

const CANADA_POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const US_ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/;
const NAME_REGEX = /^[A-Za-zÀ-ÿ' -]{2,50}$/;
const CITY_REGION_REGEX = /^[A-Za-zÀ-ÿ0-9.' -]{2,50}$/;
const SITE_REGEX = /^[A-Za-z0-9 -]{1,10}$/;
const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

const emptyReservation = () => ({
  site: "",
  fromDate: "",
  toDate: "",
});

const initialGuest = {
  addressLookup: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneCountryCode: "+1",
  phone: "",
  address: "",
  city: "",
  stateProvince: "",
  country: "Canada",
  postalCode: "",
  website: "",
};

const endpoint = import.meta.env.VITE_RGPP_INTAKE_ENDPOINT || "";
const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const mapsScriptId = "google-maps-places-script";
const MAPS_READY_TIMEOUT_MS = 10000;

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();
const formatPhoneInput = (value) => value.replace(/[^\d+()\-.\s]/g, "");
const digitsOnly = (value) => value.replace(/\D/g, "");

const normalizePostalCode = (country, value) => {
  const trimmed = normalizeWhitespace(value);
  return country === "Canada" ? trimmed.toUpperCase() : trimmed;
};

const waitForGoogleMapsReady = () =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (window.google?.maps?.importLibrary) {
        resolve(window.google);
        return;
      }

      if (Date.now() - startedAt >= MAPS_READY_TIMEOUT_MS) {
        reject(new Error("Google Maps Places library is unavailable."));
        return;
      }

      window.setTimeout(checkReady, 50);
    };

    checkReady();
  });

const loadGoogleMapsPlaces = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps can only load in the browser."));
      return;
    }

    if (window.google?.maps?.importLibrary) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(mapsScriptId);
    if (existingScript) {
      waitForGoogleMapsReady().then(resolve).catch(reject);
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google Maps failed to load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = mapsScriptId;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      mapsApiKey
    )}&libraries=places&loading=async`;
    script.onload = () => {
      waitForGoogleMapsReady().then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

const getRegionLabel = (country) =>
  country === "United States" ? "State" : "Province / State";

const getPostalLabel = (country) =>
  country === "United States" ? "ZIP Code" : "Postal Code / ZIP Code";

const getPostalPlaceholder = (country) => {
  if (country === "Canada") {
    return "A1A 1A1";
  }

  if (country === "United States") {
    return "12345";
  }

  return "Postal code";
};

const getCooldownRemaining = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  const lastSubmitAt = Number(window.localStorage.getItem(SUBMIT_LOCK_KEY) || "0");
  const remaining = lastSubmitAt + RESUBMIT_COOLDOWN_MS - Date.now();
  return remaining > 0 ? remaining : 0;
};

const validateName = (label, value) => {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return `Please enter your ${label.toLowerCase()}.`;
  }

  if (!NAME_REGEX.test(normalized)) {
    return `${label} can only include letters, spaces, apostrophes, and hyphens.`;
  }

  return "";
};

const validatePostalCode = (country, postalCode) => {
  const normalizedPostalCode = normalizePostalCode(country, postalCode);

  if (!normalizedPostalCode) {
    return "Please enter your postal code or ZIP code.";
  }

  if (country === "Canada" && !CANADA_POSTAL_CODE_REGEX.test(normalizedPostalCode)) {
    return "Please enter a valid Canadian postal code, for example A1A 1A1.";
  }

  if (country === "United States" && !US_ZIP_CODE_REGEX.test(normalizedPostalCode)) {
    return "Please enter a valid U.S. ZIP code, for example 12345 or 12345-6789.";
  }

  if (country === "Other" && normalizedPostalCode.length < 3) {
    return "Please enter a valid postal code.";
  }

  return "";
};

const validateGuest = (guest, regionLabel, requiresAddressSelection, hasSelectedAddress) => {
  const errors = {};
  const normalizedEmail = normalizeWhitespace(guest.email).toLowerCase();
  const phoneDigits = digitsOnly(guest.phone);
  const normalizedAddress = normalizeWhitespace(guest.address);
  const normalizedCity = normalizeWhitespace(guest.city);
  const normalizedRegion = normalizeWhitespace(guest.stateProvince);

  const firstNameError = validateName("First name", guest.firstName);
  if (firstNameError) {
    errors.firstName = firstNameError;
  }

  const lastNameError = validateName("Last name", guest.lastName);
  if (lastNameError) {
    errors.lastName = lastNameError;
  }

  if (!normalizedEmail) {
    errors.email = "Please enter your email address.";
  } else if (normalizedEmail.length > 254) {
    errors.email = "Please enter a shorter email address.";
  } else if (normalizedEmail.includes("..")) {
    errors.email = "Please enter a valid email address.";
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = "Please enter a valid email address.";
  } else {
    const [localPart = "", domainPart = ""] = normalizedEmail.split("@");
    const domainLabels = domainPart.split(".");

    if (
      localPart.length === 0 ||
      localPart.length > 64 ||
      domainPart.length > 253 ||
      domainLabels.some(
        (label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-")
      )
    ) {
      errors.email = "Please enter a valid email address.";
    }
  }

  if (!guest.phone.trim()) {
    errors.phone = "Please enter your phone number.";
  } else if (guest.phoneCountryCode === "+1") {
    if (phoneDigits.length !== 10) {
      errors.phone = "Please enter a 10-digit phone number, including area code.";
    }
  } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Please enter a valid international phone number.";
  }

  if (requiresAddressSelection && !hasSelectedAddress) {
    errors.addressLookup = "Select an address from the autocomplete list.";
    return errors;
  }

  if (!normalizedAddress) {
    errors.address = "Please enter your street address.";
  } else if (normalizedAddress.length < 6 || normalizedAddress.length > 120) {
    errors.address = "Please enter a complete street address.";
  }

  if (!normalizedCity) {
    errors.city = "Please enter your city.";
  } else if (!CITY_REGION_REGEX.test(normalizedCity)) {
    errors.city = "Please enter a valid city.";
  }

  if (!guest.country.trim()) {
    errors.country = "Please select your country.";
  }

  if (!normalizedRegion) {
    errors.stateProvince = `Please enter your ${regionLabel.toLowerCase()}.`;
  } else if (!CITY_REGION_REGEX.test(normalizedRegion)) {
    errors.stateProvince = `Please enter a valid ${regionLabel.toLowerCase()}.`;
  }

  const postalCodeError = validatePostalCode(guest.country, guest.postalCode);
  if (postalCodeError) {
    errors.postalCode = postalCodeError;
  }

  return errors;
};

const validateReservations = (reservations) => {
  const errors = {};
  const completedReservations = [];
  const today = new Date().toISOString().slice(0, 10);

  reservations.forEach((reservation, index) => {
    const normalizedSite = normalizeWhitespace(reservation.site);
    const fromDate = reservation.fromDate.trim();
    const toDate = reservation.toDate.trim();
    const fields = [normalizedSite, fromDate, toDate];
    const filledCount = fields.filter(Boolean).length;

    if (filledCount === 0) {
      return;
    }

    if (filledCount < 3) {
      errors[index] = `Complete Site, From, and To for reservation row ${index + 1}.`;
      return;
    }

    if (!SITE_REGEX.test(normalizedSite)) {
      errors[index] = `Use a valid site number or code in reservation row ${index + 1}.`;
      return;
    }

    if (fromDate > toDate) {
      errors[index] = `The From date must be before the To date in reservation row ${
        index + 1
      }.`;
      return;
    }

    if (toDate > today) {
      errors[index] = `Reservation row ${index + 1} must describe a past stay.`;
      return;
    }

    completedReservations.push({
      site: normalizedSite,
      fromDate,
      toDate,
    });
  });

  if (completedReservations.length < MIN_REQUIRED_STAYS) {
    errors.general = `Add ${MIN_REQUIRED_STAYS} complete past stays to confirm eligibility.`;
  } else {
    const sortedReservations = [...completedReservations].sort((a, b) =>
      a.fromDate.localeCompare(b.fromDate)
    );

    const hasEligiblePair = sortedReservations.some((reservation, index) => {
      return sortedReservations.slice(index + 1).some((candidate) => {
        if (reservation.site !== candidate.site) {
          return false;
        }

        const [reservationFromYear, reservationFromMonth, reservationFromDay] =
          reservation.fromDate.split("-").map(Number);
        const [reservationToYear, reservationToMonth, reservationToDay] =
          reservation.toDate.split("-").map(Number);
        const [candidateFromYear, candidateFromMonth, candidateFromDay] =
          candidate.fromDate.split("-").map(Number);
        const [candidateToYear, candidateToMonth, candidateToDay] =
          candidate.toDate.split("-").map(Number);

        const sameFromMonthDay =
          reservationFromMonth === candidateFromMonth &&
          reservationFromDay === candidateFromDay;
        const sameToMonthDay =
          reservationToMonth === candidateToMonth &&
          reservationToDay === candidateToDay;
        const consecutiveYears =
          Math.abs(reservationFromYear - candidateFromYear) === 1 &&
          Math.abs(reservationToYear - candidateToYear) === 1;

        return sameFromMonthDay && sameToMonthDay && consecutiveYears;
      });
    });

    if (!hasEligiblePair) {
      errors.general =
        "Add two past stays on the same site for the same date range in consecutive years.";
    }
  }

  return { errors, completedReservations };
};

const fieldClassName =
  "w-full rounded-xl border border-brownPrimary/12 bg-white/92 px-4 py-3 text-base outline-none transition focus:border-brownPrimary/60 focus:ring-2 focus:ring-brownPrimary/10 md:rounded-[1.15rem]";

const RGPPApply = () => {
  const [guest, setGuest] = useState(initialGuest);
  const [reservations, setReservations] = useState(
    Array.from({ length: DEFAULT_ROW_COUNT }, emptyReservation)
  );
  const [guestErrors, setGuestErrors] = useState({});
  const [reservationErrors, setReservationErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const [formStartedAt] = useState(() => Date.now());
  const addressLookupInputRef = useRef(null);

  const hasEndpoint = useMemo(() => endpoint.trim().length > 0, []);
  const hasMapsApiKey = useMemo(() => mapsApiKey.trim().length > 0, []);
  const regionLabel = getRegionLabel(guest.country);
  const postalLabel = getPostalLabel(guest.country);
  const postalPlaceholder = getPostalPlaceholder(guest.country);
  const emailPattern = "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+";
  const canUseAddressAutocomplete = hasMapsApiKey && !mapsError;
  const showManualAddressFields = hasSelectedAddress || !canUseAddressAutocomplete;

  const handleGuestChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? formatPhoneInput(value) : value;

    if (name === "addressLookup") {
      if (canUseAddressAutocomplete) {
        setHasSelectedAddress(false);
      }
      setGuest((current) => ({
        ...current,
        addressLookup: nextValue,
        ...(canUseAddressAutocomplete
          ? {
              address: "",
              city: "",
              stateProvince: "",
              postalCode: "",
            }
          : {}),
      }));
      setGuestErrors((current) => ({
        ...current,
        addressLookup: "",
        ...(canUseAddressAutocomplete
          ? {
              address: "",
              city: "",
              stateProvince: "",
              postalCode: "",
            }
          : {}),
      }));
      setSubmitError("");
      return;
    }

    setGuest((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === "country" && (value === "Canada" || value === "United States")
        ? { phoneCountryCode: "+1" }
        : {}),
    }));

    setGuestErrors((current) => ({
      ...current,
      [name]: "",
    }));
    setSubmitError("");
  };

  const handleReservationChange = (index, field, value) => {
    setReservations((current) =>
      current.map((reservation, reservationIndex) =>
        reservationIndex === index
          ? { ...reservation, [field]: value }
          : reservation
      )
    );

    setReservationErrors((current) => ({
      ...current,
      [index]: "",
      general: "",
    }));
    setSubmitError("");
  };

  const addReservationRow = () => {
    setReservations((current) => [...current, emptyReservation()]);
  };

  useEffect(() => {
    if (!hasMapsApiKey || !addressLookupInputRef.current) {
      if (!hasMapsApiKey) {
        setMapsError(
          "Google address lookup is unavailable right now. Enter your address manually below."
        );
      }
      return undefined;
    }

    let autocompleteListener;
    let isCancelled = false;

    loadGoogleMapsPlaces()
      .then(async (googleMaps) => {
        if (isCancelled || !addressLookupInputRef.current) {
          return;
        }

        if (!googleMaps?.maps?.importLibrary) {
          throw new Error("Google Maps Places library is unavailable.");
        }

        const placesLibrary = await googleMaps.maps.importLibrary("places");
        const { Autocomplete } = placesLibrary;

        if (
          isCancelled ||
          !addressLookupInputRef.current ||
          typeof Autocomplete !== "function"
        ) {
          throw new Error("Google address lookup is unavailable right now. Enter your address manually below.");
        }

        setMapsError("");

        const autocomplete = new Autocomplete(addressLookupInputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
          componentRestrictions:
            guest.country === "Canada"
              ? { country: ["ca"] }
              : guest.country === "United States"
                ? { country: ["us"] }
                : { country: ["ca", "us"] },
        });

        autocompleteListener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const components = place.address_components || [];
          let streetNumber = "";
          let route = "";
          let locality = "";
          let region = "";
          let postalCode = "";
          let country = guest.country;

          components.forEach((component) => {
            const type = component.types[0];

            if (type === "street_number") {
              streetNumber = component.long_name || "";
            }

            if (type === "route") {
              route = component.long_name || "";
            }

            if (type === "locality" || type === "postal_town" || type === "sublocality_level_1") {
              locality = locality || component.long_name || "";
            }

            if (type === "administrative_area_level_1") {
              region = component.short_name || component.long_name || "";
            }

            if (type === "postal_code") {
              postalCode = component.long_name || "";
            }

            if (type === "country") {
              country =
                component.short_name === "US"
                  ? "United States"
                  : component.short_name === "CA"
                    ? "Canada"
                    : component.long_name || country;
            }
          });

          setGuest((current) => ({
            ...current,
            addressLookup: place.formatted_address || "",
            address: [streetNumber, route].filter(Boolean).join(" ").trim() || current.address,
            city: locality || current.city,
            stateProvince: region || current.stateProvince,
            country,
            postalCode: normalizePostalCode(country, postalCode || current.postalCode),
          }));
          setHasSelectedAddress(true);
          setGuestErrors((current) => ({
            ...current,
            address: "",
            city: "",
            stateProvince: "",
            country: "",
            postalCode: "",
          }));
          setMapsError("");
        });
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error("RGPP address autocomplete failed to initialize.", error);
          setMapsError(
            error instanceof Error && error.message
              ? error.message
              : "Google address lookup is unavailable right now. Enter your address manually below."
          );
        }
      });

    return () => {
      isCancelled = true;
      if (autocompleteListener) {
        autocompleteListener.remove();
      }
    };
  }, [guest.country, hasMapsApiKey]);

  const validate = () => {
    const nextGuestErrors = validateGuest(
      guest,
      regionLabel,
      canUseAddressAutocomplete,
      hasSelectedAddress
    );
    const {
      errors: nextReservationErrors,
      completedReservations,
    } = validateReservations(reservations);

    setGuestErrors(nextGuestErrors);
    setReservationErrors(nextReservationErrors);

    return {
      isValid:
        Object.keys(nextGuestErrors).length === 0 &&
        Object.keys(nextReservationErrors).length === 0,
      completedReservations,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const cooldownRemaining = getCooldownRemaining();
    if (cooldownRemaining > 0) {
      setSubmitError("Please wait a few seconds before submitting again.");
      return;
    }

    if (Date.now() - formStartedAt < MIN_SUBMIT_DELAY_MS) {
      setSubmitError("Please review the form and try again.");
      return;
    }

    if (guest.website.trim()) {
      setSubmitError("We couldn’t submit your request. Please refresh and try again.");
      return;
    }

    const { isValid, completedReservations } = validate();
    if (!isValid) {
      return;
    }

    if (!hasEndpoint) {
      setSubmitError(
        "The RGPP intake form is not connected yet. Please add the intake endpoint before submitting."
      );
      return;
    }

    const payload = {
      submittedAt: new Date().toISOString(),
      source: "bradsdadsland-rgpp-apply-page",
      formStartedAt: new Date(formStartedAt).toISOString(),
      guest: {
        firstName: normalizeWhitespace(guest.firstName),
        lastName: normalizeWhitespace(guest.lastName),
        email: normalizeWhitespace(guest.email).toLowerCase(),
        phone: `${guest.phoneCountryCode} ${normalizeWhitespace(guest.phone)}`.trim(),
        address: normalizeWhitespace(guest.address),
        city: normalizeWhitespace(guest.city),
        stateProvince: normalizeWhitespace(guest.stateProvince),
        country: normalizeWhitespace(guest.country),
        postalCode: normalizePostalCode(guest.country, guest.postalCode),
      },
      reservations: completedReservations,
    };

    try {
      setIsSubmitting(true);

      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SUBMIT_LOCK_KEY, String(Date.now()));
      }

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn’t submit your sign-up right now. Please try again or contact us directly at contact@bradsdadsland.com."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#654d3a_0%,_#4a382a_42%,_#2f241c_100%)] px-4 py-10 font-sans text-beigePrimary sm:px-6 md:px-8 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 shadow-[0_22px_60px_rgba(0,0,0,0.22)] md:rounded-[2rem]">
          <img
            src={rgppImage}
            alt="Returning Guest Priority Program sign up"
            className="h-32 w-full object-cover sm:h-40 md:h-56"
          />
        </div>

        {isSubmitted ? (
          <section className="mt-6 rounded-[1.75rem] bg-[linear-gradient(180deg,_#fff8f0_0%,_#f2e6d7_100%)] p-6 text-brownPrimary shadow-[0_28px_80px_rgba(0,0,0,0.24)] sm:mt-8 md:rounded-[2.25rem] md:p-10">
            <div className="inline-flex rounded-full border border-brownPrimary/15 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brownPrimary/65">
              Submission Received
            </div>
            <h2 className="mt-5 text-2xl font-semibold sm:text-3xl md:text-4xl">
              RGPP request received.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brownPrimary/80">
              We have your application and reservation history. Our team will review it
              and follow up by email.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/rgpp"
                className="inline-flex items-center justify-center rounded-full bg-brownPrimary px-6 py-3 text-base font-medium text-beigePrimary transition hover:bg-[#4c392b]"
              >
                Back to RGPP details
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-brownPrimary/20 px-6 py-3 text-base font-medium text-brownPrimary transition hover:bg-brownPrimary/5"
              >
                Back to homepage
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,_#fff8f0_0%,_#f5ebde_100%)] text-brownPrimary shadow-[0_22px_60px_rgba(0,0,0,0.2)] sm:mt-8 md:rounded-[2rem]">
            <div className="px-5 py-6 sm:px-8 md:px-10 md:py-8">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-brownPrimary/50 sm:text-xs">
                  RGPP Application
                </p>
                <h1 className="mt-2 max-w-3xl text-[1.9rem] font-semibold leading-tight sm:text-3xl md:text-4xl">
                  Sign up form
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-brownPrimary/75">
                  Enter the guest details and the two past stays that establish
                  eligibility for review.
                </p>
              </div>
            </div>

            <div className="px-4 pb-5 sm:px-8 sm:pb-8 md:px-10 md:pb-10">
              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <div className="rounded-[1.15rem] border border-brownPrimary/10 bg-white/55 p-4 sm:p-5 md:rounded-[1.4rem] md:p-6">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold">Guest information</h2>
                    <p className="mt-1 text-sm leading-relaxed text-brownPrimary/68 sm:text-base">
                      Use the primary guest who should receive follow-up.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium" htmlFor="firstName">
                          First name
                        </label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          maxLength={50}
                          value={guest.firstName}
                          onChange={handleGuestChange}
                          aria-invalid={Boolean(guestErrors.firstName)}
                          className={fieldClassName}
                        />
                        {guestErrors.firstName && (
                          <p className="mt-2 text-sm text-red-700">{guestErrors.firstName}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium" htmlFor="lastName">
                          Last name
                        </label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          maxLength={50}
                          value={guest.lastName}
                          onChange={handleGuestChange}
                          aria-invalid={Boolean(guestErrors.lastName)}
                          className={fieldClassName}
                        />
                        {guestErrors.lastName && (
                          <p className="mt-2 text-sm text-red-700">{guestErrors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium" htmlFor="email">
                          Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          maxLength={254}
                          inputMode="email"
                          pattern={emailPattern}
                          title="Enter a valid email address"
                          value={guest.email}
                          onChange={handleGuestChange}
                          aria-invalid={Boolean(guestErrors.email)}
                          className={fieldClassName}
                        />
                        {guestErrors.email && (
                          <p className="mt-2 text-sm text-red-700">{guestErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium" htmlFor="phone">
                          Phone
                        </label>
                        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                          <select
                            id="phoneCountryCode"
                            name="phoneCountryCode"
                            value={guest.phoneCountryCode}
                            onChange={handleGuestChange}
                            className={fieldClassName}
                            aria-label="Phone country code"
                          >
                            {PHONE_COUNTRY_CODES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            {!PHONE_COUNTRY_CODES.some(
                              (option) => option.value === guest.phoneCountryCode
                            ) && (
                              <option value={guest.phoneCountryCode}>{guest.phoneCountryCode}</option>
                            )}
                          </select>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            autoComplete="tel-national"
                            maxLength={25}
                            inputMode="tel"
                            placeholder={guest.phoneCountryCode === "+1" ? "(250) 555-1234" : "Phone number"}
                            value={guest.phone}
                            onChange={handleGuestChange}
                            aria-invalid={Boolean(guestErrors.phone)}
                            className={fieldClassName}
                          />
                        </div>
                        {guestErrors.phone && (
                          <p className="mt-2 text-sm text-red-700">{guestErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    {canUseAddressAutocomplete && (
                      <div>
                        <label className="mb-2 block text-sm font-medium" htmlFor="addressLookup">
                          Address
                        </label>
                        <input
                          id="addressLookup"
                          name="addressLookup"
                          type="text"
                          ref={addressLookupInputRef}
                          autoComplete="street-address"
                          maxLength={160}
                          placeholder="Start typing your address"
                          value={guest.addressLookup}
                          onChange={handleGuestChange}
                          aria-invalid={Boolean(guestErrors.addressLookup)}
                          className={fieldClassName}
                        />
                        <div className="mt-2">
                          <p className="text-sm text-brownPrimary/58">
                            Select your address from the autocomplete list to continue.
                          </p>
                        </div>
                        {guestErrors.addressLookup && (
                          <p className="mt-2 text-sm text-red-700">{guestErrors.addressLookup}</p>
                        )}
                      </div>
                    )}

                    {showManualAddressFields && (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-medium" htmlFor="address">
                            Street address
                          </label>
                          <input
                            id="address"
                            name="address"
                            type="text"
                            autoComplete="street-address"
                            maxLength={120}
                            value={guest.address}
                            onChange={handleGuestChange}
                            aria-invalid={Boolean(guestErrors.address)}
                            className={fieldClassName}
                          />
                          {guestErrors.address && (
                            <p className="mt-2 text-sm text-red-700">{guestErrors.address}</p>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor="city">
                              City
                            </label>
                            <input
                              id="city"
                              name="city"
                              type="text"
                              autoComplete="address-level2"
                              maxLength={50}
                              value={guest.city}
                              onChange={handleGuestChange}
                              aria-invalid={Boolean(guestErrors.city)}
                              className={fieldClassName}
                            />
                            {guestErrors.city && (
                              <p className="mt-2 text-sm text-red-700">{guestErrors.city}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor="country">
                              Country
                            </label>
                            <select
                              id="country"
                              name="country"
                              autoComplete="country-name"
                              value={guest.country}
                              onChange={handleGuestChange}
                              aria-invalid={Boolean(guestErrors.country)}
                              className={fieldClassName}
                            >
                              {COUNTRY_OPTIONS.map((country) => (
                                <option key={country} value={country}>
                                  {country}
                                </option>
                              ))}
                            </select>
                            {guestErrors.country && (
                              <p className="mt-2 text-sm text-red-700">{guestErrors.country}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor="stateProvince">
                              {regionLabel}
                            </label>
                            <input
                              id="stateProvince"
                              name="stateProvince"
                              type="text"
                              autoComplete="address-level1"
                              maxLength={50}
                              value={guest.stateProvince}
                              onChange={handleGuestChange}
                              aria-invalid={Boolean(guestErrors.stateProvince)}
                              className={fieldClassName}
                            />
                            {guestErrors.stateProvince && (
                              <p className="mt-2 text-sm text-red-700">{guestErrors.stateProvince}</p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor="postalCode">
                              {postalLabel}
                            </label>
                            <input
                              id="postalCode"
                              name="postalCode"
                              type="text"
                              autoComplete="postal-code"
                              maxLength={12}
                              placeholder={postalPlaceholder}
                              value={guest.postalCode}
                              onChange={handleGuestChange}
                              aria-invalid={Boolean(guestErrors.postalCode)}
                              className={`${fieldClassName} uppercase`}
                            />
                            {guestErrors.postalCode && (
                              <p className="mt-2 text-sm text-red-700">{guestErrors.postalCode}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={guest.website}
                        onChange={handleGuestChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-brownPrimary/10 bg-[#f6ede1] p-4 sm:p-5 md:rounded-[1.4rem] md:p-6">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">Reservation history</h2>
                      <p className="mt-1 text-sm leading-relaxed text-brownPrimary/68 sm:text-base">
                        Add two prior stays on the same site for the same date range in
                        consecutive years.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addReservationRow}
                      className="w-full shrink-0 rounded-full border border-brownPrimary/70 bg-white px-5 py-3 text-sm font-medium transition hover:bg-brownPrimary hover:text-beigePrimary sm:w-auto"
                    >
                      Add stay
                    </button>
                  </div>

                  {reservationErrors.general && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                      {reservationErrors.general}
                    </div>
                  )}

                  <div className="space-y-4">
                    {reservations.map((reservation, index) => (
                      <div
                        key={`reservation-${index}`}
                        className="rounded-[1rem] border border-brownPrimary/10 bg-white/94 px-4 py-4 sm:px-5 md:rounded-[1.2rem]"
                      >
                        <div className="mb-3 inline-flex rounded-full bg-[#efe2d1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brownPrimary/60">
                          Stay {index + 1}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor={`site-${index}`}>
                              Site
                            </label>
                            <input
                              id={`site-${index}`}
                              type="text"
                              maxLength={10}
                              value={reservation.site}
                              onChange={(event) =>
                                handleReservationChange(index, "site", event.target.value)
                              }
                              aria-invalid={Boolean(reservationErrors[index])}
                              className={fieldClassName}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor={`fromDate-${index}`}>
                              From
                            </label>
                            <input
                              id={`fromDate-${index}`}
                              type="date"
                              value={reservation.fromDate}
                              onChange={(event) =>
                                handleReservationChange(index, "fromDate", event.target.value)
                              }
                              aria-invalid={Boolean(reservationErrors[index])}
                              className={fieldClassName}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium" htmlFor={`toDate-${index}`}>
                              To
                            </label>
                            <input
                              id={`toDate-${index}`}
                              type="date"
                              value={reservation.toDate}
                              onChange={(event) =>
                                handleReservationChange(index, "toDate", event.target.value)
                              }
                              aria-invalid={Boolean(reservationErrors[index])}
                              className={fieldClassName}
                            />
                          </div>
                        </div>

                        {reservationErrors[index] && (
                          <p className="mt-3 text-sm text-red-700">{reservationErrors[index]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {!hasEndpoint && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    This form is ready in the site, but it still needs the Google Apps
                    Script endpoint configured in `VITE_RGPP_INTAKE_ENDPOINT`.
                  </div>
                )}

                {submitError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    {submitError}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-4 border-t border-brownPrimary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    to="/rgpp"
                    className="text-sm font-medium text-brownPrimary/70 transition hover:text-brownPrimary"
                  >
                    Back to RGPP details
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center rounded-full bg-brownPrimary px-7 py-3.5 text-base font-medium text-beigePrimary shadow-[0_10px_24px_rgba(91,67,50,0.22)] transition hover:bg-[#4c392b] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    {isSubmitting ? "Submitting..." : "Submit RGPP Request"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default RGPPApply;
