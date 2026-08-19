import type { ContactChannel, NavItem } from "@/lib/types";

export const conference = {
  name: "MERITMUN",
  iteration: "III",
  fullName: "MERITMUN III",
  longName: "Meritorious Model United Nations, Third Iteration",
  tagline: "Discover the World of Diplomacy",
  /** Dates are unannounced. Consumers must render the TBD state, never invent one. */
  dates: null as string | null,
  datesLabel: "Dates to be announced",
  durationDays: 3,
  city: "Karachi",
  country: "Pakistan",
  venue: "Meritorious Campus, Main Auditorium Block", // PLACEHOLDER: confirm venue
  venueAddress: "Main Auditorium Block, Meritorious Campus, Karachi", // PLACEHOLDER
  committeeCount: 12,
  seatCount: 600,
  founded: 2023, // PLACEHOLDER: confirm first iteration year
} as const;

export const pricing = {
  currency: "PKR",
  delegate: 4500, // PLACEHOLDER: confirm fee
  delegationStandard: 4000, // per head, 5+
  delegationLarge: 3500, // per head, 15+
  largeThreshold: 15,
  minDelegation: 5,
  maxDelegation: 30,
} as const;

export const navItems: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Executive Board", href: "/executive-board" },
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
      {
        label: "Check your status",
        href: "/register/status",
        description: "Already applied? Look up your reference code.",
      },
    ],
  },
];

export const contactChannels: ContactChannel[] = [
  {
    id: "delegate-affairs",
    label: "Delegate Affairs",
    value: "delegates@meritmun.org", // PLACEHOLDER
    href: "mailto:delegates@meritmun.org",
    note: "Registration, committee allocation, and fee questions.",
  },
  {
    id: "delegations",
    label: "Institutional Delegations",
    value: "delegations@meritmun.org", // PLACEHOLDER
    href: "mailto:delegations@meritmun.org",
    note: "Group bookings, faculty coordination, and invoicing.",
  },
  {
    id: "phone",
    label: "Secretariat line",
    value: "+92 21 3455 0000", // PLACEHOLDER
    href: "tel:+922134550000",
    note: "Weekdays, 4pm to 9pm PKT.",
  },
  {
    id: "venue",
    label: "Venue",
    value: conference.venueAddress,
    href: null,
    note: "Directions are sent with your allocation email.",
  },
];

export const socials = [
  { label: "Instagram", href: "https://instagram.com/meritmun", icon: "instagram" }, // PLACEHOLDER
  { label: "LinkedIn", href: "https://linkedin.com/company/meritmun", icon: "linkedin" }, // PLACEHOLDER
] as const;

export const valueProps = [
  {
    id: "committees",
    title: "Twelve committees, not twelve name tags",
    body: "Every committee runs a single, researched agenda with a full background guide and a chair who has sat in the seat. You debate one thing properly instead of five things vaguely.",
  },
  {
    id: "beginners",
    title: "A real entry point if it is your first time",
    body: "The Youth Assembly and UNEP are chaired for first-timers: procedure taught in session, no penalty for asking, and a pre-conference briefing that covers everything from the speakers' list to writing a working paper.",
  },
  {
    id: "crisis",
    title: "Crisis that actually moves",
    body: "Two crisis committees with live directives, a dedicated backroom, and updates that respond to what delegates do — not a pre-written script read out on schedule.",
  },
  {
    id: "record",
    title: "Third iteration, and it shows",
    body: "Two conferences behind us means the logistics are boring in the way logistics should be: sessions start on time, allocations arrive when promised, and the secretariat answers email.",
  },
] as const;

export const aftermovie = {
  title: "MERITMUN II — Conference Aftermovie",
  description:
    "Three days, forty-one institutions, and one very long final General Assembly session.",
  duration: "3:42", // PLACEHOLDER
  src: null as string | null, // PLACEHOLDER: drop the mp4/embed URL here
  chapters: [
    "Opening ceremony",
    "Committee in session",
    "Crisis breaks",
    "Awards and closing",
  ],
} as const;
