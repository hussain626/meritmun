import type { ScheduleDay } from "@/lib/types";

/**
 * Conference dates are unannounced, so every `date` is null and consumers render
 * the "to be announced" state. Times are fixed relative to each day and will not
 * change when the calendar dates are confirmed.
 */
export const scheduleDays: ScheduleDay[] = [
  {
    id: "day-1",
    date: null,
    label: "Day One",
    theme: "Opening and first committee sessions",
    items: [
      {
        id: "d1-registration",
        start: "08:00",
        end: "09:30",
        title: "Delegate registration and placard collection",
        kind: "logistics",
        venue: "Main Auditorium Foyer",
        description:
          "Bring photo ID and your reference code. Head delegates collect for the whole delegation at the institutional desk.",
      },
      {
        id: "d1-briefing",
        start: "09:00",
        end: "09:45",
        title: "First-timer briefing",
        kind: "logistics",
        venue: "Seminar Hall B",
        description:
          "Rules of procedure, the speakers' list, and how a working paper is written. Optional, and worth it.",
      },
      {
        id: "d1-opening",
        start: "10:00",
        end: "11:30",
        title: "Opening ceremony",
        kind: "ceremony",
        venue: "Main Auditorium",
        description:
          "Address from the Secretary-General, keynote, and the roll call of participating institutions.",
      },
      {
        id: "d1-break-1",
        start: "11:30",
        end: "12:00",
        title: "Tea break",
        kind: "break",
        venue: "Central Courtyard",
        description: null,
      },
      {
        id: "d1-session-1",
        start: "12:00",
        end: "14:00",
        title: "Committee Session I",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "Roll call, setting the agenda, and opening speeches. Crisis committees begin with their first directive window.",
      },
      {
        id: "d1-lunch",
        start: "14:00",
        end: "15:00",
        title: "Lunch",
        kind: "break",
        venue: "Dining Hall",
        description: "Vegetarian and allergen-aware options are labelled at the counter.",
      },
      {
        id: "d1-session-2",
        start: "15:00",
        end: "17:30",
        title: "Committee Session II",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "Moderated and unmoderated caucus. Working paper blocs typically form here.",
      },
      {
        id: "d1-social",
        start: "18:00",
        end: "20:00",
        title: "Delegate social",
        kind: "social",
        venue: "Central Courtyard",
        description:
          "Informal, and the single best place to find your bloc before day two.",
      },
    ],
  },
  {
    id: "day-2",
    date: null,
    label: "Day Two",
    theme: "The long day — drafting, crisis, and the press cycle",
    items: [
      {
        id: "d2-bulletin",
        start: "08:30",
        end: "09:00",
        title: "Daily bulletin distribution",
        kind: "logistics",
        venue: "Main Auditorium Foyer",
        description: "Filed overnight by the International Press Corps.",
      },
      {
        id: "d2-session-3",
        start: "09:00",
        end: "11:30",
        title: "Committee Session III",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "Draft resolutions and working papers submitted to the dais for approval.",
      },
      {
        id: "d2-break-1",
        start: "11:30",
        end: "12:00",
        title: "Tea break",
        kind: "break",
        venue: "Central Courtyard",
        description: null,
      },
      {
        id: "d2-session-4",
        start: "12:00",
        end: "14:00",
        title: "Committee Session IV",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "Formal debate on approved drafts. Crisis committees run their second escalation.",
      },
      {
        id: "d2-lunch",
        start: "14:00",
        end: "15:00",
        title: "Lunch",
        kind: "break",
        venue: "Dining Hall",
        description: null,
      },
      {
        id: "d2-jcc",
        start: "15:00",
        end: "16:00",
        title: "Joint Crisis Committee — joint session",
        kind: "session",
        venue: "Main Auditorium",
        description:
          "Both JCC cabinets in one room. Open to observers from other committees.",
      },
      {
        id: "d2-session-5",
        start: "15:00",
        end: "18:00",
        title: "Committee Session V",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "The longest block of the conference. Amendments, and the last chance to move a bloc.",
      },
      {
        id: "d2-press",
        start: "18:00",
        end: "19:00",
        title: "Press conference",
        kind: "session",
        venue: "Seminar Hall A",
        description:
          "Committee chairs and selected delegates take questions from the Press Corps.",
      },
      {
        id: "d2-dinner",
        start: "19:30",
        end: "22:00",
        title: "Delegate dinner",
        kind: "social",
        venue: "Off-site — coach transport provided",
        description:
          "Included in the registration fee. Coaches leave from the main gate at 19:15.",
      },
    ],
  },
  {
    id: "day-3",
    date: null,
    label: "Day Three",
    theme: "Voting procedure, awards, and close",
    items: [
      {
        id: "d3-session-6",
        start: "09:00",
        end: "11:00",
        title: "Committee Session VI",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "Final debate. Amendments close thirty minutes before the session ends.",
      },
      {
        id: "d3-break-1",
        start: "11:00",
        end: "11:30",
        title: "Tea break",
        kind: "break",
        venue: "Central Courtyard",
        description: null,
      },
      {
        id: "d3-voting",
        start: "11:30",
        end: "13:30",
        title: "Voting procedure",
        kind: "session",
        venue: "Allocated committee rooms",
        description:
          "Doors are sealed. No entry or exit once voting procedure has been declared.",
      },
      {
        id: "d3-lunch",
        start: "13:30",
        end: "14:30",
        title: "Lunch",
        kind: "break",
        venue: "Dining Hall",
        description: null,
      },
      {
        id: "d3-photos",
        start: "14:30",
        end: "15:30",
        title: "Committee photographs",
        kind: "logistics",
        venue: "Central Courtyard",
        description: "By committee, in the order posted on the foyer board.",
      },
      {
        id: "d3-closing",
        start: "16:00",
        end: "18:00",
        title: "Closing ceremony and awards",
        kind: "ceremony",
        venue: "Main Auditorium",
        description:
          "Best Delegate, High Commendation, and Honourable Mention per committee, plus the Best Delegation award.",
      },
    ],
  },
];

export function getDayById(id: string): ScheduleDay | undefined {
  return scheduleDays.find((day) => day.id === id);
}
