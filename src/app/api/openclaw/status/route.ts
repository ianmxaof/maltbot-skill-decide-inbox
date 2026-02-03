import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { readEnvMasked, readConfig } from "@/lib/openclaw-config";

const execFileAsync = promisify(execFile);

/**
 * GET /api/openclaw/status
 * Check if OpenClaw is installed and configured
 */
export async function GET() {
  const cliPath = process.env.OPENCLAW_CLI_PATH ?? "openclaw";
  const needsShell = process.platform === "win32" && cliPath.toLowerCase().endsWith(".cmd");

  const status = {
    installed: false,
    configured: false,
    version: null as string | null,
    hasApiKeys: false,
    hasModel: false,
    gatewayRunning: false,
    errors: [] as string[],
  };

  try {
    // Test 1: Check if CLI file exists (faster than running --version which may hang)
    const cliExists = existsSync(cliPath);
    
    if (cliExists) {
      status.installed = true;
      
      // Try to get version, but don't fail if it hangs
      try {
        const { stdout } = await execFileAsync(cliPath, ["--version"], {
          timeout: 3000, // Shorter timeout
          shell: needsShell,
        });
        status.version = stdout.trim();
      } catch (err: any) {
        // Version check failed/timed out, but file exists so it's installed
        // This happens when OpenClaw needs configuration
        status.version = "installed (needs configuration)";
      }
    } else {
      // CLI file doesn't exist
      status.installed = false;
      status.errors.push(`OpenClaw CLI not found at: ${cliPath}`);
    }

    // Test 2: Check configuration by reading the actual config files directly
    // This is more reliable than running CLI commands which may hang
    if (status.installed) {
      try {
        // Read ~/.openclaw/.env directly for API keys
        const envKeys = await readEnvMasked();
        const hasAnyKey = envKeys.some(
          (k) =>
            k.hasValue &&
            (k.name === "ANTHROPIC_API_KEY" ||
              k.name === "OPENAI_API_KEY" ||
              k.name === "OPENROUTER_API_KEY" ||
              k.name === "GROQ_API_KEY" ||
              k.name === "ZAI_API_KEY")
        );
        status.hasApiKeys = hasAnyKey;

        // Try to get config from gateway first (if running), then fall back to file
        let primaryModel: string | undefined;
        
        // First try the gateway HTTP endpoint (if gateway is running)
        try {
          const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";
          const configRes = await fetch(`${gatewayUrl}/config`, {
            signal: AbortSignal.timeout(2000),
          });
          if (configRes.ok) {
            const gatewayConfig = await configRes.json();
            // Extract model from gateway config response
            const modelFromGateway =
              typeof gatewayConfig?.agents?.defaults?.model === "string"
                ? gatewayConfig.agents.defaults.model
                : typeof gatewayConfig?.agents?.defaults?.model === "object" && gatewayConfig.agents.defaults.model !== null
                  ? gatewayConfig.agents.defaults.model.primary
                  : undefined;
            if (modelFromGateway) {
              primaryModel = modelFromGateway;
            }
          }
        } catch {
          // Gateway not available or doesn't have /config endpoint
        }

        // Fall back to reading ~/.openclaw/openclaw.json directly
        if (!primaryModel) {
          const { config } = await readConfig();
          const modelConfig = config?.agents as { defaults?: { model?: unknown } } | undefined;
          primaryModel =
            typeof modelConfig?.defaults?.model === "string"
              ? modelConfig.defaults.model
              : typeof modelConfig?.defaults?.model === "object" && modelConfig.defaults.model !== null
                ? (modelConfig.defaults.model as { primary?: string }).primary
                : undefined;
        }

        status.hasModel = Boolean(primaryModel && primaryModel.length > 0);
        status.configured = status.hasApiKeys && status.hasModel;
      } catch (err: any) {
        // Config check failed - OpenClaw is installed but not configured
        status.configured = false;
        status.hasApiKeys = false;
        status.hasModel = false;
      }
    }

    // Test 3: Check if gateway is running - try HTTP first (faster), then CLI
    if (status.installed) {
      try {
        // Try to ping the gateway directly (much faster than CLI)
        const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";
        const pingRes = await fetch(`${gatewayUrl}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        status.gatewayRunning = pingRes.ok;
      } catch {
        // Gateway HTTP check failed, try CLI
        try {
          const { stdout } = await execFileAsync(cliPath, ["gateway", "status", "--json"], {
            timeout: 3000,
            shell: needsShell,
          });
          const gatewayStatus = JSON.parse(stdout);
          status.gatewayRunning = gatewayStatus.running === true || gatewayStatus.status === "running";
        } catch (err: any) {
          // Gateway not running
          status.gatewayRunning = false;
        }
      }
    }

    console.log("[OpenClaw Status]", {
      installed: status.installed,
      hasApiKeys: status.hasApiKeys,
      hasModel: status.hasModel,
      gatewayRunning: status.gatewayRunning,
      configured: status.configured,
    });

    return NextResponse.json(status, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    status.errors.push(`Unexpected error: ${error.message}`);
    return NextResponse.json(status, { status: 500 });
  }
}
