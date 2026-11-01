import type { MetadataRoute } from "next";

/** Name, colours and icons for "Add to home screen". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finsol Enterprises",
    short_name: "Finsol",
    description:
      "Turnkey recovery of unclaimed shares and dividends. No upfront fee, no recovery no fee, confidential handling.",
    start_url: "/",
    display: "standalone",
    background_color: "#05080E",
    theme_color: "#05080E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
