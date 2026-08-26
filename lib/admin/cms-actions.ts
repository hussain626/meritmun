"use server";

import { revalidatePath } from "next/cache";
import { getDemoStore } from "@/lib/admin/demo-store";
import type {
  CommitteeAdminRecord,
  EbMemberRecord,
  HodRecord,
  ScheduleDayRecord,
  ScheduleItemRecord,
  SecretariatMemberRecord,
  SponsorRecord,
} from "@/lib/admin/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { CommitteeType, Difficulty, ScheduleKind } from "@/lib/types";
import { initialsFromName, slugify } from "@/lib/utils";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function ok(message: string): { ok: true; message: string } {
  return { ok: true, message };
}

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

type ActionResult = { ok: boolean; message: string };

function revalidatePublic(): void {
  revalidatePath("/", "layout");
  revalidatePath("/register");
  revalidatePath("/register/delegate");
  revalidatePath("/register/delegation");
  revalidatePath("/about");
  revalidatePath("/schedule");
  revalidatePath("/committees");
  revalidatePath("/executive-board");
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const COMMITTEE_TYPES: CommitteeType[] = [
  "general-assembly",
  "specialised",
  "crisis",
  "press",
];
const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];
const SCHEDULE_KINDS: ScheduleKind[] = [
  "ceremony",
  "session",
  "break",
  "social",
  "logistics",
];

export async function setRegistrationOpen(
  open: boolean,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.conference.registrationOpen = open;
    store.conference.updatedAt = nowIso();
    store.conference.updatedBy = "demo-admin";
    revalidatePath("/admin/registrations");
    revalidatePublic();
    return ok(open ? "Registration is open (demo)." : "Registration is closed (demo).");
  }

  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    const { error } = await client.from("conference_settings").upsert({
      id: 1,
      registration_open: open,
      updated_at: nowIso(),
      updated_by: user?.id ?? null,
    });
    if (error) throw error;
    revalidatePath("/admin/registrations");
    revalidatePublic();
    return ok(open ? "Registration is open." : "Registration is closed.");
  } catch (error) {
    console.warn("[meritmun/admin] setRegistrationOpen", error);
    return fail("Could not update registration. Run migration 004 if this table is missing.");
  }
}

export async function createCommittee(input: {
  name: string;
  abbr: string;
  type: CommitteeType;
  difficulty: Difficulty;
  agenda: string;
  seats: number;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const abbr = input.abbr.trim().toUpperCase();
  const agenda = input.agenda.trim();
  const seats = Math.max(0, Math.floor(input.seats));
  if (!name || !abbr) return fail("Name and abbreviation are required.");
  if (!COMMITTEE_TYPES.includes(input.type)) return fail("Choose a committee type.");
  if (!DIFFICULTIES.includes(input.difficulty)) return fail("Choose a difficulty.");

  let slug = slugify(abbr) || slugify(name);
  if (!slug) slug = `committee-${Date.now()}`;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.committees.some((c) => c.slug === slug || c.abbr === abbr)) {
      return fail("A committee with that abbreviation already exists.");
    }
    const row: CommitteeAdminRecord = {
      id: newId(),
      slug,
      name,
      abbr,
      type: input.type,
      difficulty: input.difficulty,
      hardnessScore: 5,
      agenda,
      overview: "",
      focusPoints: [],
      seats,
      studyGuidePath: null,
      studyGuideUrl: null,
      featured: false,
      isPublished: true,
      sortOrder: store.committees.length + 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.committees.push(row);
    revalidatePath("/admin/committees");
    revalidatePath("/committees");
    return ok("Committee created (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("committees").insert({
      slug,
      name,
      abbr,
      type: input.type,
      difficulty: input.difficulty,
      hardness_score: 5,
      agenda,
      overview: "",
      focus_points: [],
      seats,
      featured: false,
      is_published: true,
      sort_order: 0,
    });
    if (error) {
      if (error.code === "23505") {
        return fail("A committee with that slug or abbreviation already exists.");
      }
      throw error;
    }
    revalidatePath("/admin/committees");
    revalidatePath("/committees");
    return ok("Committee created.");
  } catch (error) {
    console.warn("[meritmun/admin] createCommittee", error);
    return fail("Could not create the committee.");
  }
}

export async function createEbMember(input: {
  name: string;
  role: string;
  bio: string;
  email: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !role) return fail("Name and role are required.");
  const email = input.email.trim() || null;
  const bio = input.bio.trim();
  const initials = initialsFromName(name);

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const row: EbMemberRecord = {
      id: newId(),
      name,
      role,
      bio,
      email,
      photoPath: null,
      photoUrl: null,
      initials,
      sortOrder: store.ebMembers.length + 1,
      isPublished: true,
    };
    store.ebMembers.push(row);
    revalidatePath("/admin/eb");
    revalidatePath("/executive-board");
    return ok("EB member added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("eb_members").insert({
      name,
      role,
      bio,
      email,
      initials,
      sort_order: 0,
      is_published: true,
    });
    if (error) throw error;
    revalidatePath("/admin/eb");
    revalidatePath("/executive-board");
    return ok("EB member added.");
  } catch (error) {
    console.warn("[meritmun/admin] createEbMember", error);
    return fail("Could not add the EB member.");
  }
}

