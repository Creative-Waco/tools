import { TOOLS } from "@/lib/tools-registry";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ tools: TOOLS });
}
