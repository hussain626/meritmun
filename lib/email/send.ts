/**
 * Resend wrappers for admin / registration transactional mail.
 * Without RESEND_API_KEY, logs the payload and returns `mocked: true`, callers
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

/** Public origin used for absolute links and images inside emails. */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://meritmun.systemsummit.online"
).replace(/\/+$/, "");

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
  input: { template: string; to: string | string[]; related?: EmailRelated },
  result: SendResult,
): Promise<void> {
  const service = createServiceClient();
  if (!service) return;
  try {
    const { error } = await service.from("email_logs").insert({
      to_email: Array.isArray(input.to) ? input.to.join(", ") : input.to,
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
  to: string | string[];
  /** Extra recipients: everyone in `to` sees them. */
  cc?: string[];
  /** Overrides the default sender, e.g. a named inbox on the domain. */
  from?: string;
  replyTo?: string;
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
        from: input.from ?? getFromAddress(),
        to: input.to,
        ...(input.cc?.length ? { cc: input.cc } : {}),
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
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
    return "No email was sent, RESEND_API_KEY is not set on this deployment (add it in Netlify with the Functions scope, then redeploy).";
  }
  return "Email sent.";
}

/** Turn Resend's most common rejections into the fix. */
function resendHint(error: string): string {
  const text = error.toLowerCase();
  if (text.includes("domain") && (text.includes("verif") || text.includes("not found"))) {
    return `, the From address (${getFromAddress()}) must use a domain verified in Resend. Verify it under Resend → Domains, or set EMAIL_FROM to an address on a verified domain.`;
  }
  if (text.includes("testing emails") || text.includes("own email address")) {
    return ", Resend is in test mode and only delivers to your own address until a domain is verified.";
  }
  if (text.includes("api key") || text.includes("unauthorized") || text.includes("invalid")) {
    return ", check that RESEND_API_KEY is a valid, full-access key.";
  }
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------------ */
/* Branded layout                                                            */
/* ------------------------------------------------------------------------ */

const C = {
  forest: "#0F430C",
  ink: "#062B15",
  cream: "#F7FFDC",
  paper: "#FFFFFF",
  rule: "#CFE0A8",
  muted: "#4A6352",
  accent: "#8DB33A",
} as const;

const FONT_HEAD = "'Josefin Sans', Helvetica, Arial, sans-serif";
const FONT_BODY = "Archivo, Helvetica, Arial, sans-serif";

/** Escape, then keep the sender's line breaks. */
function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${FONT_BODY};font-size:15px;line-height:24px;color:${C.ink};">${html}</p>`;
}

function sectionTitle(label: string): string {
  return (
    `<p style="margin:28px 0 10px 0;font-family:${FONT_HEAD};font-size:12px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.forest};">` +
    `${escapeHtml(label)}</p>`
  );
}

/** Two-column key facts table. Values are escaped here. */
function detailsTable(rows: [string, string][]): string {
  const body = rows
    .map(
      ([label, value], i) =>
        `<tr>` +
        `<td valign="top" style="padding:12px 16px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}font-family:${FONT_HEAD};font-size:11px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.muted};width:38%;">${escapeHtml(label)}</td>` +
        `<td valign="top" style="padding:12px 16px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}font-family:${FONT_BODY};font-size:15px;line-height:20px;font-weight:600;color:${C.ink};">${escapeHtml(value)}</td>` +
        `</tr>`,
    )
    .join("");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background-color:${C.cream};border:1px solid ${C.rule};border-left:4px solid ${C.forest};border-radius:6px;margin:0 0 20px 0;">` +
    body +
    `</table>`
  );
}

function button(href: string, label: string): string {
  const url = escapeHtml(href);
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;"><tr>` +
    `<td align="center" bgcolor="${C.forest}" style="border-radius:4px;background-color:${C.forest};">` +
    `<a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-family:${FONT_HEAD};font-size:13px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.cream};text-decoration:none;border-radius:4px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

function numberedSteps(steps: string[], start = 1): string {
  const rows = steps
    .map(
      (step, i) =>
        `<tr>` +
        `<td valign="top" width="36" style="padding:0 12px 12px 0;">` +
        `<div style="width:26px;height:26px;line-height:26px;border-radius:13px;background-color:${C.forest};color:${C.cream};text-align:center;font-family:${FONT_HEAD};font-size:13px;font-weight:700;">${i + start}</div>` +
        `</td>` +
        `<td valign="top" style="padding:3px 0 12px 0;font-family:${FONT_BODY};font-size:15px;line-height:22px;color:${C.ink};">${step}</td>` +
        `</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">${rows}</table>`;
}

/** Quoted message panel for replies and broadcasts. */
function messagePanel(body: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;"><tr>` +
    `<td style="padding:18px 20px;background-color:${C.cream};border-left:4px solid ${C.forest};border-radius:4px;font-family:${FONT_BODY};font-size:15px;line-height:24px;color:${C.ink};">${multiline(body)}</td>` +
    `</tr></table>`
  );
}

