# Real-Time Setup Wizard Updates - FIXED!

## The Problem

You configured OpenClaw in Settings (API keys, model, gateway), but the setup wizard still showed all steps as incomplete. The wizard wasn't detecting your actual configuration in real-time.

## Root Causes

### 1. **Wizard Only Checked on Page Load**
- Status check ran once when page loaded
- No refresh after Settings changes
- You had to manually click "Retry" to see updates

### 2. **Wrong Detection Method**
- Tried to run `openclaw config list` (which hangs when not configured)
- Didn't read the actual config file directly
- Couldn't detect gateway status reliably

### 3. **Skills Timeout (502 Error)**
- Skills command had 30s timeout
- OpenClaw needs up to 90s to initialize on first run
- Caused 502 Bad Gateway errors

## The Fix

### ✅ 1. Real-Time Configuration Detection

**Now checks actual config file, not CLI commands:**

```typescript
// OLD: Run CLI command (hangs)
openclaw config list

// NEW: Read config file directly (instant)
fetch('/api/openclaw/config')
→ Reads ~/.openclaw/.env
→ Checks for: ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.
→ Checks for: DEFAULT_MODEL
```

**Benefits:**
- ✅ Instant detection (no hanging commands)
- ✅ Sees your actual configuration
- ✅ Works even if OpenClaw CLI is unresponsive

### ✅ 2. Auto-Refresh on Settings Changes

**Wizard now listens for Settings events:**

```typescript
// When you save API key in Settings
ApiKeysPanel → saves key → dispatches "settings:keysUpdated"
                                    ↓
                          Skills page listens
                                    ↓
                          Auto-refreshes wizard
                                    ↓
                          API key step disappears!
```

**Events:**
- `settings:keysUpdated` - Fired when API keys are saved
- `settings:modelUpdated` - Fired when default model is saved
- `settings:gatewayUpdated` - Fired when gateway starts/restarts

**No more manual "Retry" needed!**

### ✅ 3. Gateway Status Check

**Now pings gateway directly (much faster):**

```typescript
// OLD: Run CLI command (slow)
openclaw gateway status --json  // 5s timeout

// NEW: HTTP ping (fast)
fetch('http://127.0.0.1:18789/health')  // 2s timeout
→ If responds: Gateway is running ✓
→ If fails: Fall back to CLI check
```

### ✅ 4. Skills Timeout Increased

**Fixed 502 Bad Gateway errors:**

```typescript
// OLD: 30 second timeout
SKILLS_TIMEOUT_MS = 30000

// NEW: 90 second timeout
SKILLS_TIMEOUT_MS = 90000  // OpenClaw needs time to initialize
```

**Why 90 seconds?**
- OpenClaw may need to initialize on first run
- Loads skill definitions, checks dependencies
- Better to wait than fail with 502

## How It Works Now

### Scenario 1: You Save API Key

```
1. You go to Settings
2. Enter API key, click "Save"
3. ApiKeysPanel dispatches "settings:keysUpdated"
4. Skills page hears the event
5. Automatically refreshes wizard
6. "Configure API Keys" step disappears ✓
```

### Scenario 2: You Select Model

```
1. You go to Settings
2. Select model, click "Save"
3. ModelPanel dispatches "settings:modelUpdated"
4. Skills page hears the event
5. Automatically refreshes wizard
6. "Select Default Model" step disappears ✓
```

### Scenario 3: You Start Gateway

```
1. You go to Settings
2. Click "Start Gateway"
3. ModelPanel dispatches "settings:gatewayUpdated"
4. Skills page hears the event
5. Automatically refreshes wizard
6. "Start Gateway" step disappears ✓
```

### Scenario 4: All Steps Complete

```
1. All required steps are done
2. Wizard automatically hides itself
3. You see your skills list
4. No more wizard! 🎉
```

## What You'll See Now

### Before (Old Behavior):
```
❌ Configure API Keys
   (even though you just saved it in Settings)
❌ Select Default Model
   (even though you just selected it)
❌ Start Gateway
   (even though it's already running)

[You had to click "Retry" manually]
```

