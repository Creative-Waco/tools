import { readFileSync } from "node:fs";

function readOptionalFile(path) {
  if (!path?.trim()) return undefined;
  return readFileSync(path.trim(), "utf8").trim();
}

function readSecret(envKey, fileEnvKey) {
  const direct = process.env[envKey]?.trim();
  if (direct) return direct;

  const filePath = process.env[fileEnvKey]?.trim();
  if (filePath) return readOptionalFile(filePath);

  return undefined;
}

export function normalizeCustomerId(value) {
  return value?.replace(/\D/g, "") ?? "";
}

export function getGoogleAdsConfig() {
  const developerToken = readSecret(
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_DEVELOPER_TOKEN_PATH",
  );
  const clientId = readSecret("GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_ID_PATH");
  const clientSecret = readSecret(
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_CLIENT_SECRET_PATH",
  );
  const refreshToken = readSecret(
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_REFRESH_TOKEN_PATH",
  );
  const customerId = normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const loginCustomerId = normalizeCustomerId(
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  );

  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    loginCustomerId: loginCustomerId || undefined,
  };
}

export function getGoogleAdsConfigStatus() {
  const config = getGoogleAdsConfig();
  const missing = [];

  if (!config.developerToken) missing.push("GOOGLE_ADS_DEVELOPER_TOKEN");
  if (!config.clientId) missing.push("GOOGLE_ADS_CLIENT_ID");
  if (!config.clientSecret) missing.push("GOOGLE_ADS_CLIENT_SECRET");
  if (!config.refreshToken) missing.push("GOOGLE_ADS_REFRESH_TOKEN");
  if (!config.customerId) missing.push("GOOGLE_ADS_CUSTOMER_ID");

  return {
    configured: missing.length === 0,
    missing,
    customerId: config.customerId || null,
    loginCustomerId: config.loginCustomerId || null,
  };
}

export function assertGoogleAdsConfigured() {
  const status = getGoogleAdsConfigStatus();
  if (!status.configured) {
    throw new Error(
      `Google Ads API is not configured. Missing: ${status.missing.join(", ")}`,
    );
  }
  return getGoogleAdsConfig();
}
