"use client";

import { OpenClawStatusBlock } from "@/components/OpenClawStatusBlock";
import { SecurityAgentRoster } from "@/components/SecurityAgentRoster";
import SecurityDashboard from "@/components/security/SecurityDashboard";
import GovernanceFingerprintBlock from "@/components/security/GovernanceFingerprintBlock";

export default function SecurityPosturePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Security
        </h2>
        <p className="mt-1 text-zinc-400">
          Security layer (vault, sanitizer, anomaly detection, approvals, audit) and infrastructure posture.
        </p>
      </section>

      <div className="space-y-8">
        <SecurityDashboard />

        <GovernanceFingerprintBlock />

        <section>
          <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-4">
            Infrastructure & Posture
          </h3>
          <div className="space-y-6">
            <OpenClawStatusBlock />
            <SecurityAgentRoster />
          </div>
        </section>
      </div>
    </main>
  );
}
