import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAccessTokenStale } from "./asana-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Load Givebutter / Asana credentials for local dev when env vars are unset. */
export function loadLocalCredentials() {
  if (process.env.VERCEL) return;

  const tokenPath = path.resolve(__dirname, "../../../../asana/.asana_token.json");
  if (fs.existsSync(tokenPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
      const envToken = process.env.ASANA_ACCESS_TOKEN?.trim();
      const fileToken = data.access_token?.trim();
      if (fileToken && (!envToken || isAccessTokenStale(envToken))) {
        process.env.ASANA_ACCESS_TOKEN = fileToken;
      }
      if (data.refresh_token && !process.env.ASANA_REFRESH_TOKEN) {
        process.env.ASANA_REFRESH_TOKEN = data.refresh_token;
      }
    } catch {
      // ignore corrupt token file
    }
  }

  const givebutterEnvPath = path.resolve(
    __dirname,
    "../../../../../Archive/givebutter/.env",
  );
  const givebutterVars = readDotEnv(givebutterEnvPath);

  if (!process.env.GIVEBUTTER_API_KEY && givebutterVars.GIVEBUTTER_API_KEY) {
    process.env.GIVEBUTTER_API_KEY = givebutterVars.GIVEBUTTER_API_KEY;
  }
  if (!process.env.GIVEBUTTER_ACCOUNT_ID && givebutterVars.GIVEBUTTER_ACCOUNT_ID) {
    process.env.GIVEBUTTER_ACCOUNT_ID = givebutterVars.GIVEBUTTER_ACCOUNT_ID;
  }
}
