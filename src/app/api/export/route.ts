import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/user";
import { buildExportCsv } from "@/lib/privacy/export";

/** Downloads the signed-in user's full history as CSV (spec §4). */
export async function GET() {
  const user = await requireAppUser();

  const csv = await buildExportCsv(user.id);
  await prisma.dataRequest.create({
    data: { userId: user.id, requestType: "EXPORT" },
  });

  const filename = `nutritrack-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Never let a proxy or the browser retain personal data.
      "Cache-Control": "no-store, private",
    },
  });
}
