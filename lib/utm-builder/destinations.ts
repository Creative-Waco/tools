export type DestinationShortcut = {
  id: string;
  label: string;
  url: string;
};

function normalizeDestinationPath(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin.toLowerCase()}${path}`;
  } catch {
    return "";
  }
}

export function detectDestinationId(baseUrl: string): string {
  const current = normalizeDestinationPath(baseUrl);
  if (!current) return "";

  const match = DESTINATION_SHORTCUTS.find(
    (shortcut) => normalizeDestinationPath(shortcut.url) === current,
  );

  return match?.id ?? "";
}

export const DESTINATION_SHORTCUTS: DestinationShortcut[] = [
  {
    id: "home",
    label: "Home",
    url: "https://creativewaco.org/",
  },
  {
    id: "events",
    label: "Events",
    url: "https://creativewaco.org/events",
  },
  {
    id: "spark",
    label: "Spark",
    url: "https://creativewaco.org/programs/spark",
  },
  {
    id: "about",
    label: "About",
    url: "https://creativewaco.org/about",
  },
];
