import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CREATIVE_WACO_GA4_DIR = path.join(os.homedir(), ".config", "creativewaco");

function readPropertyIdFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const value = fs.readFileSync(filePath, "utf8").trim();
  return /^\d+$/.test(value) ? value : null;
}

/** Load GA4 credentials for local dev when env vars are unset. */
export function loadLocalCredentials() {
  if (process.env.VERCEL) return;

  if (!process.env.GA4_PROPERTY_ID) {
    const propertyId = readPropertyIdFile(
      path.join(CREATIVE_WACO_GA4_DIR, "ga4-property-id.txt"),
    );
    if (propertyId) {
      process.env.GA4_PROPERTY_ID = propertyId;
    }
  }

  if (
    process.env.GA4_SERVICE_ACCOUNT_JSON ||
    process.env.GA4_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    return;
  }

  const candidates = [
    path.join(CREATIVE_WACO_GA4_DIR, "ga4-service-account.json"),
    path.resolve(__dirname, "../../../../ga4/service-account.json"),
    path.resolve(__dirname, "../../../../ga4/ga4-service-account.json"),
    path.resolve(__dirname, "../../ga4-service-account.json"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      JSON.parse(raw);
      process.env.GA4_SERVICE_ACCOUNT_PATH = filePath;
      break;
    } catch {
      // ignore corrupt credential file
    }
  }
}
