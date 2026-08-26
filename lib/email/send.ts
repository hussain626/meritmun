/**
 * Resend wrappers for admin / registration transactional mail.
 * Without RESEND_API_KEY, logs the payload and returns a mocked success.
 */

import { Resend } from "resend";
import type { BankAccount } from "@/lib/admin/types";

export type SendResult =
  | { ok: true; mocked: true }
  | { ok: true; mocked: false; id: string }
  | { ok: false; error: string };

const DEFAULT_FROM = "MeritMUN <noreply@meritmun.org>";

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : DEFAULT_FROM;
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

async function sendMail(input: {
  template: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const client = getResendClient();
  if (!client) {
    console.log("[meritmun/email] mocked send (no RESEND_API_KEY)", {
      template: input.template,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true, mocked: true };
  }

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, mocked: false, id: data?.id ?? "unknown" };
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
    subject,
    html,
    text,
  });
}

export async function sendPaymentConfirmed(input: {
  to: string;
  fullName: string;
  reference: string;
}): Promise<SendResult> {
  const subject = `MERITMUN III — Payment confirmed (${input.reference})`;
  const text =
    `Hello ${input.fullName},\n\n` +
    `We have received your payment for ${input.reference}. ` +
    `Committee allotment will follow once the Executive Board confirms your seat.\n\n` +
    `— MERITMUN Secretariat`;
  const html =
    `<p>Hello ${escapeHtml(input.fullName)},</p>` +
    `<p>We have received your payment for <strong>${escapeHtml(input.reference)}</strong>. ` +
    `Committee allotment will follow once the Executive Board confirms your seat.</p>` +
    `<p>— MERITMUN Secretariat</p>`;

  return sendMail({
    template: "payment-confirmed",
    to: input.to,
    subject,
    html,
    text,
  });
}

export async function sendAllotmentConfirmed(input: {
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
    subject,
    html,
    text,
  });
}

export async function sendQueryReply(input: {
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
    subject,
    html,
    text,
  });
}
