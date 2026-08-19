import type { BoardMember } from "@/lib/types";

/**
 * All names are PLACEHOLDER. Replace with the real secretariat before launch —
 * `grep -rn "PLACEHOLDER" content/` is the launch checklist.
 */
export const boardMembers: BoardMember[] = [
  {
    id: "sg",
    name: "Hania Rehman", // PLACEHOLDER
    role: "Secretary-General",
    tier: "secretariat",
    bio: "Four years on the circuit and two as MERITMUN's Director-General. Sets the academic standard for the conference and personally reads every committee's background guide before it ships.",
    initials: "HR",
    email: "sg@meritmun.org",
  },
  {
    id: "dsg",
    name: "Arsalan Baig", // PLACEHOLDER
    role: "Deputy Secretary-General",
    tier: "secretariat",
    bio: "Runs the substantive side day to day — chair training, guide review, and the awards rubric that committees are held to.",
    initials: "AB",
    email: "dsg@meritmun.org",
  },
  {
    id: "dg",
    name: "Meher Zaidi", // PLACEHOLDER
    role: "Director-General",
    tier: "secretariat",
    bio: "Owns operations end to end: venue, timing, and the unglamorous work that makes sessions start when the schedule says they will.",
    initials: "MZ",
    email: "dg@meritmun.org",
  },
  {
    id: "usg-committees",
    name: "Saad Anwar", // PLACEHOLDER
    role: "USG Committees",
    tier: "secretariat",
    bio: "Selects the slate, appoints chairs, and is the reason no two committees this year are debating a version of the same agenda.",
    initials: "SA",
    email: "committees@meritmun.org",
  },
  {
    id: "usg-delegate-affairs",
    name: "Anum Sethi", // PLACEHOLDER
    role: "USG Delegate Affairs",
    tier: "secretariat",
    bio: "Handles allocations, preferences, and the inbox. If you emailed about your committee and got an answer the same day, it was this desk.",
    initials: "AS",
    email: "delegates@meritmun.org",
  },
  {
    id: "usg-marketing",
    name: "Raza Kamal", // PLACEHOLDER
    role: "USG Marketing & Outreach",
    tier: "secretariat",
    bio: "Brings the institutions in. Ran the school outreach that took MERITMUN II from twenty-six delegations to forty-one.",
    initials: "RK",
    email: "outreach@meritmun.org",
  },
  {
    id: "usg-logistics",
    name: "Iman Tariq", // PLACEHOLDER
    role: "USG Logistics",
    tier: "secretariat",
    bio: "Venue, transport, catering, and accommodation. Keeps a contingency plan for every session and has needed roughly half of them.",
    initials: "IT",
    email: "logistics@meritmun.org",
  },
  {
    id: "usg-finance",
    name: "Yousuf Habib", // PLACEHOLDER
    role: "USG Finance",
    tier: "secretariat",
    bio: "Fees, sponsorship, and invoicing for institutional delegations. Publishes where the registration fee goes at the close of every conference.",
    initials: "YH",
    email: "finance@meritmun.org",
  },
  {
    id: "dir-crisis",
    name: "Warda Naqvi", // PLACEHOLDER
    role: "Director of Crisis",
    tier: "directorate",
    bio: "Writes and runs the backroom for both crisis committees. Will not tell you what happens on day two.",
    initials: "WN",
    email: null,
  },
  {
    id: "dir-press",
    name: "Hassan Ali", // PLACEHOLDER
    role: "Director of Press",
    tier: "directorate",
    bio: "Edits the daily bulletin and holds the Press Corps to a publication deadline that does not move for anyone.",
    initials: "HA",
    email: null,
  },
  {
    id: "dir-training",
    name: "Noor Fatima", // PLACEHOLDER
    role: "Director of Delegate Training",
    tier: "directorate",
    bio: "Runs the pre-conference briefings for first-time delegates and the mock session that precedes opening ceremony.",
    initials: "NF",
    email: null,
  },
  {
    id: "dir-tech",
    name: "Zaid Mirza", // PLACEHOLDER
    role: "Director of Technology",
    tier: "directorate",
    bio: "Registration systems, allocation tooling, and the conference bulletin site. Built the status lookup you are probably about to use.",
    initials: "ZM",
    email: null,
  },
  {
    id: "dir-design",
    name: "Amal Sohail", // PLACEHOLDER
    role: "Director of Design",
    tier: "directorate",
    bio: "Identity, placards, and every printed thing in the building. Responsible for the fact that you can read the committee signage from across the hall.",
    initials: "AS",
    email: null,
  },
  {
    id: "dir-hospitality",
    name: "Bushra Latif", // PLACEHOLDER
    role: "Director of Hospitality",
    tier: "directorate",
    bio: "Looks after visiting delegations — accommodation, dietary requirements, and faculty coordination for out-of-city institutions.",
    initials: "BL",
    email: null,
  },
];

export const secretariat = boardMembers.filter(
  (member) => member.tier === "secretariat",
);

export const directorate = boardMembers.filter(
  (member) => member.tier === "directorate",
);
