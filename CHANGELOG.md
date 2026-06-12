# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-06-12

### Added

- **UTM URL Builder** — **From analytics** panel loads top UTM combinations from GA4 (last 90 days via `GET /api/utm-builder/history/`); **Load** fills the builder; GA4-only sources/mediums/campaigns append to Quick start chips when not in the static lists.
- **Analytics Dashboard** — Search queries panel: sortable columns (click headers), **Keywords / Pages** toggle, click a keyword to filter landing pages (switches to Pages), click a page to filter keywords (switches to Keywords); filter chips with clear.
- **Analytics Dashboard** — **User demographics** card in the overview grid: GA4 age brackets, gender, interests (`brandingInterest`), and **top cities** with coverage % and a note that most visitors are not assigned demographics; interest labels truncate with hover for the full Google category path; city rows show region/country subtitles and hover for share, engagement, new vs returning, top sources, and top landing pages.
- **Analytics Dashboard** — **Path exploration** redesigned as a single horizontal row: column 1 loads all session-start pages; each selection loads the next column from that path only; **Add step** extends up to 8 columns with horizontal scroll (`mode=landings|next` API).
- **Analytics Dashboard** — **Sponsorship** program filter for all sponsor/sponsorship pages site-wide (`program=sponsorship`).
- **Analytics Dashboard** — per-program **season date presets** in the date dropdown (e.g. Last Día de los Muertos season Oct 1–Nov 15, Last concert season May–Sep, Previous calendar year for year-round programs); shareable as `preset=last-season` with `program`.
- **Analytics Dashboard** — official Google product icons (`public/logos/ga4.png`, `public/logos/gsc.png` from Google gstatic) beside section titles for charts, tables, and program insights.
- **Analytics Dashboard** — traffic channels pie chart and legend tooltips show session count, share, and top sources per channel (GA4 `sessionDefaultChannelGroup` + `sessionSource` breakdown).
- **Analytics Dashboard** — sessions/page-views trend chart tooltip shows the full date, daily total, and top pages viewed that day (GA4 `date` + `pagePath` breakdown).
- **Analytics Dashboard** at `/analytics-dashboard/` — GA4 site overview (Shadcnblocks **chart-group14**, `@google-analytics/data`, `recharts`) with date presets, KPI cards, sessions/page-views trend, traffic channels, top pages, and referrers; **Analytics** sidebar tag in `lib/tools-registry.ts`.
- **Analytics Dashboard** — **program filters** (Creative Spark, Events, Levitt, Día de los Muertos, Artprenticeship, Waco Wonderland, Sponsorship) with scoped KPIs and four GA4 insight panels (who visits, how they find it, what they do, where they go next); `program` query param on `GET /api/analytics-dashboard/`.
- **Analytics Dashboard** — **Google Search Console** integration for organic search queries (clicks, impressions, CTR, position), scoped to program page paths; in-dashboard setup instructions when API access is missing; `googleapis` dependency.
- **Analytics Dashboard** — local credential auto-load from `~/.config/creativewaco/` (`ga4-service-account.json`, `ga4-property-id.txt`).
- **Event Card Graphics** — selective PNG download with checkboxes; one selection downloads a single PNG, multiple selections download a ZIP (`jszip`).
- **Event Card Graphics** — **Display slideshow** output format: landscape cards at **1920px** width (variable height), image-left/details-right layout, format selector above **Generate cards**, and `format` param on `POST /api/event-cards/generate/` (`instagram` | `slideshow`).
- **Event Card Graphics** — optional **date range** filter (start/end) on the generate form; events are sorted within the selected range (default: upcoming from today).
- **Event Card Graphics** — **quick date range** presets (next 1/2/4 weeks, 2/6 months) plus **Month in feed** selector populated from the RSS feed (`POST /api/event-cards/months/`).
- **UTM URL Builder** at `/utm-builder/` — client-side campaign link builder with channel presets (Instagram, Facebook, newsletter, Google Ads, print/QR, partner), destination shortcuts, campaign slug helper, content variant links, recent campaigns (`localStorage`), shareable URL state, color-coded URL preview, and Print/QR downloadable QR code (`qrcode`).
- **UTM URL Builder** — copy full URL, query string only, or path+query for HubSpot/email; auto-parse tagged URLs on paste; field help tooltips; **⌘⇧C** / **Ctrl+Shift+C** copy shortcut; **Marketing** sidebar tag with link icon in `lib/tools-registry.ts`.
- **Analytics Dashboard** — shareable URL params for program and date filters (`?program=creative-spark&preset=last-30-days` or `startDate`/`endDate`); session-scoped cache avoids refetching GA4/GSC on page refresh until **Refresh** is clicked.
- **Analytics Dashboard** — **Top cities** card in the overview grid (GA4 `city` dimension with active users and sessions); site-wide and program-scoped.
- **Analytics Dashboard** — city rows show region/country subtitles; hover for share, engagement rate, new vs returning, top sources, and top landing pages per city.

