"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectForm } from "@/components/ContextHub/ProjectForm";

export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Parameters<Parameters<typeof ProjectForm>[0]["onSubmit"]>[0]) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create project");
      router.push(`/projects/${json.project.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Context Hub
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-white">New project</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Define a problem space and link repos, feeds, agents.
      </p>

      <div className="mt-8">
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/")}
          submitting={submitting}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      )}
    </main>
  );
}
