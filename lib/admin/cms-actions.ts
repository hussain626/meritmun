"use server";

import { revalidatePath } from "next/cache";
import { isSafeHttpUrl } from "@/lib/admin/announcement";
import { authorizeAction } from "@/lib/admin/auth";
import { getDemoStore } from "@/lib/admin/demo-store";
import type {
  AdminRole,
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

/** Content is edited by admins and the EB (RLS: is_eb_or_admin). */
const STAFF: AdminRole[] = ["admin", "eb"];

type Client = Awaited<ReturnType<typeof createClient>>;

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

/** Public links and images: a full http(s) URL, or a path on this site. */
function isSafeLink(value: string): boolean {
  return isSafeHttpUrl(value) || (/^\/[^/\\]/.test(value) && !value.includes(".."));
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

/**
 * Next sort position, so new rows land at the end of their list in Supabase
 * exactly as they do in demo mode (not at the top with sort_order 0).
 */
async function nextSortOrder(
  client: Client,
  table: string,
  scope?: { column: string; value: string },
): Promise<number> {
  let query = client
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (scope) query = query.eq(scope.column, scope.value);
  const { data, error } = await query;
  if (error) throw error;
  const top = data?.[0] as { sort_order?: unknown } | undefined;
  return (typeof top?.sort_order === "number" ? top.sort_order : 0) + 1;
}

/** Swap a row with its neighbour in `rows` (already sorted), returning both new orders. */
function swapWithNeighbour<T extends { id: string; sortOrder: number }>(
  rows: T[],
  id: string,
  direction: -1 | 1,
): [T, T] | null {
  const index = rows.findIndex((r) => r.id === id);
  const other = rows[index + direction];
  if (index < 0 || !other) return null;
  return [rows[index], other];
}

/* ── Registration gate ───────────────────────────────────────────────────── */

export async function setRegistrationOpen(
  open: boolean,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "open or close registration");
  if (!auth.ok) return auth;

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
    const { error } = await client.from("conference_settings").upsert({
      id: 1,
      registration_open: open,
      updated_at: nowIso(),
      updated_by: auth.session.user.id,
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

/* ── Committees ──────────────────────────────────────────────────────────── */

/**
 * New committees start unpublished: they go live from their admin page once
 * the overview and country list exist, so delegates never pick an empty one.
 */
export async function createCommittee(input: {
  name: string;
  abbr: string;
  type: CommitteeType;
  difficulty: Difficulty;
  agenda: string;
  seats: number;
}): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "create committees");
  if (!auth.ok) return auth;

  const name = input.name.trim();
  const abbr = input.abbr.trim().toUpperCase();
  const agenda = input.agenda.trim();
  const seats = Math.max(0, Math.floor(input.seats));
  if (!name || !abbr) return fail("Name and abbreviation are required.");
  if (!COMMITTEE_TYPES.includes(input.type)) return fail("Choose a committee type.");
  if (!DIFFICULTIES.includes(input.difficulty)) return fail("Choose a difficulty.");

  let slug = slugify(abbr) || slugify(name);
  if (!slug) slug = `committee-${Date.now()}`;
  const created =
    "Committee created as a draft. Add its overview and countries, then publish it from its page.";

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
      isPublished: false,
      allotmentsPaused: false,
      sortOrder: Math.max(0, ...store.committees.map((c) => c.sortOrder)) + 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.committees.push(row);
    revalidatePath("/admin/committees");
    revalidatePublic();
    return ok(`${created} (demo)`);
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
      is_published: false,
      sort_order: await nextSortOrder(client, "committees"),
    });
    if (error) {
      if (error.code === "23505") {
        return fail("A committee with that slug or abbreviation already exists.");
      }
      throw error;
    }
    revalidatePath("/admin/committees");
    revalidatePublic();
    return ok(created);
  } catch (error) {
    console.warn("[meritmun/admin] createCommittee", error);
    return fail("Could not create the committee.");
  }
}

/**
 * Delete a committee with no allotted seats (its countries and secretariat go
 * with it). Committees that already seated someone are unpublished instead,
 * since those seats and emails point at them.
 */
