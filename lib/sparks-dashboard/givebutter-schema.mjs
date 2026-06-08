const DEFAULT_TIER_TAGS = {
  gold: ["gold", "gold creative spark", "creative spark gold", "spark gold"],
  silver: ["silver", "silver creative spark", "creative spark silver", "spark silver"],
  bronze: ["bronze", "bronze creative spark", "creative spark bronze", "spark bronze"],
  honoraryGold: ["honorary gold", "honorary gold creative spark", "honorary-gold"],
  honorarySilver: ["honorary silver", "honorary silver creative spark", "honorary-silver"],
  honoraryBronze: [
    "honorary bronze",
    "honorary bronze creative spark",
    "honorary-bronze",
  ],
};

function loadTierAliases() {
  const raw = process.env.GIVEBUTTER_TIER_TAG_ALIASES_JSON;
  if (!raw) return DEFAULT_TIER_TAGS;
  try {
    return { ...DEFAULT_TIER_TAGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TIER_TAGS;
  }
}

function normTag(tag) {
  return String(tag ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseContactTags(tags = []) {
  const aliases = loadTierAliases();
  const names = tags.map((t) => normTag(typeof t === "string" ? t : t?.name ?? t?.label ?? ""));
  const schemaIssues = [];

  let tier = null;
  let isHonorary = false;

  const honoraryMap = [
    ["honoraryGold", "gold", true],
    ["honorarySilver", "silver", true],
    ["honoraryBronze", "bronze", true],
    ["gold", "gold", false],
    ["silver", "silver", false],
    ["bronze", "bronze", false],
  ];

  for (const [aliasKey, tierValue, honorary] of honoraryMap) {
    const aliasList = (aliases[aliasKey] ?? []).map(normTag);
    if (names.some((n) => aliasList.includes(n))) {
      tier = tierValue;
      isHonorary = honorary;
      break;
    }
  }

  if (!tier) {
    for (const name of names) {
      const parsed = parseSparkTierFromLabel(name);
      if (parsed) {
        tier = parsed.tier;
        isHonorary = parsed.isHonorary;
        break;
      }
    }
  }

  if (!tier && names.length > 0) {
    const sparkish = names.filter(
      (n) => (n.includes("spark") || n.includes("honorary")) && !parseSparkTierFromLabel(n),
    );
    if (sparkish.length > 0) {
      schemaIssues.push({
        code: "unknown_tag",
        source: "givebutter",
        field: "tags",
        expected: "gold, silver, bronze, or honorary variants",
        found: sparkish.join(", "),
        message: `Unrecognized Spark tier tag(s): ${sparkish.join(", ")}. Update GIVEBUTTER_TIER_TAG_ALIASES_JSON if tags were renamed.`,
      });
    }
  }

  return { tier, isHonorary, schemaIssues };
}

/** e.g. "gold creative spark", "honorary bronze creative spark" */
function parseSparkTierFromLabel(name) {
  const n = normTag(name);
  if (!n.includes("spark") && !n.includes("honorary") && !/\b(gold|silver|bronze)\b/.test(n)) {
    return null;
  }

  const isHonorary = n.includes("honorary");
  if (/\bgold\b/.test(n)) return { tier: "gold", isHonorary };
  if (/\bsilver\b/.test(n)) return { tier: "silver", isHonorary };
  if (/\bbronze\b/.test(n)) return { tier: "bronze", isHonorary };
  return null;
}

export function createSchemaIssue({ code, field, expected, found, message }) {
  return { code, source: "givebutter", field, expected, found, message };
}
