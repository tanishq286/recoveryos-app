import type { Metadata, Viewport } from "next";
import "@fontsource-variable/mona-sans/wdth.css";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RecoveryOS: find the path back to your assets",
    template: "%s · RecoveryOS",
  },
  description:
    "Guided recovery of unclaimed shares and dividends from India's IEPF. See every document, every step and who owns it. No upfront fee.",
};

export const viewport: Viewport = {
  themeColor: "#0B1114",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint: marks the document as motion-capable only when the
// visitor has no reduced-motion preference, so entrance states never flash.
const motionFlag = `try{if(matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.dataset.motion='on'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionFlag }} />
      </head>
      <body className="min-h-dvh bg-ink-950 text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-signal focus:px-4 focus:py-3 focus:font-medium focus:text-on-signal"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
