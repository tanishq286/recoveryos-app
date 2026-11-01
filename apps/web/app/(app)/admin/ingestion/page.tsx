import type { Metadata } from "next";

import { IngestionUploader } from "@/components/admin/ingestion-uploader";
import { api } from "@/lib/api/server";
import { handleApiError } from "@/lib/api/guard";
import type { CompanyListItem, IngestionJob } from "@/lib/api/types";

export const metadata: Metadata = { title: "IEPF imports", robots: { index: false } };

export default async function IngestionPage() {
  let jobs: IngestionJob[];
  let companies: CompanyListItem[];
  try {
    [jobs, companies] = await Promise.all([
      api<IngestionJob[]>("admin/ingestion", { session: true }),
      api<CompanyListItem[]>("companies", { revalidate: 300 }),
    ]);
  } catch (e) {
    handleApiError(e, "/admin/ingestion");
  }
  return (
    <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)] text-fg">
        IEPF-2 and IEPF-4 imports
      </h1>
      <p className="mt-2 max-w-[70ch] text-fg-2">
        Upload the investor-wise statements companies file with MCA. Each file is parsed in the
        background, holders are matched to their search columns, and new records are searchable as
        soon as the import completes.
      </p>
      <div className="mt-8">
        <IngestionUploader
          companies={companies.map((c) => ({ slug: c.slug, name: c.name }))}
          jobs={jobs}
        />
      </div>
    </div>
  );
}
