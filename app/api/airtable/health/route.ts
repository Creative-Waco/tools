import { getAirtableConfig } from "@/lib/airtable/config.mjs";
import { ensureLocalCredentials } from "@/lib/airtable/local-env.mjs";
import { ensureToolsSchema } from "@/lib/airtable/schema.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    ensureLocalCredentials();
    const config = getAirtableConfig();

    if (!config.configured) {
      return Response.json({
        configured: false,
        message: config.message,
      });
    }

    const schema = await ensureToolsSchema();

    return Response.json({
      ok: true,
      configured: true,
      baseId: schema.baseId,
      existingTableCount: schema.existingTableCount,
      existingTableNames: schema.existingTableNames,
      toolsTables: schema.toolsTables,
    });
  } catch (error) {
    return Response.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Airtable health check failed.",
      },
      { status: 500 },
    );
  }
}
