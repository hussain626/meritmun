import type { FaqEntry } from "@/lib/types";

export const faqs: FaqEntry[] = [
  {
    id: "when",
    question: "When is MERITMUN III?",
    answer:
      "Dates are not announced yet. The conference runs over three days in Karachi. Register now and you will be emailed the dates the moment they are confirmed — registering does not lock you into a date you have not seen.",
    topics: ["logistics", "registration"],
  },
  {
    id: "first-time",
    question: "I have never done MUN before. Should I apply?",
    answer:
      "Yes. The Youth Assembly and UNEP are chaired specifically for first-time delegates, procedure is taught during the session rather than assumed, and there is a briefing on the morning of day one that covers everything you need.",
    topics: ["committees", "registration"],
  },
  {
    id: "delegate-vs-delegation",
    question: "What is the difference between a delegate and a delegation?",
    answer:
      "Register as a delegate if you are applying on your own. Register a delegation if you are a society head or faculty member bringing five or more students from one institution — you fill in one form, get a reduced per-head rate, and your students are allocated as a group.",
    topics: ["registration", "fees"],
  },
  {
    id: "allocation",
    question: "How does committee allocation work?",
    answer:
      "You rank three committees in order of preference. Allocations weigh your stated experience against the difficulty of each committee, and go out by email with your country or portfolio assignment. Most delegates receive their first or second preference.",
    topics: ["committees", "registration"],
  },
  {
    id: "fees",
    question: "What does registration cost?",
    answer:
      "PKR 4,500 for an individual delegate. Delegations of five or more pay PKR 4,000 per head, and delegations of fifteen or more pay PKR 3,500 per head. The fee covers all three days, lunches, the delegate dinner, and conference materials.",
    topics: ["fees", "registration"],
  },
  {
    id: "accommodation",
    question: "Is accommodation available for out-of-city delegates?",
    answer:
      "Yes, at partner accommodation near the venue, arranged separately from the registration fee. Flag it on your application and Hospitality will contact you with options and pricing.",
    topics: ["logistics", "fees"],
  },
  {
    id: "background-guides",
    question: "When are background guides published?",
    answer:
      "Guides are released after allocations go out, so you receive the guide for the committee you are actually in. Each one includes the agenda framing, a timeline, position paper requirements, and a reading list.",
    topics: ["committees"],
  },
  {
    id: "status",
    question: "I already applied. How do I check my status?",
    answer:
      "Use the reference code from your confirmation screen or email on the status page. It shows whether your application has been received, is under review, has been allocated, or is confirmed.",
    topics: ["registration"],
  },
];

/** The three shown in the floating help widget before "see all". */
export const quickHelpFaqs = faqs.filter((faq) =>
  ["when", "delegate-vs-delegation", "fees"].includes(faq.id),
);
