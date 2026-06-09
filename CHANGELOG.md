# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **UTM URL Builder** at `/utm-builder/` — build campaign-tagged links with standard UTM parameters, Creative Waco channel presets, custom query params, URL parsing, and one-click copy.
- **UTM URL Builder UX** — auto-parse on destination paste; active preset indicator; value normalization and field warnings; inline field help tooltips; overwrite warning for existing UTMs; copy full URL / query string / path+query; advanced fields collapsed; destination shortcuts; campaign slug helper; content variant links; recent campaigns (`localStorage`); shareable URL state in query params; color-coded URL breakdown; sticky output panel; Print/QR downloadable QR code; preset content suggestions; **⌘⇧C** copy shortcut.

### Changed

- Clerk production and development: **password auth disabled**; sign-in is **Google** or **email verification code** only.
- **Event Card Graphics** — redesigned as **ticket-style Instagram cards** (1080px wide at export; height follows each photo): single white ticket with CSS-mask side notches, dashed perforation divider, rounded outer corners, inset hero image, category, date/time, and venue stub.
- **Event Card Graphics** — each slide uses a **blurred version of the event photo** as the backdrop (replacing rotating gradient themes); PNG export captures the full scene including blur.
- **Event Card Graphics** — removed card width option and QR codes; enrichment pulls category, location, organizer name, and photo from event pages.

### Fixed

- **Event Card Graphics** — ticket stub refactored to one white container with CSS-mask side notches and a dashed divider (replaces split top/bottom SVG shapes that looked disconnected).
- **Event Card Graphics** — apply card limit **after** filtering to events with images (fixes carousel showing fewer than requested cards).
- **Event Card Graphics** — blurred backdrops load via an `<img>` layer (fixes broken `background-image` from quoted URLs in inline styles).
- **Event Card Graphics** — divider position synced after layout (`syncTicketDivider`) so side-notch cutouts align with the perforation at any content height; carousel viewport height tracks the active slide.

### Added

- **Event Card Graphics** — **Instagram carousel preview** (`InstagramCarouselPreview.tsx`): persistent frame, swipe/dots/slide counter, per-slide PNG download; populates on Generate with a loading overlay.
- **Event Card Graphics** — ticket rendering modules: `sync-ticket-divider.mjs`, `card-styles.mjs`, `constants.mjs` (540px layout width, 2× PNG export → 1080px wide).
- **Clerk authentication** — all tools and API routes (except `/api/health/`) require sign-in; uses a **Creative Waco–only** Clerk application (separate from Tortoise & Hare); `/sign-in/` and `/sign-up/` use Clerk with the shadcn theme; sidebar user menu wired to Clerk profile and sign-out.
- **`middleware.ts`** — protected-first route gating; optional Frontend API proxy when `NEXT_PUBLIC_CLERK_PROXY_URL` is set; `@creativewaco.org` email domain enforcement on protected routes.
- **`lib/clerk-appearance.ts`** — shared Clerk shadcn theme and Creative Waco logo for sign-in/sign-up.
- **Local Clerk scripts** — `scripts/dev-local.sh`, `scripts/setup-local-clerk-hosts.sh`; npm scripts `dev`, `dev:3847`, `dev:local`, `setup:local-clerk`.
- Env templates: [`.env.example`](.env.example), [`.env.development.local.example`](.env.development.local.example).
- **`public/creative-waco-logo-horizontal.avif`** — Creative Waco horizontal logo for Clerk sign-in/sign-up branding.
- **Next.js 15 App Router** — React pages, Route Handlers, and Tailwind (`app/`, `components/`).
- **Application Shell 2** — Shadcnblocks inset collapsible sidebar (`components/application-shell2.tsx`, `components/AppShell.tsx`) with a single **Tools** nav group from `lib/tools-registry.ts`.
- **shadcn/ui** — `components.json`, sidebar primitives under `components/ui/`, and `lib/cn.ts` for the `cn()` helper.
- Shared UI: `PageHero`, `StatusLine`, and tools hub driven by `lib/tools-registry.ts`.
- **Creative Spark Dashboard** at `/sparks-dashboard/` — live KPIs, goals, tier mix, growth chart, and Spark events pipeline from Givebutter and Asana (`GET /api/sparks-dashboard/`).
- **Event Card Graphics** at `/event-cards/` — ticket-style Instagram cards from the events RSS feed (`html-to-image` for client PNG export).
- Tools hub at `/` and `/api/tools/` registry.
- Givebutter integration: paid plans plus honorary-only contacts, tier/honorary tag parsing, monthly growth series, and member profile links.
- Asana integration: Creative Sparks project sync, Event Status phases, schema-drift banner, and OAuth token auto-refresh for local dev.
- Dashboard UX: skeleton loading, chart tooltips, growth-month detail modal, separate paid/honorary member tables, and plum styling for honorary tiers.
- `scripts/refresh-asana-oauth.mjs` for re-authorizing Asana when refresh tokens expire.

