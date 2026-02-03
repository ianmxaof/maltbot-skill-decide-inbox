"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

interface OpenClawStatus {
  installed: boolean;
  configured: boolean;
  version: string | null;
  hasApiKeys: boolean;
  hasModel: boolean;
  gatewayRunning: boolean;
  errors: string[];
}

interface OpenClawSetupWizardProps {
  status: OpenClawStatus;
  onRetry: () => void;
}

export function OpenClawSetupWizard({ status, onRetry }: OpenClawSetupWizardProps) {
  const [checking, setChecking] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    await onRetry();
    setChecking(false);
  };
  
  // Allow users to dismiss the wizard if they know OpenClaw is installed
  if (dismissed) {
    return null;
  }

  // If OpenClaw is installed, skip the install step in the UI
  const skipInstallStep = status.installed;

  // Determine setup steps
  const steps = [
    ...(skipInstallStep ? [] : [{
      id: "install",
      label: "Install OpenClaw CLI",
      completed: status.installed,
      required: true,
      instructions: (
        <div className="space-y-2 text-xs text-zinc-400">
          <p>Install OpenClaw globally via npm:</p>
          <code className="block bg-zinc-900 px-3 py-2 rounded">npm install -g openclaw</code>
          <p className="mt-2">Or visit the official docs:</p>
          <a
            href="https://docs.openclaw.ai/installation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            OpenClaw Installation Guide
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ),
    }]),
    {
      id: "configure",
      label: "Configure API Keys",
      completed: status.hasApiKeys,
      required: true,
      instructions: (
        <div className="space-y-2 text-xs text-zinc-400">
          <p>Add your API keys in Settings or via CLI:</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            Go to Settings
            <ArrowRight className="h-3 w-3" />
          </Link>
          <p className="mt-2">Or run the onboarding wizard:</p>
          <code className="block bg-zinc-900 px-3 py-2 rounded">openclaw onboard</code>
          <p className="mt-2 text-zinc-500">
            You'll need at least one API key (Anthropic, OpenAI, OpenRouter, etc.)
          </p>
        </div>
      ),
    },
    {
      id: "model",
      label: "Select Default Model",
      completed: status.hasModel,
      required: true,
      instructions: (
        <div className="space-y-2 text-xs text-zinc-400">
          <p>Configure your default model in Settings:</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            Go to Settings → Default Model
            <ArrowRight className="h-3 w-3" />
          </Link>
          <p className="mt-2">Or via CLI:</p>
          <code className="block bg-zinc-900 px-3 py-2 rounded">
            openclaw config set default_model anthropic/claude-sonnet-4
          </code>
        </div>
      ),
    },
    {
      id: "gateway",
      label: "Start Gateway (Optional)",
      completed: status.gatewayRunning,
      required: false,
      instructions: (
        <div className="space-y-2 text-xs text-zinc-400">
          <p>The gateway enables advanced features. Start it from Settings or CLI:</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            Go to Settings → Start Gateway
            <ArrowRight className="h-3 w-3" />
          </Link>
          <p className="mt-2">Or via CLI:</p>
          <code className="block bg-zinc-900 px-3 py-2 rounded">openclaw gateway start</code>
          <p className="mt-2 text-zinc-500">
            Not required for basic skills management.
          </p>
        </div>
      ),
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const requiredSteps = steps.filter((s) => s.required).length;
  const requiredCompleted = steps.filter((s) => s.required && s.completed).length;
  const isFullyConfigured = requiredCompleted === requiredSteps;
  
  // If OpenClaw is installed and configured, don't show wizard at all
  if (status.installed && status.configured) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header - always visible */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/20 p-1.5">
            {isFullyConfigured ? (
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-400">
              {isFullyConfigured
                ? "OpenClaw is configured!"
                : status.installed
                  ? "OpenClaw Configuration Required"
                  : "OpenClaw Not Installed"}
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              {isFullyConfigured
                ? "All required steps completed. Click 'Retry' to load your installed skills."
                : status.installed
                  ? `OpenClaw is installed. Complete ${requiredSteps - requiredCompleted} more step${requiredSteps - requiredCompleted === 1 ? "" : "s"} to configure it.`
                  : "Install OpenClaw CLI to get started."}
            </p>
            {status.version && (
              <p className="mt-1 text-xs text-zinc-500">
                Version: <code className="bg-zinc-900 px-1 rounded">{status.version}</code>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status.installed && (
              <>
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  {collapsed ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                  title="Dismiss this wizard (you can still configure OpenClaw in Settings)"
                >
                  Dismiss
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleRetry}
              disabled={checking}
              className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
            >
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Retry"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Setup Progress</span>
              <span>
                {completedSteps} / {steps.length} steps
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(completedSteps / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`rounded-lg border p-3 ${
                  step.completed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-zinc-700 bg-zinc-800/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-600 text-xs text-zinc-500">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-medium text-white">{step.label}</h4>
                        {!step.required && (
                          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                            Optional
                          </span>
                        )}
                      </div>
                      {step.completed && (
                        <p className="mt-0.5 text-xs text-emerald-400">✓ Completed</p>
                      )}
                    </div>
                    {!step.completed && step.instructions}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Errors */}
          {status.errors.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <h4 className="text-xs font-medium text-red-400 mb-1">Errors</h4>
              <ul className="space-y-0.5 text-xs text-zinc-400">
                {status.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
