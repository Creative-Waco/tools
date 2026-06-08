import { addYears, getPeriodRange, isInRange, last12MonthLabels, monthKey } from "./period.mjs";
import { createSchemaIssue, parseContactTags } from "./givebutter-schema.mjs";

const BASE_URL = "https://api.givebutter.com/v1";
const ACTIVE_PLAN_STATUSES = new Set(["active", "past_due"]);

function getApiKey() {
  return process.env.GIVEBUTTER_API_KEY?.trim() || null;
}

function campaignMatch() {
  const raw = process.env.GIVEBUTTER_SPARK_CAMPAIGN_MATCH ?? "creative-spark";
  return raw.toLowerCase();
}

async function gbFetch(path, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GIVEBUTTER_API_KEY is not configured.");
  }

  const url = new URL(`${BASE_URL}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Givebutter API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function fetchAllPages(path, params = {}) {
  const items = [];
  let page = 1;
  let lastPage = 1;

  do {
    const data = await gbFetch(path, { ...params, page, per_page: 100 });
    const chunk = data.data ?? [];
    items.push(...chunk);
    lastPage = data.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return items;
}

function isSparkCampaign(campaign) {
  if (!campaign) return true;
  const match = campaignMatch();
  const hay = [campaign.title, campaign.name, campaign.slug, campaign.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(match) || match === "*";
}

function planMembershipType(plan) {
  const freq = String(plan.frequency ?? "").toLowerCase();
  if (freq.includes("year") || freq.includes("annual")) return "annual";
  return "monthly";
}

function pickDate(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function contactEmails(contact) {
  const emails = [];
  if (contact.email) emails.push(String(contact.email));
  for (const entry of contact.emails ?? []) {
    if (entry?.value) emails.push(String(entry.value));
  }
  return emails.map((e) => e.toLowerCase()).filter(Boolean);
}

function contactNameParts(contact, plan = null) {
  const first = String(contact?.first_name ?? plan?.first_name ?? "").trim();
  const last = String(contact?.last_name ?? plan?.last_name ?? "").trim();
  return { first, last };
}

export function formatMemberDisplayName(first, last) {
  const f = String(first ?? "").trim();
  const l = String(last ?? "").trim();
  if (!f && !l) return "Member";
  if (!l) return f;
  return `${f} ${l.charAt(0).toUpperCase()}.`;
}

/** Numeric ID from dashboard URL (e.g. …/accounts/145191/…), not the API account slug. */
export function getDashboardAccountId() {
  const id = process.env.GIVEBUTTER_ACCOUNT_ID?.trim();
  if (!id || !/^\d+$/.test(id)) return null;
  return id;
}

export function givebutterContactProfileUrl(accountId, contactId) {
  const account = String(accountId ?? "").trim();
  const contact = String(contactId ?? "").trim();
  if (!account || !contact || !/^\d+$/.test(account)) return null;
  return `https://dashboard.givebutter.com/accounts/${account}/contacts/${contact}`;
}

function buildContactTagMap(contacts) {
  const byEmail = new Map();
  const byId = new Map();

  for (const contact of contacts) {
    const tags = contact.tags ?? contact.labels ?? [];
    const parsed = parseContactTags(tags);
    const entry = {
      tags,
      ...parsed,
      contactCreatedAt: pickDate(
        contact.contact_since,
        contact.created_at,
        contact.createdAt,
      ),
      contact,
    };

    for (const email of contactEmails(contact)) {
      byEmail.set(email, entry);
    }
    if (contact.id != null) byId.set(String(contact.id), entry);
  }

  return { byEmail, byId };
}