export async function setEbMemberPublished(
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    const member = getDemoStore().ebMembers.find((m) => m.id === id);
    if (!member) return fail("Member not found.");
    member.isPublished = isPublished;
    revalidatePath("/admin/eb");
    revalidatePath("/executive-board");
    return ok("Updated (demo).");
  }
  try {
    const client = await createClient();
    const { error } = await client
      .from("eb_members")
      .update({ is_published: isPublished })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/eb");
    revalidatePath("/executive-board");
    return ok("Updated.");
  } catch (error) {
    console.warn("[meritmun/admin] setEbMemberPublished", error);
    return fail("Could not update the member.");
  }
}

export async function createSponsor(input: {
  name: string;
  url: string;
  logoUrl: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name || !url) return fail("Name and URL are required.");
  const logoUrl = input.logoUrl.trim();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const row: SponsorRecord = {
      id: newId(),
      name,
      logoPath: null,
      logoUrl,
      url,
      sortOrder: store.sponsors.length + 1,
      isActive: true,
    };
    store.sponsors.push(row);
    revalidatePath("/admin/sponsors");
    revalidatePath("/");
    return ok("Sponsor added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("sponsors").insert({
      name,
      url,
      logo_url: logoUrl,
      sort_order: 0,
      is_active: true,
    });
    if (error) throw error;
    revalidatePath("/admin/sponsors");
    revalidatePath("/");
    return ok("Sponsor added.");
  } catch (error) {
    console.warn("[meritmun/admin] createSponsor", error);
    return fail("Could not add the sponsor.");
  }
}

export async function setSponsorActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    const sponsor = getDemoStore().sponsors.find((s) => s.id === id);
    if (!sponsor) return fail("Sponsor not found.");
    sponsor.isActive = isActive;
    revalidatePath("/admin/sponsors");
    revalidatePath("/");
    return ok("Updated (demo).");
  }
  try {
    const client = await createClient();
    const { error } = await client
      .from("sponsors")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/sponsors");
    revalidatePath("/");
    return ok("Updated.");
  } catch (error) {
    console.warn("[meritmun/admin] setSponsorActive", error);
    return fail("Could not update the sponsor.");
  }
}

export async function createSecretariatMember(input: {
  name: string;
  role: string;
  committeeId: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !role || !input.committeeId) {
    return fail("Name, role, and committee are required.");
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (!store.committees.some((c) => c.id === input.committeeId)) {
      return fail("Committee not found.");
    }
    const row: SecretariatMemberRecord = {
      id: newId(),
      committeeId: input.committeeId,
      name,
      role,
      initials: initialsFromName(name),
      sortOrder: store.secretariat.length + 1,
    };
    store.secretariat.push(row);
    revalidatePath("/admin/secretariat-hods");
    return ok("Secretariat member added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("secretariat_members").insert({
      committee_id: input.committeeId,
      name,
      role,
      initials: initialsFromName(name),
      sort_order: 0,
    });
    if (error) throw error;
    revalidatePath("/admin/secretariat-hods");
    return ok("Secretariat member added.");
  } catch (error) {
    console.warn("[meritmun/admin] createSecretariatMember", error);
    return fail("Could not add the secretariat member.");
  }
}

export async function createHod(input: {
  name: string;
  role: string;
  bio: string;
  email: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !role) return fail("Name and role are required.");

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const row: HodRecord = {
      id: newId(),
      name,
      role,
      bio: input.bio.trim(),
      email: input.email.trim() || null,
      photoPath: null,
      photoUrl: null,
      initials: initialsFromName(name),
      sortOrder: store.hods.length + 1,
      isPublished: true,
    };
    store.hods.push(row);
    revalidatePath("/admin/secretariat-hods");
    return ok("HOD added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("hods").insert({
      name,
      role,
      bio: input.bio.trim(),
      email: input.email.trim() || null,
      initials: initialsFromName(name),
      sort_order: 0,
      is_published: true,
    });
    if (error) throw error;
    revalidatePath("/admin/secretariat-hods");
    return ok("HOD added.");
  } catch (error) {
    console.warn("[meritmun/admin] createHod", error);
    return fail("Could not add the HOD.");
  }
}

