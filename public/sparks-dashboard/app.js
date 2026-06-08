const TIERS = ["bronze", "silver", "gold"];

const $ = (id) => document.getElementById(id);

let dashboardDetail = { members: [], events: [] };
let growthModalLastFocus = null;

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusSlugToClass(slug) {
  const map = {
    idea: "idea",
    planning: "planning",
    marketing: "marketing",
    operations: "operations",
    ready: "ready",
    "follow-up": "follow-up",
    followup: "follow-up",
    done: "done",
    canceled: "canceled",
    cancelled: "canceled",
  };
  return map[slug] ?? "unknown";
}

async function fetchDashboard({ period, membershipType, refresh = false }) {
  const params = new URLSearchParams({ period, membershipType });
  if (refresh) params.set("refresh", "1");
  const res = await fetch(`/api/sparks-dashboard?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function renderSyncBanner(syncHealth, warnings) {
  const el = $("sync-banner");
  const schemaIssues = syncHealth?.schemaIssues ?? [];

  if (schemaIssues.length === 0) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  const sources = new Set(schemaIssues.map((i) => i.source));
  const title =
    sources.has("asana") && sources.has("givebutter")
      ? "Dashboard sync needs attention"
      : sources.has("asana")
        ? "Asana sync needs attention"
        : "Givebutter sync needs attention";

  const items = schemaIssues
    .map((i) => `<li>${escapeHtml(i.message)}</li>`)
    .join("");

  el.hidden = false;
  el.innerHTML = `
    <div class="sync-banner__inner">
      <strong>${escapeHtml(title)}</strong>
      <ul class="sync-banner__list">${items}</ul>
      <p class="sync-banner__hint">Field names or statuses may have changed. Update the mapping in <code>lib/sparks-dashboard/asana-schema.mjs</code> or env alias variables — partial data is shown below.</p>
    </div>
  `;

  if (warnings?.length) {
    // Transient warnings go to status line only, not this banner
  }
}

function renderKpis(kpis) {
  $("kpi-grid").innerHTML = kpis
    .map(
      (kpi) => `
    <article class="kpi-card${kpi.accent ? " kpi-card--accent" : ""}${kpi.degraded ? " kpi-card--degraded" : ""}" ${kpi.degraded ? 'title="Data unavailable or mapping issue"' : ""}>
      <p class="kpi-card__label">${escapeHtml(kpi.label)}</p>
      <p class="kpi-card__value">${escapeHtml(kpi.value)}</p>
      <p class="kpi-card__delta ${kpi.delta.className}">${escapeHtml(kpi.delta.text)}</p>
      ${kpi.footnote ? `<p class="kpi-card__footnote${kpi.footnote.includes("honorary") ? " is-honorary" : ""}">${escapeHtml(kpi.footnote)}</p>` : ""}
    </article>
  `,
    )
    .join("");
}

function renderGoals(goals) {
  $("membership-goals").innerHTML = goals
    .map((goal, index) => {
      const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
      const complete = pct >= 100;
      const pipelineStrip =
        index === 1 && goal.pipelineByMonth?.length
          ? `<div class="pipeline-strip">${goal.pipelineByMonth
              .map(
                (m) =>
                  `<span class="pipeline-month${m.count >= m.target ? " is-met" : ""}">${escapeHtml(m.label)}: ${m.count}/${m.target}</span>`,
              )
              .join("")}</div>`
          : "";

      const honoraryNote =
        index === 0 && goal.honoraryCount > 0
          ? `<p class="goal__honorary">${formatNumber(goal.honoraryCount)} honorary members tracked separately</p>`
          : "";

      const goalTipRows =
        index === 0
          ? [
              `swatch--members::Paid::${formatNumber(goal.current)}`,
              `swatch--honorary::Honorary tracked::${formatNumber(goal.honoraryCount ?? 0)}`,
              `swatch--total::Paid to goal::${formatNumber(Math.max(goal.target - goal.current, 0))}`,
            ].join("|")
          : [
              `swatch--events::Scheduled::${formatNumber(goal.current)}`,
              `swatch--members::Target::${formatNumber(goal.target)}`,
              `swatch--total::Still needed::${formatNumber(Math.max(goal.target - goal.current, 0))}`,
            ].join("|");

      return `
      <div class="goal${index === 0 ? " goal--paid" : ""}">
        <div class="goal__head">
          <span class="goal__label">${escapeHtml(goal.label)}</span>
          <span class="goal__numbers">${formatNumber(goal.current)} / ${formatNumber(goal.target)} ${escapeHtml(goal.unit)}</span>
        </div>
        <div
          class="goal__bar chart-hit"
          role="progressbar"
          tabindex="0"
          aria-valuenow="${Math.round(pct)}"
          aria-valuemin="0"
          aria-valuemax="100"
          data-tip-title="${escapeHtml(goal.label)}"
          data-tip-rows="${goalTipRows}"
        >
          <div class="goal__fill${complete ? " is-complete" : ""}" style="width: ${pct}%"></div>
        </div>
        <p class="goal__note">${escapeHtml(goal.note)}</p>
        ${honoraryNote}
        ${pipelineStrip}
      </div>
    `;
    })
    .join("");
}

function renderTierDonut(tierMixPaid, tierMixHonorary, total, honoraryCount, paidCount) {
  const paidColors = { bronze: "#a47148", silver: "#8d99ae", gold: "#e9c46a" };
  const honoraryColors = { bronze: "#9a86b8", silver: "#7f6fa3", gold: "#b09ad0" };
  const slices = [];

  for (const tier of TIERS) {
    const paid = tierMixPaid[tier] || 0;
    if (paid > 0) slices.push({ count: paid, color: paidColors[tier] });
  }
  for (const tier of TIERS) {
    const honorary = tierMixHonorary[tier] || 0;
    if (honorary > 0) slices.push({ count: honorary, color: honoraryColors[tier] });
  }

  const sum = slices.reduce((acc, slice) => acc + slice.count, 0) || 1;
  let cursor = 0;
  const stops = slices
    .map((slice) => {
      const width = (slice.count / sum) * 100;
      const start = cursor;
      cursor += width;
      return `${slice.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  const donut = $("tier-donut");
  donut.style.background = sum > 0 ? `conic-gradient(${stops})` : "#efe9df";
  donut.dataset.total = formatNumber(total);
  donut.dataset.tipPaid = String(paidCount);
  donut.dataset.tipHonorary = String(honoraryCount);
  donut.dataset.tipTotal = String(total);

  $("tier-legend").innerHTML = TIERS.map((tier) => {
    const paid = tierMixPaid[tier] || 0;
    const honorary = tierMixHonorary[tier] || 0;
    const tierTotal = paid + honorary;
    const pct = Math.round((tierTotal / sum) * 100);
    return `
      <li
        class="tier-legend__item chart-hit"
        tabindex="0"
        data-tip-tier="${tier}"
        data-tip-paid="${paid}"
        data-tip-honorary="${honorary}"
        data-tip-pct="${pct}"
      >
        <span class="tier-legend__label">
          <i class="tier-swatch tier-swatch--${tier}" aria-hidden="true"></i>
          ${tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
        <span class="tier-legend__counts">
          <span class="tier-legend__paid">${formatNumber(paid)} paid</span>
          ${honorary > 0 ? `<span class="tier-legend__honorary">+ ${formatNumber(honorary)} honorary</span>` : ""}
          <span class="muted">(${pct}%)</span>
        </span>
      </li>
    `;
  }).join("");

  $("tier-summary").innerHTML =
    total > 0
      ? `<span class="tier-summary__paid">${formatNumber(paidCount)} paid</span><span class="tier-summary__sep">·</span><span class="tier-summary__honorary">${formatNumber(honoraryCount)} honorary</span><span class="tier-summary__sep">·</span><span class="muted">${formatNumber(total)} total</span>`
      : "";
}

function monthKeyFromIso(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthHeading(monthKey) {
  const [year, month] = String(monthKey).split("-");
  if (!year || !month) return monthKey;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function renderGrowthChart(monthly) {
  const max = Math.max(
    ...(monthly ?? []).flatMap((m) => [
      (m.membersPaid ?? 0) + (m.membersHonorary ?? 0),
      m.events ?? 0,
    ]),
    1,
  );

  $("growth-chart").innerHTML = (monthly ?? [])
    .map((row) => {
      const membersPaid = row.membersPaid ?? 0;
      const membersHonorary = row.membersHonorary ?? 0;
      const paidH = Math.round((membersPaid / max) * 100);
      const honoraryH = Math.round((membersHonorary / max) * 100);
      const eventH = Math.round((row.events / max) * 100);
      const monthLabel = row.month ?? row.key;
      return `
      <div
        class="growth-month chart-hit growth-month--interactive"
        tabindex="0"
        role="button"
        aria-label="View details for ${escapeHtml(formatMonthHeading(row.key))}"
        data-month-key="${escapeHtml(row.key)}"
        data-tip-title="${escapeHtml(monthLabel)}"
        data-tip-paid="${membersPaid}"
        data-tip-honorary="${membersHonorary}"
        data-tip-events="${row.events ?? 0}"
      >
        <div class="growth-bars">
          <div class="growth-bar-stack">
            <div class="growth-bar growth-bar--honorary" style="height: ${honoraryH}%"></div>
            <div class="growth-bar growth-bar--members" style="height: ${paidH}%"></div>
          </div>
          <div class="growth-bar growth-bar--events" style="height: ${eventH}%"></div>
        </div>
        <span class="growth-month__label">${escapeHtml(row.month)}</span>
      </div>
    `;
    })
    .join("");
}

function eventRowHtml(event) {
  const slug = statusSlugToClass(event.status);
  const label = event.statusLabel ?? event.status ?? "—";
  const titleCell = event.asanaUrl
    ? `<a href="${escapeHtml(event.asanaUrl)}" target="_blank" rel="noopener">${escapeHtml(event.title)}</a>`
    : escapeHtml(event.title);
  return `
    <tr>
      <td>${titleCell}</td>
      <td>${formatDate(event.date)}</td>
      <td><span class="status-badge status-badge--${slug}">${escapeHtml(label)}</span></td>
    </tr>
  `;
}

function renderEvents(events) {
  const list = events ?? [];
  const active = list.filter((e) => e.status !== "done" && e.status !== "canceled" && e.status !== "cancelled");
  const done = list.filter((e) => e.status === "done");
  const upcomingCount = active.filter((e) => e.status !== "idea").length;
  const ideaCount = active.filter((e) => e.status === "idea").length;

  $("events-summary").textContent =
    ideaCount > 0
      ? `${upcomingCount} upcoming · ${ideaCount} ideas`
      : `${upcomingCount} upcoming`;

  $("events-body").innerHTML = active.map((event) => eventRowHtml(event)).join("");

  const doneWrap = $("events-done-wrap");
  const doneBody = $("events-done-body");
  const doneToggle = $("events-done-toggle");

  if (!done.length) {
    doneWrap.hidden = true;
    doneBody.innerHTML = "";
    return;
  }

  doneWrap.hidden = false;
  doneToggle.dataset.collapsedLabel = `Show completed events (${done.length})`;
  doneToggle.textContent = doneToggle.dataset.collapsedLabel;
  doneToggle.setAttribute("aria-expanded", "false");
  doneBody.innerHTML = done.map((event) => eventRowHtml(event)).join("");
  doneBody.hidden = true;
}

function renderPipelineCallout(count) {
  const el = $("pipeline-callout");
  if (!count) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `${formatNumber(count)} pipeline event(s) lack a due date in Asana. <a href="https://app.asana.com/1/1211307037171881/project/1213968849649812" target="_blank" rel="noopener">Add dates in Creative Sparks</a> for accurate pipeline tracking.`;
}

function membershipTypeLabel(type) {
  if (type === "annual") return "Annual";
  if (type === "honorary") return "Honorary";
  return "Monthly";
}

function memberTierLabel(tier) {
  return `${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
}

function memberNameCell(member) {
  const name = escapeHtml(member.displayName ?? "Member");
  if (!member.profileUrl) return name;
  return `<a href="${escapeHtml(member.profileUrl)}" class="member-profile-link" target="_blank" rel="noopener noreferrer">${name}</a>`;
}

function memberRowAttrs(member, rowClass) {
  if (!member.profileUrl) return `class="${rowClass}"`;
  return `class="${rowClass} member-row--link" data-profile-url="${escapeHtml(member.profileUrl)}"`;
}

let memberProfileLinksReady = false;

function bindMemberProfileLinks() {
  if (memberProfileLinksReady) return;
  memberProfileLinksReady = true;

  document.addEventListener("click", (event) => {
    const row = event.target.closest(".member-row--link");
    if (!row || event.target.closest("a")) return;
    const url = row.dataset.profileUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });
}

function growthModalMemberItem(member) {
  const tier = memberTierLabel(member.tier);
  const type = membershipTypeLabel(member.type);
  return `
    <li class="growth-modal__item${member.isHonorary ? " growth-modal__item--honorary" : ""}">
      <span class="growth-modal__item-main">${memberNameCell(member)}</span>
      <span class="growth-modal__item-meta">${escapeHtml(tier)} · ${escapeHtml(type)}</span>
    </li>
  `;
}

function growthModalEventItem(event) {
  const title = event.asanaUrl
    ? `<a href="${escapeHtml(event.asanaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(event.title)}</a>`
    : escapeHtml(event.title);
  return `
    <li class="growth-modal__item">
      <span class="growth-modal__item-main">${title}</span>
      <span class="growth-modal__item-meta">${formatDate(event.date)}</span>
    </li>
  `;
}

function growthModalEmpty(text) {
  return `<li class="growth-modal__empty">${escapeHtml(text)}</li>`;
}

function openGrowthMonthModal(monthKey) {
  const modal = $("growth-modal");
  const paid = dashboardDetail.members.filter(
    (m) => !m.isHonorary && monthKeyFromIso(m.memberSince) === monthKey,
  );
  const honorary = dashboardDetail.members.filter(
    (m) => m.isHonorary && monthKeyFromIso(m.memberSince) === monthKey,
  );
  const events = dashboardDetail.events.filter(
    (e) => e.status === "done" && monthKeyFromIso(e.date) === monthKey,
  );

  $("growth-modal-title").textContent = formatMonthHeading(monthKey);
  $("growth-modal-summary").textContent = `${formatNumber(paid.length)} paid · ${formatNumber(honorary.length)} honorary · ${formatNumber(events.length)} events held`;

  $("growth-modal-paid").innerHTML = paid.length
    ? paid.map((m) => growthModalMemberItem(m)).join("")
    : growthModalEmpty("No new paid members this month");

  $("growth-modal-honorary").innerHTML = honorary.length
    ? honorary.map((m) => growthModalMemberItem(m)).join("")
    : growthModalEmpty("No new honorary members this month");

  $("growth-modal-events").innerHTML = events.length
    ? events.map((e) => growthModalEventItem(e)).join("")
    : growthModalEmpty("No events held this month");

  growthModalLastFocus = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("growth-modal-open");
  $("growth-modal").querySelector(".growth-modal__close")?.focus();
  hideChartTooltip();
}

function closeGrowthMonthModal() {
  const modal = $("growth-modal");
  modal.hidden = true;
  document.body.classList.remove("growth-modal-open");
  growthModalLastFocus?.focus?.();
  growthModalLastFocus = null;
}

let growthModalReady = false;

function bindGrowthMonthModal() {
  if (growthModalReady) return;
  growthModalReady = true;

  $("growth-chart").addEventListener("click", (event) => {
    const month = event.target.closest(".growth-month");
    if (!month?.dataset.monthKey) return;
    openGrowthMonthModal(month.dataset.monthKey);
  });

  $("growth-chart").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const month = event.target.closest(".growth-month");
    if (!month?.dataset.monthKey) return;
    event.preventDefault();
    openGrowthMonthModal(month.dataset.monthKey);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-growth-modal-close]")) closeGrowthMonthModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("growth-modal").hidden) {
      event.preventDefault();
      closeGrowthMonthModal();
    }
  });
}

