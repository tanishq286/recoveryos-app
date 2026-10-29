import type { MetadataRoute } from "next";
import { SERVICE_VERTICALS } from "@recoveryos/shared";

import { listCompanies } from "@/lib/companies";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await listCompanies();
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/calculator`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/services`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/unclaimed-shares`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/partners`, lastModified: now, priority: 0.6 },
    { url: `${SITE_URL}/check`, lastModified: now, priority: 0.6 },
    ...SERVICE_VERTICALS.map((s) => ({
      url: `${SITE_URL}/services/${s.slug}`,
      lastModified: now,
      priority: 0.7,
    })),
    ...companies.map((c) => ({
      url: `${SITE_URL}/unclaimed-shares/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      priority: 0.7,
    })),
  ];
}
