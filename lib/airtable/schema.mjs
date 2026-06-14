import {
  TABLE_CAMPAIGN_LINKS,
  TABLE_CAMPAIGNS,
  TABLE_KPIS,
} from "./config.mjs";
import {
  createTable,
  ensureFieldExists,
  findTableByName,
  getBaseSchema,
  getConfiguredClient,
} from "./client.mjs";

const CAMPAIGN_FIELDS = [
  { name: "utm_campaign", type: "singleLineText" },
  { name: "landing_url", type: "url" },
  {
    name: "program",
    type: "singleSelect",
    options: {
      choices: [
        { name: "Creative Spark" },
        { name: "Events" },
        { name: "Levitt" },
        { name: "Día de los Muertos" },
        { name: "Artprenticeship" },
        { name: "Waco Wonderland" },
        { name: "Sponsorship" },
      ],
    },
  },
  {
    name: "status",
    type: "singleSelect",
    options: {
      choices: [{ name: "Draft" }, { name: "Active" }, { name: "Complete" }],
    },
  },
  { name: "benchmark_sessions", type: "number", options: { precision: 0 } },
  { name: "benchmark_engagement_rate", type: "percent", options: { precision: 1 } },
  { name: "benchmark_bounce_rate", type: "percent", options: { precision: 1 } },
  { name: "notes", type: "multilineText" },
  { name: "created_by", type: "email" },
  {
    name: "created_at",
    type: "dateTime",
    options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
  },
  {
    name: "updated_at",
    type: "dateTime",
    options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
  },
];

const KPI_FIELDS = [
  { name: "slug", type: "singleLineText" },
  {
    name: "program",
    type: "singleSelect",
    options: {
      choices: [
        { name: "Creative Spark" },
        { name: "Events" },
        { name: "Levitt" },
        { name: "Día de los Muertos" },
        { name: "Artprenticeship" },
        { name: "Waco Wonderland" },
        { name: "Sponsorship" },
      ],
    },
  },
  { name: "metric", type: "singleLineText" },
  { name: "target_value", type: "number", options: { precision: 2 } },
  { name: "unit", type: "singleLineText" },
  {
    name: "period",
    type: "singleSelect",
    options: {
      choices: [{ name: "monthly" }, { name: "quarterly" }, { name: "FY" }],
    },
  },
  { name: "active", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "notes", type: "multilineText" },
];

let schemaCache = null;
let schemaCacheAt = 0;
const SCHEMA_CACHE_MS = 5 * 60 * 1000;

async function ensureTable(apiKey, baseId, schema, tableName, description, fields) {
  let table = findTableByName(schema, tableName);

  if (!table) {
    const created = await createTable(apiKey, baseId, tableName, fields, description);
    table = created;
    schema.tables = [...(schema.tables ?? []), created];
    return table;
  }

  for (const field of fields) {
    if (field.name === "Name") continue;
    await ensureFieldExists(apiKey, baseId, table.id, field, schema);
  }

  return table;
}

async function ensureCampaignLinksTable(apiKey, baseId, schema, campaignsTableId) {
  let table = findTableByName(schema, TABLE_CAMPAIGN_LINKS);

  const linkField = {
    name: "Campaign",
    type: "multipleRecordLinks",
    options: {
      linkedTableId: campaignsTableId,
    },
  };

  const fields = [
    linkField,
    { name: "utm_source", type: "singleLineText" },
    { name: "utm_medium", type: "singleLineText" },
    { name: "utm_term", type: "singleLineText" },
    { name: "utm_content", type: "singleLineText" },
    { name: "utm_id", type: "singleLineText" },
    { name: "channel_preset", type: "singleLineText" },
    { name: "tagged_url", type: "url" },
    { name: "created_by", type: "email" },
    {
      name: "created_at",
      type: "dateTime",
      options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
    },
  ];

  if (!table) {
    const created = await createTable(
      apiKey,
      baseId,
      TABLE_CAMPAIGN_LINKS,
      [
        { name: "Name", type: "singleLineText" },
        ...fields,
      ],
      "Tagged URL variants for CW Tools campaigns",
    );
    table = created;
    schema.tables = [...(schema.tables ?? []), created];
    return table;
  }

  for (const field of fields) {
    await ensureFieldExists(apiKey, baseId, table.id, field, schema);
  }

  return table;
}

/**
 * Idempotent bootstrap for CW Tools-owned Airtable tables.
 * Never deletes or renames existing tables.
 */
export async function ensureToolsSchema({ refresh = false } = {}) {
  const config = getConfiguredClient();
  const now = Date.now();

  if (!refresh && schemaCache && now - schemaCacheAt < SCHEMA_CACHE_MS) {
    return schemaCache;
  }

  const schema = await getBaseSchema(config.apiKey, config.baseId);

  const campaignsTable = await ensureTable(
    config.apiKey,
    config.baseId,
    schema,
    TABLE_CAMPAIGNS,
    "Marketing campaigns created in CW Tools Campaign Builder",
    [{ name: "Name", type: "singleLineText" }, ...CAMPAIGN_FIELDS],
  );

  const linksTable = await ensureCampaignLinksTable(
    config.apiKey,
    config.baseId,
    schema,
    campaignsTable.id,
  );

  const kpisTable = await ensureTable(
    config.apiKey,
    config.baseId,
    schema,
    TABLE_KPIS,
    "Org-wide KPI definitions for CW Tools",
    [{ name: "Name", type: "singleLineText" }, ...KPI_FIELDS],
  );

  const result = {
    configured: true,
    baseId: config.baseId,
    existingTableCount: (schema.tables ?? []).length,
    existingTableNames: (schema.tables ?? []).map((table) => table.name),
    toolsTables: {
      campaigns: { id: campaignsTable.id, name: TABLE_CAMPAIGNS },
      campaignLinks: { id: linksTable.id, name: TABLE_CAMPAIGN_LINKS },
      kpis: { id: kpisTable.id, name: TABLE_KPIS },
    },
  };

  schemaCache = result;
  schemaCacheAt = now;
  return result;
}

export function clearSchemaCache() {
  schemaCache = null;
  schemaCacheAt = 0;
}
