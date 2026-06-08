# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Next.js 15 App Router** — React pages, Route Handlers, and Tailwind (`app/`, `components/`).
- Shared UI shell: `ToolNav`, `PageHero`, `StatusLine`, and tools hub driven by `lib/tools-registry.ts`.
- **Creative Spark Dashboard** at `/sparks-dashboard/` — live KPIs, goals, tier mix, growth chart, and Spark events pipeline from Givebutter and Asana (`GET /api/sparks-dashboard/`).
- **Event Card Graphics** at `/event-cards/` — 4:5 portrait PNG cards from the events RSS feed (`html-to-image` for client export).
- Tools hub at `/` and `/api/tools/` registry.
- Givebutter integration: paid plans plus honorary-only contacts, tier/honorary tag parsing, monthly growth series, and member profile links.
- Asana integration: Creative Sparks project sync, Event Status phases, schema-drift banner, and OAuth token auto-refresh for local dev.
- Dashboard UX: skeleton loading, chart tooltips, growth-month detail modal, separate paid/honorary member tables, and plum styling for honorary tiers.
- `scripts/refresh-asana-oauth.mjs` for re-authorizing Asana when refresh tokens expire.

### Changed

- **Migrated to Next.js** — removed Express `server.mjs` and static `public/` tool HTML/JS; same URLs and API contracts preserved.
- `npm run dev` starts Next.js on port 3847; `npm run build` / `npm start` for production.
- `loadLocalCredentials()` in `aggregate.mjs` runs on first dashboard request instead of at import time (serverless-safe).
- Vercel config uses native Next.js framework detection (`vercel.json`).
- Split the monolithic RSS email tool into a dedicated `/rss-email/` page.
- **90 paid members** goal counts active paid plans only; honorary members tracked separately in KPIs and tier mix.
- **Upcoming events** KPI counts Planning, Marketing, and Ready events with a future date (previously Ready only).

### Fixed

- Givebutter member profile links use the numeric dashboard account ID (`GIVEBUTTER_ACCOUNT_ID`, e.g. `145191`) instead of the API account slug, which broke dashboard URLs.

### Removed

- Express server (`server.mjs`) and legacy static tool assets under `public/`.
