# Troubleshooting: "Why am I seeing the setup wizard when OpenClaw is installed?"

## The Problem

You have OpenClaw installed, but the Skills page shows the setup wizard saying "OpenClaw Not Installed" or "OpenClaw Configuration Required."

## Root Cause

**OpenClaw CLI commands are hanging/timing out** when the dashboard tries to check if it's installed.

When you run:
```bash
openclaw --version
```

The command **doesn't respond** - it just hangs indefinitely. This happens because:
1. OpenClaw is installed but **not configured** (missing API keys, model, etc.)
2. OpenClaw waits for configuration before responding to ANY command
3. The dashboard's status check times out after 3-5 seconds
4. Dashboard assumes OpenClaw isn't installed

## The Fix (Applied)

I've updated the detection logic to:

### 1. **Check if the file exists first** (fast)
   - Instead of running `openclaw --version` (which hangs)
   - Check if the file exists at `C:\Users\ianmp\AppData\Roaming\npm\openclaw.cmd`
   - If file exists → OpenClaw is installed ✓

### 2. **Skip install step if file exists**
   - If OpenClaw file is found, wizard only shows configuration steps
   - No more "Install OpenClaw CLI" step when it's already installed

### 3. **Add "Dismiss" button**
   - If you know OpenClaw is installed but wizard still shows
   - Click **"Dismiss"** to hide the wizard
   - You can still configure OpenClaw in Settings

### 4. **Shorter timeout**
   - Reduced version check timeout from 5s to 3s
   - Faster detection when commands hang

## How to Fix Your OpenClaw Installation

The wizard is showing because **OpenClaw needs configuration**, not because it's not installed.

### Option 1: Configure via UI (Recommended)
1. Go to **Settings** page
2. Add your API key (Anthropic, OpenAI, OpenRouter, etc.)
3. Select a default model
4. Return to Skills page and click **"Retry"**

### Option 2: Configure via CLI
```bash
# Run the onboarding wizard
openclaw onboard

# Or configure manually
openclaw config set anthropic_api_key sk-ant-...
openclaw config set default_model anthropic/claude-sonnet-4

# Verify configuration
openclaw config list
```

### Option 3: Dismiss the Wizard
1. Click **"Dismiss"** button on the wizard
2. Wizard disappears, tabs remain accessible
3. Configure OpenClaw later in Settings

## Verifying OpenClaw Works

After configuration, test that OpenClaw responds:

```bash
# This should return quickly now
openclaw --version

# This should list your config
openclaw config list

# This should list skills (may be empty)
openclaw skills list
```

If these commands **respond quickly** (< 1 second), OpenClaw is working!

## Why Commands Hang

OpenClaw's design requires configuration before responding to commands:
- ❌ **Before config:** `openclaw --version` → hangs forever
- ✅ **After config:** `openclaw --version` → returns version instantly

This is intentional behavior from OpenClaw, not a bug.

## What the Dashboard Does Now

### When OpenClaw File Exists:
```
✓ OpenClaw is installed
  → Shows configuration steps only
  → Provides "Dismiss" button
  → Links to Settings for quick config
```

### When OpenClaw File Doesn't Exist:
```
✗ OpenClaw not installed
  → Shows install instructions
  → npm install -g openclaw
```

## Quick Actions

### I want to dismiss the wizard:
→ Click **"Dismiss"** button (appears when OpenClaw is detected)

### I want to configure OpenClaw:
→ Click **"Go to Settings"** → Add API keys → Select model

### I want to verify detection:
→ Visit `/api/openclaw/status` in browser to see detection results

### I want to see diagnostics:
→ Visit `/api/openclaw/skills/debug` for detailed CLI test results

## Technical Details

### Detection Logic (New):
1. Check if file exists: `existsSync(cliPath)` ← **Fast, doesn't hang**
2. If exists: Mark as installed, try version check with 3s timeout
3. If version check times out: Still mark as installed (just needs config)
4. Check configuration: Try `openclaw config list`
5. If config fails: Show configuration steps

### Previous Logic (Old):
1. Run `openclaw --version` with 5s timeout
2. If times out: Assume not installed ← **Wrong assumption!**
3. Show install instructions

## Summary

**You were right** - OpenClaw IS installed. The wizard was showing because:
- OpenClaw commands hang when not configured
- Dashboard couldn't detect it was installed
- Now fixed: Dashboard checks if file exists (doesn't run commands)

**What to do now:**
1. Refresh the browser
2. You should see "OpenClaw is installed. Complete 2 more steps to configure it."
3. Either configure it or click "Dismiss" to hide the wizard
4. Tabs are always accessible regardless of wizard state

The wizard is now much smarter and won't falsely claim OpenClaw isn't installed! 🎉
