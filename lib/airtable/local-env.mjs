import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREATIVE_WACO_DIR = path.join(os.homedir(), ".config", "creativewaco");

function readTrimmedFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const value = fs.readFileSync(filePath, "utf8").trim();
  return value || null;
}

/** Load Airtable credentials for local dev when env vars are unset. */
export function loadLocalCredentials() {
  if (process.env.VERCEL) return;

  if (!process.env.AIRTABLE_API_KEY) {
    const apiKey = readTrimmedFile(path.join(CREATIVE_WACO_DIR, "airtable-api-key.txt"));
    if (apiKey) process.env.AIRTABLE_API_KEY = apiKey;
  }

  if (!process.env.AIRTABLE_BASE_ID) {
    const baseId = readTrimmedFile(path.join(CREATIVE_WACO_DIR, "airtable-base-id.txt"));
    if (baseId) process.env.AIRTABLE_BASE_ID = baseId;
  }
}

let credentialsLoaded = false;

export function ensureLocalCredentials() {
  if (credentialsLoaded) return;
  loadLocalCredentials();
  credentialsLoaded = true;
}
