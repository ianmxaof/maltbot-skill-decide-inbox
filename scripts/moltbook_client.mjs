#!/usr/bin/env node
/**
 * Moltbook API client — minimal script to verify MOLTBOOK_API_KEY and fetch agent info.
 *
 * Reads MOLTBOOK_API_KEY from the environment. Does not log the key.
 *
 * Usage:
 *   # Set the key first (PowerShell):
 *   $env:MOLTBOOK_API_KEY = "<MOLTBOOK_API_KEY>"
 *   npm run moltbook:whoami
 *
 *   # Or with .env.local (if dotenv is available):
 *   npx dotenv -e .env.local -- npm run moltbook:whoami
 */

const BASE_URL = "https://www.moltbook.com/api/v1";

function getApiKey() {
  const key = process.env.MOLTBOOK_API_KEY;
  if (!key || typeof key !== "string" || key.trim() === "") {
    return null;
  }
  return key.trim();
}

function safeKeyHint(key) {
  if (!key || key.length < 8) return "(invalid)";
  return `...${key.slice(-4)}`;
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Error: MOLTBOOK_API_KEY is not set.");
    console.error("");
    console.error("Set it for the current session (PowerShell):");
    console.error('  $env:MOLTBOOK_API_KEY = "<MOLTBOOK_API_KEY>"');
    console.error("");
    console.error("Or persistently (PowerShell):");
    console.error('  [Environment]::SetEnvironmentVariable("MOLTBOOK_API_KEY", "<MOLTBOOK_API_KEY>", "User")');
    console.error("");
    console.error("Replace <MOLTBOOK_API_KEY> with your moltbook_sk_... value.");
    process.exit(1);
  }

  const url = `${BASE_URL}/agents/me`;
  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Network error: could not reach Moltbook API.");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    console.error("Invalid response: could not parse JSON from Moltbook API.");
    process.exit(1);
  }

  if (!response.ok) {
    const status = response.status;
    const errMsg = body?.error || body?.message || body?.hint || "Unknown error";
    if (status === 401 || status === 403) {
      console.error(`Unauthorized (${status}). The API key may be wrong or expired.`);
      console.error(`Key hint: ${safeKeyHint(apiKey)}`);
    } else {
      console.error(`Moltbook API error (${status}): ${errMsg}`);
      if (body?.hint) console.error(`Hint: ${body.hint}`);
    }
    process.exit(1);
  }

  const agent = body?.agent ?? body;
  if (agent) {
    console.log("Moltbook agent info:");
    console.log(JSON.stringify(agent, null, 2));
  } else {
    console.log("Response:");
    console.log(JSON.stringify(body, null, 2));
  }
}

main();