export async function createScheduleDay(input: {
  label: string;
  theme: string;
  date: string;
}): Promise<ActionResult> {
  const label = input.label.trim();
  if (!label) return fail("Give the day a label.");
  const date = input.date.trim() || null;
  const theme = input.theme.trim();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const row: ScheduleDayRecord = {
      id: newId(),
      date,
      label,
      theme,
      sortOrder: store.schedule.length + 1,
      items: [],
    };
    store.schedule.push(row);
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Day added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("schedule_days").insert({
      label,
      theme,
      date,
      sort_order: 0,
    });
    if (error) throw error;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Day added.");
  } catch (error) {
    console.warn("[meritmun/admin] createScheduleDay", error);
    return fail("Could not add the day. Run migration 004 if the table is missing.");
  }
}

export async function updateScheduleDay(
  id: string,
  input: { label: string; theme: string; date: string },
): Promise<ActionResult> {
  const label = input.label.trim();
  if (!label) return fail("Give the day a label.");
  const date = input.date.trim() || null;
  const theme = input.theme.trim();

  if (!isSupabaseConfigured()) {
    const day = getDemoStore().schedule.find((d) => d.id === id);
    if (!day) return fail("Day not found.");
    day.label = label;
    day.theme = theme;
    day.date = date;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Day saved (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("schedule_days")
      .update({ label, theme, date })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Day saved.");
  } catch (error) {
    console.warn("[meritmun/admin] updateScheduleDay", error);
    return fail("Could not save the day.");
  }
}

export async function deleteScheduleDay(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.schedule = store.schedule.filter((d) => d.id !== id);
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Day removed (demo).");
  }
  try {
    const client = await createClient();
    const { error } = await client.from("schedule_days").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Day removed.");
  } catch (error) {
    console.warn("[meritmun/admin] deleteScheduleDay", error);
    return fail("Could not remove the day.");
  }
}

export async function createScheduleItem(input: {
  dayId: string;
  start: string;
  end: string;
  title: string;
  kind: ScheduleKind;
  venue: string;
  description: string;
}): Promise<ActionResult> {
  const title = input.title.trim();
  const start = input.start.trim();
  const end = input.end.trim();
  if (!title) return fail("Give the session a title.");
  if (!isTime(start) || !isTime(end)) {
    return fail("Use 24-hour times like 09:00.");
  }
  if (!SCHEDULE_KINDS.includes(input.kind)) return fail("Choose a session type.");

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const day = store.schedule.find((d) => d.id === input.dayId);
    if (!day) return fail("Day not found.");
    const row: ScheduleItemRecord = {
      id: newId(),
      dayId: input.dayId,
      start,
      end,
      title,
      kind: input.kind,
      venue: input.venue.trim(),
      description: input.description.trim() || null,
      sortOrder: day.items.length + 1,
    };
    day.items.push(row);
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Session added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("schedule_items").insert({
      day_id: input.dayId,
      start_time: start,
      end_time: end,
      title,
      kind: input.kind,
      venue: input.venue.trim(),
      description: input.description.trim() || null,
      sort_order: 0,
    });
    if (error) throw error;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Session added.");
  } catch (error) {
    console.warn("[meritmun/admin] createScheduleItem", error);
    return fail("Could not add the session.");
  }
}

export async function updateScheduleItem(
  id: string,
  input: {
    start: string;
    end: string;
    title: string;
    kind: ScheduleKind;
    venue: string;
    description: string;
  },
): Promise<ActionResult> {
  const title = input.title.trim();
  const start = input.start.trim();
  const end = input.end.trim();
  if (!title) return fail("Give the session a title.");
  if (!isTime(start) || !isTime(end)) {
    return fail("Use 24-hour times like 09:00.");
  }
  if (!SCHEDULE_KINDS.includes(input.kind)) return fail("Choose a session type.");

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const item = store.schedule
      .flatMap((d) => d.items)
      .find((row) => row.id === id);
    if (!item) return fail("Session not found.");
    item.start = start;
    item.end = end;
    item.title = title;
    item.kind = input.kind;
    item.venue = input.venue.trim();
    item.description = input.description.trim() || null;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Session saved (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("schedule_items")
      .update({
        start_time: start,
        end_time: end,
        title,
        kind: input.kind,
        venue: input.venue.trim(),
        description: input.description.trim() || null,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Session saved.");
  } catch (error) {
    console.warn("[meritmun/admin] updateScheduleItem", error);
    return fail("Could not save the session.");
  }
}

export async function deleteScheduleItem(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    for (const day of store.schedule) {
      day.items = day.items.filter((item) => item.id !== id);
    }
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Session removed (demo).");
  }
  try {
    const client = await createClient();
    const { error } = await client.from("schedule_items").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    return ok("Session removed.");
  } catch (error) {
    console.warn("[meritmun/admin] deleteScheduleItem", error);
    return fail("Could not remove the session.");
  }
}