/** Large committee and portfolio block for allotment mail. */
function allotmentHero(committee: string, portfolio: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr>` +
    `<td align="center" bgcolor="${C.forest}" style="padding:26px 20px;background-color:${C.forest};border-radius:6px;">` +
    `<p style="margin:0 0 6px 0;font-family:${FONT_HEAD};font-size:11px;line-height:16px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${C.accent};">Committee</p>` +
    `<p style="margin:0 0 18px 0;font-family:${FONT_HEAD};font-size:24px;line-height:30px;font-weight:700;letter-spacing:1px;color:${C.cream};">${escapeHtml(committee)}</p>` +
    `<table role="presentation" width="60" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 18px auto;"><tr><td height="2" style="height:2px;line-height:2px;font-size:0;background-color:${C.accent};">&nbsp;</td></tr></table>` +
    `<p style="margin:0 0 6px 0;font-family:${FONT_HEAD};font-size:11px;line-height:16px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${C.accent};">Portfolio</p>` +
    `<p style="margin:0;font-family:${FONT_HEAD};font-size:20px;line-height:26px;font-weight:700;letter-spacing:1px;color:${C.cream};">${escapeHtml(portfolio)}</p>` +
    `</td></tr></table>`
  );
}

function signOff(): string {
  return (
    `<p style="margin:28px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:22px;color:${C.ink};">With regards,<br />` +
    `<span style="font-family:${FONT_HEAD};font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:13px;color:${C.forest};">MERITMUN Secretariat</span></p>`
  );
}

/**
 * Shared shell for every transactional email. Table based with inline styles
 * so it holds up in Gmail, Outlook and Apple Mail. `intro` and `bodyHtml` are
 * trusted HTML: callers escape user values before passing them in.
 */