export async function deleteCommittee(id: string): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "delete committees");
  if (!auth.ok) return auth;
  const inUse =
    "Delegates already hold seats in this committee. Unpublish it instead, or move those seats first.";

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const committee = store.committees.find((c) => c.id === id);
    if (!committee) return fail("Committee not found.");
    if (store.allotments.some((a) => a.committeeId === id)) return fail(inUse);
    store.committees = store.committees.filter((c) => c.id !== id);
    store.portfolios = store.portfolios.filter((p) => p.committeeId !== id);
    store.secretariat = store.secretariat.filter((m) => m.committeeId !== id);
    revalidatePath("/admin/committees");
    revalidatePath("/admin/allotments");
    revalidatePublic();
    return ok(`${committee.abbr} deleted (demo).`);
  }

  try {
    const client = await createClient();
    const { count, error: countError } = await client
      .from("allotments")
      .select("id", { count: "exact", head: true })
      .eq("committee_id", id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) return fail(inUse);

    const { data, error } = await client
      .from("committees")
      .delete()
      .eq("id", id)
      .select("abbr");
    if (error) {
      if (error.code === "23503") return fail(inUse);
      throw error;
    }
    if (!data?.length) return fail("Committee not found.");
    revalidatePath("/admin/committees");
    revalidatePath("/admin/allotments");
    revalidatePublic();
    return ok(`${String(data[0].abbr)} deleted.`);
  } catch (error) {
    console.warn("[meritmun/admin] deleteCommittee", error);
    return fail("Could not delete the committee.");
  }
}

/* ── EB members and HODs (same shape, two tables) ────────────────────────── */

export type BoardKind = "eb" | "hod";

const BOARD_TABLE: Record<BoardKind, string> = { eb: "eb_members", hod: "hods" };
const BOARD_NOUN: Record<BoardKind, string> = { eb: "EB member", hod: "HOD" };

function boardRows(kind: BoardKind): (EbMemberRecord | HodRecord)[] {
  const store = getDemoStore();
  return kind === "eb" ? store.ebMembers : store.hods;
}

function revalidateBoard(): void {
  revalidatePath("/admin/eb");
  revalidatePath("/admin/secretariat-hods");
  revalidatePublic();
}

export type BoardMemberInput = {
  /** Omit to create. */
  id?: string;
  name: string;
  role: string;
  bio: string;
  email: string;
  photoUrl: string;
  isPublished?: boolean;
};

/** Create or edit an EB member or HOD. */
export async function saveBoardMember(
  kind: BoardKind,
  input: BoardMemberInput,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the board");
  if (!auth.ok) return auth;

  const noun = BOARD_NOUN[kind];
  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !role) return fail("Name and role are required.");
  const email = input.email.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Enter a valid email address, or leave it empty.");
  }
  const photoUrl = input.photoUrl.trim() || null;
  if (photoUrl && !isSafeLink(photoUrl)) {
    return fail("The photo must be an https:// link or a path on this site.");
  }
  const fields = {
    name,
    role,
    bio: input.bio.trim(),
    email,
    photoUrl,
    initials: initialsFromName(name),
  };

  if (!isSupabaseConfigured()) {
    const rows = boardRows(kind);
    if (input.id) {
      const row = rows.find((r) => r.id === input.id);
      if (!row) return fail(`${noun} not found.`);
      Object.assign(row, fields, {
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      });
    } else {
      rows.push({
        id: newId(),
        ...fields,
        photoPath: null,
        sortOrder: Math.max(0, ...rows.map((r) => r.sortOrder)) + 1,
        isPublished: input.isPublished ?? true,
      });
    }
    revalidateBoard();
    return ok(`${noun} ${input.id ? "saved" : "added"} (demo).`);
  }

  try {
    const client = await createClient();
    const table = BOARD_TABLE[kind];
    const row = {
      name: fields.name,
      role: fields.role,
      bio: fields.bio,
      email: fields.email,
      photo_url: fields.photoUrl,
      initials: fields.initials,
      ...(input.isPublished !== undefined ? { is_published: input.isPublished } : {}),
    };
    const { data, error } = input.id
      ? await client.from(table).update(row).eq("id", input.id).select("id")
      : await client
          .from(table)
          .insert({
            ...row,
            is_published: input.isPublished ?? true,
            sort_order: await nextSortOrder(client, table),
          })
          .select("id");
    if (error) throw error;
    if (!data?.length) return fail(`${noun} not found.`);
    revalidateBoard();
    return ok(`${noun} ${input.id ? "saved" : "added"}.`);
  } catch (error) {
    console.warn("[meritmun/admin] saveBoardMember", error);
    return fail(`Could not save the ${noun}.`);
  }
}

