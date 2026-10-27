/**
 * Resend wrappers for admin / registration transactional mail.
 * Without RESEND_API_KEY, logs the payload and returns `mocked: true` — callers
 * must not report that an email went out in that case. Every send is recorded
 * in `email_logs` when the service role is available.
 */

import { Resend } from "resend";
import type { BankAccount } from "@/lib/admin/types";
import { createServiceClient } from "@/lib/supabase/server";

export type SendResult =
  | { ok: true; mocked: true }
  | { ok: true; mocked: false; id: string }
  | { ok: false; error: string };

const DEFAULT_FROM = "MeritMUN <noreply@meritmun.systemsummit.online>";

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : DEFAULT_FROM;
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

/** Links a sent email to the row it concerns, for `email_logs`. */
export type EmailRelated = { type: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Best-effort audit row; a logging failure never fails the send. */
async function logEmail(
  input: { template: string; to: string; related?: EmailRelated },
  result: SendResult,
): Promise<void> {
  const service = createServiceClient();
  if (!service) return;
  try {
    const { error } = await service.from("email_logs").insert({
      to_email: input.to,
      template: input.template,
      related_type: input.related?.type ?? null,
      related_id:
        input.related && UUID.test(input.related.id) ? input.related.id : null,
      provider_id: result.ok && !result.mocked ? result.id : null,
      status: !result.ok ? "failed" : result.mocked ? "mocked" : "sent",
    });
    if (error) console.warn("[meritmun/email] email_logs insert", error.message);
  } catch (error) {
    console.warn("[meritmun/email] email_logs insert", error);
  }
}

async function sendMail(input: {
  template: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  related?: EmailRelated;
}): Promise<SendResult> {
  let result: SendResult;
  const client = getResendClient();
  if (!client) {
    console.log("[meritmun/email] mocked send (no RESEND_API_KEY)", {
      template: input.template,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    result = { ok: true, mocked: true };
  } else {
    // Resend reports API errors in `error`, but network failures throw; both
    // become { ok: false } so a send can never abort the caller mid-batch.
    try {
      const { data, error } = await client.emails.send({
        from: getFromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      result = error
        ? { ok: false, error: error.message }
        : { ok: true, mocked: false, id: data?.id ?? "unknown" };
    } catch (error) {
      result = {
        ok: false,
        error: error instanceof Error ? error.message : "network error",
      };
    }
  }

  if (!result.ok) {
    console.warn(`[meritmun/email] ${input.template} → ${input.to} failed`, result.error);
  }
  await logEmail(input, result);
  return result;
}

/** Short suffix for admin toasts describing what happened to the email. */
export function deliveryNote(result: SendResult): string {
  if (!result.ok) {
    return `The email could not be sent: ${result.error}${resendHint(result.error)}`;
  }
  if (result.mocked) {
    return "No email was sent — RESEND_API_KEY is not set on this deployment (add it in Netlify with the Functions scope, then redeploy).";
  }
  return "Email sent.";
}

/** Turn Resend's most common rejections into the fix. */
function resendHint(error: string): string {
  const text = error.toLowerCase();
  if (text.includes("domain") && (text.includes("verif") || text.includes("not found"))) {
    return ` — the From address (${getFromAddress()}) must use a domain verified in Resend. Verify it under Resend → Domains, or set EMAIL_FROM to an address on a verified domain.`;
  }
  if (text.includes("testing emails") || text.includes("own email address")) {
    return " — Resend is in test mode and only delivers to your own address until a domain is verified.";
  }
  if (text.includes("api key") || text.includes("unauthorized") || text.includes("invalid")) {
    return " — check that RESEND_API_KEY is a valid, full-access key.";
  }
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bankBlock(accounts: BankAccount[]): { html: string; text: string } {
  const active = accounts.filter((a) => a.isActive);
  if (active.length === 0) {
    return {
      html: "<p>Bank details will follow from Delegate Affairs.</p>",
      text: "Bank details will follow from Delegate Affairs.",
    };
  }

  const html = active
    .map(
      (a) =>
        `<li><strong>${escapeHtml(a.bankName)}</strong> — ${escapeHtml(a.accountTitle)}<br/>` +
        `Account: ${escapeHtml(a.accountNumber)}` +
        (a.iban ? `<br/>IBAN: ${escapeHtml(a.iban)}` : "") +
        (a.instructions
          ? `<br/><em>${escapeHtml(a.instructions)}</em>`
          : "") +
        `</li>`,
    )
    .join("");

  const text = active
    .map(
      (a) =>
        `${a.bankName} — ${a.accountTitle}\nAccount: ${a.accountNumber}` +
        (a.iban ? `\nIBAN: ${a.iban}` : "") +
        (a.instructions ? `\n${a.instructions}` : ""),
    )
    .join("\n\n");

  return {
    html: `<ul>${html}</ul>`,
    text,
  };
}

export async function sendRegistrationConfirmation(input: {
  related?: EmailRelated;
  to: string;
  fullName: string;
  reference: string;
  delegateCode: string;
  feeAmount: number;
  currency: string;
  bankAccounts: BankAccount[];
}): Promise<SendResult> {
  const banks = bankBlock(input.bankAccounts);
  const subject = `MERITMUN III — Registration received (${input.delegateCode})`;
  const text =
    `Hello ${input.fullName},\n\n` +
    `We have your registration. Reference: ${input.reference}. ` +
    `Delegate code: ${input.delegateCode}.\n` +
    `Fee: ${input.currency} ${input.feeAmount}.\n\n` +
    `Pay using one of the active accounts below and keep your delegate code as the payment reference.\n\n` +
    `${banks.text}\n\n` +
    `— MERITMUN Secretariat`;

  const html =
    `<p>Hello ${escapeHtml(input.fullName)},</p>` +
    `<p>We have your registration.</p>` +
    `<p><strong>Reference:</strong> ${escapeHtml(input.reference)}<br/>` +
    `<strong>Delegate code:</strong> ${escapeHtml(input.delegateCode)}<br/>` +
    `<strong>Fee:</strong> ${escapeHtml(input.currency)} ${input.feeAmount}</p>` +
    `<p>Pay using one of the active accounts below and keep your delegate code as the payment reference.</p>` +
    banks.html +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "registration-confirmation",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

export async function sendDelegationRegistrationConfirmation(input: {
  related?: EmailRelated;
  to: string;
  headName: string;
  institutionName: string;
  reference: string;
  members: { fullName: string; delegateCode: string }[];
  feeAmount: number;
  currency: string;
  bankAccounts: BankAccount[];
}): Promise<SendResult> {
  const banks = bankBlock(input.bankAccounts);
  const subject = `MERITMUN III — Delegation registered (${input.reference})`;
  const rosterText = input.members
    .map((m, i) => `${i + 1}. ${m.fullName} — ${m.delegateCode}`)
    .join("\n");
  const rosterHtml = input.members
    .map(
      (m) =>
        `<li>${escapeHtml(m.fullName)} — <code>${escapeHtml(m.delegateCode)}</code></li>`,
    )
    .join("");
  const text =
    `Hello ${input.headName},\n\n` +
    `We have the registration for ${input.institutionName}. Reference: ${input.reference}.\n` +
    `Delegates (${input.members.length}):\n${rosterText}\n\n` +
    `Fee: ${input.currency} ${input.feeAmount} for the whole delegation.\n\n` +
    `Pay using one of the active accounts below and use ${input.reference} as the payment reference.\n\n` +
    `${banks.text}\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.headName)},</p>` +
    `<p>We have the registration for <strong>${escapeHtml(input.institutionName)}</strong>.</p>` +
    `<p><strong>Reference:</strong> ${escapeHtml(input.reference)}<br/>` +
    `<strong>Fee:</strong> ${escapeHtml(input.currency)} ${input.feeAmount} for the whole delegation</p>` +
    `<p><strong>Delegates (${input.members.length})</strong></p><ol>${rosterHtml}</ol>` +
    `<p>Pay using one of the active accounts below and use ${escapeHtml(input.reference)} as the payment reference.</p>` +
    banks.html +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "delegation-registration-confirmation",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

export async function sendPaymentConfirmed(input: {
  related?: EmailRelated;
  to: string;
  fullName: string;
  reference: string;
  /** Amount recorded as received, in PKR. */
  amount?: number;
}): Promise<SendResult> {
  const subject = `MERITMUN III — Payment confirmed (${input.reference})`;
  const paid =
    input.amount != null ? ` of PKR ${input.amount.toLocaleString("en-US")}` : "";
  const text =
    `Hello ${input.fullName},\n\n` +
    `We have received your payment${paid} for ${input.reference}. ` +
    `Committee allotment will follow once the Executive Board confirms your seat.\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.fullName)},</p>` +
    `<p>We have received your payment${escapeHtml(paid)} for <strong>${escapeHtml(input.reference)}</strong>. ` +
    `Committee allotment will follow once the Executive Board confirms your seat.</p>` +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "payment-confirmed",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

export async function sendAllotmentConfirmed(input: {
  related?: EmailRelated;
  to: string;
  fullName: string;
  committeeName: string;
  countryName: string;
  studyGuideUrl: string | null;
}): Promise<SendResult> {
  const subject = `MERITMUN III — Allotment confirmed (${input.committeeName})`;
  const guideLine = input.studyGuideUrl
    ? `Background guide: ${input.studyGuideUrl}`
    : "Background guide will be published on your committee page.";
  const text =
    `Hello ${input.fullName},\n\n` +
    `Your allotment is confirmed.\n` +
    `Committee: ${input.committeeName}\n` +
    `Portfolio: ${input.countryName}\n` +
    `${guideLine}\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.fullName)},</p>` +
    `<p>Your allotment is confirmed.</p>` +
    `<p><strong>Committee:</strong> ${escapeHtml(input.committeeName)}<br/>` +
    `<strong>Portfolio:</strong> ${escapeHtml(input.countryName)}</p>` +
    (input.studyGuideUrl
      ? `<p><a href="${escapeHtml(input.studyGuideUrl)}">Background guide</a></p>`
      : `<p>Background guide will be published on your committee page.</p>`) +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "allotment-confirmed",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

export async function sendAllotmentChanged(input: {
  related?: EmailRelated;
  to: string;
  fullName: string;
  committeeName: string;
  countryName: string;
  studyGuideUrl: string | null;
}): Promise<SendResult> {
  const subject = `MERITMUN III — Allotment updated (${input.committeeName})`;
  const guideLine = input.studyGuideUrl
    ? `Background guide: ${input.studyGuideUrl}`
    : "Background guide will be published on your committee page.";
  const text =
    `Hello ${input.fullName},\n\n` +
    `Your allotment has been changed by the Executive Board. ` +
    `This replaces the allotment we sent you earlier.\n` +
    `Committee: ${input.committeeName}\n` +
    `Portfolio: ${input.countryName}\n` +
    `${guideLine}\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.fullName)},</p>` +
    `<p>Your allotment has been changed by the Executive Board. ` +
    `<strong>This replaces the allotment we sent you earlier.</strong></p>` +
    `<p><strong>Committee:</strong> ${escapeHtml(input.committeeName)}<br/>` +
    `<strong>Portfolio:</strong> ${escapeHtml(input.countryName)}</p>` +
    (input.studyGuideUrl
      ? `<p><a href="${escapeHtml(input.studyGuideUrl)}">Background guide</a></p>`
      : `<p>Background guide will be published on your committee page.</p>`) +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "allotment-changed",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

export async function sendQueryReply(input: {
  related?: EmailRelated;
  to: string;
  name: string;
  subject: string;
  replyBody: string;
}): Promise<SendResult> {
  const subject = `Re: ${input.subject}`;
  const text =
    `Hello ${input.name},\n\n` +
    `${input.replyBody}\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.name)},</p>` +
    `<p>${escapeHtml(input.replyBody).replace(/\n/g, "<br/>")}</p>` +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "query-reply",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

export async function sendBroadcast(input: {
  related?: EmailRelated;
  to: string;
  name: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const text =
    `Hello ${input.name},\n\n` +
    `${input.body}\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.name)},</p>` +
    `<p>${escapeHtml(input.body).replace(/\n/g, "<br/>")}</p>` +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "broadcast",
    to: input.to,
    related: input.related,
    subject: `MERITMUN III — ${input.subject}`,
    html,
    text,
  });
}