function renderEmail(input: {
  preheader: string;
  heading: string;
  intro?: string;
  bodyHtml: string;
  cta?: { href: string; label: string };
}): string {
  const logoUrl = `${SITE_URL}/email/logo.png`;
  const preheader = escapeHtml(input.preheader);
  const siteHost = SITE_URL.replace(/^https?:\/\//, "");

  return (
    `<!DOCTYPE html>` +
    `<html lang="en" xmlns="http://www.w3.org/1999/xhtml">` +
    `<head>` +
    `<meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<meta name="x-apple-disable-message-reformatting" />` +
    `<meta name="color-scheme" content="light" />` +
    `<meta name="supported-color-schemes" content="light" />` +
    `<title>${escapeHtml(input.heading)}</title>` +
    `<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&amp;family=Josefin+Sans:wght@600;700&amp;display=swap" rel="stylesheet" />` +
    `<style>` +
    `body{margin:0;padding:0;}` +
    `a{color:${C.forest};}` +
    `@media only screen and (max-width:620px){.mm-pad{padding-left:20px !important;padding-right:20px !important;}}` +
    `</style>` +
    `</head>` +
    `<body style="margin:0;padding:0;background-color:${C.cream};">` +
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.cream};opacity:0;">${preheader}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.cream}" style="background-color:${C.cream};">` +
    `<tr><td align="center" style="padding:32px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;">` +
    // Header band
    `<tr><td align="center" bgcolor="${C.forest}" style="background-color:${C.forest};padding:32px 24px 26px 24px;border-radius:8px 8px 0 0;">` +
    `<a href="${escapeHtml(SITE_URL)}" target="_blank" rel="noopener" style="text-decoration:none;">` +
    `<img src="${escapeHtml(logoUrl)}" width="70" height="72" alt="MERITMUN emblem" style="display:block;margin:0 auto 14px auto;border:0;outline:none;width:70px;height:72px;" />` +
    `</a>` +
    `<p style="margin:0;font-family:${FONT_HEAD};font-size:22px;line-height:28px;font-weight:700;letter-spacing:8px;text-transform:uppercase;color:${C.cream};">MERITMUN&nbsp;III</p>` +
    `<p style="margin:8px 0 0 0;font-family:${FONT_HEAD};font-size:11px;line-height:16px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:${C.accent};">Model United Nations</p>` +
    `</td></tr>` +
    // Accent rule
    `<tr><td height="4" bgcolor="${C.accent}" style="height:4px;line-height:4px;font-size:0;background-color:${C.accent};">&nbsp;</td></tr>` +
    // Body card
    `<tr><td class="mm-pad" bgcolor="${C.paper}" style="background-color:${C.paper};padding:36px 40px 32px 40px;border-left:1px solid ${C.rule};border-right:1px solid ${C.rule};">` +
    `<h1 style="margin:0 0 6px 0;font-family:${FONT_HEAD};font-size:24px;line-height:30px;font-weight:700;letter-spacing:1px;color:${C.ink};">${escapeHtml(input.heading)}</h1>` +
    `<table role="presentation" width="48" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 22px 0;"><tr><td height="3" style="height:3px;line-height:3px;font-size:0;background-color:${C.forest};">&nbsp;</td></tr></table>` +
    (input.intro ? paragraph(input.intro) : "") +
    input.bodyHtml +
    (input.cta ? button(input.cta.href, input.cta.label) : "") +
    signOff() +
    `</td></tr>` +
    // Footer
    `<tr><td class="mm-pad" bgcolor="${C.ink}" style="background-color:${C.ink};padding:24px 40px;border-radius:0 0 8px 8px;">` +
    `<p style="margin:0 0 8px 0;font-family:${FONT_HEAD};font-size:12px;line-height:16px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${C.cream};">MERITMUN III</p>` +
    `<p style="margin:0 0 10px 0;font-family:${FONT_BODY};font-size:12px;line-height:19px;color:${C.rule};">Meritorious College, PECHS Campus (AKUEB &amp; A Levels), Karachi &middot; 1, 2 and 3 January 2027</p>` +
    `<p style="margin:0;font-family:${FONT_BODY};font-size:12px;line-height:18px;"><a href="${escapeHtml(SITE_URL)}" target="_blank" rel="noopener" style="color:${C.accent};text-decoration:underline;">${escapeHtml(siteHost)}</a></p>` +
    `</td></tr>` +
    `</table>` +
    `<p style="margin:16px 0 0 0;font-family:${FONT_BODY};font-size:11px;line-height:16px;color:${C.muted};">You are receiving this email because of your MERITMUN III registration.</p>` +
    `</td></tr>` +
    `</table>` +
    `</body>` +
    `</html>`
  );
}

function bankBlock(accounts: BankAccount[]): { html: string; text: string } {
  const active = accounts.filter((a) => a.isActive);
  if (active.length === 0) {
    return {
      html: paragraph("Bank details will follow from Delegate Affairs."),
      text: "Bank details will follow from Delegate Affairs.",
    };
  }

  const line = (label: string, value: string) =>
    `<p style="margin:0 0 4px 0;font-family:${FONT_BODY};font-size:14px;line-height:20px;color:${C.ink};">` +
    `<span style="color:${C.muted};">${escapeHtml(label)}:</span> ` +
    `<span style="font-family:'Courier New',Courier,monospace;font-weight:600;">${escapeHtml(value)}</span></p>`;

  const html = active
    .map(
      (a, i) =>
        `<tr><td style="padding:16px 18px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}">` +
        `<p style="margin:0 0 2px 0;font-family:${FONT_HEAD};font-size:15px;line-height:20px;font-weight:700;letter-spacing:1px;color:${C.forest};">${escapeHtml(a.bankName)}</p>` +
        `<p style="margin:0 0 8px 0;font-family:${FONT_BODY};font-size:14px;line-height:20px;color:${C.ink};">${escapeHtml(a.accountTitle)}</p>` +
        line("Account", a.accountNumber) +
        (a.iban ? line("IBAN", a.iban) : "") +
        (a.instructions
          ? `<p style="margin:8px 0 0 0;font-family:${FONT_BODY};font-size:13px;line-height:19px;font-style:italic;color:${C.muted};">${multiline(a.instructions)}</p>`
          : "") +
        `</td></tr>`,
    )
    .join("");

  const text = active
    .map(
      (a) =>
        `${a.bankName}: ${a.accountTitle}\nAccount: ${a.accountNumber}` +
        (a.iban ? `\nIBAN: ${a.iban}` : "") +
        (a.instructions ? `\n${a.instructions}` : ""),
    )
    .join("\n\n");

  return {
    html:
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:2px solid ${C.forest};border-radius:6px;background-color:${C.paper};margin:0 0 20px 0;">` +
      html +
      `</table>`,
    text,
  };
}

