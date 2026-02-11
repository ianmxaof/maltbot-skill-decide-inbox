/**
 * Dev-only: clear active pair so onboarding starts from scratch on next load.
 * Run before next dev when DEV_RESET_ONBOARDING=true in .env.local.
 */

const path = require("path");
const fs = require("fs");

// Load .env.local so DEV_RESET_ONBOARDING is set when running via npm run dev
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^\s*DEV_RESET_ONBOARDING\s*=\s*(.+)/);
    if (m) process.env.DEV_RESET_ONBOARDING = m[1].trim().replace(/^["']|["']$/g, "");
  });
}

if (process.env.DEV_RESET_ONBOARDING !== "true") {
  process.exit(0);
}

const dataDir = path.join(process.cwd(), ".data");
const activePairPath = path.join(dataDir, "active-pair.json");

try {
  if (fs.existsSync(activePairPath)) {
    fs.unlinkSync(activePairPath);
    console.log("[dev-reset-onboarding] Cleared .data/active-pair.json — onboarding will start from beginning.");
  }
} catch (e) {
  console.warn("[dev-reset-onboarding] Could not clear active-pair:", e.message);
}
