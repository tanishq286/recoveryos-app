import { redirect } from "next/navigation";

/** /admin/imports is the bulk importer, at its original address. */
export default function AdminImports() {
  redirect("/admin/ingestion");
}
