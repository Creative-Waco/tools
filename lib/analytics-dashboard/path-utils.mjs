/** Shared path normalization for GA4, GSC, and cross-insight joins. */

export function normalizePath(path) {
  if (!path || path === "(not set)") return "";
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

export function gscPageToPath(pageUrl) {
  try {
    const pathname = new URL(pageUrl).pathname;
    return normalizePath(pathname || "/");
  } catch {
    return normalizePath(pageUrl);
  }
}

export function landingLookup(landingPages) {
  const byPath = new Map();
  for (const row of landingPages ?? []) {
    const path = normalizePath(row.path);
    if (!path) continue;
    const existing = byPath.get(path);
    if (!existing || row.sessions > existing.sessions) {
      byPath.set(path, { ...row, path });
    }
  }
  return byPath;
}

export function pageLookup(pages) {
  const byPath = new Map();
  for (const row of pages ?? []) {
    const path = normalizePath(row.path);
    if (!path) continue;
    byPath.set(path, { ...row, path });
  }
  return byPath;
}
