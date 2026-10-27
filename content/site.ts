import type { ContactChannel, NavItem } from "@/lib/types";

/**
 * Fallback only, the live gate is `conference_settings.registration_open`,
 * toggled from /admin/registrations.
 */
export const registrationOpen = false;

export const conference = {
  name: "MERITMUN",
  iteration: "III",
  fullName: "MERITMUN III",
  longName: "Meritorious Model United Nations, Third Iteration",
  tagline: "Discover the World of Diplomacy",
  /** Conference days, in order (ISO dates, Karachi time). */
  dayDates: ["2027-01-01", "2027-01-02", "2027-01-03"] as readonly string[],
  datesLabel: "1, 2 and 3 January 2027",
  durationDays: 3,
  city: "Karachi",
  country: "Pakistan",
  venue: "Meritorious College, PECHS Campus (AKUEB & A Levels)",
  /** Opens the venue in Google Maps. */
  venueUrl:
    "https://www.google.com/maps/search/?api=1&query=Meritorious+College+PECHS+Campus+Karachi",
} as const;

/** Demo-mode seed fees. The live site reads /admin/pricing. */
export const pricing = {
  currency: "PKR",
  delegate: 4500, // Demo seed only; live fees come from /admin/pricing
  delegationStandard: 4000, // per head, 5+
  delegationLarge: 3500, // per head, 15+
  largeThreshold: 15,
  minDelegation: 5,
  maxDelegation: 30,
} as const;

export const navItems: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "EB", href: "/executive-board" },
  { label: "Committees", href: "/committees" },
  { label: "Schedule", href: "/schedule" },
  { label: "Contact", href: "/contact" },
  {
    label: "Register",
    href: "/register",
    children: [
      {
        label: "Register a Delegate",
        href: "/register/delegate",
        description: "Applying on your own. Takes about four minutes.",
      },
      {
        label: "Register a Delegation",
        href: "/register/delegation",
        description: "Bringing 5–30 students from one institution.",
      },
    ],
  },
];

export const contactChannels: ContactChannel[] = [
  {
    id: "delegate-affairs",
    label: "Delegate Affairs",
    value: "delegates@meritmun.systemsummit.online",
    href: "mailto:delegates@meritmun.systemsummit.online",
    note: "Registration, committee allocation, and fee questions.",
  },
  {
    id: "delegations",
    label: "Institutional Delegations",
    value: "delegations@meritmun.systemsummit.online",
    href: "mailto:delegations@meritmun.systemsummit.online",
    note: "Group bookings, faculty coordination, and invoicing.",
  },
  {
    id: "venue",
    label: "Venue",
    value: `${conference.venue}, ${conference.city}`,
    href: conference.venueUrl,
    note: "Open in Google Maps for directions.",
  },
];

/** Official social accounts. Empty until real handles are confirmed, the
 *  footer and contact page hide the section when there are none. */
export const socials: readonly {
  label: string;
  href: string;
  icon: "instagram" | "linkedin";
}[] = [];

export const valueProps = [
  {
    id: "committees",
    title: "One agenda per committee",
    body: "Each committee debates a single, published question for the full three days, so you can prepare properly instead of skimming five topics.",
  },
  {
    id: "merit",
    title: "Seats allotted on merit",
    body: "Rank three committees when you register. Once your payment is confirmed, seats are matched against your preferences and experience, and your committee and portfolio arrive by email.",
  },
  {
    id: "beginners",
    title: "Open to first-timers",
    body: "No experience is needed to register. Every committee lists its difficulty level, so you can choose one pitched at where you are.",
  },
  {
    id: "record",
    title: "Third iteration",
    body: "40+ institutions and 300+ delegates have taken part in MERITMUN so far.",
  },
] as const;