export async function setBoardMemberPublished(
  kind: BoardKind,
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the board");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const member = boardRows(kind).find((m) => m.id === id);
    if (!member) return fail("Member not found.");
    member.isPublished = isPublished;
    revalidateBoard();
    return ok("Updated (demo).");
  }
  try {
    const client = await createClient();
    const { data, error } = await client
      .from(BOARD_TABLE[kind])
      .update({ is_published: isPublished })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("Member not found.");
    revalidateBoard();
    return ok("Updated.");
  } catch (error) {
    console.warn("[meritmun/admin] setBoardMemberPublished", error);
    return fail("Could not update the member.");
  }
}

export async function deleteBoardMember(
  kind: BoardKind,
  id: string,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the board");
  if (!auth.ok) return auth;
  const noun = BOARD_NOUN[kind];

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (kind === "eb") {
      store.ebMembers = store.ebMembers.filter((m) => m.id !== id);
    } else {
      store.hods = store.hods.filter((m) => m.id !== id);
    }
    revalidateBoard();
    return ok(`${noun} removed (demo).`);
  }
  try {
    const client = await createClient();
    const { data, error } = await client
      .from(BOARD_TABLE[kind])
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail(`${noun} not found.`);
    revalidateBoard();
    return ok(`${noun} removed.`);
  } catch (error) {
    console.warn("[meritmun/admin] deleteBoardMember", error);
    return fail(`Could not remove the ${noun}.`);
  }
}

export async function moveBoardMember(
  kind: BoardKind,
  id: string,
  direction: -1 | 1,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the board");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const rows = [...boardRows(kind)].sort((a, b) => a.sortOrder - b.sortOrder);
    rows.forEach((r, i) => (r.sortOrder = i + 1));
    const pair = swapWithNeighbour(rows, id, direction);
    if (!pair) return ok("Already at the edge.");
    [pair[0].sortOrder, pair[1].sortOrder] = [pair[1].sortOrder, pair[0].sortOrder];
    revalidateBoard();
    return ok("Order saved (demo).");
  }
  return moveRow(BOARD_TABLE[kind], id, direction, undefined, revalidateBoard);
}

/** Supabase reorder: renumber the list 1..n with the row swapped. */
async function moveRow(
  table: string,
  id: string,
  direction: -1 | 1,
  scope: { column: string; value: string } | undefined,
  revalidate: () => void,
): Promise<ActionResult> {
  try {
    const client = await createClient();
    let query = client
      .from(table)
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (scope) query = query.eq(scope.column, scope.value);
    const { data, error } = await query;
    if (error) throw error;
    const ids = (data ?? []).map((r) => String((r as { id: unknown }).id));
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0) return fail("Row not found.");
    if (target < 0 || target >= ids.length) return ok("Already at the edge.");
    [ids[index], ids[target]] = [ids[target], ids[index]];
    for (let i = 0; i < ids.length; i += 1) {
      const { error: updateError } = await client
        .from(table)
        .update({ sort_order: i + 1 })
        .eq("id", ids[i]);
      if (updateError) throw updateError;
    }
    revalidate();
    return ok("Order saved.");
  } catch (error) {
    console.warn(`[meritmun/admin] move ${table}`, error);
    return fail("Could not save the new order.");
  }
}

/** Kept for existing callers. */
export async function createEbMember(input: {
  name: string;
  role: string;
  bio: string;
  email: string;
  photoUrl?: string;
}): Promise<ActionResult> {
  return saveBoardMember("eb", { ...input, photoUrl: input.photoUrl ?? "" });
}

export async function setEbMemberPublished(
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  return setBoardMemberPublished("eb", id, isPublished);
}

export async function createHod(input: {
  name: string;
  role: string;
  bio: string;
  email: string;
  photoUrl?: string;
}): Promise<ActionResult> {
  return saveBoardMember("hod", { ...input, photoUrl: input.photoUrl ?? "" });
}

/* ── Sponsors ────────────────────────────────────────────────────────────── */

function revalidateSponsors(): void {
  revalidatePath("/admin/sponsors");
  revalidatePublic();
}

export type SponsorInput = {
  id?: string;
  name: string;
  url: string;
  logoUrl: string;
  isActive?: boolean;
};