### Changed

- **UTM URL Builder** — simplified layout: **Quick start** combines page and channel chips; optional slug helper, extra UTM fields, custom params, and content variants live under one **More options** panel (auto-expands when loaded from a shared link or recent campaign); output panel drops redundant parameter summary.
- **UTM URL Builder** — **Quick start** page chips highlight the active destination when the URL matches a shortcut (same active style as channel presets).
- **UTM URL Builder** — **Quick start** adds **Sources**, **Mediums**, and **Campaigns** chip rows with active highlighting; campaign suggestions match analytics program names.
- **Analytics Dashboard** — path exploration uses GA4 **funnel reports** so each step counts sessions that followed the full selected path in order; counts narrow as you go deeper. API accepts `pathSteps` JSON array (up to 5 next-page options per step — GA4 limit).
- **Analytics Dashboard** — standalone **Top cities** overview card merged into **User demographics** (age, gender, interests, and cities in one panel). Program insights still show top cities in the “Who’s visiting” panel (lighter GA4 query). Session cache bumped to `v4` so stale `sessionStorage` without cities is ignored.

### Removed

- **Analytics Dashboard** — earlier five-column visitor journeys cards (replaced by Path exploration tree graph).

### Fixed

- **UTM URL Builder** — GA4 history entries with identical UTM/landing combos (after placeholder cleanup) are merged so React keys stay unique and session counts are summed correctly.
- **Analytics Dashboard** — Singapore is excluded from top-city lists (user demographics and program insights); common GA4 noise for this property.
- **Event Card Graphics** — landscape slideshow and Instagram PNG downloads no longer export blank event images for off-screen carousel slides; card images are preloaded before `html-to-image` export and card templates use eager loading instead of lazy loading.
- **Analytics Dashboard** — sessions trend tooltip reads top pages from the full daily dataset (not Recharts payload alone) so “Top pages that day” lists paths and view counts; dashboard cache bumped to `v2` so stale sessionStorage without per-day pages is ignored.
- **Analytics Dashboard** — path exploration no longer expands the page width; horizontal step columns scroll inside a contained area while the rest of the dashboard stays within the viewport. App shell and sidebar inset also clip horizontal overflow so cards below (e.g. Search queries) stay aligned.
- **Analytics Dashboard** — Día de los Muertos program filter now matches the current `/dia-de-los-muertos` URL (and legacy `/diadelosmuertos` paths); the old filter only matched the no-hyphen slug, so recent date ranges showed zero sessions despite traffic in GA4.
- **Analytics Dashboard** — sessions trend tooltip no longer clips at the chart edge (card/chart use `overflow-visible`; tooltip flips above when near the bottom); long page paths wrap instead of overflowing horizontally.
- **Analytics Dashboard** — sessions trend tooltip no longer clips session counts or page view numbers; reads the metric from row data when Recharts omits `value`, and scrolls the top-pages list.
- **Analytics Dashboard** — program trend charts (e.g. Events) no longer look zoomed in: Y-axis always starts at 0 and chart height stays fixed like the all-site view.
- **Analytics Dashboard** — Search queries table uses fixed column widths and truncates long keywords (hover for full text); filters spammy GSC rows (`-site:` chains, HTML entity noise, 100+ chars).
- **Analytics Dashboard** — Search Console program filters no longer send unsupported `groupType: "or"`; multiple page paths are combined with a single `includingRegex` filter (GSC only supports `"and"` within a filter group).
- **Analytics Dashboard** — Search Console click/impression totals now come from an aggregate query instead of summing only the top 15 keyword rows (which undercounted totals).

### Changed

