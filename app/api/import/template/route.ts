import { apiUser } from "@/lib/auth";
import { buildTemplate } from "@/lib/excel";

export async function GET() {
  const user = await apiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const buffer = buildTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="purchase-import-template.xlsx"',
    },
  });
}
