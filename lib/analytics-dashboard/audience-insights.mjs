import { pctChange } from "./date-range.mjs";
import {
  DEMO_COVERAGE_MIN,
  DEMO_COVERAGE_NOTE,
  DEMO_KNOWN_USERS_MIN,
  DEMO_SHIFT_KNOWN_USERS,
  LOCAL_CITY_NAMES,
  round1,
} from "./insight-thresholds.mjs";

function makeInsight(fields) {
  return {
    kind: fields.kind ?? "audience",
    coverageNote: fields.coverageNote,
    ...fields,
    impactScore: round1(fields.impactScore ?? 0),
  };
}

function bucketRows(rows) {
  const summary = {
    quick_wins: [],
    cannibalization: [],
    conversion: [],
    rising: [],
    watchlist: [],
    all: [],
  };
  for (const row of rows) {
    summary[row.category]?.push(row);
    summary.all.push(row);
  }
  for (const key of Object.keys(summary)) {
    summary[key].sort((a, b) => b.impactScore - a.impactScore);
  }
  return summary;
}

function shareOf(users, total) {
  return total > 0 ? round1((users / total) * 100) : 0;
}

function sessionsChangePct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : null;
  return round1(pctChange(current, previous));
}

function analyzeDemographicSegments(currentRows, previousRows, totalKnown, dimension) {
  const rows = [];
  const prevMap = new Map(
    (previousRows ?? []).map((r) => [r.label ?? r.fullLabel, r]),
  );
  const sorted = [...(currentRows ?? [])]
    .filter((r) => r.users > 0)
    .sort((a, b) => b.users - a.users)
    .slice(0, 3);

  for (const seg of sorted) {
    const label = seg.label ?? seg.fullLabel ?? "Unknown";
    const currentShare = shareOf(seg.users, totalKnown);
    const prev = prevMap.get(label);
    const prevShare = prev ? shareOf(prev.users, totalKnown) : 0;
    const shareChange = round1(currentShare - prevShare);

    if (
      totalKnown >= DEMO_SHIFT_KNOWN_USERS &&
      Math.abs(shareChange) >= 5 &&
      (currentShare >= 10 || prevShare >= 10)
    ) {
      const growing = shareChange > 0;
      rows.push(
        makeInsight({
          id: `audience:demo:${dimension}:${label}`,
          kind: "demographic",
          tags: ["demographic_shift"],
          category: growing ? "rising" : "watchlist",
          label: `${label} (${dimension})`,
          subject: label,
          dimension,
          action: growing ? "Review" : "Monitor",
          actionDetail: growing
            ? `${label} grew ${shareChange}pp to ${currentShare}% of known ${dimension} audience — review messaging and CTAs for this segment.`
            : `${label} shrank ${Math.abs(shareChange)}pp to ${currentShare}% — monitor whether content still resonates.`,
          impactScore: Math.abs(shareChange) * totalKnown * 0.002,
          share: currentShare,
          shareChange,
          coverageNote: DEMO_COVERAGE_NOTE,
        }),
      );
    }
  }
  return rows;
}

/**
 * @param {{
 *   audienceRaw: object;
 *   kpis: object;
 *   programInsights?: object | null;
 *   channels?: object[];
 * }} input
 */
