import Link from "next/link";
import { DASHBOARDS, UTILITY_TOOLS, type Tool } from "@/lib/tools-registry";
import { PageHero } from "@/components/PageHero";
import { ToolSection } from "@/components/cw/ToolSection";

function ToolGrid({ items }: { items: Tool[] }) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((tool) => (
        <li key={tool.id}>
          <Link
            href={tool.path}
            className="flex h-full flex-col rounded-panel border border-line bg-card p-6 text-card-foreground no-underline shadow-panel transition-colors hover:bg-accent"
          >
            <h2 className="mb-2 text-lg font-semibold">{tool.name}</h2>
            <p className="m-0 flex-1 text-sm leading-relaxed text-muted-foreground">
              {tool.description}
            </p>
            <span className="mt-4 inline-block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tool.tag}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco"
        title="Internal tools"
        lede="Small utilities for newsletter, events, and web workflows — plus live dashboards."
      />

      <ToolSection title="Tools">
        <ToolGrid items={UTILITY_TOOLS} />
      </ToolSection>

      <ToolSection title="Dashboards" className="mb-0">
        <ToolGrid items={DASHBOARDS} />
      </ToolSection>
    </main>
  );
}