function renderMembers(members) {
  const list = members ?? [];
  const paid = list.filter((m) => !m.isHonorary);
  const honorary = list.filter((m) => m.isHonorary);

  $("paid-members-summary").textContent = `${formatNumber(paid.length)} paid`;
  $("honorary-members-summary").textContent = `${formatNumber(honorary.length)} honorary`;

  $("paid-members-body").innerHTML = paid
    .map(
      (member) => `
    <tr ${memberRowAttrs(member, "member-row--paid")}>
      <td>${memberNameCell(member)}</td>
      <td><span class="tier-badge tier-badge--${member.tier}">${escapeHtml(memberTierLabel(member.tier))}</span></td>
      <td>${membershipTypeLabel(member.type)}</td>
      <td>${formatDate(member.memberSince)}</td>
    </tr>
  `,
    )
    .join("");

  $("honorary-members-body").innerHTML = honorary
    .map(
      (member) => `
    <tr ${memberRowAttrs(member, "member-row--honorary")}>
      <td class="member-name--honorary">${memberNameCell(member)}</td>
      <td><span class="tier-badge tier-badge--honorary tier-badge--honorary-${member.tier}">${escapeHtml(memberTierLabel(member.tier))}</span></td>
      <td>${formatDate(member.honorarySince)}</td>
      <td>${formatDate(member.honoraryExpires)}</td>
    </tr>
  `,
    )
    .join("");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chartTooltipRow(swatchClass, label, value) {
  return `
    <div class="chart-tooltip__row">
      <i class="swatch ${swatchClass}" aria-hidden="true"></i>
      <span class="chart-tooltip__label">${escapeHtml(label)}</span>
      <strong class="chart-tooltip__value">${escapeHtml(value)}</strong>
    </div>
  `;
}

function chartTooltipHtml(title, rows) {
  return `
    <p class="chart-tooltip__title">${escapeHtml(title)}</p>
    <div class="chart-tooltip__rows">${rows}</div>
  `;
}

function positionChartTooltip(clientX, clientY) {
  const tip = $("chart-tooltip");
  const pad = 14;
  const { width, height } = tip.getBoundingClientRect();
  let left = clientX + pad;
  let top = clientY - height - pad;

  if (left + width > window.innerWidth - 10) left = clientX - width - pad;
  if (top < 10) top = clientY + pad;
  if (left < 10) left = 10;

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function showChartTooltip(html, clientX, clientY) {
  const tip = $("chart-tooltip");
  tip.innerHTML = html;
  tip.hidden = false;
  positionChartTooltip(clientX, clientY);
}

function hideChartTooltip() {
  const tip = $("chart-tooltip");
  tip.hidden = true;
  document.querySelectorAll(".is-chart-active").forEach((el) => {
    el.classList.remove("is-chart-active");
  });
}

function growthMonthTooltip(month) {
  const paid = Number(month.dataset.tipPaid ?? 0);
  const honorary = Number(month.dataset.tipHonorary ?? 0);
  const events = Number(month.dataset.tipEvents ?? 0);
  const label = month.dataset.tipTitle ?? "Month";

  return chartTooltipHtml(
    label,
    [
      chartTooltipRow("swatch--members", "New paid", formatNumber(paid)),
      chartTooltipRow("swatch--honorary", "New honorary", formatNumber(honorary)),
      chartTooltipRow("swatch--events", "Events held", formatNumber(events)),
    ].join(""),
  );
}

function tierLegendTooltip(item) {
  const tier = item.dataset.tipTier ?? "";
  const paid = Number(item.dataset.tipPaid ?? 0);
  const honorary = Number(item.dataset.tipHonorary ?? 0);
  const pct = item.dataset.tipPct ?? "0";

  return chartTooltipHtml(
    tier.charAt(0).toUpperCase() + tier.slice(1),
    [
      chartTooltipRow(`tier-swatch tier-swatch--${tier}`, "Paid", formatNumber(paid)),
      honorary > 0
        ? chartTooltipRow("swatch--honorary", "Honorary", formatNumber(honorary))
        : "",
      chartTooltipRow("swatch--total", "Share of total", `${pct}%`),
    ].join(""),
  );
}

function tierDonutTooltip(donut) {
  return chartTooltipHtml(
    "Membership mix",
    [
      chartTooltipRow("swatch--members", "Paid", formatNumber(donut.dataset.tipPaid ?? 0)),
      chartTooltipRow("swatch--honorary", "Honorary", formatNumber(donut.dataset.tipHonorary ?? 0)),
      chartTooltipRow("swatch--total", "Total members", formatNumber(donut.dataset.tipTotal ?? 0)),
    ].join(""),
  );
}

function goalTooltip(goal) {
  const title = goal.dataset.tipTitle ?? "Goal";
  const rows = (goal.dataset.tipRows ?? "")
    .split("|")
    .filter(Boolean)
    .map((row) => {
      const [swatch, label, value] = row.split("::");
      return chartTooltipRow(swatch, label, value);
    })
    .join("");
  return chartTooltipHtml(title, rows);
}

let activeChartHit = null;

function activateChartHit(hit, clientX, clientY) {
  document.querySelectorAll(".is-chart-active").forEach((el) => {
    if (el !== hit) el.classList.remove("is-chart-active");
  });
  hit.classList.add("is-chart-active");

  let html = "";
  if (hit.classList.contains("growth-month")) html = growthMonthTooltip(hit);
  else if (hit.classList.contains("tier-legend__item")) html = tierLegendTooltip(hit);
  else if (hit.classList.contains("tier-donut")) html = tierDonutTooltip(hit);
  else if (hit.classList.contains("goal__bar")) html = goalTooltip(hit);

  if (html) showChartTooltip(html, clientX, clientY);
}

let chartInteractionsReady = false;

function bindChartInteractions() {
  if (chartInteractionsReady) return;
  chartInteractionsReady = true;

  document.addEventListener("mouseover", (event) => {
    const hit = event.target.closest?.(".chart-hit");
    if (!hit) return;

    const x = event.clientX;
    const y = event.clientY;
    if (hit === activeChartHit) {
      positionChartTooltip(x, y);
      return;
    }

    activeChartHit = hit;
    activateChartHit(hit, x, y);
  });

  document.addEventListener("mousemove", (event) => {
    const tip = $("chart-tooltip");
    if (!tip.hidden && activeChartHit) positionChartTooltip(event.clientX, event.clientY);
  });

  document.addEventListener("mouseout", (event) => {
    const hit = event.target.closest?.(".chart-hit");
    if (!hit || hit !== activeChartHit) return;
    const related = event.relatedTarget;
    if (related && hit.contains(related)) return;
    activeChartHit = null;
    hideChartTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const hit = event.target.closest?.(".chart-hit");
    if (!hit) return;
    activeChartHit = hit;
    const rect = hit.getBoundingClientRect();
    activateChartHit(hit, rect.left + rect.width / 2, rect.top);
  });

  document.addEventListener("focusout", (event) => {
    const hit = event.target.closest?.(".chart-hit");
    if (!hit || hit !== activeChartHit) return;
    const related = event.relatedTarget;
    if (related && hit.contains(related)) return;
    activeChartHit = null;
    hideChartTooltip();
  });

  window.addEventListener("scroll", () => {
    activeChartHit = null;
    hideChartTooltip();
  }, { passive: true });
}

function setStatus(message, type = "") {
  const el = $("status");
  el.textContent = message;
  el.className = type ? `status ${type}` : "status";
}

function skeletonBar(widthPct = 100) {
  return `<span class="skeleton skeleton--bar" style="width:${widthPct}%"></span>`;
}

function skeletonText(size = "md", width = "72%") {
  return `<span class="skeleton skeleton--text-${size}" style="width:${width}"></span>`;
}

function skeletonTableRows(count, rowClass, colCount) {
  return Array.from({ length: count }, () => {
    const cells = Array.from(
      { length: colCount },
      () => `<td><span class="skeleton skeleton--text-md"></span></td>`,
    ).join("");
    return `<tr class="skeleton-table-row ${rowClass}">${cells}</tr>`;
  }).join("");
}

function showSkeletonLoading() {
  const page = $("dashboard-page");
  page.classList.add("is-loading");
  page.setAttribute("aria-busy", "true");

  $("last-updated").innerHTML = skeletonText("sm", "140px");

  $("kpi-grid").innerHTML = Array.from({ length: 5 }, (_, i) => `
    <article class="kpi-card${i === 0 ? " kpi-card--accent" : ""} skeleton-kpi" aria-hidden="true">
      ${skeletonText("sm", "58%")}
      ${skeletonText("xl", i === 0 ? "42%" : "28%")}
      ${skeletonText("sm", "76%")}
    </article>
  `).join("");

  $("membership-goals").innerHTML = [0, 1].map((i) => `
    <div class="skeleton-goal" aria-hidden="true">
      <div class="goal__head">
        ${skeletonText("md", i === 0 ? "38%" : "52%")}
        ${skeletonText("md", "88px")}
      </div>
      ${skeletonBar(100)}
      ${skeletonText("sm", "64%")}
      ${i === 1 ? `<div class="pipeline-strip">${Array.from({ length: 6 }, () => `<span class="skeleton skeleton--pill" style="width:52px"></span>`).join("")}</div>` : ""}
    </div>
  `).join("");

  $("tier-summary").innerHTML = skeletonText("sm", "120px");
  $("tier-donut").style.background = "";
  $("tier-donut").innerHTML = '<span class="skeleton skeleton--donut" aria-hidden="true"></span>';
  $("tier-legend").innerHTML = TIERS.map(
    () => `
      <li class="skeleton-tier-legend__row" aria-hidden="true">
        ${skeletonText("md", "72px")}
        ${skeletonText("md", "48px")}
      </li>
    `,
  ).join("");

  $("growth-chart").innerHTML = Array.from({ length: 12 }, (_, i) => `
    <div class="skeleton-growth-month" aria-hidden="true">
      <div class="skeleton-growth-bars">
        <span class="skeleton" style="height:${35 + (i % 4) * 14}%"></span>
        <span class="skeleton" style="height:${20 + (i % 3) * 18}%"></span>
      </div>
      ${skeletonText("sm", "28px")}
    </div>
  `).join("");

  $("events-summary").innerHTML = '<span class="skeleton skeleton--pill" style="width:112px"></span>';
  $("events-body").innerHTML = skeletonTableRows(6, "", 3);
  $("events-done-wrap").hidden = true;
  $("events-done-body").innerHTML = "";
  $("pipeline-callout").hidden = true;

  $("paid-members-summary").innerHTML = '<span class="skeleton skeleton--pill" style="width:72px"></span>';
  $("honorary-members-summary").innerHTML = '<span class="skeleton skeleton--pill" style="width:88px"></span>';
  $("paid-members-body").innerHTML = skeletonTableRows(6, "skeleton-members-row", 4);
  $("honorary-members-body").innerHTML = skeletonTableRows(6, "skeleton-members-row", 4);
}

function clearSkeletonLoading() {
  const page = $("dashboard-page");
  page.classList.remove("is-loading");
  page.setAttribute("aria-busy", "false");
  $("tier-donut").innerHTML = "";
}

async function loadDashboard() {
  const period = $("period").value;
  const membershipType = $("membership-type").value;

  $("refresh-btn").disabled = true;
  showSkeletonLoading();
  setStatus("");

  try {
    const data = await fetchDashboard({ period, membershipType, refresh: true });

    clearSkeletonLoading();

    $("last-updated").textContent = `Updated ${new Date(data.updatedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })}${data.cached ? " (cached)" : ""}`;

    renderSyncBanner(data.syncHealth, data.warnings);
    renderKpis(data.kpis);
    renderGoals(data.goals);
    renderTierDonut(
      data.tierMixPaid,
      data.tierMixHonorary,
      data.totalMemberCount,
      data.honoraryCount,
      data.paidCount,
    );
    dashboardDetail = {
      members: data.members ?? [],
      events: data.events ?? [],
    };

    renderGrowthChart(data.monthly);
    renderEvents(data.events);
    renderPipelineCallout(data.undatedPipelineCount);
    renderMembers(data.members);

    if (data.warnings?.length) {
      setStatus(data.warnings.map((w) => w.message).join(" "), "");
    } else if ((data.syncHealth?.schemaIssues ?? []).length === 0) {
      setStatus("", "");
    } else {
      setStatus("", "");
    }
  } catch (error) {
    clearSkeletonLoading();
    setStatus(error instanceof Error ? error.message : "Could not load dashboard.");
  } finally {
    $("refresh-btn").disabled = false;
  }
}

function exportSnapshot() {
  const period = $("period").value;
  const membershipType = $("membership-type").value;
  fetchDashboard({ period, membershipType })
    .then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `creative-spark-dashboard-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Snapshot downloaded.", "is-success");
    })
    .catch((error) => {
      setStatus(error instanceof Error ? error.message : "Export failed.");
    });
}

function toggleCompletedEvents() {
  const body = $("events-done-body");
  const toggle = $("events-done-toggle");
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  body.hidden = expanded;
  toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
  toggle.textContent = expanded
    ? toggle.dataset.collapsedLabel
    : "Hide completed events";
}

$("events-done-toggle")?.addEventListener("click", toggleCompletedEvents);

$("period").addEventListener("change", loadDashboard);
$("membership-type").addEventListener("change", loadDashboard);
$("refresh-btn").addEventListener("click", loadDashboard);
$("export-btn").addEventListener("click", exportSnapshot);

bindChartInteractions();
bindMemberProfileLinks();
bindGrowthMonthModal();
loadDashboard();
