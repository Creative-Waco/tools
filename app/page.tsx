import Link from "next/link";
import { TOOLS } from "@/lib/tools-registry";

export default function HomePage() {
  return (
    <main className="page">
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Creative Waco
        </p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">Internal tools</h1>
        <p className="m-0 max-w-2xl text-muted-foreground">
          Small utilities for newsletter, events, and web workflows. Pick a tool below.
        </p>
      </header>

      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((tool) => (
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
    </main>
  );
}
