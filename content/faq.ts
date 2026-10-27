import type { FaqEntry } from "@/lib/types";

/** The live fee numbers the FAQ quotes (from /admin/pricing). */
export type FaqPricing = {
  currency: string;
  delegate: number;
  perDelegate: number;
  delegationFlat: number;
  minDelegation: number;
  maxDelegation: number;
  earlyBird: { endsAt: string | null } | null;
};

function money(pricing: FaqPricing, amount: number): string {
  return `${pricing.currency} ${amount.toLocaleString("en-US")}`;
}

function feesAnswer(pricing: FaqPricing | null): string {
  if (!pricing) {
    return "Current fees are shown on the registration page and in your confirmation email. The fee covers all three days of the conference.";
  }
  const flat =
    pricing.delegationFlat > 0
      ? `, plus ${money(pricing, pricing.delegationFlat)} once per delegation`
      : "";
  const early = pricing.earlyBird
    ? ` These are early-bird rates${pricing.earlyBird.endsAt ? ` until ${new Date(pricing.earlyBird.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Karachi" })}` : ""}.`
    : "";
  return (
    `${money(pricing, pricing.delegate)} for an individual delegate. Delegations of ${pricing.minDelegation} to ${pricing.maxDelegation} students pay ${money(pricing, pricing.perDelegate)} per head${flat}.${early} ` +
    "You pay by bank transfer after registering, the account details arrive in your confirmation email. The fee covers all three days of the conference."
  );
}

/** FAQ with the fee and delegation-size answers filled from live pricing. */
export function buildFaqs(pricing: FaqPricing | null): FaqEntry[] {
  const minimum = pricing ? String(pricing.minDelegation) : "five";
  return faqs.map((faq) => {
    if (faq.id === "fees") return { ...faq, answer: feesAnswer(pricing) };
    if (faq.id === "delegate-vs-delegation") {
      return { ...faq, answer: faq.answer.replace("five or more", `${minimum} or more`) };
    }
    return faq;
  });
}

/** Static copy; use `buildFaqs` so fee answers match /admin/pricing. */
const faqs: FaqEntry[] = [
  {
    id: "when",
    question: "When is MERITMUN III?",
    answer:
      "MERITMUN III runs on 1, 2 and 3 January 2027 at Meritorious College, PECHS Campus (AKUEB & A Levels), Karachi. The full running order is on the Schedule page.",
    topics: ["logistics", "registration"],
  },
  {
    id: "first-time",
    question: "I have never done MUN before. Should I apply?",
    answer:
      "Yes. No experience is needed to register. Every committee lists its difficulty level on the Committees page, so you can rank ones pitched at where you are.",
    topics: ["committees", "registration"],
  },
  {
    id: "delegate-vs-delegation",
    question: "What is the difference between a delegate and a delegation?",
    answer:
      "Register as a delegate if you are applying on your own. Register a delegation if you are a society head or faculty member bringing five or more students from one institution, you fill in one form, get a reduced per-head rate, and your students are allocated as a group.",
    topics: ["registration", "fees"],
  },
  {
    id: "allocation",
    question: "How does committee allocation work?",
    answer:
      "You rank three committees in order of preference. Once your payment is confirmed, seats are allotted on merit, your preferences weighed against your stated experience and each committee's difficulty, and your committee and portfolio arrive by email.",
    topics: ["committees", "registration"],
  },
  {
    id: "fees",
    question: "What does registration cost?",
    answer:
      "Built from live pricing, see feesAnswer().",
    topics: ["fees", "registration"],
  },
  {
    id: "accommodation",
    question: "Can out-of-city delegates get help with accommodation?",
    answer:
      "Tick accommodation on your application and Delegate Affairs will email you about options. It is arranged separately from the registration fee.",
    topics: ["logistics", "fees"],
  },
  {
    id: "background-guides",
    question: "When are background guides published?",
    answer:
      "Guides are released after allocations go out, so you receive the guide for the committee you are actually in.",
    topics: ["committees"],
  },
  {
    id: "status",
    question: "I already applied. What happens next?",
    answer:
      "Pay the fee using the bank details in your confirmation email and send the transfer screenshot to Delegate Affairs. Once your payment is confirmed you are allotted on merit, and your committee, portfolio and background guide arrive by email. Questions? Email Delegate Affairs with your reference code.",
    topics: ["registration"],
  },
];

/** The three shown in the floating help widget before "see all". */
export function quickHelpFaqs(all: FaqEntry[]): FaqEntry[] {
  return all.filter((faq) =>
    ["when", "delegate-vs-delegation", "fees"].includes(faq.id),
  );
}
