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

export function formatPathLabel(path: string | undefined): string {
  if (!path || path === "(not set)") return "Unknown page";
  if (path === "__more__") return "More pages";

  const normalized = path.replace(/\/$/, "") || "/";
  const known = PATH_LABELS[normalized] ?? PATH_LABELS[path];
  if (known) return known;

  if (normalized.startsWith("/event/")) {
    const slug = normalized.slice("/event/".length);
    return slug ? `Event · ${slug}` : "Event";
  }

  if (normalized.startsWith("/es/")) {
    return `ES ${formatPathLabel(normalized.slice(3))}`;
  }

  if (normalized.length > 42) {
    return `${normalized.slice(0, 39)}…`;
  }

  return normalized;
}

export function pathLabelSubtitle(path: string | undefined) {
  if (!path || path === "(not set)" || path === "__more__") return null;
  const label = formatPathLabel(path);
  if (label === path || label === path.replace(/\/$/, "")) return null;
  return path;
}
