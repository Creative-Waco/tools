# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Next.js 15 App Router** — React pages, Route Handlers, and Tailwind (`app/`, `components/`).
- **Application Shell 2** — Shadcnblocks inset collapsible sidebar (`components/application-shell2.tsx`, `components/AppShell.tsx`) with a single **Tools** nav group from `lib/tools-registry.ts`.
- **shadcn/ui** — `components.json`, sidebar primitives under `components/ui/`, and `lib/cn.ts` for the `cn()` helper.
- Shared UI: `PageHero`, `StatusLine`, and tools hub driven by `lib/tools-registry.ts`.
- **Creative Spark Dashboard** at `/sparks-dashboard/` — live KPIs, goals, tier mix, growth chart, and Spark events pipeline from Givebutter and Asana (`GET /api/sparks-dashboard/`).
- **Event Card Graphics** at `/event-cards/` — 4:5 portrait PNG cards from the events RSS feed (`html-to-image` for client export).
- Tools hub at `/` and `/api/tools/` registry.
- Givebutter integration: paid plans plus honorary-only contacts, tier/honorary tag parsing, monthly growth series, and member profile links.
- Asana integration: Creative Sparks project sync, Event Status phases, schema-drift banner, and OAuth token auto-refresh for local dev.
- Dashboard UX: skeleton loading, chart tooltips, growth-month detail modal, separate paid/honorary member tables, and plum styling for honorary tiers.
- `scripts/refresh-asana-oauth.mjs` for re-authorizing Asana when refresh tokens expire.

### Changed

- Creative Spark Dashboard toolbar: removed **Export snapshot** button.
- KPI cards no longer show prior-period comparison lines (`vs prior period` deltas).
- Sidebar expanded/collapsed state persists for 7 days via the `sidebar_state` cookie (restored on load).
- Sidebar and mobile header logo use the same Creative Waco mark instead of the `CW` initials placeholder.
- Hidden placeholder sidebar user menu until real auth is wired up.
- Sidebar branding block is display-only (no home link); "All tools" remains the hub nav item.
- Disabled the Next.js dev indicator overlay (`devIndicators: false` in `next.config.ts`).
- **App navigation** — replaced per-page `ToolNav` back links with the Application Shell 2 sidebar (active route highlighting).
- **Application shell** — switched from Application Shell 5 to Application Shell 2 (inset sidebar with icon collapse).
- **Tailwind CSS v4** — upgraded from v3 so shadcn/ui sidebar utilities (`w-(--sidebar-width)`, etc.) render correctly; PostCSS now uses `@tailwindcss/postcss`.
- **Hub and tool chrome** — hub cards and page headers use shadcn theme tokens (`bg-card`, `text-muted-foreground`) instead of the legacy warm custom palette on the shell.
- **Migrated to Next.js** — removed Express `server.mjs` and static `public/` tool HTML/JS; same URLs and API contracts preserved.
- `npm run dev` starts Next.js on port 3847; `npm run build` / `npm start` for production.
- `loadLocalCredentials()` in `aggregate.mjs` runs on first dashboard request instead of at import time (serverless-safe).
- Vercel config uses native Next.js framework detection (`vercel.json`).
- Split the monolithic RSS email tool into a dedicated `/rss-email/` page.
- **90 paid members** goal counts active paid plans only; honorary members tracked separately in KPIs and tier mix.
- **Upcoming events** KPI counts Planning, Marketing, and Ready events with a future date (previously Ready only).

### Fixed

- Creative Spark Dashboard secondary text (KPI labels, timestamps, goal captions) invisible after shadcn theme migration — scoped legacy `--muted` / `--ink` tokens on `.dashboard-page`.
- Removed colored top accent borders on paid/honorary member table panels.
- Sidebar nav: all tools listed under a single **Tools** group instead of separate Home/Newsletter/Social/Membership sections.
- Event cards and RSS email preview placeholder text invisible — use `--muted-foreground` instead of shadcn `--muted` background token.
- Creative Spark Dashboard header matches other tools (`PageHero`); removed custom hero block and last-updated timestamp row.
- Chart tooltip and growth modal label text invisible — scoped dashboard `--muted` token on fixed overlays.
- Event status badges showed `&amp;` instead of `&` — render labels as React text instead of pre-escaped HTML entities.
- Sidebar collapse toggle blocked by full-width logo row in the header.
- Givebutter member profile links use the numeric dashboard account ID (`GIVEBUTTER_ACCOUNT_ID`, e.g. `145191`) instead of the API account slug, which broke dashboard URLs.

### Removed

- `ToolNav` component — sidebar navigation supersedes back links on tool pages.
- Express server (`server.mjs`) and legacy static tool assets under `public/`.