export function computeAudienceInsights({
  audienceRaw,
  kpis,
  programInsights = null,
  channels = [],
}) {
  const rows = [];
  const siteEngagement = kpis.engagementRate?.value ?? 0;
  const siteBounce = kpis.bounceRate?.value ?? 0;
  const siteSessions = kpis.sessions?.value ?? 1;

  const coverage = audienceRaw.demographics?.coveragePercent ?? 0;
  const knownUsers = audienceRaw.demographics?.knownUsers ?? 0;

  if (coverage >= DEMO_COVERAGE_MIN && knownUsers >= DEMO_KNOWN_USERS_MIN) {
    const demo = audienceRaw.demographics;
    rows.push(
      ...analyzeDemographicSegments(
        demo.age?.rows,
        audienceRaw.demographicsPrevious?.age?.rows,
        knownUsers,
        "age",
      ),
    );
    rows.push(
      ...analyzeDemographicSegments(
        demo.gender?.rows,
        audienceRaw.demographicsPrevious?.gender?.rows,
        knownUsers,
        "gender",
      ),
    );

    for (const seg of demo.interests?.rows ?? []) {
      const label = seg.label ?? seg.fullLabel ?? "";
      const prev = (audienceRaw.demographicsPrevious?.interests?.rows ?? []).find(
        (r) => (r.label ?? r.fullLabel) === label,
      );
      const currentShare = shareOf(seg.users, knownUsers);
      const prevShare = prev ? shareOf(prev.users, knownUsers) : 0;
      const shareGain = round1(currentShare - prevShare);
      if (shareGain >= 4 && currentShare >= 8 && siteEngagement >= 55) {
        rows.push(
          makeInsight({
            id: `audience:interest:${label}`,
            kind: "demographic",
            tags: ["interest_opportunity"],
            category: "quick_wins",
            label,
            subject: label,
            dimension: "interest",
            action: "Expand content",
            actionDetail: `Interest "${label}" gained ${shareGain}pp share (${currentShare}% of known users) with healthy site engagement — add related events and cross-links.`,
            impactScore: shareGain * knownUsers * 0.003,
            share: currentShare,
            shareChange: shareGain,
            coverageNote: DEMO_COVERAGE_NOTE,
          }),
        );
      }
    }
  }

  for (const device of audienceRaw.devices ?? []) {
    const prev = (audienceRaw.devicesPrevious ?? []).find(
      (d) => d.category === device.category,
    );
    const currentShare = round1((device.sessions / siteSessions) * 100);
    const prevShare = prev
      ? round1((prev.sessions / (audienceRaw.previousSiteSessions || siteSessions)) * 100)
      : 0;
    const shareChange = round1(currentShare - prevShare);

    if (
      device.sessions >= 30 &&
      Math.abs(shareChange) >= 8
    ) {
      rows.push(
        makeInsight({
          id: `audience:device:${device.category}`,
          kind: "device",
          tags: ["device_mix_shift"],
          category: shareChange > 0 ? "rising" : "watchlist",
          label: device.category,
          subject: device.category,
          dimension: "device",
          action: device.category === "mobile" ? "Fix mobile" : "Review",
          actionDetail:
            device.category === "mobile"
              ? `Mobile share ${shareChange > 0 ? "grew" : "shifted"} to ${currentShare}% — audit forms, nav, and hero on phone.`
              : `${device.category} share changed ${shareChange}pp to ${currentShare}%.`,
          impactScore: Math.abs(shareChange) * device.sessions * 0.05,
          sessions: device.sessions,
          share: currentShare,
          shareChange,
        }),
      );
    }

    if (
      device.category === "mobile" &&
      currentShare >= 60 &&
      device.sessions >= 20
    ) {
      rows.push(
        makeInsight({
          id: `audience:device:mobile_gap`,
          kind: "device",
          tags: ["device_mix_shift", "mobile_gap"],
          category: "quick_wins",
          label: "Mobile experience",
          subject: "mobile",
          dimension: "device",
          action: "Fix mobile",
          actionDetail: `${currentShare}% of sessions are mobile — test forms, nav, and hero on a phone.`,
          impactScore: device.sessions * 0.08,
          sessions: device.sessions,
          share: currentShare,
        }),
      );
    }
  }

  const referrerSources = new Set(
    (audienceRaw.referrers ?? []).map((r) => r.source),
  );
  for (const ref of audienceRaw.referrers ?? []) {
    const change = sessionsChangePct(ref.sessions, ref.previousSessions ?? 0);
    if (change === null) continue;

    const dupSource = channels.some((ch) =>
      ch.sources?.some(
        (s) =>
          s.source === ref.source &&
          referrerSources.has(ref.source) &&
          Math.abs(
            pctChange(s.sessions, s.previousSessions ?? 0) - change,
          ) < 5,
      ),
    );

    if (dupSource) continue;

    if (ref.sessions >= 15 && change >= 50) {
      rows.push(
        makeInsight({
          id: `audience:referrer:spike:${ref.source}`,
          kind: "referrer",
          tags: ["referrer_spike"],
          category: "rising",
          label: ref.source,
          subject: ref.source,
          dimension: "referrer",
          action: "Scale channel",
          actionDetail: `${ref.source} gained ${change}% sessions — nurture the partnership or link source.`,
          impactScore: round1((ref.sessions * Math.min(Math.abs(change), 200)) / 100),
          sessions: ref.sessions,
          sessionsChange: change,
        }),
      );
    } else if ((ref.previousSessions ?? 0) >= 25 && change <= -30) {
      rows.push(
        makeInsight({
          id: `audience:referrer:drop:${ref.source}`,
          kind: "referrer",
          tags: ["referrer_drop"],
          category: "watchlist",
          label: ref.source,
          subject: ref.source,
          dimension: "referrer",
          action: "Review",
          actionDetail: `${ref.source} lost ${Math.abs(change)}% of sessions — check backlinks and listings.`,
          impactScore: round1(((ref.previousSessions ?? 0) * Math.abs(change)) / 100),
          sessions: ref.sessions,
          sessionsChange: change,
        }),
      );
    } else if (
      ref.sessions >= 20 &&
      siteEngagement > 0 &&
      (ref.engagementRate ?? siteEngagement) < siteEngagement * 0.65
    ) {
      rows.push(
        makeInsight({
          id: `audience:referrer:engage:${ref.source}`,
          kind: "referrer",
          tags: ["referrer_low_engagement"],
          category: "quick_wins",
          label: ref.source,
          subject: ref.source,
          dimension: "referrer",
          action: "Fix landing",
          actionDetail: `${ref.source} sends ${ref.sessions} sessions but engagement trails site average — align landing content with referral intent.`,
          impactScore: ref.sessions * 0.05,
          sessions: ref.sessions,
        }),
      );
    }
  }

  for (const city of audienceRaw.cities ?? []) {
    const cityName = (city.city ?? "").toLowerCase();
    const change = sessionsChangePct(city.sessions, city.previousSessions ?? 0);
    const cityShare = round1((city.sessions / siteSessions) * 100);

    if (LOCAL_CITY_NAMES.has(cityName) && cityShare >= 35 && city.sessions >= 40) {
      rows.push(
        makeInsight({
          id: `audience:city:local:${city.city}`,
          kind: "city",
          tags: ["city_concentration"],
          category: "quick_wins",
          label: city.city,
          subject: city.city,
          dimension: "city",
          action: "Expand content",
          actionDetail: `${cityShare}% of sessions from ${city.city} — highlight local events, artists, and "in Waco" CTAs.`,
          impactScore: city.sessions * 0.04,
          sessions: city.sessions,
          share: cityShare,
        }),
      );
    }

    if (
      change !== null &&
      change >= 25 &&
      city.sessions >= 15 &&
      city.engagementRate < siteEngagement * 0.75
    ) {
      rows.push(
        makeInsight({
          id: `audience:city:rising:${city.city}`,
          kind: "city",
          tags: ["city_rising_engagement_gap"],
          category: "rising",
          label: city.city,
          subject: city.city,
          dimension: "city",
          action: "Fix landing",
          actionDetail: `${city.city} sessions up ${change}% but engagement (${city.engagementRate}%) lags site (${siteEngagement}%) — review top landing pages for this geo.`,
          impactScore: round1(
            Math.max(0, city.sessions - (city.previousSessions ?? 0)) *
              (siteEngagement - city.engagementRate) *
              0.1,
          ),
          sessions: city.sessions,
          sessionsChange: change,
        }),
      );
    }
  }

  if (programInsights?.audience) {
    const { newUsers, returningUsers } = programInsights.audience;
    const total = newUsers + returningUsers || 1;
    const newShare = round1((newUsers / total) * 100);
    const prev = audienceRaw.programAudiencePrevious;
    const prevTotal = prev ? prev.newUsers + prev.returningUsers : 0;
    const prevNewShare =
      prevTotal > 0 ? round1((prev.newUsers / prevTotal) * 100) : null;
    const shareChange =
      prevNewShare !== null ? round1(newShare - prevNewShare) : null;

    if (
      siteSessions >= 100 &&
      newShare >= 68 &&
      (shareChange === null || shareChange >= 5)
    ) {
      rows.push(
        makeInsight({
          id: `audience:retention:site`,
          kind: "audience",
          tags: ["new_vs_returning_imbalance"],
          category: "conversion",
          label: "New visitor share",
          subject: "Site-wide",
          dimension: "audience",
          action: "Improve CTA",
          actionDetail: `${newShare}% of visitors are new${shareChange !== null ? ` (up ${shareChange}pp)` : ""} — add email capture and return-visit hooks.`,
          impactScore: round1((newShare - 50) * 2 + (shareChange ?? 0) * 2),
          share: newShare,
          shareChange,
        }),
      );
    }
  }

  return bucketRows(rows);
}
