import Link from "next/link";

export function ToolNav() {
  return (
    <nav className="mb-5 text-sm">
      <Link href="/" className="text-muted no-underline hover:text-ink hover:underline">
        ← All tools
      </Link>
    </nav>
  );
}