### After (New Behavior):
```
✓ Configure API Keys (auto-detected)
✓ Select Default Model (auto-detected)
✓ Start Gateway (auto-detected)

[Wizard disappears automatically]
[Skills list appears]
```

## Testing the Fix

### 1. Test API Key Detection
```bash
# Configure via Settings
1. Go to Settings
2. Add ANTHROPIC_API_KEY
3. Click "Save"
4. Switch to Skills tab
5. "Configure API Keys" step should be gone ✓

# Or configure via CLI
openclaw config set ANTHROPIC_API_KEY sk-ant-...
# Then refresh Skills page - step should be gone ✓
```

### 2. Test Model Detection
```bash
# Configure via Settings
1. Go to Settings
2. Select "anthropic/claude-sonnet-4"
3. Click "Save"
4. Switch to Skills tab
5. "Select Default Model" step should be gone ✓

# Or configure via CLI
openclaw config set DEFAULT_MODEL anthropic/claude-sonnet-4
# Then refresh Skills page - step should be gone ✓
```

### 3. Test Gateway Detection
```bash
# Start via Settings
1. Go to Settings
2. Click "Start Gateway"
3. Switch to Skills tab
4. "Start Gateway" step should be gone ✓

# Or start via CLI
openclaw gateway start
# Then refresh Skills page - step should be gone ✓
```

### 4. Test Skills Loading
```bash
# Should no longer get 502 errors
1. Go to Skills tab
2. Wait up to 90 seconds (first time only)
3. Skills should load successfully ✓
4. No more 502 Bad Gateway errors ✓
```

## Technical Details

### Configuration Detection Flow

```
┌─────────────────────────────────────────┐
│ User saves API key in Settings          │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ ApiKeysPanel dispatches event           │
│ window.dispatchEvent("settings:keysUpdated") │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ SkillsList hears event                  │
│ window.addEventListener("settings:keysUpdated") │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ Calls refetch() → checkOpenClawStatus() │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ GET /api/openclaw/status                │
│ → Reads ~/.openclaw/.env directly       │
│ → Checks for API keys                   │
│ → Checks for DEFAULT_MODEL              │
│ → Pings gateway HTTP endpoint           │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ Updates wizard state                    │
│ → hasApiKeys: true ✓                    │
│ → hasModel: true ✓                      │
│ → gatewayRunning: true ✓                │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ Wizard hides completed steps            │
│ → "Configure API Keys" disappears       │
│ → "Select Default Model" disappears     │
│ → "Start Gateway" disappears            │
└─────────────────────────────────────────┘
```

### Files Changed

1. **`src/app/api/openclaw/status/route.ts`**
   - Reads config file directly instead of running CLI
   - Pings gateway HTTP endpoint for faster detection
   - Returns accurate status in real-time

2. **`src/components/settings/ApiKeysPanel.tsx`**
   - Already dispatches `settings:keysUpdated` (no change needed)

3. **`src/components/settings/ModelPanel.tsx`**
   - Now dispatches `settings:modelUpdated` when model saved
   - Now dispatches `settings:gatewayUpdated` when gateway started/restarted

4. **`src/components/skills/SkillsList.tsx`**
   - Listens for all three Settings events
   - Auto-refreshes wizard when any event fires
   - No manual "Retry" needed

5. **`src/lib/openclaw.ts`**
   - Increased skills timeout from 30s to 90s
   - Fixes 502 Bad Gateway errors

## Summary

✅ **Wizard updates in real-time** - No manual refresh needed
✅ **Detects actual configuration** - Reads config file directly
✅ **Fast gateway detection** - HTTP ping instead of CLI
✅ **No more 502 errors** - 90s timeout for skills
✅ **Auto-hides when done** - Wizard disappears automatically

**You can now:**
1. Configure OpenClaw in Settings
2. Switch to Skills tab
3. See wizard update automatically
4. No more stale/incorrect status!

The wizard is now truly real-time and accurately reflects your OpenClaw configuration! 🎉