function resolveMemberFromPlan(plan, contactMaps) {
  const schemaIssues = [];
  const email = String(plan.email ?? "").toLowerCase();
  const contactId = plan.contact_id != null ? String(plan.contact_id) : null;

  let contactInfo =
    (email && contactMaps.byEmail.get(email)) ||
    (contactId && contactMaps.byId.get(contactId)) ||
    { tier: null, isHonorary: false, schemaIssues: [], contactCreatedAt: null };

  schemaIssues.push(...(contactInfo.schemaIssues ?? []));

  const memberSince = pickDate(plan.created_at, plan.createdAt, contactInfo.contactCreatedAt);
  const isHonorary = contactInfo.isHonorary;
  let honorarySince = null;

  if (isHonorary) {
    honorarySince = pickDate(
      contactInfo.honorarySince,
      contactInfo.contactCreatedAt,
      plan.created_at,
      plan.createdAt,
    );
    if (!honorarySince) {
      schemaIssues.push(
        createSchemaIssue({
          code: "missing_date",
          field: "honorarySince",
          expected: "tag created_at or plan created_at",
          found: "null",
          message:
            "Honorary member missing honorary start date. Tag applied date unavailable from Givebutter.",
        }),
      );
    }
  }

  let tier = contactInfo.tier;
  if (!tier) {
    const amount = Number(plan.amount) || 0;
    if (amount >= 120) tier = "gold";
    else if (amount >= 70) tier = "silver";
    else if (amount >= 50) tier = "bronze";
  }

  if (!tier) {
    schemaIssues.push(
      createSchemaIssue({
        code: "missing_tier",
        field: "tier",
        expected: "gold, silver, bronze tag",
        found: email || plan.id,
        message: `Active plan without tier tag (plan ${plan.id}). Add a tier tag in Givebutter.`,
      }),
    );
    tier = "bronze";
  }

  const { first, last } = contactNameParts(contactInfo.contact, plan);

  return {
    id: String(plan.id),
    contactId: contactId ?? null,
    displayName: formatMemberDisplayName(first, last),
    tier,
    isHonorary,
    type: planMembershipType(plan),
    memberSince,
    honorarySince,
    honoraryExpires: honorarySince ? addYears(honorarySince, 1) : null,
    schemaIssues,
  };
}

function buildHonoraryOnlyMember(contact, parsed, schemaIssues) {
  const memberSince = pickDate(contact.contact_since, contact.created_at, contact.createdAt);
  const honorarySince = memberSince;
  const { first, last } = contactNameParts(contact);

  if (!honorarySince) {
    schemaIssues.push(
      createSchemaIssue({
        code: "missing_date",
        field: "honorarySince",
        expected: "contact_since or created_at",
        found: String(contact.id),
        message: "Honorary member missing start date in Givebutter.",
      }),
    );
  }

  return {
    id: `honorary-${contact.id}`,
    contactId: String(contact.id),
    displayName: formatMemberDisplayName(first, last),
    tier: parsed.tier ?? "bronze",
    isHonorary: true,
    type: "honorary",
    memberSince,
    honorarySince,
    honoraryExpires: honorarySince ? addYears(honorarySince, 1) : null,
    schemaIssues: [],
  };
}

