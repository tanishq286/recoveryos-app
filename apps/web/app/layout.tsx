import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist-mono";
import "./globals.css";

import { CursorGlow } from "@/components/motion/cursor-glow";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Finsol Enterprises: recover unclaimed shares and dividends",
    template: "%s · Finsol Enterprises",
  },
  description:
    "Turnkey recovery of unclaimed shares and dividends. Start a free 3-minute check. No upfront fee, no recovery no fee, confidential handling.",
  // The share image itself is app/opengraph-image.tsx; these name the site
  // and ask X for the large card.
  openGraph: { siteName: "Finsol Enterprises", locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#05080E",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint: marks the document as motion-capable only when the
// visitor has no reduced-motion preference, so entrance states never flash.
const motionFlag = `try{if(matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.dataset.motion='on'}catch(e){}`;

// Also before first paint: restore a theme the visitor chose, so it never flashes.
const themeFlag = `try{var t=localStorage.getItem('finsol:theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" data-theme="dark" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/mona-sans-latin-wdth-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <script dangerouslySetInnerHTML={{ __html: themeFlag + ";" + motionFlag }} />
      </head>
      <body className="min-h-dvh bg-ink-950 text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md bg-brand focus:px-4 focus:py-3 focus:font-semibold focus:text-on-brand"
        >
          Skip to main content
        </a>
        <MotionProvider>{children}</MotionProvider>
        <CursorGlow />
      </body>
    </html>
  );
}
