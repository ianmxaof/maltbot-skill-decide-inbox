# OpenClaw Setup Guide - In-UI Configuration

## Overview

The Maltbot UI now includes a **complete setup wizard** that guides you through OpenClaw configuration without leaving the dashboard. No more command-line onboarding required!

## How It Works

### 1. Automatic Detection

When you visit the **Skills** page, the dashboard automatically:
- Checks if OpenClaw CLI is installed
- Verifies API keys are configured
- Confirms a default model is selected
- Checks if the gateway is running (optional)

### 2. Setup Wizard

If OpenClaw isn't fully configured, you'll see a **Setup Wizard** with:

#### Step 1: Install OpenClaw CLI
- **Status Check:** Is `openclaw` command available?
- **Instructions:** 
  ```bash
  npm install -g openclaw
  ```
- **Alternative:** Link to official installation docs

#### Step 2: Configure API Keys ⭐ REQUIRED
- **Status Check:** Are API keys present in OpenClaw config?
- **Quick Fix:** Click "Go to Settings" → Add your API keys
- **Alternative:** Run `openclaw onboard` in terminal
- **Supported:** Anthropic, OpenAI, OpenRouter, etc.

#### Step 3: Select Default Model ⭐ REQUIRED
- **Status Check:** Is a default model configured?
- **Quick Fix:** Click "Go to Settings → Default Model"
- **Alternative:** Run `openclaw config set default_model <model>`
- **Examples:** 
  - `anthropic/claude-sonnet-4`
  - `openai/gpt-4`
  - `openrouter/anthropic/claude-sonnet-4`

#### Step 4: Start Gateway (Optional)
- **Status Check:** Is the gateway process running?
- **Quick Fix:** Click "Go to Settings" → Click "Start Gateway"
- **Alternative:** Run `openclaw gateway start`
- **Note:** Not required for basic skills management

### 3. Progress Tracking

The wizard shows:
- ✅ Completed steps (green checkmark)
- ⏳ Pending steps (numbered circle)
- Progress bar (X / 4 steps)
- "Optional" badge for non-required steps

### 4. Retry Button

After completing any step:
1. Click the **"Retry"** button
2. Dashboard re-checks OpenClaw status
3. Wizard updates to show new progress
4. Once all required steps are done, wizard disappears and shows your real skills!

## Configuration via Settings Page

### Adding API Keys

1. Navigate to **Settings** (top navigation)
2. Find the **"API Keys"** section
3. Enter your API key(s):
   - Anthropic: `sk-ant-...`
   - OpenAI: `sk-...`
   - OpenRouter: `sk-or-...`
4. Click **"Save API Key"**
5. Return to Skills page and click **"Retry"**

### Selecting a Model

1. Navigate to **Settings**
2. Find the **"Default Model"** section
3. Select from the dropdown (models populate based on your API keys)
4. Click **"Set as Default"**
5. Optionally click **"Start Gateway"** for advanced features
6. Return to Skills page and click **"Retry"**

## Configuration via CLI (Alternative)

If you prefer the command line:

```bash
# Run the full onboarding wizard
openclaw onboard

# Or configure manually
openclaw config set anthropic_api_key sk-ant-...
openclaw config set default_model anthropic/claude-sonnet-4

# Start gateway (optional)
openclaw gateway start

# Verify configuration
openclaw config list
```

Then refresh the Skills page in the dashboard.

## What Happens After Setup

Once OpenClaw is configured:

### ✅ Skills Page Shows:
- **Installed Tab:** Your actual installed OpenClaw skills
- **Available Tab:** Community skills from ClawHub (when API is available)
- **Bundled Tab:** Default OpenClaw skills (when ClawHub API is available)

### ✅ You Can:
- Install skills with one click
- Uninstall skills with one click
- See real metadata (risk scores, usage counts, etc.)
- View skill descriptions and authors
- Enable "Dry Run" mode for safe testing

### ✅ No Mock Data:
- All skills are real from your OpenClaw installation
- No example/placeholder data
- Direct integration with OpenClaw CLI

## Troubleshooting

### "OpenClaw CLI not found"
- Install OpenClaw: `npm install -g openclaw`
- Verify installation: `openclaw --version`
- Check `.env.local` has correct path: `OPENCLAW_CLI_PATH=...`

### "Skills list timeout"
- Ensure API keys are configured
- Check default model is set
- Try running `openclaw skills list` in terminal to see actual error
- Visit `/api/openclaw/skills/debug` for detailed diagnostics

### "No skills showing after setup"
- You may not have any skills installed yet
- Install skills from the "Available" tab (when ClawHub API is available)
- Or install via CLI: `openclaw skills install <skill-name>`

### Setup Wizard Won't Disappear
- Ensure all **required** steps show ✅ green checkmarks
- Click "Retry" button to refresh status
- Check browser console for errors
- Try `openclaw config list` in terminal to verify configuration

## Environment Variables

The dashboard uses these environment variables (`.env.local`):

```bash
# Required: Path to OpenClaw CLI
OPENCLAW_CLI_PATH=C:\Users\ianmp\AppData\Roaming\npm\openclaw.cmd

# Optional: Gateway URL (defaults to http://127.0.0.1:18789)
# OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789

# Optional: Gateway token (if authentication is enabled)
# OPENCLAW_GATEWAY_TOKEN=your_token_here

# Future: ClawHub API key (when public API is available)
# CLAWHUB_API_KEY=your_key_here
```

## API Endpoints

The dashboard uses these backend endpoints:

- `GET /api/openclaw/status` - Check OpenClaw installation and configuration
- `GET /api/openclaw/skills` - List installed skills
- `GET /api/openclaw/skills/clawhub` - Fetch community skills (when available)
- `POST /api/openclaw/skills/install` - Install a skill
- `POST /api/openclaw/skills/uninstall` - Uninstall a skill
- `GET /api/openclaw/skills/debug` - Diagnostic information

## Next Steps

1. **Visit the Skills page** - The wizard will guide you
2. **Complete the required steps** - API keys and model selection
3. **Click "Retry"** - See your real skills appear
4. **Start managing skills** - Install, uninstall, and configure from the UI

No command-line experience required! 🎉
