import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Creative Waco OAuth app — do not use ASANA_CLIENT_ID (a separate integration).
const CLIENT_ID = process.env.ASANA_OAUTH_CLIENT_ID ?? "1212819982295213";
const CLIENT_SECRET =
  process.env.ASANA_OAUTH_CLIENT_SECRET ?? "1fea645bc2d31ccd13cc54b089fa2394";

const TOKEN_FILE = path.resolve(__dirname, "../../../../asana/.asana_token.json");

function readTokenFile() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeTokenFile(data) {
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
}

export function accessTokenExpiresAt(token) {
  if (!token) return 0;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

export function isAccessTokenStale(token, skewMs = 5 * 60 * 1000) {
  const exp = accessTokenExpiresAt(token);
  if (!exp) return false;
  return Date.now() >= exp - skewMs;
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const res = await fetch("https://app.asana.com/-/oauth_token", { method: "POST", body });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Asana token refresh failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`Asana token refresh failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

let refreshPromise = null;

/**
 * Return a valid Asana bearer token, refreshing via refresh_token when needed.
 * Updates process.env.ASANA_ACCESS_TOKEN and the local token file when refreshed.
 */
export async function getValidAccessToken() {
  const envToken = process.env.ASANA_ACCESS_TOKEN?.trim();
  const envRefresh = process.env.ASANA_REFRESH_TOKEN?.trim();

  if (envToken && !isAccessTokenStale(envToken)) {
    return envToken;
  }

  const fileData = readTokenFile();
  const refreshToken = envRefresh || fileData?.refresh_token;
  const candidate = envToken || fileData?.access_token;

  if (candidate && !isAccessTokenStale(candidate)) {
    if (!envToken && candidate) process.env.ASANA_ACCESS_TOKEN = candidate;
    return candidate;
  }

  if (!refreshToken) {
    if (candidate) return candidate;
    throw new Error(
      "ASANA_ACCESS_TOKEN is not configured. Run scripts/refresh-asana-oauth.mjs to authorize.",
    );
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken)
      .then((json) => {
        const merged = {
          ...(fileData ?? {}),
          ...json,
          refresh_token: json.refresh_token ?? refreshToken,
        };
        if (!process.env.VERCEL) writeTokenFile(merged);
        process.env.ASANA_ACCESS_TOKEN = json.access_token;
        return json.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
