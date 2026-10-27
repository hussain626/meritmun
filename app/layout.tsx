import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Josefin_Sans, Poiret_One } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Type pairing, chosen against the brand's physical object, not by reflex.
 *
 * The object is a committee placard and an engraved rostrum nameplate:
 * engraved, deliberate, meant to be spoken aloud.
 *
 * Josefin Sans carries the headings: geometric Art Deco capitals with real
 * bold weights. Poiret One is kept for the MERITMUN III logo lockup only, to
 * match the logo. Archivo takes the text and the UI.
 */
const poiret = Poiret_One({
  variable: "--font-poiret",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meritmun.systemsummit.online"),
  title: {
    default: "MERITMUN III | Discover the World of Diplomacy",
    template: "%s · MERITMUN III",
  },
  description:
    "The third iteration of Meritorious Model United Nations, three days of committees, crisis and debate in Karachi, Pakistan.",
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
    title: "MERITMUN III | Discover the World of Diplomacy",
    description:
      "Three days of committees, crisis and debate in Karachi. Registration, committees and schedule on the site.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MERITMUN III | Discover the World of Diplomacy",
    description:
      "Three days of committees, crisis and debate in Karachi. Registration, committees and schedule on the site.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#062b15" },
    { media: "(prefers-color-scheme: light)", color: "#f7ffdc" },
  ],
};

/** Root shell: fonts + theme only. Marketing chrome lives in `(site)`; admin has its own layout. */
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poiret.variable} ${josefin.variable} ${archivo.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-fg">{children}</body>
    </html>
  );
}
