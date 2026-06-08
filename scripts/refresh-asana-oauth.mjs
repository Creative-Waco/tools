#!/usr/bin/env node
/**
 * Refresh Asana OAuth token using the registered localhost callback.
 *
 * Default redirect (Creative Waco Asana app):
 *   http://localhost:3334/oauth/callback
 *
 * Usage:
 *   node scripts/refresh-asana-oauth.mjs
 *   node scripts/refresh-asana-oauth.mjs --code="http://localhost:3334/oauth/callback?code=..."
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const CLIENT_ID = "1212819982295213";
const CLIENT_SECRET = "1fea645bc2d31ccd13cc54b089fa2394";
const DEFAULT_REDIRECT_URI = "http://localhost:3334/oauth/callback";
const CALLBACK_PORT = 3334;
const TOKEN_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../asana/.asana_token.json",
);

function redirectUri() {
  return process.env.ASANA_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
}

function buildAuthUrl() {
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    state,
    scope: "openid email profile default identity",
  });
  return `https://app.asana.com/-/oauth_authorize?${params}`;
}

function openBrowser(url) {
  try {
    execSync(`open ${JSON.stringify(url)}`, { stdio: "ignore" });
  } catch {
    console.log("\nOpen this URL in your browser:\n", url);
  }
}

function extractCode(input) {
  const raw = String(input ?? "").trim();
  if (raw.startsWith("http")) {
    const code = new URL(raw).searchParams.get("code");
    if (code) return code;
  }
  return raw || null;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri(),
    code,
  });
  const res = await fetch("https://app.asana.com/-/oauth_token", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

function waitForCallback() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, redirectUri());
      if (url.pathname !== "/oauth/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>Authorized — return to terminal</h1>");

      server.close();
      if (error) reject(new Error(error));
      else if (code) resolve(code);
      else reject(new Error("No code in callback"));
    });

    server.listen(CALLBACK_PORT, () => {
      console.log(`Listening on ${redirectUri()}`);
    });
    server.on("error", reject);
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth timed out after 3 minutes"));
    }, 180_000);
  });
}

async function main() {
  const codeArg = process.argv.find((a) => a.startsWith("--code="))?.slice(7);

  console.log("Asana OAuth refresh");
  console.log(`Redirect URI: ${redirectUri()}`);

  let code = codeArg ? extractCode(codeArg) : null;

  if (!code) {
    const authUrl = buildAuthUrl();
    const callbackPromise = waitForCallback();
    console.log("Opening browser for authorization…");
    openBrowser(authUrl);
    code = await callbackPromise;
  }

  console.log("Exchanging code for access token…");
  const tokenData = await exchangeCode(code);
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
  console.log(`✓ Token saved to ${TOKEN_FILE}`);

  if (tokenData.refresh_token) {
    console.log("✓ Refresh token saved for future renewals.");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