export async function fetchGivebutterDashboard({ period = "fy", membershipType = "all" } = {}) {
  const schemaIssues = [];
  const range = getPeriodRange(period);

  if (!getApiKey()) {
    return {
      ok: false,
      error: "GIVEBUTTER_API_KEY is not configured.",
      schemaIssues: [],
      data: null,
    };
  }

  try {
    const [plans, contacts, campaigns] = await Promise.all([
      fetchAllPages("plans"),
      fetchAllPages("contacts"),
      fetchAllPages("campaigns").catch(() => []),
    ]);

    const accountId = getDashboardAccountId();

    const campaignById = new Map(campaigns.map((c) => [String(c.id), c]));

    const sparkPlans = plans.filter((plan) => {
      if (!ACTIVE_PLAN_STATUSES.has(String(plan.status ?? "").toLowerCase())) return false;
      const campaign = campaignById.get(String(plan.campaign_id ?? plan.campaignId ?? ""));
      if (campaigns.length > 0 && campaign && !isSparkCampaign(campaign)) return false;
      if (campaigns.length > 0 && !campaign && campaignMatch() !== "*") {
        const title = String(plan.campaign_title ?? plan.campaign_name ?? "").toLowerCase();
        if (title && !title.includes(campaignMatch())) return false;
      }
      return true;
    });

    const contactMaps = buildContactTagMap(contacts);
    const members = [];
    const seenContactIds = new Set();

    for (const plan of sparkPlans) {
      const member = resolveMemberFromPlan(plan, contactMaps);
      schemaIssues.push(...member.schemaIssues);

      if (membershipType !== "all" && member.type !== membershipType) continue;

      members.push(member);
      if (member.contactId) seenContactIds.add(member.contactId);
    }

    for (const contact of contacts) {
      const tags = contact.tags ?? contact.labels ?? [];
      const parsed = parseContactTags(tags);
      if (!parsed.isHonorary || !parsed.tier) continue;

      const contactId = String(contact.id);
      if (seenContactIds.has(contactId)) continue;

      const honoraryMember = buildHonoraryOnlyMember(contact, parsed, schemaIssues);
      if (membershipType !== "all" && membershipType !== "honorary") continue;

      members.push(honoraryMember);
      seenContactIds.add(contactId);
    }

    if (sparkPlans.length > 0 && members.length === 0 && membershipType !== "all") {
      // filtered empty — not a schema issue
    } else if (plans.length > 0 && sparkPlans.length === 0) {
      schemaIssues.push(
        createSchemaIssue({
          code: "no_members_parsed",
          field: "campaign",
          expected: `campaign matching "${campaignMatch()}"`,
          found: `${plans.length} plans, 0 matched`,
          message: `No active plans matched Spark campaign filter "${campaignMatch()}". Check GIVEBUTTER_SPARK_CAMPAIGN_MATCH.`,
        }),
      );
    }

    const tierMix = { gold: 0, silver: 0, bronze: 0 };
    const tierMixPaid = { gold: 0, silver: 0, bronze: 0 };
    const tierMixHonorary = { gold: 0, silver: 0, bronze: 0 };
    let honoraryCount = 0;
    let paidCount = 0;

    for (const m of members) {
      if (tierMix[m.tier] != null) tierMix[m.tier] += 1;
      if (m.isHonorary) {
        honoraryCount += 1;
        if (tierMixHonorary[m.tier] != null) tierMixHonorary[m.tier] += 1;
      } else {
        paidCount += 1;
        if (tierMixPaid[m.tier] != null) tierMixPaid[m.tier] += 1;
      }
    }

    const totalCount = members.length;
    const paidMembers = members.filter((m) => !m.isHonorary);
    const honoraryMembers = members.filter((m) => m.isHonorary);
    const newInPeriod = members.filter((m) => isInRange(m.memberSince, range)).length;
    const newInPeriodPaid = paidMembers.filter((m) => isInRange(m.memberSince, range)).length;
    const newInPeriodHonorary = honoraryMembers.filter((m) => isInRange(m.memberSince, range)).length;

    const monthLabels = last12MonthLabels();
    const monthlyNewMembers = monthLabels.map(({ key, label }) => {
      const inMonth = members.filter((m) => monthKey(m.memberSince) === key);
      return {
        month: label,
        key,
        members: inMonth.length,
        membersPaid: inMonth.filter((m) => !m.isHonorary).length,
        membersHonorary: inMonth.filter((m) => m.isHonorary).length,
      };
    });

    const allMembers = [...members]
      .sort((a, b) => {
        if (a.isHonorary !== b.isHonorary) return a.isHonorary ? 1 : -1;
        return new Date(b.memberSince ?? 0) - new Date(a.memberSince ?? 0);
      })
      .map((m) => ({
        displayName: m.displayName,
        contactId: m.contactId ?? null,
        profileUrl: givebutterContactProfileUrl(accountId, m.contactId),
        tier: m.tier,
        isHonorary: m.isHonorary,
        type: m.type,
        memberSince: m.memberSince?.slice(0, 10) ?? null,
        honorarySince: m.honorarySince?.slice(0, 10) ?? null,
        honoraryExpires: m.honoraryExpires ?? null,
      }));

    const uniqueIssues = dedupeIssues(schemaIssues);

    return {
      ok: uniqueIssues.every((i) => i.code !== "no_members_parsed"),
      schemaIssues: uniqueIssues,
      data: {
        totalCount,
        paidCount,
        honoraryCount,
        newInPeriod,
        newInPeriodPaid,
        newInPeriodHonorary,
        tierMix,
        tierMixPaid,
        tierMixHonorary,
        monthlyNewMembers,
        allMembers,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Givebutter fetch failed.",
      schemaIssues: [],
      data: null,
    };
  }
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((i) => {
    const key = `${i.code}:${i.field}:${i.found}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