/** Final step of the registration emails: upload the transfer screenshot. */
function uploadBlock(
  uploadUrl: string | undefined,
  step: number,
): { html: string; text: string } {
  if (!uploadUrl) {
    const line = "Reply to this email with your transfer screenshot.";
    return { html: numberedSteps([escapeHtml(line)], step), text: line };
  }
  const lead =
    "After paying, upload a screenshot of the transfer using the button below. Finance matches it and confirms your payment.";
  return {
    html: numberedSteps([escapeHtml(lead)], step) + button(uploadUrl, "Upload payment screenshot"),
    text: `
Upload it here: `,
  };
}

function formatFee(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString("en-US")}`;
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
  /** Private link where the payer uploads the transfer screenshot. */
  uploadUrl?: string;
}): Promise<SendResult> {
  const banks = bankBlock(input.bankAccounts);
  const contacts = uploadBlock(input.uploadUrl, 3);
  const subject = `MERITMUN III, Registration received (${input.delegateCode})`;
  const text =
    `Hello ${input.fullName},\n\n` +
    `We have your registration. Reference: ${input.reference}. ` +
    `Delegate code: ${input.delegateCode}.\n` +
    `Fee: ${input.currency} ${input.feeAmount}.\n\n` +
    `Pay using one of the active accounts below and keep your delegate code as the payment reference.\n\n` +
    `${banks.text}\n\n` +
    `${contacts.text}\n\n` +
    `MERITMUN Secretariat`;

  const code = `<strong>${escapeHtml(input.delegateCode)}</strong>`;
  const html = renderEmail({
    preheader: `Registration received. Your delegate code is ${input.delegateCode}. Payment details inside.`,
    heading: "Registration received",
    intro: `Hello ${escapeHtml(input.fullName)}, thank you for registering for MERITMUN III. Your details are below.`,
    bodyHtml:
      detailsTable([
        ["Reference", input.reference],
        ["Delegate code", input.delegateCode],
        ["Fee", formatFee(input.currency, input.feeAmount)],
      ]) +
      sectionTitle("How to pay") +
      numberedSteps([
        `Transfer <strong>${escapeHtml(formatFee(input.currency, input.feeAmount))}</strong> to one of the accounts below.`,
        `Use your delegate code ${code} as the payment reference.`,
      ]) +
      sectionTitle("Bank accounts") +
      banks.html +
      contacts.html +
      paragraph("We will email you once the payment is confirmed."),
  });

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
  /** Private link where the payer uploads the transfer screenshot. */
  uploadUrl?: string;
}): Promise<SendResult> {
  const banks = bankBlock(input.bankAccounts);
  const contacts = uploadBlock(input.uploadUrl, 3);
  const subject = `MERITMUN III, Delegation registered (${input.reference})`;
  const rosterText = input.members
    .map((m, i) => `${i + 1}. ${m.fullName}: ${m.delegateCode}`)
    .join("\n");
  const text =
    `Hello ${input.headName},\n\n` +
    `We have the registration for ${input.institutionName}. Reference: ${input.reference}.\n` +
    `Delegates (${input.members.length}):\n${rosterText}\n\n` +
    `Fee: ${input.currency} ${input.feeAmount} for the whole delegation.\n\n` +
    `Pay using one of the active accounts below and use ${input.reference} as the payment reference.\n\n` +
    `${banks.text}\n\n` +
    `${contacts.text}\n\n` +
    `MERITMUN Secretariat`;

  const rosterHtml =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:1px solid ${C.rule};border-radius:6px;margin:0 0 8px 0;">` +
    input.members
      .map(
        (m, i) =>
          `<tr>` +
          `<td width="32" valign="top" style="padding:10px 0 10px 16px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}font-family:${FONT_HEAD};font-size:13px;line-height:20px;font-weight:700;color:${C.muted};">${i + 1}.</td>` +
          `<td valign="top" style="padding:10px 8px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}font-family:${FONT_BODY};font-size:15px;line-height:20px;color:${C.ink};">${escapeHtml(m.fullName)}</td>` +
          `<td align="right" valign="top" style="padding:10px 16px 10px 8px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}font-family:'Courier New',Courier,monospace;font-size:14px;line-height:20px;font-weight:700;color:${C.forest};white-space:nowrap;">${escapeHtml(m.delegateCode)}</td>` +
          `</tr>`,
      )
      .join("") +
    `</table>`;

  const ref = `<strong>${escapeHtml(input.reference)}</strong>`;
  const html = renderEmail({
    preheader: `Delegation registered for ${input.institutionName}. Reference ${input.reference}. Payment details inside.`,
    heading: "Delegation registered",
    intro: `Hello ${escapeHtml(input.headName)}, we have the registration for <strong>${escapeHtml(input.institutionName)}</strong>.`,
    bodyHtml:
      detailsTable([
        ["Reference", input.reference],
        ["Delegates", String(input.members.length)],
        ["Fee", `${formatFee(input.currency, input.feeAmount)} (whole delegation)`],
      ]) +
      sectionTitle(`Delegates (${input.members.length})`) +
      rosterHtml +
      sectionTitle("How to pay") +
      numberedSteps([
        `Transfer <strong>${escapeHtml(formatFee(input.currency, input.feeAmount))}</strong> for the whole delegation to one of the accounts below.`,
        `Use ${ref} as the payment reference.`,
      ]) +
      sectionTitle("Bank accounts") +
      banks.html +
      contacts.html +
      paragraph("We will email you once the payment is confirmed."),
  });

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
  const subject = `MERITMUN III, Payment confirmed (${input.reference})`;
  const paid =
    input.amount != null ? ` of PKR ${input.amount.toLocaleString("en-US")}` : "";
  const text =
    `Hello ${input.fullName},\n\n` +
    `We have received your payment${paid} for ${input.reference}. ` +
    `Committee allotment will follow once the Executive Board confirms your seat.\n\n` +
    `MERITMUN Secretariat`;

  const rows: [string, string][] = [["Reference", input.reference]];
  if (input.amount != null) {
    rows.push(["Amount received", `PKR ${input.amount.toLocaleString("en-US")}`]);
  }
  rows.push(["Status", "Payment confirmed"]);

  const html = renderEmail({
    preheader: `We have received your payment for ${input.reference}.`,
    heading: "Payment confirmed",
    intro: `Hello ${escapeHtml(input.fullName)}, we have received your payment${escapeHtml(paid)} for <strong>${escapeHtml(input.reference)}</strong>.`,
    bodyHtml:
      detailsTable(rows) +
      sectionTitle("What happens next") +
      paragraph(
        "Committee allotment will follow once the Executive Board confirms your seat. We will email you your committee and portfolio.",
      ),
  });

  return sendMail({
    template: "payment-confirmed",
    to: input.to,
    related: input.related,
    subject,
    html,
    text,
  });
}

