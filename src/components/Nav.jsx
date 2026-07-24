import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navigationItems = [
  { type: "internal", label: "Home", to: "/" },
  {
    type: "internal",
    label: "Vintage Trailers",
    to: "/vintage-trailers",
  },
  {
    type: "group",
    id: "explore",
    label: "Explore",
    items: [
      { label: "Amenities & Facilities", to: "/amenities" },
      { label: "Photo Gallery", to: "/gallery" },
      { label: "Campground Policies", to: "/policies" },
    ],
  },
  {
    type: "group",
    id: "about",
    label: "About",
    items: [
      { label: "Our Story", to: "/about-us" },
      { label: "Contact Us", to: "/contact-us" },
    ],
  },
  {
    type: "external",
    label: "Beachcomber RV Park",
    href:
      "https://beachcomberrv.com?utm_source=bradsdadsland.com&utm_medium=referral",
  },
];

const desktopLinkClasses = (isActive) =>
  `block whitespace-nowrap border-b-2 px-1 py-2 text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary focus-visible:ring-offset-4 focus-visible:ring-offset-beigePrimary 2xl:text-lg ${
    isActive
      ? "border-brownPrimary"
      : "border-transparent hover:border-beigeSecondary"
  }`;

const mobileLinkClasses = (isActive) =>
  `block rounded-xl px-4 py-3 text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary ${
    isActive
      ? "bg-brownPrimary text-beigePrimary"
      : "hover:bg-peach/45"
  }`;

