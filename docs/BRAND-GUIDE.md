# Creative Waco Tools — Brand Guide

Warm editorial internal-tool aesthetic inspired by the Creative Spark Dashboard. Read this before adding new UI components or significant styling.

## Principles

- **Surfaces:** cream paper background (`--paper`), white panels (`--panel`), warm borders (`--line`)
- **Primary actions:** ink (`--ink` / `--primary`) — dark buttons, not orange CTAs everywhere
- **Accent:** Spark orange (`--spark`) for highlights, data viz, active list states, and eyebrow labels
- **Secondary identity:** plum (`--honorary`) for honorary/stewardship contexts only
- **Tone:** rounded panels (14px), soft shadows, uppercase micro-labels for section headers

## Tokens

Defined in [`app/brand-tokens.css`](app/brand-tokens.css) and mapped to shadcn in [`app/globals.css`](app/globals.css). Tailwind extensions in [`tailwind.config.ts`](tailwind.config.ts).

| Token | Hex | Use |
|-------|-----|-----|
| `--spark` | `#e85d04` | Accent bars, chart primary |
| `--spark-soft` | `#fff4ec` | Hover highlights, accent KPI backgrounds |
| `--spark-muted` | `#c44d03` | Accent text, eyebrows |
| `--ink` | `#1a1a1a` | Body text, primary buttons |
| `--paper` | `#f4f1ea` | Page background |
| `--panel` | `#ffffff` | Card/panel background |
| `--line` | `#e4dfd4` | Borders |
| `--text-muted` | `#666666` | Labels, subtitles |
| `--honorary` | `#6b5b95` | Honorary tier emphasis |
| `--success` | `#2d6a4f` | Positive status |
| `--warning` | `#b08900` | Caution status |
| `--info` | `#3d5a80` | Informational / events viz |
| `--error` | `#b42318` | Errors |

Chart series use `--chart-1` … `--chart-5` (spark, info, honorary, success, warning).

JS constants for data viz tiers: [`lib/cw-design-tokens.ts`](lib/cw-design-tokens.ts).

## Typography

- App sans stack (no custom font files)
- Section / field labels: `text-xs font-medium uppercase tracking-widest text-muted-foreground`
- Page titles: `text-3xl font-semibold tracking-tight` (see `PageHero`)
- Metrics: `tabular-nums` on numeric values

## Components (use first)

| Need | Use |
|------|-----|
| Page wrapper | `ToolPage` (`wide` for 1320px dashboards) |
| Sidebar + main grid | `ToolLayout` |
| Page header | `PageHero` |
| Section heading + content | `ToolSection` |
| Form/output card | `ToolPanel` or legacy `.panel` |
| KPI / metric tile | `MetricCard` |
| Status pill | `StatusPill` or shadcn `Badge` (brand variants) |
| Status message | `StatusLine` |
| Primary button | shadcn `Button` default or `.primary-btn` |
| Accent CTA | `Button` variant `spark` |
| Analytics cards | shadcn `Card`, `Badge`, `Button` |

Shared toolkit: [`components/cw/`](components/cw/). shadcn primitives: [`components/ui/`](components/ui/).

## Do

- Use CSS variables or Tailwind utilities (`bg-spark-soft`, `text-muted-foreground`, `border-line`)
- Extend `components/cw/` or shadcn variants when a pattern repeats across tools
- Update this guide when adding tokens or shared components

## Don't

- Hardcode hex in JSX/CSS except tier constants in `lib/cw-design-tokens.ts`
- Redefine `.panel`, `.field`, or global tokens in page-local CSS
- Add unscoped global class names that collide with toolkit utilities
- Use cold neutral grays that bypass the mapped `:root` theme

## Adding new UI

1. Read this guide
2. Search `components/cw/` and `components/ui/`
3. Compose from existing components + tokens
4. Add a new shared component only if nothing fits; document it here
