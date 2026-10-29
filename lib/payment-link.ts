import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Private links that let a registrant upload their transfer screenshot without
 * an account. The token names the registration and carries an HMAC, so it
 * cannot be guessed or pointed at someone else's registration.
 */

export type PaymentLinkKind = "delegate" | "delegation";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://meritmun.systemsummit.online"
).replace(/\/+$/, "");

const KIND_PREFIX: Record<PaymentLinkKind, string> = { delegate: "d", delegation: "g" };

function secret(): string {
  return (
    process.env.PAYMENT_LINK_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    // Demo mode only: there is no data worth protecting without Supabase.
    "meritmun-demo-payment-links"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 32);
}

export function paymentToken(kind: PaymentLinkKind, id: string): string {
  const payload = `${KIND_PREFIX[kind]}${id}`;
  return `${payload}.${sign(payload)}`;
}

/** Site-relative path to the upload page (used on the success screen). */
export function paymentUploadPath(kind: PaymentLinkKind, id: string): string {
  return `/pay/${paymentToken(kind, id)}`;
}

/** Absolute link for emails. */
export function paymentUploadUrl(kind: PaymentLinkKind, id: string): string {
  return `${SITE_URL}${paymentUploadPath(kind, id)}`;
}

/** The registration a token points at, or null when it is malformed or forged. */
export function readPaymentToken(
  token: string,
): { kind: PaymentLinkKind; id: string } | null {
  const [payload, signature] = decodeURIComponent(token).split(".");
  if (!payload || !signature || payload.length < 2) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const kind = payload[0] === "d" ? "delegate" : payload[0] === "g" ? "delegation" : null;
  const id = payload.slice(1);
  return kind && /^[0-9a-z-]{1,64}$/i.test(id) ? { kind, id } : null;
}
