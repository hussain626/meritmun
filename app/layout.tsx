import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { HelpWidget } from "@/components/layout/HelpWidget";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { conference, navItems, socials } from "@/content/site";
import { quickHelpFaqs } from "@/content/faq";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Variable font: `axes` requires the weight axis stay variable, so no `weight`.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
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
      "Twelve committees, three days, six hundred seats. Registration is open for delegates and delegations.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MERITMUN III — Discover the World of Diplomacy",
    description:
      "Twelve committees, three days, six hundred seats. Registration is open.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b241c" },
    { media: "(prefers-color-scheme: light)", color: "#fbfefc" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} h-full`}
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
