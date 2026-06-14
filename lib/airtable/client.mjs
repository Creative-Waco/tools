import { requireAirtableConfig } from "./config.mjs";
import { ensureLocalCredentials } from "./local-env.mjs";

const API_ROOT = "https://api.airtable.com/v0";

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.error?.message ?? data.error ?? text;
  } catch {
    return text || response.statusText;
  }
}

export async function airtableFetch(apiKey, path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      ...authHeaders(apiKey),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(`Airtable API ${response.status}: ${message}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function getBaseSchema(apiKey, baseId) {
  const data = await airtableFetch(apiKey, `/meta/bases/${baseId}/tables`);
  return { tables: data.tables ?? [] };
}

export function findTableByName(schema, tableName) {
  const tables = schema.tables ?? [];
  return tables.find((table) => table.name === tableName) ?? null;
}

export async function createTable(apiKey, baseId, name, fields, description) {
  return airtableFetch(apiKey, `/meta/bases/${baseId}/tables`, {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      fields,
    }),
  });
}

export async function createField(apiKey, baseId, tableId, field) {
  return airtableFetch(
    apiKey,
    `/meta/bases/${baseId}/tables/${encodeURIComponent(tableId)}/fields`,
    {
      method: "POST",
      body: JSON.stringify(field),
    },
  );
}

export function tableHasField(schema, tableId, fieldName) {
  const table = (schema.tables ?? []).find((item) => item.id === tableId);
  return (table?.fields ?? []).some((field) => field.name === fieldName);
}

export async function ensureFieldExists(apiKey, baseId, tableId, field, schema) {
  const exists = tableHasField(schema, tableId, field.name);
  if (exists) return field.name;
  const created = await createField(apiKey, baseId, tableId, field);
  const table = (schema.tables ?? []).find((item) => item.id === tableId);
  if (table) {
    table.fields = [...(table.fields ?? []), created];
  }
  return created.name ?? field.name;
}

export async function listRecords(apiKey, baseId, tableNameOrId, options = {}) {
  const { filterByFormula, sort, maxRecords, fields } = options;
  const params = new URLSearchParams();
  if (filterByFormula) params.set("filterByFormula", filterByFormula);
  if (maxRecords) params.set("maxRecords", String(maxRecords));
  if (fields?.length) {
    for (const field of fields) params.append("fields[]", field);
  }
  if (sort?.length) {
    sort.forEach((item, index) => {
      params.set(`sort[${index}][field]`, item.field);
      if (item.direction) params.set(`sort[${index}][direction]`, item.direction);
    });
  }

  const records = [];
  let offset;

  do {
    const pageParams = new URLSearchParams(params);
    if (offset) pageParams.set("offset", offset);
    const query = pageParams.toString();
    const path = `/${baseId}/${encodeURIComponent(tableNameOrId)}${query ? `?${query}` : ""}`;
    const data = await airtableFetch(apiKey, path);
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);

  return records;
}

export async function createRecord(apiKey, baseId, tableNameOrId, fields) {
  const data = await airtableFetch(apiKey, `/${baseId}/${encodeURIComponent(tableNameOrId)}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return data;
}

export async function updateRecord(apiKey, baseId, tableNameOrId, recordId, fields) {
  const data = await airtableFetch(
    apiKey,
    `/${baseId}/${encodeURIComponent(tableNameOrId)}/${recordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    },
  );
  return data;
}

export function getConfiguredClient() {
  ensureLocalCredentials();
  return requireAirtableConfig();
}
