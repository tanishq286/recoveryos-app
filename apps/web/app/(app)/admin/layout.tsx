import { notFound } from "next/navigation";

import { isStaffRole } from "@/lib/api/server";
import { requireViewer } from "@/lib/api/guard";

/** Staff only. The API enforces roles on every call; this keeps the screens out of reach too. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireViewer("/admin/crm");
  if (!isStaffRole(viewer.role)) notFound();
  return children;
}
