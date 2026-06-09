# Creative Waco Tools

Internal tools for Creative Waco, hosted at **https://tools.creativewaco.org**.

## Tools

| Tool | URL | Description |
|------|-----|-------------|
| RSS Email HTML Generator | [/rss-email/](https://tools.creativewaco.org/rss-email/) | RSS feed → HubSpot-ready event email HTML |
| Event Card Graphics | [/event-cards/](https://tools.creativewaco.org/event-cards/) | Ticket-style Instagram carousel cards (1080px wide export) from the events RSS feed |
| Creative Spark Dashboard | [/sparks-dashboard/](https://tools.creativewaco.org/sparks-dashboard/) | Live Spark membership + event pipeline from Givebutter and Asana |

## Architecture

Next.js 15 App Router app deployed on Vercel at **https://tools.creativewaco.org**. **Clerk** protects all pages and API routes except `/api/health/` (uptime checks). Sign in at `/sign-in/`; the sidebar footer shows the signed-in user with account and sign-out actions.

| Layer | Location |
|-------|----------|
| Pages | `app/` — hub, `/rss-email/`, `/event-cards/`, `/sparks-dashboard/` |
| API | `app/api/` — Route Handlers wrapping `lib/` |
| App shell | `components/AppShell.tsx` + `@shadcnblocks/application-shell2` — inset collapsible sidebar; all tools under one **Tools** group from `lib/tools-registry.ts` |
| UI components | `components/` — shadcn/ui primitives, shared layout, per-tool React clients |
| Backend logic | `lib/` — RSS generation, event cards, Givebutter/Asana dashboard |

Navigation is provided by the Application Shell 2 layout (inset sidebar with icon collapse). The sidebar lists **All tools** plus every registry entry under a single **Tools** group; the Creative Waco branding block at the top is display-only (use **All tools** or **⌘B** / **Ctrl+B** to collapse the sidebar). Collapsed vs expanded state is remembered for 7 days in a browser cookie. The hub at `/` and each tool page render inside the shell's main content area.

Favicon and Apple touch icon match [creativewaco.org](https://creativewaco.org/) (`app/icon.png`, `app/apple-icon.png`).

## Run locally

```bash
npm install
npm run dev
```

Default dev server: **https://local.tools.creativewaco.org/** (HTTPS on port 443, production Clerk keys in `.env.local`). First run adds a hosts entry via `npm run setup:local-clerk` (sudo). Unauthenticated visits redirect to `/sign-in/`.

For **Development** instance keys on `http://localhost:3847`, use `npm run dev:3847` with [`.env.development.local`](.env.development.local.example) (see Clerk section below).

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
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Creative Waco Clerk publishable key |
| `CLERK_SECRET_KEY` | Creative Waco Clerk secret key |

Optional overrides match the table above (`ASANA_SPARKS_PROJECT_GID`, campaign/tier aliases, etc.).

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
| `POST` | `/api/generate/` | RSS → HubSpot email HTML |
| `POST` | `/api/event-cards/generate/` | RSS → Instagram-width event card HTML |

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
3. Renders **ticket-style Instagram cards** — separate top/bottom **SVG vector stubs** with scalloped side punchouts at the perforation, rounded outer corners, dashed tear line, inset photo, category, title, date/time, and venue row; each card sits on a **blurred version of its event photo**
4. Previews as an **Instagram carousel** (swipe, dots, slide counter); download individual or all PNGs (**1080px wide** at 2× export, includes blurred backdrop), or copy HTML

Layout is **540px** in the tool; export uses 2× pixel ratio. Vector paths are synced after layout (`lib/event-cards/sync-ticket-shapes.mjs`) so stub height follows each photo.

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

## Adding a new tool

1. **Registry** — Add an entry to `TOOLS` in [`lib/tools-registry.ts`](lib/tools-registry.ts) (hub and `/api/tools` read from here).
2. **UI** — Add `app/<tool-id>/page.tsx` and a client component under `components/<tool-id>/`. The sidebar picks up new tools automatically from the registry (single **Tools** group; `tag` controls the nav icon). Reuse `PageHero`, `StatusLine`, and globals from `app/globals.css`.
3. **API** (if needed) — Add `app/api/<tool-id>/route.ts` and logic under `lib/<tool-id>/`. Set `export const runtime = "nodejs"` for routes that use filesystem auth or long-running fetches.

Deploy by pushing to `main` on [Creative-Waco/tools](https://github.com/Creative-Waco/tools) (Vercel auto-deploys as a Next.js project). See [CHANGELOG.md](./CHANGELOG.md) for release notes.
