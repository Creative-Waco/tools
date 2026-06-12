/** Human-friendly labels for GA4 page paths in journey UI. */

const PATH_LABELS: Record<string, string> = {
  "/": "Home",
  "/events": "Events",
  "/event": "Events",
  "/programs/spark": "Creative Spark",
  "/creative-spark": "Creative Spark",
  "/spark": "Creative Spark",
  "/about": "About",
  "/contact": "Contact",
  "/donate": "Donate",
  "/levitt": "Levitt",
  "/artprenticeship": "Artprenticeship",
  "/dia-de-los-muertos": "Día de los Muertos",
  "/diadelosmuertos": "Día de los Muertos",
  "/waco-wonderland-parade": "Waco Wonderland",
};

export function formatJourneyPath(path: string | undefined): string {
  if (!path || path === "(not set)") return "Unknown page";

  const normalized = path.replace(/\/$/, "") || "/";
  const known = PATH_LABELS[normalized] ?? PATH_LABELS[path];
  if (known) return known;

  if (normalized.startsWith("/event/")) {
    const slug = normalized.slice("/event/".length);
    return slug ? `Event · ${slug}` : "Event";
  }

  if (normalized.startsWith("/es/")) {
    return `ES ${formatJourneyPath(normalized.slice(3))}`;
  }

  return normalized;
}

export function journeyPathSubtitle(path: string | undefined) {
  if (!path || path === "(not set)") return null;
  const label = formatJourneyPath(path);
  if (label === path || label === path.replace(/\/$/, "")) return null;
  return path;
}
