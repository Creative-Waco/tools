import { GoogleAdsApi } from "google-ads-api";

import { assertGoogleAdsConfigured } from "./config.mjs";

let clientPromise = null;

export function getGoogleAdsClient() {
  if (!clientPromise) {
    clientPromise = Promise.resolve().then(() => {
      const config = assertGoogleAdsConfigured();
      return new GoogleAdsApi({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        developer_token: config.developerToken,
      });
    });
  }
  return clientPromise;
}

export async function getGoogleAdsCustomer() {
  const config = assertGoogleAdsConfigured();
  const client = await getGoogleAdsClient();

  return client.Customer({
    customer_id: config.customerId,
    refresh_token: config.refreshToken,
    ...(config.loginCustomerId
      ? { login_customer_id: config.loginCustomerId }
      : {}),
  });
}