export async function saveSponsor(input: SponsorInput): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit sponsors");
  if (!auth.ok) return auth;

  const name = input.name.trim();
  const url = input.url.trim();
  const logoUrl = input.logoUrl.trim();
  if (!name || !url) return fail("Name and website are required.");
  if (!isSafeHttpUrl(url)) return fail("The website must be a full https:// link.");
  if (logoUrl && !isSafeLink(logoUrl)) {
    return fail("The logo must be an https:// image link or a path on this site.");
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (input.id) {
      const row = store.sponsors.find((s) => s.id === input.id);
      if (!row) return fail("Sponsor not found.");
      Object.assign(row, {
        name,
        url,
        logoUrl,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
    } else {
      const row: SponsorRecord = {
        id: newId(),
        name,
        logoPath: null,
        logoUrl,
        url,
        sortOrder: Math.max(0, ...store.sponsors.map((s) => s.sortOrder)) + 1,
        isActive: input.isActive ?? true,
      };
      store.sponsors.push(row);
    }
    revalidateSponsors();
    return ok(input.id ? "Sponsor saved (demo)." : "Sponsor added (demo).");
  }

  try {
    const client = await createClient();
    const row = {
      name,
      url,
      logo_url: logoUrl,
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    };
    const { data, error } = input.id
      ? await client.from("sponsors").update(row).eq("id", input.id).select("id")
      : await client
          .from("sponsors")
          .insert({
            ...row,
            is_active: input.isActive ?? true,
            sort_order: await nextSortOrder(client, "sponsors"),
          })
          .select("id");
    if (error) throw error;
    if (!data?.length) return fail("Sponsor not found.");
    revalidateSponsors();
    return ok(input.id ? "Sponsor saved." : "Sponsor added.");
  } catch (error) {
    console.warn("[meritmun/admin] saveSponsor", error);
    return fail("Could not save the sponsor.");
  }
}

/** Kept for existing callers. */
export async function createSponsor(input: {
  name: string;
  url: string;
  logoUrl: string;
}): Promise<ActionResult> {
  return saveSponsor(input);
}

export async function setSponsorActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit sponsors");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const sponsor = getDemoStore().sponsors.find((s) => s.id === id);
    if (!sponsor) return fail("Sponsor not found.");
    sponsor.isActive = isActive;
    revalidateSponsors();
    return ok("Updated (demo).");
  }
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("sponsors")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("Sponsor not found.");
    revalidateSponsors();
    return ok("Updated.");
  } catch (error) {
    console.warn("[meritmun/admin] setSponsorActive", error);
    return fail("Could not update the sponsor.");
  }
}

export async function deleteSponsor(id: string): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit sponsors");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.sponsors = store.sponsors.filter((s) => s.id !== id);
    revalidateSponsors();
    return ok("Sponsor removed (demo).");
  }
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("sponsors")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("Sponsor not found.");
    revalidateSponsors();
    return ok("Sponsor removed.");
  } catch (error) {
    console.warn("[meritmun/admin] deleteSponsor", error);
    return fail("Could not remove the sponsor.");
  }
}

export async function moveSponsor(
  id: string,
  direction: -1 | 1,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit sponsors");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const rows = [...getDemoStore().sponsors].sort((a, b) => a.sortOrder - b.sortOrder);
    rows.forEach((r, i) => (r.sortOrder = i + 1));
    const pair = swapWithNeighbour(rows, id, direction);
    if (!pair) return ok("Already at the edge.");
    [pair[0].sortOrder, pair[1].sortOrder] = [pair[1].sortOrder, pair[0].sortOrder];
    revalidateSponsors();
    return ok("Order saved (demo).");
  }
  return moveRow("sponsors", id, direction, undefined, revalidateSponsors);
}

/* ── Committee secretariat (chairs shown on committee pages) ─────────────── */

function revalidateSecretariat(): void {
  revalidatePath("/admin/secretariat-hods");
  revalidatePublic();
}

export type SecretariatInput = {
  id?: string;
  name: string;
  role: string;
  committeeId: string;
};