const Chevron = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 20 20"
  >
    <path
      d="m5 7.5 5 5 5-5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const ExternalArrow = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 20 20"
  >
    <path
      d="M7 5h8v8M15 5 5 15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const Nav = () => {
  const location = useLocation();
  const navRef = useRef(null);
  const mobileButtonRef = useRef(null);
  const desktopGroupButtonRefs = useRef({});

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState(null);
  const [openMobileGroup, setOpenMobileGroup] = useState(null);

  const isPathActive = (path) => location.pathname === path;
  const isGroupActive = (group) =>
    group.items.some(({ to }) => isPathActive(to));

  useEffect(() => {
    setIsMobileOpen(false);
    setOpenMobileGroup(null);
    setOpenDesktopGroup(null);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileOpen(false);
        setOpenMobileGroup(null);
        setOpenDesktopGroup(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;

      if (openDesktopGroup) {
        const groupToFocus = openDesktopGroup;
        setOpenDesktopGroup(null);
        desktopGroupButtonRefs.current[groupToFocus]?.focus();
        return;
      }

      if (isMobileOpen) {
        setIsMobileOpen(false);
        setOpenMobileGroup(null);
        mobileButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobileOpen, openDesktopGroup]);

  const openGroupFromKeyboard = (groupId) => {
    setOpenDesktopGroup(groupId);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`desktop-${groupId}-menu`)
        ?.querySelector("a")
        ?.focus();
    });
  };

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className="relative z-40 mb-8 flex justify-end"
    >
      <button
        ref={mobileButtonRef}
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-brownPrimary text-brownPrimary transition hover:bg-brownPrimary hover:text-beigePrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary focus-visible:ring-offset-4 focus-visible:ring-offset-beigePrimary xl:hidden"
        aria-controls="mobile-navigation"
        aria-expanded={isMobileOpen}
        aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => {
          setIsMobileOpen((isOpen) => !isOpen);
          setOpenMobileGroup(null);
        }}
      >
        <svg
          aria-hidden="true"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileOpen ? (
            <path
              d="M6 18 18 6M6 6l12 12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />
          ) : (
            <path
              d="M4 6h16M4 12h16M4 18h16"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />
          )}
        </svg>
      </button>

      <ul className="hidden items-center gap-6 font-sans font-medium text-brownPrimary xl:flex 2xl:gap-9">
        {navigationItems.map((item) => {
          if (item.type === "internal") {
            const isActive = isPathActive(item.to);

            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                  className={desktopLinkClasses(isActive)}
                >
                  {item.label}
                </Link>
              </li>
            );
          }

          if (item.type === "external") {
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={desktopLinkClasses(false)}
                >
                  <span className="flex items-center gap-1.5">
                    {item.label}
                    <ExternalArrow />
                  </span>
                </a>
              </li>
            );
          }

          const isOpen = openDesktopGroup === item.id;
          const isActive = isGroupActive(item);

          return (
            <li
              key={item.id}
              className="relative"
              onMouseEnter={() => setOpenDesktopGroup(item.id)}
              onMouseLeave={() => setOpenDesktopGroup(null)}
            >
              <button
                ref={(node) => {
                  desktopGroupButtonRefs.current[item.id] = node;
                }}
                type="button"
                aria-haspopup="true"
                aria-controls={`desktop-${item.id}-menu`}
                aria-expanded={isOpen}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-2 text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary focus-visible:ring-offset-4 focus-visible:ring-offset-beigePrimary 2xl:text-lg ${
                  isActive || isOpen
                    ? "border-brownPrimary"
                    : "border-transparent hover:border-beigeSecondary"
                }`}
                onClick={() => setOpenDesktopGroup(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    openGroupFromKeyboard(item.id);
                  }
                }}
              >
                {item.label}
                <span
                  className={`transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <Chevron />
                </span>
              </button>

              <div
                id={`desktop-${item.id}-menu`}
                className={`absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3 ${
                  isOpen ? "block" : "hidden"
                }`}
              >
                <ul className="rounded-2xl border border-brownPrimary/10 bg-beigePrimary p-2 shadow-[0_20px_50px_rgba(56,43,30,0.18)]">
                  {item.items.map((child) => {
                    const childIsActive = isPathActive(child.to);

                    return (
                      <li key={child.to}>
                        <Link
                          to={child.to}
                          aria-current={childIsActive ? "page" : undefined}
                          className={`block rounded-xl px-4 py-2.5 text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary ${
                            childIsActive
                              ? "bg-brownPrimary text-beigePrimary"
                              : "hover:bg-peach/45"
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>

      {isMobileOpen && (
        <div
          id="mobile-navigation"
          className="absolute right-0 top-14 z-50 max-h-[calc(100vh-7rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-brownPrimary/10 bg-beigePrimary p-3 font-sans text-brownPrimary shadow-[0_24px_60px_rgba(56,43,30,0.22)] xl:hidden"
        >
          <ul>
            {navigationItems.map((item, index) => {
              const itemBorder = index === 0 ? "" : "border-t border-brownPrimary/10";

              if (item.type === "internal") {
                const isActive = isPathActive(item.to);

                return (
                  <li key={item.to} className={itemBorder}>
                    <Link
                      to={item.to}
                      aria-current={isActive ? "page" : undefined}
                      className={mobileLinkClasses(isActive)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              if (item.type === "external") {
                return (
                  <li key={item.href} className={itemBorder}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-lg font-semibold transition hover:bg-peach/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary"
                    >
                      {item.label}
                      <ExternalArrow />
                    </a>
                  </li>
                );
              }

              const isOpen = openMobileGroup === item.id;
              const isActive = isGroupActive(item);

              return (
                <li key={item.id} className={itemBorder}>
                  <button
                    type="button"
                    aria-controls={`mobile-${item.id}-menu`}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-lg font-semibold transition hover:bg-peach/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary"
                    onClick={() =>
                      setOpenMobileGroup(isOpen ? null : item.id)
                    }
                  >
                    <span className="flex items-center gap-2">
                      {item.label}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-brownPrimary"
                        />
                      )}
                    </span>
                    <span
                      className={`transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <Chevron />
                    </span>
                  </button>

                  {isOpen && (
                    <ul
                      id={`mobile-${item.id}-menu`}
                      className="mb-2 ml-3 border-l border-brownPrimary/15 pl-3"
                    >
                      {item.items.map((child) => {
                        const childIsActive = isPathActive(child.to);

                        return (
                          <li key={child.to}>
                            <Link
                              to={child.to}
                              aria-current={childIsActive ? "page" : undefined}
                              className={`block rounded-lg px-3 py-2.5 text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brownPrimary ${
                                childIsActive
                                  ? "bg-brownPrimary text-beigePrimary"
                                  : "hover:bg-peach/45"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Nav;
