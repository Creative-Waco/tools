# Creative Waco Tools

Internal tools for Creative Waco, hosted at **https://tools.creativewaco.org**.

## Tools

| Tool | URL | Description |
|------|-----|-------------|
| RSS Email HTML Generator | [/rss-email/](https://tools.creativewaco.org/rss-email/) | RSS feed → HubSpot-ready event email HTML |
| Event Card Graphics | [/event-cards/](https://tools.creativewaco.org/event-cards/) | 4:5 portrait cards (photo + title) from the events RSS feed |
| Creative Spark Dashboard | [/sparks-dashboard/](https://tools.creativewaco.org/sparks-dashboard/) | Live Spark membership + event pipeline from Givebutter and Asana |

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3847](http://localhost:3847) for the tools hub.

### Creative Spark Dashboard — environment variables

Set these before `npm start` (or in Vercel → Settings → Environment Variables):

| Variable | Required | Purpose |
|----------|----------|---------|
| `GIVEBUTTER_API_KEY` | Yes | Bearer token from Givebutter → Settings → Integrations → API |
| `ASANA_ACCESS_TOKEN` | Yes | PAT or OAuth token (same as `Workspace/asana/`) |
| `ASANA_SPARKS_PROJECT_GID` | No | Default `1213968849649812` (Creative Sparks) |
| `ASANA_EVENT_STATUS_FIELD_GID` | No | Fallback if Event Status field is renamed |
| `ASANA_FIELD_ALIASES_JSON` | No | JSON override for Asana field/section/status aliases |
| `GIVEBUTTER_SPARK_CAMPAIGN_MATCH` | No | Substring to match Spark campaigns (default `creative-spark`) |
| `GIVEBUTTER_TIER_TAG_ALIASES_JSON` | No | JSON override for tier/honorary tag matching |
| `GIVEBUTTER_ACCOUNT_ID` | Yes (prod) | Numeric Givebutter dashboard account ID for contact profile links (from your dashboard URL, e.g. `145191` in `…/accounts/145191/…`). Not the API account slug. |
| `ASANA_REFRESH_TOKEN` | Recommended (prod) | OAuth refresh token so Vercel can renew `ASANA_ACCESS_TOKEN` without the local token file |
| `ASANA_OAUTH_CLIENT_ID` | No | OAuth app client ID (default: Creative Waco app) |
| `ASANA_OAUTH_CLIENT_SECRET` | No | OAuth app client secret (default: Creative Waco app) |

### Vercel (production)

Local file auto-load does **not** run on Vercel. Set at minimum:

| Variable | Notes |
|----------|--------|
| `GIVEBUTTER_API_KEY` | Givebutter → Settings → Integrations → API |
| `GIVEBUTTER_ACCOUNT_ID` | Numeric ID from dashboard URL (`145191` for Creative Waco) — required for member links |
| `ASANA_ACCESS_TOKEN` | Current OAuth access token |
| `ASANA_REFRESH_TOKEN` | From `Workspace/asana/.asana_token.json` after running `scripts/refresh-asana-oauth.mjs` — keeps Asana working when the access token expires |

Optional overrides match the table above (`ASANA_SPARKS_PROJECT_GID`, campaign/tier aliases, etc.).

Example local setup:

```bash
export GIVEBUTTER_API_KEY="..."
export ASANA_ACCESS_TOKEN="..."
npm start
```

**Local auto-load:** If env vars are unset, the server reads `Workspace/asana/.asana_token.json` and `Archive/givebutter/.env` (API key and `GIVEBUTTER_ACCOUNT_ID`) automatically. Expired OAuth tokens are refreshed using the saved `refresh_token` (updates the token file locally).

**Re-authorize** if automatic refresh fails (revoked app access):

```bash
node scripts/refresh-asana-oauth.mjs
```

Uses the registered callback `http://localhost:3334/oauth/callback`. Sign in when the browser opens and click **Allow** — the script captures the redirect automatically.

Override redirect URI if needed:

```bash
ASANA_OAUTH_REDIRECT_URI="http://localhost:3334/oauth/callback" node scripts/refresh-asana-oauth.mjs
```

API endpoint: `GET /api/sparks-dashboard?period=fy&membershipType=all`

## Creative Spark Dashboard

Public-facing dashboard for [Creative Spark](https://creativewaco.org/spark) membership and event pipeline progress.

**Data sources**

- **Givebutter** — active plans plus honorary-only contacts (tier tags without a recurring plan) for tier (gold / silver / bronze) and honorary flag
- **Asana** — [Creative Sparks](https://app.asana.com/1/1211307037171881/project/1213968849649812) project, Events section, `Event Status` custom field

**KPIs**

| KPI | Logic |
|-----|-------|
| Paid members | Active Spark plans (excludes honorary-only contacts); footnote shows honorary + total |
| New paid this period | Paid `memberSince` in selected period; honorary new sign-ups in footnote |
| Events held | Event Status = Done, in period |
| Upcoming events | Event Status = Ready, future `due_on` |
| Pipeline scheduled | Planning / Marketing / Operations / Ready with `due_on` in next 6 months |

**Goals**

- **90 paid members** by Dec 31, 2026 (honorary members tracked separately and excluded from this goal)
- **12 pipeline events** (2/month × 6 months) with dates in Asana

**Tier mix** — paid tiers (warm palette) and honorary tiers (plum palette) in the donut; legend and members table distinguish paid vs honorary. Honorary rows use plum styling; `honorary since` / `expires` dates reflect 1-year stewardship.

**Event Status phases** (from Asana): Idea, Planning, Marketing, Operations, Ready, Follow up, Done, Canceled.

**Schema-tolerant sync** — if Asana field names or enum labels change, the dashboard shows an amber banner with mapping hints (`lib/sparks-dashboard/asana-schema.mjs`) and still renders partial data. Transient API errors appear in the status line only.

**Members tables** — separate **Paid members** and **Honorary members** panels; names shown as first name + last initial only. Only paid members count toward the 90-member goal. Click a member row to open their Givebutter contact profile.

**Spark events table** — upcoming pipeline first (soonest dated events on top), then ideas; completed events are collapsed behind a toggle. Scrollable table body keeps the layout compact.

**Loading** — skeleton placeholders animate while Givebutter and Asana data load (filter changes and Refresh).

**Chart tooltips** — hover (or keyboard focus) on the growth chart, tier donut/legend, and goal progress bars for custom detail tooltips. Click a month in the growth chart to open a modal with new members and events held that month (names link to Givebutter).

**Privacy** — no MRR, no full names/emails, no RSVP counts.

## Event Card Graphics

1. Fetches `https://creativewaco.org/event/rss.xml` (or any feed URL)
2. Enriches event pages for images and upcoming dates (recommended)
3. Renders fixed **4:5** cards — event image on top, title on a white bar below
4. Preview in the browser; download individual or all PNGs, or copy HTML

Events without an image after enrichment are skipped.

## RSS Email HTML Generator

1. Fetches the RSS feed you provide
2. Optionally loads each event page to get the real event date and ticket/organizer website link
3. Filters to upcoming events, sorts, and limits the count
4. Renders list, **2-column**, or **3-column grid** layouts (grids stack to one column on narrow screens)
5. Shows a live preview and copyable HTML

Optional **Include event images** adds thumbnails (list: left of title; grid: card header image).

Grid output includes a `<style>` block with a `@media` query so columns stack on mobile in HubSpot and most email clients.

**Notes**

- **Enrich from event pages** is recommended for Creative Waco events. It reads JSON-LD dates and finds ticket links (OvationTix, PACC, Levitt, etc.).
- Without enrichment, the tool falls back to RSS publish dates and only includes a Learn more button.
- Re-run Generate any time you need fresh HTML for a newsletter send.

## Adding a new tool

1. **UI** — Add a folder under `public/<tool-id>/` with `index.html`, styles, and client JS. Link `/shared.css` for consistent layout and add a card on `public/index.html`.
2. **API** (if needed) — Add routes in `server.mjs` (e.g. `POST /api/<tool-id>/...`) and logic under `lib/<tool-id>/`.
3. **Registry** — Add an entry to the `TOOLS` array in `server.mjs` so `/api/tools` lists it.

Deploy by pushing to `main` on [Creative-Waco/tools](https://github.com/Creative-Waco/tools) (Vercel auto-deploys). See [CHANGELOG.md](./CHANGELOG.md) for release notes.
