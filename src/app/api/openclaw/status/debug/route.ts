import { NextResponse } from "next/server";
import { readEnvMasked, readConfig, ENV_PATH, CONFIG_PATH } from "@/lib/openclaw-config";
import { existsSync } from "fs";

/**
 * GET /api/openclaw/status/debug
 * Debug endpoint to see what the status check is actually reading
 */
export async function GET() {
  const cliPath = process.env.OPENCLAW_CLI_PATH ?? "openclaw";

  const debug = {
    cliPath,
    cliExists: existsSync(cliPath),
    envPath: ENV_PATH,
    envExists: existsSync(ENV_PATH),
    configPath: CONFIG_PATH,
    configExists: existsSync(CONFIG_PATH),
    envKeys: null as { name: string; hasValue: boolean }[] | null,
    config: null as Record<string, unknown> | null,
    hasApiKeys: false,
    hasModel: false,
    modelValue: null as string | null,
  };

  try {
    // Read env keys
    const envKeys = await readEnvMasked();
    debug.envKeys = envKeys.map((k) => ({ name: k.name, hasValue: k.hasValue }));

    // Check for API keys
    debug.hasApiKeys = envKeys.some(
      (k) =>
        k.hasValue &&
        (k.name === "ANTHROPIC_API_KEY" ||
          k.name === "OPENAI_API_KEY" ||
          k.name === "OPENROUTER_API_KEY" ||
          k.name === "GROQ_API_KEY" ||
          k.name === "ZAI_API_KEY")
    );

    // Read config
    const { config } = await readConfig();
    debug.config = config;

    // Check for model
    const modelConfig = config?.agents as { defaults?: { model?: unknown } } | undefined;
    const primaryModel =
      typeof modelConfig?.defaults?.model === "string"
        ? modelConfig.defaults.model
        : typeof modelConfig?.defaults?.model === "object" && modelConfig.defaults.model !== null
          ? (modelConfig.defaults.model as { primary?: string }).primary
          : undefined;
    debug.modelValue = primaryModel ?? null;
    debug.hasModel = Boolean(primaryModel && primaryModel.length > 0);

    return NextResponse.json(debug);
  } catch (error: any) {
    return NextResponse.json({ ...debug, error: error.message }, { status: 500 });
  }
}
