import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { AlphaAnalyticsDataClient } from "@google-analytics/data/build/src/v1alpha/index.js";

let clientPromise = null;
let alphaClientPromise = null;

export function getGa4PropertyId() {
  const id = process.env.GA4_PROPERTY_ID?.trim();
  if (!id) {
    throw new Error(
      "GA4_PROPERTY_ID is not set. Add your GA4 property ID to .env.local or Vercel env vars.",
    );
  }
  return id.replace(/^properties\//, "");
}

export function getGa4Client() {
  if (!clientPromise) {
    const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
    const filePath = process.env.GA4_SERVICE_ACCOUNT_PATH?.trim();

    if (json) {
      clientPromise = Promise.resolve(
        new BetaAnalyticsDataClient({
          credentials: JSON.parse(json),
        }),
      );
    } else if (filePath) {
      clientPromise = Promise.resolve(
        new BetaAnalyticsDataClient({
          keyFilename: filePath,
        }),
      );
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      clientPromise = Promise.resolve(new BetaAnalyticsDataClient());
    } else {
      throw new Error(
        "GA4 credentials are not configured. Set GA4_SERVICE_ACCOUNT_JSON, GA4_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
  }
  return clientPromise;
}

export function getAlphaGa4Client() {
  if (!alphaClientPromise) {
    const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
    const filePath = process.env.GA4_SERVICE_ACCOUNT_PATH?.trim();

    if (json) {
      alphaClientPromise = Promise.resolve(
        new AlphaAnalyticsDataClient({
          credentials: JSON.parse(json),
        }),
      );
    } else if (filePath) {
      alphaClientPromise = Promise.resolve(
        new AlphaAnalyticsDataClient({
          keyFilename: filePath,
        }),
      );
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      alphaClientPromise = Promise.resolve(new AlphaAnalyticsDataClient());
    } else {
      throw new Error(
        "GA4 credentials are not configured. Set GA4_SERVICE_ACCOUNT_JSON, GA4_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
  }
  return alphaClientPromise;
}

export function parseGa4Metric(row, index) {
  const raw = row.metricValues?.[index]?.value ?? "0";
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}