export async function saveSecretariatMember(
  input: SecretariatInput,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the secretariat");
  if (!auth.ok) return auth;

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
    if (input.id) {
      const row = store.secretariat.find((m) => m.id === input.id);
      if (!row) return fail("Secretariat member not found.");
      if (row.committeeId !== input.committeeId) {
        row.sortOrder =
          Math.max(
            0,
            ...store.secretariat
              .filter((m) => m.committeeId === input.committeeId)
              .map((m) => m.sortOrder),
          ) + 1;
      }
      Object.assign(row, {
        name,
        role,
        committeeId: input.committeeId,
        initials: initialsFromName(name),
      });
    } else {
      const row: SecretariatMemberRecord = {
        id: newId(),
        committeeId: input.committeeId,
        name,
        role,
        initials: initialsFromName(name),
        sortOrder:
          Math.max(
            0,
            ...store.secretariat
              .filter((m) => m.committeeId === input.committeeId)
              .map((m) => m.sortOrder),
          ) + 1,
      };
      store.secretariat.push(row);
    }
    revalidateSecretariat();
    return ok(input.id ? "Secretariat member saved (demo)." : "Secretariat member added (demo).");
  }

  try {
    const client = await createClient();
    const scope = { column: "committee_id", value: input.committeeId };
    const row = {
      committee_id: input.committeeId,
      name,
      role,
      initials: initialsFromName(name),
    };
    let data: unknown[] | null;
    let error: unknown;
    if (input.id) {
      const { data: current, error: fetchError } = await client
        .from("secretariat_members")
        .select("committee_id")
        .eq("id", input.id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!current) return fail("Secretariat member not found.");
      const moved = String(current.committee_id) !== input.committeeId;
      ({ data, error } = await client
        .from("secretariat_members")
        .update({
          ...row,
          ...(moved ? { sort_order: await nextSortOrder(client, "secretariat_members", scope) } : {}),
        })
        .eq("id", input.id)
        .select("id"));
    } else {
      ({ data, error } = await client
        .from("secretariat_members")
        .insert({
          ...row,
          sort_order: await nextSortOrder(client, "secretariat_members", scope),
        })
        .select("id"));
    }
    if (error) throw error;
    if (!data?.length) return fail("Secretariat member not found.");
    revalidateSecretariat();
    return ok(input.id ? "Secretariat member saved." : "Secretariat member added.");
  } catch (error) {
    console.warn("[meritmun/admin] saveSecretariatMember", error);
    return fail("Could not save the secretariat member.");
  }
}

/** Kept for existing callers. */
export async function createSecretariatMember(input: {
  name: string;
  role: string;
  committeeId: string;
}): Promise<ActionResult> {
  return saveSecretariatMember(input);
}

export async function deleteSecretariatMember(id: string): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the secretariat");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.secretariat = store.secretariat.filter((m) => m.id !== id);
    revalidateSecretariat();
    return ok("Secretariat member removed (demo).");
  }
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("secretariat_members")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return fail("Secretariat member not found.");
    revalidateSecretariat();
    return ok("Secretariat member removed.");
  } catch (error) {
    console.warn("[meritmun/admin] deleteSecretariatMember", error);
    return fail("Could not remove the secretariat member.");
  }
}

export async function moveSecretariatMember(
  id: string,
  direction: -1 | 1,
): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the secretariat");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const member = store.secretariat.find((m) => m.id === id);
    if (!member) return fail("Secretariat member not found.");
    const rows = store.secretariat
      .filter((m) => m.committeeId === member.committeeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    rows.forEach((r, i) => (r.sortOrder = i + 1));
    const pair = swapWithNeighbour(rows, id, direction);
    if (!pair) return ok("Already at the edge.");
    [pair[0].sortOrder, pair[1].sortOrder] = [pair[1].sortOrder, pair[0].sortOrder];
    revalidateSecretariat();
    return ok("Order saved (demo).");
  }

  try {
    const client = await createClient();
    const { data: member, error } = await client
      .from("secretariat_members")
      .select("committee_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!member) return fail("Secretariat member not found.");
    return moveRow(
      "secretariat_members",
      id,
      direction,
      { column: "committee_id", value: String(member.committee_id) },
      revalidateSecretariat,
    );
  } catch (error) {
    console.warn("[meritmun/admin] moveSecretariatMember", error);
    return fail("Could not save the new order.");
  }
}

/* ── Schedule ────────────────────────────────────────────────────────────── */

function revalidateSchedule(): void {
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
}

