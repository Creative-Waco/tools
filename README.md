# Creative Waco Tools

Internal tools for Creative Waco, hosted at **https://tools.creativewaco.org**.

## Tools

| Tool | URL | Description |
|------|-----|-------------|
| RSS Email HTML Generator | [/rss-email/](https://tools.creativewaco.org/rss-email/) | RSS feed → HubSpot-ready event email HTML |
| Event Card Graphics | [/event-cards/](https://tools.creativewaco.org/event-cards/) | Instagram carousel cards (1080×1350, 4:5) or landscape display slideshow cards (1920px wide) from the events RSS feed |
| UTM URL Builder | [/utm-builder/](https://tools.creativewaco.org/utm-builder/) | Build campaign-tagged links with UTM parameters for analytics |

## Dashboards

| Dashboard | URL | Description |
|-----------|-----|-------------|
| Creative Spark Dashboard | [/sparks-dashboard/](https://tools.creativewaco.org/sparks-dashboard/) | Live Spark membership + event pipeline from Givebutter and Asana |
| Analytics Dashboard | [/analytics-dashboard/](https://tools.creativewaco.org/analytics-dashboard/) | GA4 + Search Console — site and program analytics, organic keywords, traffic channels |

## Architecture

Next.js 15 App Router app deployed on Vercel at **https://tools.creativewaco.org**. **Clerk** protects all pages and API routes except `/api/health/` (uptime checks). Sign in at `/sign-in/`; the sidebar footer shows the signed-in user with account and sign-out actions.

| Layer | Location |
|-------|----------|
| Pages | `app/` — hub, `/rss-email/`, `/event-cards/`, `/sparks-dashboard/`, `/utm-builder/`, `/analytics-dashboard/` |
| API | `app/api/` — Route Handlers wrapping `lib/` |
| App shell | `components/AppShell.tsx` + `@shadcnblocks/application-shell2` — inset collapsible sidebar; **Tools** and **Dashboards** groups from `lib/tools-registry.ts` (`kind: "tool"` \| `"dashboard"`) |
| UI components | `components/` — shadcn/ui primitives, shared layout, per-tool React clients |
| Backend logic | `lib/` — RSS generation, event cards, UTM URL builder, Givebutter/Asana dashboard, GA4/Search Console analytics |

Navigation is provided by the Application Shell 2 layout (inset sidebar with icon collapse). The sidebar has a **Tools** group (**All tools** plus utilities) and a **Dashboards** group (Creative Spark, Analytics); the current page is highlighted with a dark active state (visible in both expanded and collapsed icon mode). The Creative Waco branding block at the top is display-only (use **All tools** or **⌘B** / **Ctrl+B** to collapse the sidebar). Collapsed vs expanded state is remembered for 7 days in a browser cookie. The hub at `/` and each tool page render inside the shell's main content area.

Favicon and Apple touch icon match [creativewaco.org](https://creativewaco.org/) (`app/icon.png`, `app/apple-icon.png`).

## Run locally

```bash
npm install
npm run dev
```

Default dev server: **https://local.tools.creativewaco.org/** (HTTPS on port 443, production Clerk keys in `.env.local`). First run adds a hosts entry via `npm run setup:local-clerk` (sudo). Unauthenticated visits redirect to `/sign-in/`.

For **Development** instance keys on `http://localhost:3847`, use `npm run dev:3847` with [`.env.development.local`](.env.development.local.example) (see Clerk section below).

#### Troubleshooting local dev

If the app shows a blank page, **Internal Server Error**, or terminal errors like `Cannot find module './873.js'`, the Next.js dev cache (`.next/`) is usually stale — common after killing the dev server mid-compile, running two dev servers on the same port, or many rapid hot-reloads during edits.

```bash
npm run dev:clean:3847
```

That stops anything on port 3847, deletes `.next`, and starts fresh. Avoid running `npm run build` while `dev:3847` is running (both write to `.next` and can corrupt chunks). If port 3847 is already in use, stop the other process first or use the clean script above.

During active code edits you may briefly see a **500** or “Fast Refresh had to perform a full reload” in the terminal; save the file again or hard-refresh the browser once the compile finishes.

### Clerk (Creative Waco account)

This app uses a **dedicated Creative Waco Clerk application**. Do **not** reuse API keys from the Tortoise & Hare Clerk account or any other project.

**One-time setup**

1. Sign in at [dashboard.clerk.com](https://dashboard.clerk.com/) with the Creative Waco account (or create a new Clerk account for Creative Waco).
2. **Create application** → name it e.g. **Creative Waco Tools** (separate from Tortoise & Hare).
3. Copy keys from **Configure → API keys** into `.env.local` (see [`.env.example`](.env.example)).
4. Under **Configure → Paths**, set sign-in URL `/sign-in/` and sign-up URL `/sign-up/`.
5. Under **Configure → Domains**, add:
   - Development: `http://localhost:3847`
   - Production: `https://tools.creativewaco.org`
6. Restrict access for an internal tool — e.g. **User & authentication → Restrictions** to allowlist `@creativewaco.org`, or disable public sign-up and **invite** team members only.

**Do not** click **Configure your application** in the running dev app if you are logged into the Tortoise & Hare Clerk account — that would link this project to the wrong Clerk app. Always paste Creative Waco keys into the env files below.

#### Local development (two options)

Clerk **production** keys (`pk_live_`) do not work on `http://localhost:3847` — Clerk validates the request origin against your production domain.

**Option A — day-to-day dev with test keys** (`npm run dev:3847`)

1. Install the [Clerk CLI](https://clerk.com/docs/guides/development/clerk-cli/overview) (`npm install -g clerk`), then run `clerk auth login`, `clerk init --app app_3ErvN68yrbKMBYDQrUkPvkkkK1F`, or use the project wrapper: `npm run clerk auth login`.
2. Or manually: Clerk Dashboard → **Development** instance → **Configure → API keys** → copy into [`.env.development.local.example`](.env.development.local.example) as `.env.development.local`.
3. Run `npm run dev:3847` → [http://localhost:3847/sign-in/](http://localhost:3847/sign-in/)

Verification emails from the **Development** instance are prefixed `[Development]` and sent from `@accounts.dev`. Use [https://tools.creativewaco.org/sign-in/](https://tools.creativewaco.org/sign-in/) to test production email (no `[Development]` prefix).

**Clerk CLI in Cursor:** the global `clerk` command can hang in non-interactive shells. Use `npm run clerk -- <command>` (runs `scripts/clerk.sh`) or call the native binary with stdin closed.

**Access control:** Development instance allowlists `*@creativewaco.org` (sign-in and sign-up). Manage via Dashboard → **Configure → Restrictions** or `npm run clerk -- api allowlist_identifiers`.

**Option B — default local dev with production keys** (`npm run dev`)

Uses subdomain `local.tools.creativewaco.org` (Clerk allows subdomains of `tools.creativewaco.org`). Requires `NEXT_PUBLIC_CLERK_PROXY_URL` in `.env.local` (see [`.env.example`](.env.example)); middleware enables Frontend API proxy when that variable is set.

```bash
npm run setup:local-clerk   # one-time: 127.0.0.1 local.tools.creativewaco.org in /etc/hosts (sudo)
npm run dev                 # HTTPS on port 443 (sudo inside scripts/dev-local.sh)
```

Open [https://local.tools.creativewaco.org/sign-in/](https://local.tools.creativewaco.org/sign-in/) (accept the self-signed cert warning). Add this host to Google OAuth redirect URIs if testing Google sign-in locally.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | `pk_test_…` in `.env.development.local`; `pk_live_…` in `.env.local` + Vercel |
| `CLERK_SECRET_KEY` | Yes | Matching secret for each instance |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | Local prod dev | e.g. `https://local.tools.creativewaco.org/__clerk/` when using Option B |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | No | Default `/sign-in/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | No | Default `/sign-up/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | No | Default `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | No | Default `/` |

For Vercel production, set the **Production** Clerk variables under **Settings → Environment Variables**.

#### Google sign-in (production)

Production Clerk requires **custom Google OAuth credentials** — Clerk’s shared dev credentials do not work on `pk_live_` instances.

**1. Clerk Dashboard** (Production instance selected)

1. Go to [Configure → SSO connections](https://dashboard.clerk.com/last-active?path=sso-connections).
2. **Add connection** → **For all users** → **Google**.
3. Enable **Enable for sign-up and sign-in** and **Use custom credentials**.
4. Copy the **Authorized redirect URI** shown in the modal (keep this page open).

**2. Google Cloud Console**

Use a Google Cloud project owned by Creative Waco (not Tortoise & Hare).

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen** — configure app name (e.g. *Creative Waco Tools*), support email, and set **Publishing status** to **In production** when ready.
2. **Credentials** → **Create credentials** → **OAuth client ID** → **Web application**.
3. **Authorized JavaScript origins:**
   - `https://tools.creativewaco.org`
   - `http://localhost:3847` (local dev)
4. **Authorized redirect URIs:** paste the URI from Clerk (step 1.4). For production on `creativewaco.org`, this is typically `https://clerk.creativewaco.org/v1/oauth_callback`. For local dev (`npm run dev:3847`), also add your Development instance callback (shown in Clerk when **Development** is selected), e.g. `https://<instance>.clerk.accounts.dev/v1/oauth_callback`.
5. Copy the **Client ID** and **Client secret**.

**3. Back in Clerk**

Paste the Google Client ID and Client secret into the Google connection → **Save**.

**4. Restrict who can sign in** (recommended for internal tools)

Production supports **Google** and **email code** sign-in (enter email → verification code; no password); middleware still rejects accounts whose email is not `@creativewaco.org`. In Google Cloud, set the OAuth consent screen **User type** to **Internal** if Creative Waco uses Google Workspace.

Development still uses Clerk’s email allowlist (`*@creativewaco.org`) when testing with `npm run dev:3847`.

#### Sign-in branding

The Clerk sign-in and sign-up pages use the Creative Waco horizontal logo from [`public/creative-waco-logo-horizontal.avif`](public/creative-waco-logo-horizontal.avif), configured in [`lib/clerk-appearance.ts`](lib/clerk-appearance.ts) on `ClerkProvider`.

No code changes are required — the existing `/sign-in/` page shows the Google button automatically once the connection is enabled.

#### Clerk DNS (Cloudflare)

Production Clerk for **Creative Waco Tools** (`app_3ErvN68yrbKMBYDQrUkPvkkkK1F`) uses the **creativewaco.org** apex domain. Add five **CNAME** records in the **creativewaco.org** Cloudflare zone. Set **Proxy status** to **DNS only** (grey cloud) for all of them.

| Name (Cloudflare) | Target |
|-------------------|--------|
| `clerk` | `frontend-api.clerk.services` |
| `accounts` | `accounts.clerk.services` |
| `clkmail` | `mail.3gh8t6w3hecc.clerk.services` |
| `clk._domainkey` | `dkim1.3gh8t6w3hecc.clerk.services` |
| `clk2._domainkey` | `dkim2.3gh8t6w3hecc.clerk.services` |

After adding records, click **Verify configuration** in the Clerk Dashboard (or run `npm run clerk -- deploy status --wait`). SSL certificates issue automatically once DNS verifies.

From the website repo (with `.cloudflare-env` configured):

```bash
cd ../website
source setup-cloudflare-env.sh
cf_dns_upsert clerk CNAME frontend-api.clerk.services false
cf_dns_upsert accounts CNAME accounts.clerk.services false
cf_dns_upsert clkmail CNAME mail.3gh8t6w3hecc.clerk.services false
cf_dns_upsert clk._domainkey CNAME dkim1.3gh8t6w3hecc.clerk.services false
cf_dns_upsert clk2._domainkey CNAME dkim2.3gh8t6w3hecc.clerk.services false
```

Or use **Cloudflare Dashboard** → **DNS** → **Add record** for each row.

### shadcn/ui and Shadcnblocks

The app uses [shadcn/ui](https://ui.shadcn.com/) with the Application Shell 2 block from [Shadcnblocks](https://www.shadcnblocks.com/). Configuration lives in [`components.json`](components.json).

To install additional Shadcnblocks:

```bash
source ~/.config/shadcnblocks.env   # SHADCNBLOCKS_API_KEY
npx shadcn@latest add @shadcnblocks/<block-id>
```

The `@shadcnblocks` registry in `components.json` reads `SHADCNBLOCKS_API_KEY` from the environment. Generate a key at [shadcnblocks.com/dashboard/api](https://shadcnblocks.com/dashboard/api) if needed.

**Note:** The app uses **Tailwind CSS v4** (`@tailwindcss/postcss`) — required for shadcn v4 sidebar layout utilities. `lib/cn.ts` holds the shadcn `cn()` helper. Server-side RSS/dashboard utilities remain in `lib/utils.mjs` (separate module to avoid path conflicts).

Production build:

```bash
npm run build
npm start
```

### Creative Spark Dashboard — environment variables

Set these before `npm run dev` / `npm start` (or in Vercel → Settings → Environment Variables):

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
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Creative Waco Clerk publishable key (not Tortoise & Hare) |
| `CLERK_SECRET_KEY` | Yes | Creative Waco Clerk secret key |

### Vercel (production)

Local file auto-load does **not** run on Vercel. Set at minimum:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GIVEBUTTER_API_KEY` | Givebutter → Settings → Integrations → API |
| `GIVEBUTTER_ACCOUNT_ID` | Numeric ID from dashboard URL (`145191` for Creative Waco) — required for member links |
| `ASANA_ACCESS_TOKEN` | Current OAuth access token |
| `ASANA_REFRESH_TOKEN` | From `Workspace/asana/.asana_token.json` after running `scripts/refresh-asana-oauth.mjs` — keeps Asana working when the access token expires |
| `GA4_PROPERTY_ID` | Numeric GA4 property ID (`306499072` for creativewaco.org) |
| `GA4_SERVICE_ACCOUNT_JSON` | Service account JSON with GA4 **Viewer** (same account as Search Console reader) |
| `GSC_SITE_URL` | Optional Search Console property URL (defaults to `sc-domain:creativewaco.org`) |

Optional overrides match the Spark Dashboard table above (`ASANA_SPARKS_PROJECT_GID`, campaign/tier aliases, etc.).

Example local setup:

```bash
export GIVEBUTTER_API_KEY="..."
export ASANA_ACCESS_TOKEN="..."
npm run dev
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

**API routes** (trailing slashes match `next.config.ts`):

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health/` | Health check |
| `GET` | `/api/tools/` | Tool registry JSON |
| `GET` | `/api/sparks-dashboard/` | Dashboard data (`period`, `membershipType`, optional `refresh=1`) |
| `GET` | `/api/analytics-dashboard/` | GA4 + Search Console (`startDate`, `endDate`, optional `program`) |
| `POST` | `/api/generate/` | RSS → HubSpot email HTML |
| `POST` | `/api/event-cards/generate/` | RSS → Instagram-width event card HTML |
| `POST` | `/api/event-cards/months/` | RSS → months with events (for month picker) |

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
| Upcoming events | Event Status = Planning, Marketing, Operations, or Ready with future `due_on` |

**Goals**

- **90 paid members** by Dec 31, 2026 (honorary members tracked separately and excluded from this goal)
- **12 pipeline events** (2/month × 6 months) with dates in Asana

**Tier mix** — paid tiers (warm palette) and honorary tiers (plum palette) in the donut; legend and members table distinguish paid vs honorary. Honorary rows use plum styling; `honorary since` / `expires` dates reflect 1-year stewardship.

**Event Status phases** (from Asana): Idea, Planning, Marketing, Operations, Ready, Follow up, Done, Canceled.

**Schema-tolerant sync** — if Asana field names or enum labels change, the dashboard shows an amber banner with mapping hints (`lib/sparks-dashboard/asana-schema.mjs`) and still renders partial data. Transient API errors appear in the status line only.

**Members tables** — separate **Paid members** and **Honorary members** panels; names shown as first name + last initial only. Only paid members count toward the 90-member goal. Click a member row to open their Givebutter contact profile.

**Spark events table** — upcoming pipeline first (soonest dated events on top), then ideas; completed events are collapsed behind a toggle. Scrollable table body keeps the layout compact.

**Loading** — skeleton placeholders animate while Givebutter and Asana data load (filter changes and **Refresh**). Toolbar filters: period, membership type, and refresh only (no JSON export).

**Chart tooltips** — hover (or keyboard focus) on the growth chart, tier donut/legend, and goal progress bars for custom detail tooltips. Click a month in the growth chart to open a modal with new members and events held that month (names link to Givebutter).

**Privacy** — no MRR, no full names/emails, no RSVP counts.

## Event Card Graphics

1. Fetches `https://creativewaco.org/event/rss.xml` (or any feed URL)
2. Enriches event pages for images and upcoming dates (recommended)
3. Filters via one **Date range** control (upcoming, quick presets, months found in the feed, or custom start/end); then sorts by event date
4. Choose an **output format** (tabs above **Generate cards**), then generate:
   - **Instagram carousel** — ticket-style portrait cards in a **1080×1350** (4:5) frame with blurred photo backdrop, dashed notches, and Creative Waco branding below the ticket
   - **Display slideshow** — horizontal landscape cards (**1920px** wide; height follows content) for TVs, projectors, and venue displays — card only (no backdrop or footer logo), event image on the left (full width, natural height, white panel, rounded corners), details on the right
5. Previews match the selected format (carousel or landscape slideshow). Below the preview, click **Download cards…** to open the **Select cards** panel: range summary dropdown, **Current card** and **Select all** presets, per-card thumbnails with checkboxes (click a row to jump the preview), then **Done** for one PNG or a ZIP. Per-slide PNG buttons remain in the preview; **Copy HTML** stays in the preview header. PNG export preloads each card’s images before capture so off-screen slides in the carousel still include event artwork.

Pass `format: "instagram"` or `format: "slideshow"` to `POST /api/event-cards/generate/`. Each format caches its own preview HTML when you switch tabs.

Instagram layout renders at **1080×1350**; `syncTicketLayout` (`lib/event-cards/sync-ticket-divider.mjs`) fits tall tickets inside the frame and aligns side notches after images load. Slideshow cards export at **1920px** width with height driven by the uncropped event image and text column; PNGs use a transparent background (no card drop shadow).

Assets: [`public/culturalyst.png`](public/culturalyst.png), [`public/creative-waco-logo-white.avif`](public/creative-waco-logo-white.avif) (navbar white-text logo for below-ticket branding). Clerk sign-in still uses [`public/creative-waco-logo-horizontal.avif`](public/creative-waco-logo-horizontal.avif).

Enrichment pulls category, date, venue, and organizer photo from event pages. Events without an image after enrichment are skipped (limit applies after that filter).

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

## Analytics Dashboard

Live **Google Analytics 4** and **Search Console** overview for creativewaco.org at `/analytics-dashboard/`. Built on Shadcnblocks **chart-group14** (recharts KPI cards, area chart, channel donut, date presets). Official Google product icons (`public/logos/ga4.png`, `public/logos/gsc.png`) appear beside section titles for charts, tables, and program insights.

**Data sources**

- **GA4 Data API** — active users, sessions, engagement, bounce rate, daily trends (hover a day for top pages that day — paths wrap in the tooltip; list comes from the full daily dataset), traffic channels (hover a segment or legend row for top sources), **user demographics** (age, gender, interests, and top cities — modeled demographics for a subset of visitors; shares are among known users only; hover a city for share, engagement, sources, and landing pages; Singapore is excluded from city lists as GA4 noise), top pages, referrers, **path exploration** (session-start landing → next page in order; not link-click tracking)
- **Search Console API** — organic search **queries** and **pages** (clicks, impressions, CTR, position), plus query–page pairs for cross-filtering in the UI. GA4 Organic Search shows volume only; keywords appear as `(not provided)` in GA4.

**Program filters and shareable URLs**

Select a program from the toolbar (default: **All site**). Filter state is synced to the URL and cached in `sessionStorage` for the browser tab, so refresh and back/forward reuse loaded data without another GA4/GSC round-trip. Click **Refresh** to force a new fetch.

| URL param | Example | Purpose |
|-----------|---------|---------|
| `program` | `creative-spark` | Program scope (omit for all site) |
| `preset` | `last-30-days` | Date preset: `today`, `this-week`, `this-month`, `last-7-days`, `last-30-days`, `last-3-months`, `last-season` (with a program selected) |
| `startDate` / `endDate` | `2026-05-01` | Custom range when not using a preset |

Examples: `/analytics-dashboard/?program=creative-spark&preset=last-30-days` · `/analytics-dashboard/?program=dia-de-los-muertos&preset=last-season` · `/analytics-dashboard/?program=events&startDate=2026-05-01&endDate=2026-05-31`

Scoped mode filters both GA4 and Search Console to that program’s page paths:

| Program | Example paths |
|---------|----------------|
| Creative Spark | `/programs/spark`, `/creative-spark`, `/sparks-only`, `/spark`, `/es/spark` |
| Events | `/event/…` |
| Día de los Muertos | `/dia-de-los-muertos`, `/diadelosmuertos`, `/events/dia-de-los-muertos`, `/es/dia-de-los-muertos` |
| Levitt | `/levitt` |
| Artprenticeship | `/artprenticeship` |
| Waco Wonderland | `/waco-wonderland-parade` |
| Sponsorship | Any page path containing `sponsor` (e.g. `/portfolio-sponsorship`, `/events/levitt/sponsorship`, `/diadelosmuertos/sponsors/`) |

When a program is selected, the date preset dropdown adds a **program season** option (shareable as `preset=last-season`):

| Program | Season preset | Date range |
|---------|---------------|------------|
| Día de los Muertos | Last Día de los Muertos season | Oct 1 – Nov 15 |
| Levitt | Last concert season | May 1 – Sep 30 |
| Artprenticeship | Last program year | Aug 1 – May 31 |
| Waco Wonderland | Last parade season | Nov 15 – Dec 31 |
| Creative Spark, Events, Sponsorship | Previous calendar year | Jan 1 – Dec 31 (prior year) |

During an active season, the preset runs from season start through today. After a season ends, it uses the most recently completed season.

When a program is selected, four **program insight** panels answer:

| Question | GA4 signals |
|----------|-------------|
| Who's visiting | New vs returning users, devices, top cities |
| How they find it | Source/medium, landing pages, traffic channels |
| What they're doing | Engagement time, scrolls, form starts/submits, clicks |
| Where they go next | Next page after a program page (internal navigation) |

**Path exploration** (below KPI cards) works like GA4: column 1 lists session-start landing pages; selecting one loads the next column for sessions that continued **in order** along your selections (GA4 funnel API — counts always decrease or stay flat as you go deeper). Each later step depends on the full path so far. Columns scroll horizontally in a single row; use **Add step** to extend the path (up to 8 columns). Up to 5 next-page options per step (GA4 API limit).

A **Search queries** table (Search Console) lists the actual Google keywords driving traffic to those pages, with a **Pages** view for top landing URLs from Google Search. Click column headers to sort; click a keyword to see which pages received those clicks, or click a page to see its queries. Rows truncate in the table (hover for the full text); obvious spam strings (`-site:` chains, HTML entity noise, 100+ characters) are filtered out before display. GSC **clicks** count only when someone clicked a Google search result to a program URL; GA4 **organic sessions** also include visitors who landed elsewhere (e.g. homepage) and navigated to program pages, plus Google Discover/News.

GA4 and Search Console report aggregated counts only — not individual identities. Search Console data is typically **2–3 days behind** GA4.

**Environment variables**

| Variable | Required | Purpose |
|----------|----------|---------|
| `GA4_PROPERTY_ID` | Yes | Numeric GA4 property ID (Admin → Property settings) |
| `GA4_SERVICE_ACCOUNT_JSON` | Yes (Vercel) | Service account JSON with **Viewer** on the GA4 property |
| `GA4_SERVICE_ACCOUNT_PATH` | Local alt | Path to service account JSON file |
| `GSC_SITE_URL` | No | Search Console property (default tries `sc-domain:creativewaco.org`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local alt | Standard Google client env path |

**Setup — GA4**

1. In [Google Analytics](https://analytics.google.com/) → Admin → Property access management, add the service account as **Viewer**.
2. In Google Cloud, enable the **Google Analytics Data API** for project `civic-shell-472218-g7`.
3. Set `GA4_PROPERTY_ID` and credentials in `.env.local` (or Vercel env vars).

Local dev auto-loads `~/.config/creativewaco/ga4-service-account.json` and `ga4-property-id.txt` when env vars are unset (reader: `cursor-ga4-reader@civic-shell-472218-g7.iam.gserviceaccount.com`, property **306499072**).

**Setup — Search Console (organic keywords)**

1. Enable [Search Console API](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=civic-shell-472218-g7) in Google Cloud (same project as the GA4 reader).
2. In [Search Console](https://search.google.com/search-console) → **Settings → Users and permissions**, add `cursor-ga4-reader@civic-shell-472218-g7.iam.gserviceaccount.com` as a user on `creativewaco.org`.
3. Optionally set `GSC_SITE_URL` if your property URL differs (e.g. `https://www1.creativewaco.org/`).

Until Search Console is connected, the dashboard shows in-panel setup instructions instead of query data.

**API**

`GET /api/analytics-dashboard/?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&program=creative-spark`

Returns KPIs (with period-over-period change), daily series, channels, `userDemographics` (age, gender, interests with coverage %, plus top cities with hover breakdowns), top pages, referrers, `programInsights` (when `program` is set), and `searchConsole` (queries + totals or setup error).

`GET /api/analytics-dashboard/path-exploration/?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&mode=landings|next&pathSteps=["/","/events/levitt/lineup"]&program=events`

- `mode=landings` — all session-start landing pages (column 1)
- `mode=next&pathSteps=["/","/events/…"]` — next pages after the full selected path (GA4 funnel; up to 5 options per step). Legacy `fromPath=/…` still accepted as a single-step path.

Main dashboard query params:

| Param | Default | Values |
|-------|---------|--------|
| `startDate` | 30 days ago | `YYYY-MM-DD` |
| `endDate` | today | `YYYY-MM-DD` |
| `program` | `all` | `all`, `creative-spark`, `events`, `levitt`, `dia-de-los-muertos`, `artprenticeship`, `waco-wonderland`, `sponsorship` |
| `preset` | `last-30-days` | `today`, `this-week`, `this-month`, `last-7-days`, `last-30-days`, `last-3-months`, `last-season` (with a program selected) |

**Troubleshooting**

- **`ERR_CONNECTION_REFUSED` on `localhost:3847`** — dev server is not running. Start with `npm run dev:3847` (or `npm run dev:clean:3847` if the port is stuck).
- Blank page or **500** on `/analytics-dashboard/` during local dev — stale `.next` cache. Run `npm run dev:clean:3847` and hard-refresh.
- **Unstyled page** (black background, blue default links, no sidebar chrome) — CSS failed to compile, often because the disk is full (`ENOSPC` in the terminal). Free space, delete `.next` (`rm -rf .next`), then run `npm run dev:clean:3847`.
- First GA4 load can take several seconds; skeleton placeholders and “Loading GA4 data…” are normal. Repeat visits in the same tab load instantly from session cache until **Refresh**.
- Search Console panel shows setup steps when the API is disabled or the service account lacks property access.

## UTM URL Builder

Build tagged destination URLs for Google Analytics and other reporting.

1. Enter the **destination URL** (defaults to `https://creativewaco.org/`) or use **Quick start** chips: **Pages**, **Channels** (source + medium combo), **Sources**, **Mediums**, and **Campaigns** (program names aligned with analytics)
2. Set **source**, **medium**, and **campaign** (required)
3. Expand **More options** when needed: campaign slug helper, term/content/ID, custom query keys, and **content variants** for multiple `utm_content` links
4. Copy the live preview (**Copy URL**, **Copy params**, **Copy path**), open in a new tab, or **Share link** for a pre-filled builder URL

**Auto-parse** — paste a full tagged URL into Destination URL; UTM parameters are detected and split into fields automatically.

**Recent campaigns** — last copied campaigns are saved in the browser (up to 10) for quick reload.

**From analytics** — when GA4 credentials are configured (same as Analytics Dashboard), the builder loads the last 90 days of tagged session combinations from GA4. Top combos appear in a **From analytics** panel (click **Load**); unique sources, mediums, and campaigns also append to Quick start chips.

**Print / QR preset** — shows a downloadable QR code when the tagged URL is ready.

**Keyboard shortcut** — **⌘⇧C** / **Ctrl+Shift+C** copies the full tagged URL (when focus is not in an input).

**Shareable state** — form values sync to the browser URL via `history.replaceState` (no full page reload) so you can bookmark or Slack a pre-filled link (e.g. `/utm-builder/?url=…&utm_campaign=…`). Use **Copy share link** to send the current builder state.

**API**

`GET /api/utm-builder/history/?days=90&limit=100`

Returns top UTM source/medium/campaign combinations from GA4 session-scoped dimensions (same credentials as Analytics Dashboard). Optional `days` (7–365, default 90) and `limit` (10–200, default 100). Response includes `configured`, `combinations`, and unique `sources` / `mediums` / `campaigns` for Quick start chips.

**Notes**

- Source, medium, and campaign are required before copy/open is enabled.
- Values are normalized on blur (lowercase, hyphens, special characters removed).
- If the destination already has `utm_*` tags, the tool warns that they will be replaced.
- Custom parameters are appended as non-`utm_` query keys (e.g. `ref=partner-name`).

## Adding a new tool

1. **Registry** — Add an entry to `TOOLS` in [`lib/tools-registry.ts`](lib/tools-registry.ts) with `kind: "tool"` or `kind: "dashboard"` (hub, sidebar, and `/api/tools` read from here).
2. **UI** — Add `app/<tool-id>/page.tsx` and a client component under `components/<tool-id>/`. The sidebar picks up new entries automatically (`kind` places them under **Tools** or **Dashboards**; `tag` controls the nav icon). Reuse `PageHero`, `StatusLine`, and globals from `app/globals.css`.
3. **API** (if needed) — Add `app/api/<tool-id>/route.ts` and logic under `lib/<tool-id>/`. Set `export const runtime = "nodejs"` for routes that use filesystem auth or long-running fetches.

Deploy by pushing to `main` on [Creative-Waco/tools](https://github.com/Creative-Waco/tools) (Vercel auto-deploys as a Next.js project). See [CHANGELOG.md](./CHANGELOG.md) for release notes.
