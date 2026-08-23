import type { Metadata, Viewport } from "next";
import { Archivo, Eczar } from "next/font/google";
import { HelpWidget } from "@/components/layout/HelpWidget";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { conference, navItems, socials } from "@/content/site";
import { quickHelpFaqs } from "@/content/faq";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Type pairing — chosen against the brand's physical object, not by reflex.
 *
 * The object is a committee placard and an engraved rostrum nameplate:
 * engraved, deliberate, meant to be spoken aloud.
 *
 * Eczar carries the display. It was drawn for multilingual typesetting across
 * the Indian subcontinent, which gives a Karachi conference a real typographic
 * lineage rather than a costume one, and its high stroke contrast has genuine
 * vigour at headline sizes. Archivo takes the text and the UI: a sturdy
 * grotesque built for signage and forms, so it holds up in a four-step
 * registration flow where Eczar would not.
 *
 * This replaced a Fraunces/Inter pair. Both are training-data defaults, and the
 * serif-display-over-neutral-sans move is the saturated editorial lane — the
 * exact reflex a diplomatic brand should be avoiding.
 */
const eczar = Eczar({
  variable: "--font-eczar",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meritmun.org"),
  title: {
    default: "MERITMUN III — Discover the World of Diplomacy",
    template: "%s · MERITMUN III",
  },
  description:
    "The third iteration of Meritorious Model United Nations. Twelve committees, three days, six hundred seats. Karachi, Pakistan.",
  keywords: [
    "MERITMUN",
    "Model United Nations",
    "MUN Karachi",
    "MUN Pakistan",
    "student diplomacy",
    "MUN conference",
  ],
  openGraph: {
    type: "website",
    siteName: "MERITMUN III",
    title: "MERITMUN III — Discover the World of Diplomacy",
    description:
      "Twelve committees, three days, six hundred seats. Registration coming soon.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MERITMUN III — Discover the World of Diplomacy",
    description:
      "Twelve committees, three days, six hundred seats. Registration coming soon.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    // The only sanctioned hex literals in the codebase: browser-chrome colour
    // cannot read a CSS variable. Kept in sync with --bg in each theme.
    { media: "(prefers-color-scheme: dark)", color: "#12251d" },
    { media: "(prefers-color-scheme: light)", color: "#fafdfb" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${eczar.variable} ${archivo.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-fg">
        <SkipLink />
        <SiteHeader items={navItems} />
        {children}
        <SiteFooter
          items={navItems}
          conference={{
            fullName: conference.fullName,
            city: conference.city,
            country: conference.country,
            datesLabel: conference.datesLabel,
            venue: conference.venue,
          }}
          socials={socials}
        />
        <HelpWidget faqs={quickHelpFaqs} />
      </body>
    </html>
  );
}
