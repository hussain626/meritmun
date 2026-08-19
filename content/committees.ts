import type { Committee } from "@/lib/types";

/**
 * The MERITMUN III committee slate. All chair names are PLACEHOLDER and every
 * background-guide URL is a stub until the guides are published.
 */
export const committees: Committee[] = [
  {
    slug: "unsc",
    name: "United Nations Security Council",
    abbr: "UNSC",
    type: "specialised",
    difficulty: "advanced",
    agenda:
      "Maritime security and freedom of navigation in the Strait of Hormuz",
    overview:
      "Fifteen seats, a veto, and an agenda where every clause has a fleet behind it. The Council runs on a compressed timetable with live incident updates, so delegates who arrive without a national position will be found out inside the first session.",
    focusPoints: [
      "Innocent passage under UNCLOS versus declared exclusion zones",
      "Escalation thresholds and the line between escort and intervention",
      "Sanctions enforcement when the enforcing navy is a party to the dispute",
      "Whether a Chapter VII authorisation survives a P5 split",
    ],
    seats: 15,
    chairs: [
      { name: "Ayesha Karim", role: "Chair", initials: "AK" }, // PLACEHOLDER
      { name: "Hamza Sheikh", role: "Vice Chair", initials: "HS" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: true,
  },
  {
    slug: "unhrc",
    name: "United Nations Human Rights Council",
    abbr: "UNHRC",
    type: "general-assembly",
    difficulty: "intermediate",
    agenda:
      "Protecting the right to protest in the age of predictive policing",
    overview:
      "The Council examines what assembly rights mean when the state can anticipate a gathering before it happens. Expect hard questions about surveillance procurement, and expect to defend a position your own delegation would rather not discuss.",
    focusPoints: [
      "Facial recognition at demonstrations and the consent problem",
      "Export controls on surveillance technology sold as public safety",
      "Internet shutdowns as a proportionate response — or never",
      "Special Rapporteur mandates with no enforcement teeth",
    ],
    seats: 47,
    chairs: [
      { name: "Zainab Qureshi", role: "Chair", initials: "ZQ" }, // PLACEHOLDER
      { name: "Daniyal Ahmed", role: "Vice Chair", initials: "DA" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: true,
  },
  {
    slug: "disec",
    name: "Disarmament and International Security Committee",
    abbr: "DISEC",
    type: "general-assembly",
    difficulty: "intermediate",
    agenda:
      "Regulating lethal autonomous weapons systems before deployment outpaces doctrine",
    overview:
      "The First Committee's oldest problem in its newest form: who is accountable when the decision to fire is made in software. A large floor, a long speakers' list, and a resolution that has to survive states which are already fielding the systems.",
    focusPoints: [
      "Meaningful human control — definition, verification, and enforcement",
      "Whether a pre-emptive ban is achievable or merely declarative",
      "Dual-use research and the limits of export regimes",
      "Attribution and liability under international humanitarian law",
    ],
    seats: 45,
    chairs: [
      { name: "Fatima Noor", role: "Chair", initials: "FN" }, // PLACEHOLDER
      { name: "Bilal Raza", role: "Vice Chair", initials: "BR" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "ecosoc",
    name: "Economic and Social Council",
    abbr: "ECOSOC",
    type: "general-assembly",
    difficulty: "intermediate",
    agenda:
      "Sovereign debt restructuring and the fiscal space for climate adaptation",
    overview:
      "Countries most exposed to climate damage are the ones least able to borrow to prepare for it. ECOSOC works the arithmetic: creditor committees, debt-for-nature swaps, and what a standstill clause actually costs.",
    focusPoints: [
      "Common Framework reform and the private-creditor holdout problem",
      "Climate-resilient debt clauses in new sovereign issuance",
      "Conditionality that funds adaptation without mandating austerity",
      "Credit-rating methodology as an unelected policy instrument",
    ],
    seats: 40,
    chairs: [
      { name: "Mariam Yusuf", role: "Chair", initials: "MY" }, // PLACEHOLDER
      { name: "Omar Farooq", role: "Vice Chair", initials: "OF" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "who",
    name: "World Health Organization",
    abbr: "WHO",
    type: "specialised",
    difficulty: "intermediate",
    agenda:
      "Antimicrobial resistance: stewardship, surveillance, and the empty pipeline",
    overview:
      "A slow emergency. The committee has to reconcile agricultural antibiotic use, a pharmaceutical pipeline with no commercial incentive, and surveillance systems that stop at borders drug-resistant infections do not respect.",
    focusPoints: [
      "Delinking antibiotic revenue from volume sold",
      "Veterinary and agricultural use as the largest single driver",
      "Genomic surveillance networks in low-resource health systems",
      "Access versus excess — stewardship without denying treatment",
    ],
    seats: 35,
    chairs: [
      { name: "Sara Iqbal", role: "Chair", initials: "SI" }, // PLACEHOLDER
      { name: "Ahmed Jamil", role: "Vice Chair", initials: "AJ" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "unep",
    name: "United Nations Environment Programme",
    abbr: "UNEP",
    type: "general-assembly",
    difficulty: "beginner",
    agenda: "Transboundary water sharing under accelerating glacial melt",
    overview:
      "Chaired for delegates in their first or second conference. Procedure is taught in session, the agenda is concrete, and the chairs would rather you make a real argument badly than a safe argument well.",
    focusPoints: [
      "Upstream storage rights versus downstream historical use",
      "Data sharing on flow rates as a confidence-building measure",
      "Existing basin treaties written for a hydrology that no longer exists",
      "Financing early-warning infrastructure across contested borders",
    ],
    seats: 38,
    chairs: [
      { name: "Hira Malik", role: "Chair", initials: "HM" }, // PLACEHOLDER
      { name: "Usman Tariq", role: "Vice Chair", initials: "UT" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "unodc",
    name: "United Nations Office on Drugs and Crime",
    abbr: "UNODC",
    type: "specialised",
    difficulty: "advanced",
    agenda:
      "Trafficking networks and the regulation of privacy-preserving financial rails",
    overview:
      "Where organised crime meets cryptography. The committee must draft something that constrains laundering without writing a surveillance mandate that every delegation in the room would refuse to ratify.",
    focusPoints: [
      "Travel-rule compliance for self-custodied wallets",
      "Mutual legal assistance at the speed of a blockchain settlement",
      "Mixers, privacy coins, and the legitimate-use defence",
      "Asset recovery and repatriation to source states",
    ],
    seats: 30,
    chairs: [
      { name: "Nida Abbas", role: "Chair", initials: "NA" }, // PLACEHOLDER
      { name: "Rehan Siddiqui", role: "Vice Chair", initials: "RS" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "historic-crisis",
    name: "Historic Crisis Committee — Vienna, 1814",
    abbr: "HCC",
    type: "crisis",
    difficulty: "advanced",
    agenda: "The Congress of Vienna and the settlement of post-Napoleonic Europe",
    overview:
      "A live crisis committee with a dedicated backroom. Delegates hold personal portfolios, write private directives, and will find that the map they agreed on last session has changed. Nothing here is on rails.",
    focusPoints: [
      "The Polish–Saxon question and the limits of compensation",
      "Balance of power as doctrine versus balance of power as excuse",
      "Private directives, secret treaties, and the cost of being caught",
      "Napoleon is on Elba. He does not intend to stay there.",
    ],
    seats: 20,
    chairs: [
      { name: "Talha Mahmood", role: "Director", initials: "TM" }, // PLACEHOLDER
      { name: "Eman Riaz", role: "Vice Chair", initials: "ER" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: true,
  },
  {
    slug: "joint-crisis",
    name: "Joint Crisis Committee — Arctic Council",
    abbr: "JCC",
    type: "crisis",
    difficulty: "advanced",
    agenda:
      "Competing continental shelf claims as the Northern Sea Route opens year-round",
    overview:
      "Two rooms, one crisis, one shared backroom. What one cabinet decides lands on the other's desk within the hour. Delegates should expect their carefully drafted position to be overtaken by events at least twice.",
    focusPoints: [
      "Article 76 submissions and the Lomonosov Ridge",
      "Militarisation framed as search-and-rescue capability",
      "Indigenous consultation rights in extraction licensing",
      "A shipping incident nobody in either room planned for",
    ],
    seats: 24,
    chairs: [
      { name: "Areeba Hassan", role: "Director", initials: "AH" }, // PLACEHOLDER
      { name: "Shayan Malik", role: "Vice Chair", initials: "SM" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "national-assembly",
    name: "Pakistan National Assembly",
    abbr: "PNA",
    type: "specialised",
    difficulty: "intermediate",
    agenda: "Urban water governance and the Karachi supply deficit",
    overview:
      "Conducted partly in Urdu, partly in English, and entirely in the register of a real legislature. Delegates take party positions rather than country positions, and the committee runs on parliamentary procedure instead of UN rules.",
    focusPoints: [
      "Bulk supply, distribution losses, and the tanker economy",
      "Provincial versus municipal jurisdiction over utilities",
      "Cost recovery and tariff reform in an inflationary year",
      "Points of order, walkouts, and the standing committee referral",
    ],
    seats: 34,
    chairs: [
      { name: "Ibrahim Qadri", role: "Chair", initials: "IQ" }, // PLACEHOLDER
      { name: "Laiba Anwar", role: "Vice Chair", initials: "LA" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "youth-assembly",
    name: "Youth Assembly",
    abbr: "YA",
    type: "general-assembly",
    difficulty: "beginner",
    agenda: "Digital literacy and the regulation of algorithmic feeds for minors",
    overview:
      "Built for delegates who have never done this before. Shorter sessions, procedure explained as it happens, and a mandatory pre-conference briefing covering the speakers' list, moderated caucus, and how a working paper is actually written.",
    focusPoints: [
      "Age assurance without building an identity database",
      "Default settings as policy — what 'off by default' would change",
      "Curriculum interventions that survive contact with a classroom",
      "Learning the rules of procedure without being punished for it",
    ],
    seats: 40,
    chairs: [
      { name: "Rida Aslam", role: "Chair", initials: "RA" }, // PLACEHOLDER
      { name: "Faizan Khan", role: "Vice Chair", initials: "FK" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
  {
    slug: "press-corps",
    name: "International Press Corps",
    abbr: "IPC",
    type: "press",
    difficulty: "intermediate",
    agenda:
      "Covering the conference live: reporting, photography, and editorial judgement",
    overview:
      "The Press Corps does not sit still. Delegates move between committees, file copy against real deadlines, run the daily bulletin, and conduct interviews that the committees they cover will read the next morning.",
    focusPoints: [
      "Filing to a deadline that does not move",
      "Sourcing a story when your source is in unmoderated caucus",
      "Photojournalism and the ethics of the unflattering frame",
      "Editorial independence when the editor is also being lobbied",
    ],
    seats: 18,
    chairs: [
      { name: "Sana Haider", role: "Director", initials: "SH" }, // PLACEHOLDER
      { name: "Zohaib Aziz", role: "Vice Chair", initials: "ZA" }, // PLACEHOLDER
    ],
    backgroundGuideUrl: null,
    featured: false,
  },
];

export function getCommitteeBySlug(slug: string): Committee | undefined {
  return committees.find((committee) => committee.slug === slug);
}

export const featuredCommittees = committees.filter(
  (committee) => committee.featured,
);