/** Shared body for allotment confirmed / changed. */
function allotmentContent(input: {
  committeeName: string;
  countryName: string;
  studyGuideUrl: string | null;
  coDelegateName?: string | null;
}): { bodyHtml: string; cta?: { href: string; label: string }; textLines: string } {
  const coDelegate = input.coDelegateName?.trim() || null;
  const guideLine = input.studyGuideUrl
    ? `Background guide: ${input.studyGuideUrl}`
    : "Background guide will be published on your committee page.";
  const textLines =
    `Committee: ${input.committeeName}\n` +
    `Portfolio: ${input.countryName}\n` +
    (coDelegate ? `Co-delegate: ${coDelegate}\n` : "") +
    `${guideLine}\n\n`;

  const rows: [string, string][] = [
    ["Committee", input.committeeName],
    ["Portfolio", input.countryName],
  ];
  if (coDelegate) rows.push(["Co-delegate", coDelegate]);

  const bodyHtml =
    allotmentHero(input.committeeName, input.countryName) +
    detailsTable(rows) +
    (input.studyGuideUrl
      ? paragraph("Read the background guide before you start your research.")
      : paragraph("The background guide will be published on your committee page."));

  return {
    bodyHtml,
    cta: input.studyGuideUrl
      ? { href: input.studyGuideUrl, label: "Background guide" }
      : undefined,
    textLines,
  };
}

