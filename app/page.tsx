import Link from "next/link";
import { TOOLS } from "@/lib/tools-registry";

export default function HomePage() {
  return (
    <main className="page">
      <header className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted">Creative Waco</p>
        <h1 className="mb-2 text-[32px] leading-tight">Internal tools</h1>
        <p className="m-0 max-w-[60ch] leading-relaxed text-muted">
          Small utilities for newsletter, events, and web workflows. Pick a tool below.
        </p>
      </header>

      <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {TOOLS.map((tool) => (
          <li key={tool.id}>
            <Link
              href={tool.path}
              className="block rounded-panel border border-line bg-panel p-5 text-inherit no-underline shadow-panel transition hover:-translate-y-0.5 hover:border-[#c8c0b0]"
            >
              <h2 className="mb-2 text-xl">{tool.name}</h2>
              <p className="m-0 text-sm leading-relaxed text-muted">{tool.description}</p>
              <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-wide text-muted">
                {tool.tag}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
