import Link from "next/link";
import { DASHBOARDS, UTILITY_TOOLS, type Tool } from "@/lib/tools-registry";

function ToolGrid({ items }: { items: Tool[] }) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((tool) => (
        <li key={tool.id}>
          <Link
            href={tool.path}
            className="flex h-full flex-col rounded-xl border bg-card p-6 text-card-foreground no-underline shadow-sm transition-colors hover:bg-accent/50"
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
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Creative Waco
        </p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">Internal tools</h1>
        <p className="m-0 max-w-2xl text-muted-foreground">
          Small utilities for newsletter, events, and web workflows — plus live dashboards.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Tools
        </h2>
        <ToolGrid items={UTILITY_TOOLS} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Dashboards
        </h2>
        <ToolGrid items={DASHBOARDS} />
      </section>
    </main>
  );
}