export async function sendAllotmentConfirmed(input: {
  related?: EmailRelated;
  to: string;
  fullName: string;
  committeeName: string;
  countryName: string;
  studyGuideUrl: string | null;
  /** Second delegate sharing this portfolio, for double-delegation committees. */
  coDelegateName?: string | null;
}): Promise<SendResult> {
  const subject = `MERITMUN III, Allotment confirmed (${input.committeeName})`;
  const content = allotmentContent(input);
  const text =
    `Hello ${input.fullName},\n\n` +
    `Your allotment is confirmed.\n` +
    content.textLines +
    `MERITMUN Secretariat`;
  const html = renderEmail({
    preheader: `You will represent ${input.countryName} in ${input.committeeName}.`,
    heading: "Allotment confirmed",
    intro: `Hello ${escapeHtml(input.fullName)}, your allotment is confirmed.`,
    bodyHtml: content.bodyHtml,
    cta: content.cta,
  });

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
  /** Second delegate sharing this portfolio, for double-delegation committees. */
  coDelegateName?: string | null;
}): Promise<SendResult> {
  const subject = `MERITMUN III, Allotment updated (${input.committeeName})`;
  const content = allotmentContent(input);
  const text =
    `Hello ${input.fullName},\n\n` +
    `Your allotment has been changed by the Executive Board. ` +
    `This replaces the allotment we sent you earlier.\n` +
    content.textLines +
    `MERITMUN Secretariat`;
  const html = renderEmail({
    preheader: `Your allotment has changed: ${input.countryName} in ${input.committeeName}.`,
    heading: "Allotment updated",
    intro:
      `Hello ${escapeHtml(input.fullName)}, your allotment has been changed by the Executive Board. ` +
      `<strong>This replaces the allotment we sent you earlier.</strong>`,
    bodyHtml: content.bodyHtml,
    cta: content.cta,
  });

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
    `MERITMUN Secretariat`;
  const html = renderEmail({
    preheader: `A reply to your query: ${input.subject}`,
    heading: "Reply to your query",
    intro: `Hello ${escapeHtml(input.name)}, here is our reply regarding <strong>${escapeHtml(input.subject)}</strong>.`,
    bodyHtml:
      messagePanel(input.replyBody) +
      paragraph("If you have more questions, simply reply to this email."),
  });

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
    `MERITMUN Secretariat`;
  const html = renderEmail({
    preheader: input.body.replace(/\s+/g, " ").slice(0, 120),
    heading: input.subject,
    intro: `Hello ${escapeHtml(input.name)},`,
    bodyHtml: messagePanel(input.body),
  });

  return sendMail({
    template: "broadcast",
    to: input.to,
    related: input.related,
    subject: `MERITMUN III, ${input.subject}`,
    html,
    text,
  });
}

/** The president's inbox; replies land there because it is also Reply-To. */
export function getPresidentAddress(): string {
  const from = process.env.PRESIDENT_EMAIL_FROM?.trim();
  return from && from.length > 0
    ? from
    : "Saffana Qaiser <president@meritmun.systemsummit.online>";
}

/**
 * A personal email from the president, sent from the president's inbox in the
 * MERITMUN layout. Blank lines in the body start new paragraphs.
 */
export async function sendPresidentMail(input: {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  signature: string;
}): Promise<SendResult> {
  const from = getPresidentAddress();
  const paragraphs = input.body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const text = `${paragraphs.join("\n\n")}\n\n${input.signature}`;
  const html = renderEmail({
    preheader: input.body.replace(/\s+/g, " ").slice(0, 120),
    heading: input.subject,
    bodyHtml:
      paragraphs.map((p) => paragraph(multiline(p))).join("") +
      paragraph(multiline(input.signature)),
  });

  return sendMail({
    template: "president",
    to: input.to,
    cc: input.cc,
    from,
    replyTo: from.match(/<([^>]+)>/)?.[1] ?? from,
    subject: input.subject,
    html,
    text,
  });
}
