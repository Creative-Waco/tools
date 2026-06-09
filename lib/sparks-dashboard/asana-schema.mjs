const DEFAULT_ALIASES = {
  fieldAliases: {
    eventStatus: ["Event Status", "event status", "Event Production Phase"],
    taskType: ["Task Type", "task type"],
  },
  sectionAliases: {
    events: ["Events", "Spark Events"],
  },
  taskTypeEvent: ["Event", "Spark Event"],
  statusAliases: {
    idea: ["Idea", "idea"],
    planning: ["Planning", "planning"],
    marketing: ["Marketing", "marketing"],
    operations: ["Operations", "operations", "Marketing & Operations"],
    ready: ["Ready", "ready"],
    followUp: ["Follow up", "Follow-up", "Follow Up", "follow up"],
    done: ["Done", "done", "Complete", "complete"],
    canceled: ["Canceled", "Cancelled", "canceled", "cancelled"],
  },
};

export const PIPELINE_STATUSES = new Set(["planning", "marketing", "operations", "ready"]);
export const UPCOMING_STATUSES = new Set(["planning", "marketing", "operations", "ready"]);

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function loadAliases() {
  const raw = process.env.ASANA_FIELD_ALIASES_JSON;
  if (!raw) return DEFAULT_ALIASES;
  try {
    const parsed = JSON.parse(raw);
    return {
      fieldAliases: { ...DEFAULT_ALIASES.fieldAliases, ...parsed.fieldAliases },
      sectionAliases: { ...DEFAULT_ALIASES.sectionAliases, ...parsed.sectionAliases },
      taskTypeEvent: parsed.taskTypeEvent ?? DEFAULT_ALIASES.taskTypeEvent,
      statusAliases: { ...DEFAULT_ALIASES.statusAliases, ...parsed.statusAliases },
    };
  } catch {
    return DEFAULT_ALIASES;
  }
}

export function createSchemaIssue({ code, field, expected, found, message }) {
  return { code, source: "asana", field, expected, found, message };
}

function matchAlias(value, aliases) {
  const n = norm(value);
  return aliases.some((a) => norm(a) === n);
}

export function findCustomField(customFields, logicalKey, aliasesConfig) {
  const aliases = aliasesConfig.fieldAliases[logicalKey] ?? [];
  const gidFallback =
    logicalKey === "eventStatus" ? process.env.ASANA_EVENT_STATUS_FIELD_GID : null;

  const matches = (customFields ?? []).filter((cf) => {
    if (gidFallback && cf.gid === gidFallback) return true;
    return matchAlias(cf.name, aliases);
  });

  if (matches.length > 1) {
    return {
      field: null,
      issue: createSchemaIssue({
        code: "ambiguous_field",
        field: logicalKey,
        expected: aliases.join(", "),
        found: matches.map((m) => m.name).join(", "),
        message: `Multiple Asana fields match "${logicalKey}". Expected one of: ${aliases.join(", ")}.`,
      }),
    };
  }

  if (matches.length === 0) {
    return {
      field: null,
      issue: createSchemaIssue({
        code: "field_not_found",
        field: logicalKey,
        expected: aliases.join(", "),
        found: (customFields ?? []).map((c) => c.name).filter(Boolean).join(", ") || "(none)",
        message: `Could not find Asana field for "${logicalKey}". Expected one of: ${aliases.join(", ")}. Update ASANA_FIELD_ALIASES_JSON or asana-schema.mjs.`,
      }),
    };
  }

  return { field: matches[0], issue: null };
}

export function getCustomFieldEnumValue(customField) {
  if (!customField) return null;
  return (
    customField.enum_value?.name ??
    customField.display_value ??
    null
  );
}

export function normalizeEventStatus(rawLabel, aliasesConfig, taskName, issues) {
  if (!rawLabel) return { slug: null, label: null };

  const aliases = aliasesConfig.statusAliases;
  const raw = String(rawLabel).trim();

  const slugFromKey = (key) =>
    key.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");

  for (const [key, labels] of Object.entries(aliases)) {
    if (labels.some((l) => norm(l) === norm(raw))) {
      return { slug: slugFromKey(key), label: raw };
    }
  }

  issues.push(
    createSchemaIssue({
      code: "unknown_enum",
      field: "eventStatus",
      expected: Object.values(aliases).flat().join(", "),
      found: raw,
      message: `Event "${taskName}" has status "${raw}" — not in STATUS_ALIASES. Add an alias or rename in Asana.`,
    }),
  );

  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { slug: slug || "unknown", label: raw };
}

export function isEventsSection(memberships, aliasesConfig) {
  const sectionNames = aliasesConfig.sectionAliases.events ?? [];
  return (memberships ?? []).some((m) => matchAlias(m.section?.name, sectionNames));
}

export function isEventTaskType(customFields, aliasesConfig) {
  const { field, issue } = findCustomField(customFields, "taskType", aliasesConfig);
  if (issue) return { ok: false, issue };
  const value = getCustomFieldEnumValue(field);
  const eventTypes = aliasesConfig.taskTypeEvent ?? [];
  if (!value) return { ok: false, issue: null };
  return { ok: matchAlias(value, eventTypes), issue: null };
}

export function getAliasesConfig() {
  return loadAliases();
}