export async function createScheduleDay(input: {
  label: string;
  theme: string;
  date: string;
}): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the schedule");
  if (!auth.ok) return auth;

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
      sortOrder: Math.max(0, ...store.schedule.map((d) => d.sortOrder)) + 1,
      items: [],
    };
    store.schedule.push(row);
    revalidateSchedule();
    return ok("Day added (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("schedule_days").insert({
      label,
      theme,
      date,
      sort_order: await nextSortOrder(client, "schedule_days"),
    });
    if (error) throw error;
    revalidateSchedule();
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
  const auth = await authorizeAction(STAFF, "edit the schedule");
  if (!auth.ok) return auth;

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
    revalidateSchedule();
    return ok("Day saved (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("schedule_days")
      .update({ label, theme, date })
      .eq("id", id);
    if (error) throw error;
    revalidateSchedule();
    return ok("Day saved.");
  } catch (error) {
    console.warn("[meritmun/admin] updateScheduleDay", error);
    return fail("Could not save the day.");
  }
}

const ATTENDANCE_TAKEN =
  "Attendance has already been taken on this day. Deleting it would erase those records, so it was kept.";

export async function deleteScheduleDay(id: string): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the schedule");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.attendance.some((a) => a.dayId === id)) return fail(ATTENDANCE_TAKEN);
    store.schedule = store.schedule.filter((d) => d.id !== id);
    revalidateSchedule();
    return ok("Day removed (demo).");
  }
  try {
    const client = await createClient();
    // delegate_attendance.day_id cascades on delete, so check first.
    const { count, error: countError } = await client
      .from("delegate_attendance")
      .select("day_id", { count: "exact", head: true })
      .eq("day_id", id);
    if (countError && countError.code !== "42P01" && countError.code !== "PGRST205") {
      throw countError;
    }
    if ((count ?? 0) > 0) return fail(ATTENDANCE_TAKEN);

    const { error } = await client.from("schedule_days").delete().eq("id", id);
    if (error) throw error;
    revalidateSchedule();
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
  const auth = await authorizeAction(STAFF, "edit the schedule");
  if (!auth.ok) return auth;

  const title = input.title.trim();
  const start = input.start.trim();
  const end = input.end.trim();
  if (!title) return fail("Give the session a title.");
  if (!isTime(start) || !isTime(end)) {
    return fail("Use 24-hour times like 09:00.");
  }
  if (end <= start) return fail("The session must end after it starts.");
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
      sortOrder: Math.max(0, ...day.items.map((i) => i.sortOrder)) + 1,
    };
    day.items.push(row);
    day.items.sort((a, b) => a.start.localeCompare(b.start) || a.sortOrder - b.sortOrder);
    revalidateSchedule();
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
      sort_order: await nextSortOrder(client, "schedule_items", {
        column: "day_id",
        value: input.dayId,
      }),
    });
    if (error) throw error;
    revalidateSchedule();
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
  const auth = await authorizeAction(STAFF, "edit the schedule");
  if (!auth.ok) return auth;

  const title = input.title.trim();
  const start = input.start.trim();
  const end = input.end.trim();
  if (!title) return fail("Give the session a title.");
  if (!isTime(start) || !isTime(end)) {
    return fail("Use 24-hour times like 09:00.");
  }
  if (end <= start) return fail("The session must end after it starts.");
  if (!SCHEDULE_KINDS.includes(input.kind)) return fail("Choose a session type.");

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const day = store.schedule.find((d) => d.items.some((row) => row.id === id));
    const item = day?.items.find((row) => row.id === id);
    if (!day || !item) return fail("Session not found.");
    item.start = start;
    item.end = end;
    item.title = title;
    item.kind = input.kind;
    item.venue = input.venue.trim();
    item.description = input.description.trim() || null;
    day.items.sort((a, b) => a.start.localeCompare(b.start) || a.sortOrder - b.sortOrder);
    revalidateSchedule();
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
    revalidateSchedule();
    return ok("Session saved.");
  } catch (error) {
    console.warn("[meritmun/admin] updateScheduleItem", error);
    return fail("Could not save the session.");
  }
}

export async function deleteScheduleItem(id: string): Promise<ActionResult> {
  const auth = await authorizeAction(STAFF, "edit the schedule");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    for (const day of store.schedule) {
      day.items = day.items.filter((item) => item.id !== id);
    }
    revalidateSchedule();
    return ok("Session removed (demo).");
  }
  try {
    const client = await createClient();
    const { error } = await client.from("schedule_items").delete().eq("id", id);
    if (error) throw error;
    revalidateSchedule();
    return ok("Session removed.");
  } catch (error) {
    console.warn("[meritmun/admin] deleteScheduleItem", error);
    return fail("Could not remove the session.");
  }
}
