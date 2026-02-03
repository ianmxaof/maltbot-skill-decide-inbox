import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * GET /api/openclaw/skills/debug
 * Diagnostic endpoint to test OpenClaw CLI directly
 */
export async function GET() {
  const cliPath = process.env.OPENCLAW_CLI_PATH ?? "openclaw";
  const diagnostics: any = {
    cliPath,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test 1: Check if CLI exists and responds to --version
    try {
      const { stdout: versionOut, stderr: versionErr } = await execFileAsync(
        cliPath,
        ["--version"],
        {
          timeout: 5000,
          shell: process.platform === "win32" && cliPath.toLowerCase().endsWith(".cmd"),
        }
      );
      diagnostics.version = {
        stdout: versionOut?.trim() || null,
        stderr: versionErr?.trim() || null,
      };
    } catch (vErr: any) {
      diagnostics.version = {
        error: vErr.message,
        code: vErr.code,
      };
    }

    // Test 2: Try skills list with short timeout
    try {
      const { stdout: skillsOut, stderr: skillsErr } = await execFileAsync(
        cliPath,
        ["skills", "list"],
        {
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          shell: process.platform === "win32" && cliPath.toLowerCase().endsWith(".cmd"),
        }
      );
      diagnostics.skillsList = {
        stdout: skillsOut?.trim() || null,
        stderr: skillsErr?.trim() || null,
        stdoutLength: skillsOut?.length || 0,
      };
    } catch (sErr: any) {
      diagnostics.skillsList = {
        error: sErr.message,
        code: sErr.code,
        killed: sErr.killed,
        signal: sErr.signal,
      };
    }

    // Test 3: Try skills list --json
    try {
      const { stdout: jsonOut, stderr: jsonErr } = await execFileAsync(
        cliPath,
        ["skills", "list", "--json"],
        {
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          shell: process.platform === "win32" && cliPath.toLowerCase().endsWith(".cmd"),
        }
      );
      diagnostics.skillsJson = {
        stdout: jsonOut?.trim() || null,
        stderr: jsonErr?.trim() || null,
        stdoutLength: jsonOut?.length || 0,
      };
    } catch (jErr: any) {
      diagnostics.skillsJson = {
        error: jErr.message,
        code: jErr.code,
        killed: jErr.killed,
        signal: jErr.signal,
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json({
      ...diagnostics,
      fatalError: error.message,
    }, { status: 500 });
  }
}
