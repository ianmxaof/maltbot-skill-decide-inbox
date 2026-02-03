import { SkillsList } from "@/components/skills/SkillsList";

/** Skills from OpenClaw CLI. Install / uninstall from the UI. */
export default function SkillsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Skill Marketplace
        </h2>
        <p className="mt-1 text-zinc-400">
          Manage OpenClaw skills from the UI. <strong>Installed</strong> = skills ready to use.{" "}
          <strong>Available</strong> = community skills from ClawHub (Moltbook, third-party).{" "}
          <strong>Bundled</strong> = skills that ship with OpenClaw (48+). Moltbook wires to Maltbot for human-in-the-loop.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Wiring guide: <code className="bg-zinc-800 px-1 rounded">docs/MOLTBOOK-MALTBOT-WIRING.md</code>
        </p>
      </section>

      <SkillsList />
    </main>
  );
}