- **Analytics Dashboard** — README clarifies GSC clicks vs GA4 organic sessions and documents `ERR_CONNECTION_REFUSED` when the dev server is not running on port 3847.
- **App shell** — sidebar splits **Tools** (utilities + All tools) and **Dashboards** (Creative Spark, Analytics) via `kind` on `lib/tools-registry.ts`.
- **Event Card Graphics** — output format tabs (Instagram / Display slideshow) moved to the left panel, directly above **Generate cards**.
- **Event Card Graphics** — **Download cards…** trigger sits below the preview (primary button style); collapsible **Select cards** panel opens there with range summary, presets (all / current / select all), thumbnail rows, and a **Done** button (single PNG or ZIP); clicking a row jumps the preview to that card.
- **Event Card Graphics** — display slideshow typography scaled up for venue readability (title **88px**, date pill **48px**, venue **52px**, category **36px** at 1920px export).
- **Event Card Graphics** — display slideshow exports as transparent PNGs (no drop shadow, no white matte behind the card).
- **Event Card Graphics** — display slideshow image uses full column width at natural aspect ratio (no crop); white panel with rounded corners; card height stays variable at **1920px** export width.
- **Event Card Graphics** — display slideshow slides are **card-only** (no blurred backdrop or Creative Waco logo); image-left/details-right layout; export height follows card content at **1920px** width.
- **Event Card Graphics** — simplified date range UI to one grouped dropdown (presets, feed months, custom dates) with start/end fields only for custom ranges.
- **Event Card Graphics** — **4:5 portrait export** at **1080×1350** with centered large event ticket (920px width), playful typography, natural-height uncropped images, date/time pill, CSS-mask notches, organization/venue stub with grey **Culturalyst** logo, and white-text **Creative Waco** navbar logo centered below the ticket (outside the stub).
- Clerk production and development: **password auth disabled**; sign-in is **Google** or **email verification code** only.
- **Event Card Graphics** — redesigned as **ticket-style Instagram cards** (1080px wide at export; height follows each photo): single white ticket with CSS-mask side notches, dashed perforation divider, rounded outer corners, inset hero image, category, date/time, and venue stub.
- **Event Card Graphics** — each slide uses a **blurred version of the event photo** as the backdrop (replacing rotating gradient themes); PNG export captures the full scene including blur.
- **Event Card Graphics** — removed card width option and QR codes; enrichment pulls category, location, organizer name, and photo from event pages.

### Fixed

- **Analytics Dashboard** — clearer “Loading GA4 data…” state during slow first fetch; empty traffic-channel guard to avoid chart render errors; document stale `.next` recovery (`npm run dev:clean:3847`) for blank page / 500 errors on `/analytics-dashboard/`; document **unstyled page** recovery when disk is full (`ENOSPC`).
- **Event Card Graphics** — landscape slideshow preview no longer overlaps the per-slide **PNG** hover button with the slide counter (e.g. **4/8**); PNG moves to the bottom-right when multiple slides are shown.
- **Event Card Graphics** — removed redundant **All cards** preset row from the download picker (still available in the range dropdown and **Select all**).
- **Event Card Graphics** — **Select all** in the download picker toggles off and clears every card when clicked again.
- **Event Card Graphics** — download picker selection controls use square checkboxes (with checkmark) instead of circular radio-style toggles.
- **Event Card Graphics** — download picker range dropdown no longer lists duplicate “1–8” and “All cards (1–8)” entries when every card is selected.
- **Local dev** — document stale `.next` cache recovery (`npm run dev:clean:3847`) for `Cannot find module './873.js'` and similar dev-server chunk errors.
- **Event Card Graphics** — slideshow preview sizes to the active slide and centers the scaled card; slideshow image column vertically centers the photo when the details column is taller.
- **Event Card Graphics** — slideshow preview viewport no longer shows a grey band below the card (`min-height` conflict); dots sit below the card on the dark chrome; light grey background only for the empty state.
- **Event Card Graphics** — slideshow empty-state hint text contrast on the light preview viewport.
- **App shell sidebar** — active tool link is highlighted again (dark fill on current page); `ShellLink` now forwards `data-active` and other anchor props from the sidebar menu button.
- **UTM URL Builder** — shareable state uses `window.location` + `history.replaceState` instead of `useSearchParams` / `router.replace` (fixes blank page or stuck “Loading builder…” after dev cache issues).
- **Event Card Graphics** — ticket stub refactored to one white container with CSS-mask side notches and a dashed divider (replaces split top/bottom SVG shapes that looked disconnected).
- **Event Card Graphics** — apply card limit **after** filtering to events with images (fixes carousel showing fewer than requested cards).
- **Event Card Graphics** — blurred backdrops load via an `<img>` layer (fixes broken `background-image` from quoted URLs in inline styles).
- **Event Card Graphics** — divider position synced after layout (`syncTicketDivider`) so side-notch cutouts align with the perforation at any content height; carousel viewport height tracks the active slide.

### Added

- **Event Card Graphics** — **Instagram carousel preview** (`InstagramCarouselPreview.tsx`): persistent frame, swipe/dots/slide counter, per-slide PNG download; populates on Generate with a loading overlay.
- **Event Card Graphics** — partner assets `public/culturalyst.png` and `public/creative-waco-logo-white.avif`; ticket modules `sync-ticket-divider.mjs`, `card-styles.mjs`, `constants.mjs` (1080×1350 export frame).
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
