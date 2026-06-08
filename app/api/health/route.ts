import { TOOLS } from "@/lib/tools-registry";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, tools: TOOLS.map((t) => t.id) });
}
