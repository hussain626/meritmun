/**
 * Homepage announcement bar — singleton CMS row and public projection.
 */

export type AnnouncementLinkType = "none" | "internal" | "external";

export type AnnouncementSettings = {
  id: number;
  isActive: boolean;
  message: string;
  linkType: AnnouncementLinkType;
  internalPath: string | null;
  externalUrl: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type PublicAnnouncement = {
  message: string;
  href: string | null;
  external: boolean;
};

export type AnnouncementPageOption = {
  label: string;
  path: string;
};

/** Core public routes offered in the Overview link dropdown. */
export const ANNOUNCEMENT_SITE_PAGES: AnnouncementPageOption[] = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Executive Board", path: "/executive-board" },
  { label: "Committees", path: "/committees" },
  { label: "Schedule", path: "/schedule" },
  { label: "Contact", path: "/contact" },
  { label: "Register", path: "/register" },
  { label: "Register a delegate", path: "/register/delegate" },
  { label: "Register a delegation", path: "/register/delegation" },
  { label: "Check registration status", path: "/register/status" },
];

export const ANNOUNCEMENT_MESSAGE_MAX = 200;

export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeInternalPath(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("/") && !value.startsWith("//");
}

export function toPublicAnnouncement(
  settings: AnnouncementSettings,
): PublicAnnouncement | null {
  const message = settings.message.trim();
  if (!settings.isActive || !message) return null;

  if (settings.linkType === "internal" && isSafeInternalPath(settings.internalPath)) {
    return { message, href: settings.internalPath, external: false };
  }
  if (settings.linkType === "external" && isSafeHttpUrl(settings.externalUrl)) {
    return { message, href: settings.externalUrl, external: true };
  }
  return { message, href: null, external: false };
}