### Changed

- Clerk CLI wrapper (`scripts/clerk.sh`) and npm scripts `clerk`, `clerk:doctor` — avoids hangs in non-TTY shells; ignore `client_secret_*.json` downloads in `.gitignore`.
- Clerk Development instance: email allowlist enabled for `*@creativewaco.org` (enforced on sign-in and sign-up).
- `middleware.ts` — Clerk proxy matcher updated to `'/__clerk/:path*'`; `frontendApiProxy` option typed as `{ enabled: true }` for Clerk SDK compatibility.
- Clerk setup docs and `.env.example` — require a dedicated Creative Waco Clerk app; do not reuse Tortoise & Hare keys or keyless claim from another account.
- README: Google OAuth production setup (Clerk SSO + Google Cloud Console) for `tools.creativewaco.org`.
- README: Clerk production DNS records for Cloudflare (`clerk`, `accounts`, email CNAMEs on `creativewaco.org`).
- **Clerk production instance** on app `app_3ErvN68yrbKMBYDQrUkPvkkkK1F` (`ins_3EsLuGOPBiHmHeeRQ3Z78AWoGU2`); Vercel production/preview env updated to new prod keys; DNS CNAMEs added in Cloudflare.
- Clerk production sign-in: **Google + email code** (public sign-up); middleware enforces `@creativewaco.org` email domain.
- Clerk sign-in/sign-up branding uses the Creative Waco horizontal logo from `public/creative-waco-logo-horizontal.avif`.
- README: note that Clerk **Development** verification emails use `[Development]` subject prefix and `@accounts.dev` sender (local `npm run dev:3847` only).
- Clerk production **Google OAuth** enabled (`connection_oauth_google`) on app `app_3ErvN68yrbKMBYDQrUkPvkkkK1F`.
- Local Clerk dev: `.env.development.local` + `npm run dev:3847` for Development keys; default `npm run dev` uses `local.tools.creativewaco.org` (HTTPS :443) via `scripts/dev-local.sh` with production keys and optional Frontend API proxy.
- Sidebar expanded/collapsed state persists for 7 days via the `sidebar_state` cookie (restored on load).
- Sidebar and mobile header logo use the same Creative Waco mark instead of the `CW` initials placeholder.
- Sidebar user menu shows the signed-in Clerk user (account profile + sign out).
- Disabled the Next.js dev indicator overlay (`devIndicators: false` in `next.config.ts`).
- **App navigation** — replaced per-page `ToolNav` back links with the Application Shell 2 sidebar (active route highlighting).
- **Application shell** — switched from Application Shell 5 to Application Shell 2 (inset sidebar with icon collapse).
- **Tailwind CSS v4** — upgraded from v3 so shadcn/ui sidebar utilities (`w-(--sidebar-width)`, etc.) render correctly; PostCSS now uses `@tailwindcss/postcss`.
- **Hub and tool chrome** — hub cards and page headers use shadcn theme tokens (`bg-card`, `text-muted-foreground`) instead of the legacy warm custom palette on the shell.
- **Migrated to Next.js** — removed Express `server.mjs` and static `public/` tool HTML/JS; same URLs and API contracts preserved.
- `npm run dev` runs HTTPS on `local.tools.creativewaco.org:443`; `npm run dev:3847` for localhost; `npm run build` / `npm start` for production (start listens on port 3847).
- `loadLocalCredentials()` in `aggregate.mjs` runs on first dashboard request instead of at import time (serverless-safe).
- Vercel config uses native Next.js framework detection (`vercel.json`).
- Split the monolithic RSS email tool into a dedicated `/rss-email/` page.
- **90 paid members** goal counts active paid plans only; honorary members tracked separately in KPIs and tier mix.
- **Upcoming events** KPI counts Planning, Marketing, Operations, and Ready events with a future date.
- Removed redundant **Pipeline scheduled** KPI; 6-month pipeline progress remains in the Goals section.

### Fixed

- Upcoming events KPI undercounted when an event was in **Operations** status — now includes Planning, Marketing, Operations, and Ready with a future date (matches the events table).
- Clerk sign-in logo failed to load — auth middleware now skips `.avif` files so assets in `public/` are served without sign-in.
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
