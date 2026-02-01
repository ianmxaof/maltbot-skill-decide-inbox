# Claude Code Prompt: Fix OpenClaw OAuth → API Key for Anthropic

**Copy everything below the line into Claude Code (terminal) and follow the instructions.**

---

## Objective

Fix the OpenClaw "OAuth token refresh failed for anthropic" error so the agent uses the **Anthropic API key** instead of the broken OAuth flow. The user has a valid API key (sk-ant-...) but OpenClaw is stuck trying to refresh expired OAuth credentials.

---

## Directories (Windows) — USE ABSOLUTE PATH

**Base path (absolute):** `C:\Users\ianmp\.openclaw`

Use this exact path. Do NOT use `$env:USERPROFILE`, `%USERPROFILE%`, or `~` — they may fail in Claude Code's terminal.

| Path | Purpose |
|------|---------|
| `C:\Users\ianmp\.openclaw` | Root config directory |
| `C:\Users\ianmp\.openclaw\openclaw.json` | Main config (model, agents, etc.) |
| `C:\Users\ianmp\.openclaw\.env` | API keys (ANTHROPIC_API_KEY, etc.) |
| `C:\Users\ianmp\.openclaw\agents\main\agent\auth-profiles.json` | OAuth + API key profiles (**takes precedence** over .env) |
| `C:\Users\ianmp\.openclaw\agents\main\agent\auth.json` | Runtime OAuth cache (don't edit; auto-managed) |
| `C:\Users\ianmp\.openclaw\credentials\oauth.json` | Legacy OAuth import (if present) |

**Directory contents (confirmed):** agents, canvas, cron, devices, identity, logs, memory, .env, clawdbot.json, openclaw.json, gateway script, update-check.json. Multiple .bak files exist (config edits). Both `clawdbot.json` and `openclaw.json` present — OpenClaw may read `openclaw.json` primarily.

---

## Instructions

### Step 1: List the OpenClaw directory structure

**PowerShell:**
```powershell
Get-ChildItem -Path "C:\Users\ianmp\.openclaw" -Recurse -Force | Select-Object FullName
```

**Or (any shell):**
```powershell
dir "C:\Users\ianmp\.openclaw"
```

If the path doesn't exist, the user may need to run `openclaw onboard` first.

### Step 2: Check if ANTHROPIC_API_KEY is in .env

```powershell
Get-Content "C:\Users\ianmp\.openclaw\.env" | Select-String "ANTHROPIC"
```

The key should be there (user added it via Maltbot Settings). If not, add it:
```powershell
Add-Content "C:\Users\ianmp\.openclaw\.env" "ANTHROPIC_API_KEY=sk-ant-your-key-here"
```

### Step 3: Inspect auth-profiles.json (root cause)

OpenClaw prefers auth-profiles.json over .env. If there is an OAuth profile for anthropic, it will try to refresh it and fail.

```powershell
Get-Content "C:\Users\ianmp\.openclaw\agents\main\agent\auth-profiles.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

If `agents\main` doesn't exist, find auth-profiles.json:
```powershell
Get-ChildItem "C:\Users\ianmp\.openclaw\agents" -Recurse -Filter "auth-profiles.json"
```

### Step 4: Fix option A — Remove OAuth profile for anthropic (recommended)

**Backup first:**
```powershell
Copy-Item "C:\Users\ianmp\.openclaw\agents\main\agent\auth-profiles.json" "C:\Users\ianmp\.openclaw\agents\main\agent\auth-profiles.json.bak"
```

**Edit auth-profiles.json** (path: `C:\Users\ianmp\.openclaw\agents\main\agent\auth-profiles.json`) and remove or disable the anthropic OAuth profile. The file is JSON; look for a profile with `"provider": "anthropic"` and `"type": "oauth"` (or similar). Either:
- Delete that profile entry entirely, or
- Change its `"enabled": true` to `false` if such a field exists

After removal, OpenClaw should fall back to ANTHROPIC_API_KEY from .env.

### Step 5: Fix option B — Use paste-token to override with API key

Run (user must paste their API key when prompted):
```powershell
openclaw models auth paste-token --provider anthropic
```

Paste the Anthropic API key (sk-ant-...) when prompted. This adds/updates an API-key profile for anthropic.

### Step 6: Fix option C — Re-onboard with API key

```powershell
openclaw onboard --anthropic-api-key "sk-ant-YOUR-KEY-HERE"
```

Replace with the actual key. This non-interactively configures Anthropic API key auth.

### Step 7: Delete the OAuth runtime cache (optional but recommended)

The auth.json file caches the old OAuth tokens. Delete it so OpenClaw doesn't try to use stale data:
```powershell
Remove-Item "C:\Users\ianmp\.openclaw\agents\main\agent\auth.json" -Force -ErrorAction SilentlyContinue
```

### Step 8: Verify

```powershell
openclaw models status
```

Check that anthropic shows as configured and no "OAuth token refresh failed" appears.

### Step 9: Restart the Gateway

The Gateway must be restarted to pick up the new credentials. Either:
1. From Maltbot dashboard: Settings → Default Model → Restart Gateway
2. Or kill any process on port 18789 and start fresh: `openclaw gateway --port 18789`

---

## Summary of Fix (fastest path)

1. `Copy-Item` auth-profiles.json to .bak
2. Edit auth-profiles.json: remove the anthropic OAuth profile (the one causing "OAuth token refresh failed")
3. `Remove-Item` auth.json (runtime cache)
4. Confirm ANTHROPIC_API_KEY is in .env
5. `openclaw models status` to verify
6. Restart Gateway (kill port 18789, then `openclaw gateway --port 18789`)

---

## References

- OpenClaw OAuth docs: https://docs.clawd.bot/concepts/oauth
- Anthropic provider: https://docs.clawd.bot/providers/anthropic
- Models auth: https://docs.clawd.bot/cli/models
