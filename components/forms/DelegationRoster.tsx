"use client";

import { Plus } from "@/components/icons/Plus";
import { UserPlus } from "@/components/icons/UserPlus";
import { Button } from "@/components/ui/Button";
import { Field, describedBy } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { memberField } from "@/lib/validation";
import type {
  Committee,
  DelegationMember,
  ExperienceLevel,
} from "@/lib/types";

export const EMPTY_MEMBER: DelegationMember = {
  fullName: "",
  email: "",
  phone: "",
  experience: "" as ExperienceLevel,
  priorAwards: null,
  committeePrefs: ["", "", ""],
};

/** DOM id of one roster control — also how the stepper focuses the first error. */
export function memberControlId(index: number, field: string): string {
  return `member-${index}-${field}`;
}

const EXPERIENCE_OPTIONS = [
  { value: "first-time", label: "First conference" },
  { value: "1-3", label: "1–3 conferences" },
  { value: "4-9", label: "4–9 conferences" },
  { value: "10-plus", label: "10 or more" },
];

const PREF_LABELS = ["First choice", "Second choice", "Third choice"];

type DelegationRosterProps = {
  members: DelegationMember[];
  committees: Pick<Committee, "slug" | "abbr" | "name">[];
  maxMembers: number;
  head: { name: string; email: string; phone: string };
  errorFor: (field: string) => string | undefined;
  onChange: (members: DelegationMember[]) => void;
  onTouch: (field: string) => void;
};

export function DelegationRoster({
  members,
  committees,
  maxMembers,
  head,
  errorFor,
  onChange,
  onTouch,
}: DelegationRosterProps) {
  const committeeOptions = committees.map((committee) => ({
    value: committee.slug,
    label: `${committee.abbr} — ${committee.name}`,
  }));

  const headListed = members.some(
    (m) =>
      head.email.trim() !== "" &&
      m.email.trim().toLowerCase() === head.email.trim().toLowerCase(),
  );

  function update(index: number, patch: Partial<DelegationMember>) {
    onChange(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function setPref(index: number, slot: number, slug: string) {
    const prefs = [...members[index]!.committeePrefs];
    prefs[slot] = slug;
    update(index, { committeePrefs: prefs });
  }

  function remove(index: number) {
    onChange(members.filter((_, i) => i !== index));
  }

  function addHead() {
    onChange([
      {
        ...EMPTY_MEMBER,
        fullName: head.name,
        email: head.email,
        phone: head.phone,
      },
      ...members,
    ]);
  }

  return (
    <div className="grid gap-5">
      {members.map((member, index) => {
        const err = (field: string) => errorFor(memberField(index, field));
        const id = (field: string) => memberControlId(index, field);
        const touch = (field: string) => onTouch(memberField(index, field));

        return (
          <section
            key={index}
            aria-labelledby={id("heading")}
            className="rounded-md border border-line bg-surface p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id={id("heading")} className="text-sm font-semibold text-fg">
                Delegate {index + 1}
                {member.fullName.trim() ? (
                  <span className="font-normal text-fg-muted"> — {member.fullName}</span>
                ) : null}
              </h3>
              <button
                type="button"
                className="text-sm font-medium text-danger-fg hover:underline"
                onClick={() => remove(index)}
              >
                Remove
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                htmlFor={id("fullName")}
                error={err("fullName")}
                className="sm:col-span-2"
              >
                <Input
                  id={id("fullName")}
                  value={member.fullName}
                  invalid={Boolean(err("fullName"))}
                  aria-describedby={describedBy(id("fullName"), err("fullName"))}
                  onChange={(e) => update(index, { fullName: e.target.value })}
                  onBlur={() => touch("fullName")}
                />
              </Field>

              <Field label="Email address" htmlFor={id("email")} error={err("email")}>
                <Input
                  id={id("email")}
                  type="email"
                  value={member.email}
                  invalid={Boolean(err("email"))}
                  aria-describedby={describedBy(id("email"), err("email"))}
                  onChange={(e) => update(index, { email: e.target.value })}
                  onBlur={() => touch("email")}
                />
              </Field>

              <Field
                label="Phone number"
                htmlFor={id("phone")}
                helper="WhatsApp preferred — used for conference-day logistics."
                error={err("phone")}
              >
                <Input
                  id={id("phone")}
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={member.phone}
                  invalid={Boolean(err("phone"))}
                  aria-describedby={describedBy(
                    id("phone"),
                    err("phone"),
                    "WhatsApp preferred — used for conference-day logistics.",
                  )}
                  onChange={(e) => update(index, { phone: e.target.value })}
                  onBlur={() => touch("phone")}
                />
              </Field>

              <Field
                label="MUN experience"
                htmlFor={id("experience")}
                error={err("experience")}
                className="sm:col-span-2"
              >
                <Select
                  id={id("experience")}
                  placeholder="Choose one"
                  options={EXPERIENCE_OPTIONS}
                  value={member.experience}
                  invalid={Boolean(err("experience"))}
                  aria-describedby={describedBy(id("experience"), err("experience"))}
                  onChange={(e) => {
                    update(index, { experience: e.target.value as ExperienceLevel });
                    touch("experience");
                  }}
                />
              </Field>

              {[0, 1, 2].map((slot) => (
                <Field
                  key={slot}
                  label={PREF_LABELS[slot]!}
                  htmlFor={id(slot === 0 ? "committeePrefs" : `pref${slot}`)}
                  error={slot === 0 ? err("committeePrefs") : undefined}
                  className={slot === 0 ? "sm:col-span-2" : undefined}
                >
                  <Select
                    id={id(slot === 0 ? "committeePrefs" : `pref${slot}`)}
                    placeholder="Choose a committee"
                    options={committeeOptions.filter(
                      (option) =>
                        !member.committeePrefs.some(
                          (chosen, other) => other !== slot && chosen === option.value,
                        ),
                    )}
                    value={member.committeePrefs[slot] ?? ""}
                    invalid={slot === 0 && Boolean(err("committeePrefs"))}
                    aria-describedby={
                      slot === 0
                        ? describedBy(id("committeePrefs"), err("committeePrefs"))
                        : undefined
                    }
                    onChange={(e) => {
                      setPref(index, slot, e.target.value);
                      touch("committeePrefs");
                    }}
                  />
                </Field>
              ))}

              <Field
                label="Awards or roles"
                htmlFor={id("priorAwards")}
                optional
                className="sm:col-span-2"
              >
                <Textarea
                  id={id("priorAwards")}
                  rows={2}
                  value={member.priorAwards ?? ""}
                  placeholder="Best Delegate, chairing, secretariat roles…"
                  onChange={(e) => update(index, { priorAwards: e.target.value })}
                />
              </Field>
            </div>
          </section>
        );
      })}

      {errorFor("members") ? (
        <p id="members-error" role="alert" className="text-sm text-danger-fg">
          {errorFor("members")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          id="members"
          iconStart={<Plus className="size-4" />}
          disabled={members.length >= maxMembers}
          onClick={() => {
            onChange([...members, { ...EMPTY_MEMBER, committeePrefs: ["", "", ""] }]);
          }}
        >
          Add a delegate
        </Button>
        {!headListed && head.name.trim() !== "" ? (
          <Button
            type="button"
            variant="ghost"
            iconStart={<UserPlus className="size-4" />}
            disabled={members.length >= maxMembers}
            onClick={addHead}
          >
            I&apos;m attending as a delegate too
          </Button>
        ) : null}
      </div>

      <input type="hidden" name="members" value={JSON.stringify(members)} />
    </div>
  );
}
