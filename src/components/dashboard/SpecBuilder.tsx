"use client";

import { useState, useEffect, useCallback } from "react";
import type { TaskSpec, SpecTemplate, SpecTemplateName } from "@/types/task-spec";
import {
  FileText,
  Plus,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  Check,
  X,
} from "lucide-react";

// ─── Spec Builder Panel ──────────────────────────────────

export function SpecBuilder({ pairId }: { pairId: string }) {
  const [specs, setSpecs] = useState<TaskSpec[]>([]);
  const [templates, setTemplates] = useState<SpecTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const fetchSpecs = useCallback(async () => {
    try {
      const [specsRes, templatesRes] = await Promise.all([
        fetch(`/api/task-specs?pairId=${encodeURIComponent(pairId)}`),
        fetch("/api/task-specs?templates=1"),
      ]);
      const specsData = await specsRes.json();
      const templatesData = await templatesRes.json();
      setSpecs(specsData.specs ?? []);
      setTemplates(templatesData.templates ?? []);
    } catch (e) {
      console.error("[SpecBuilder] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => { fetchSpecs(); }, [fetchSpecs]);

  const activateSpec = async (specId: string) => {
    try {
      await fetch("/api/task-specs?action=activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId }),
      });
      fetchSpecs();
    } catch (e) {
      console.error("[SpecBuilder] activate failed:", e);
    }
  };

  const completeSpec = async (specId: string, status: "success" | "cancelled") => {
    try {
      await fetch("/api/task-specs?action=complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId, status, summary: status === "success" ? "Completed by user" : "Cancelled by user" }),
      });
      fetchSpecs();
    } catch (e) {
      console.error("[SpecBuilder] complete failed:", e);
    }
  };

  const active = specs.filter((s) => s.status === "active");
  const drafts = specs.filter((s) => s.status === "draft");
  const completed = specs.filter((s) => ["completed", "expired", "cancelled"].includes(s.status));

  if (loading) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          Task Specs
        </h3>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          New Spec
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateSpecForm
          pairId={pairId}
          templates={templates}
          onCreated={() => { setShowCreate(false); fetchSpecs(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Active specs */}
      {active.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Active</p>
          {active.map((spec) => (
            <SpecCard
              key={spec.id}
              spec={spec}
              expanded={expandedSpec === spec.id}
              onToggle={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}
              onComplete={(status) => completeSpec(spec.id, status)}
            />
          ))}
        </div>
      )}

      {/* Draft specs */}
      {drafts.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Drafts</p>
          {drafts.map((spec) => (
            <SpecCard
              key={spec.id}
              spec={spec}
              expanded={expandedSpec === spec.id}
              onToggle={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}
              onActivate={() => activateSpec(spec.id)}
            />
          ))}
        </div>
      )}

      {/* Completed/expired */}
      {completed.length > 0 && (
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
            History ({completed.length})
          </p>
          {completed.slice(0, 3).map((spec) => (
            <div key={spec.id} className="flex items-center gap-2 text-xs text-zinc-500 py-1">
              {spec.status === "completed" ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <X className="w-3 h-3 text-zinc-500" />
              )}
              <span className="truncate">{spec.objective}</span>
              <span className="text-[10px] text-zinc-600">{spec.status}</span>
            </div>
          ))}
        </div>
      )}

      {specs.length === 0 && !showCreate && (
        <p className="text-xs text-zinc-500">
          No task specs yet. Create one to define exact boundaries for agent tasks.
        </p>
      )}
    </div>
  );
}

// ─── Spec Card ───────────────────────────────────────────

function SpecCard({
  spec,
  expanded,
  onToggle,
  onActivate,
  onComplete,
}: {
  spec: TaskSpec;
  expanded: boolean;
  onToggle: () => void;
  onActivate?: () => void;
  onComplete?: (status: "success" | "cancelled") => void;
}) {
  const isActive = spec.status === "active";
  const expiresAt = spec.timeLimit?.expiresAt;
  const timeRemaining = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
    : null;

  return (
    <div className="rounded border border-zinc-700 p-2 mb-1.5">
      <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        )}
        <span className="text-xs text-zinc-200 flex-1 truncate">{spec.objective}</span>
        {isActive && timeRemaining !== null && (
          <span className="text-[10px] text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeRemaining}m
          </span>
        )}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"
          }`}
        >
          {spec.status}
        </span>
      </div>

      {expanded && (
        <div className="mt-2 pl-5 space-y-2">
          {spec.description && (
            <p className="text-xs text-zinc-400">{spec.description}</p>
          )}

          {/* Constraints */}
          <div>
            <p className="text-[10px] text-zinc-500 uppercase mb-0.5">Constraints</p>
            {spec.constraints.allowedOperations.length > 0 && (
              <p className="text-xs text-zinc-400">
                <span className="text-emerald-400">Allowed:</span>{" "}
                {spec.constraints.allowedOperations.join(", ")}
              </p>
            )}
            {spec.constraints.forbiddenOperations.length > 0 && (
              <p className="text-xs text-zinc-400">
                <span className="text-red-400">Forbidden:</span>{" "}
                {spec.constraints.forbiddenOperations.join(", ")}
              </p>
            )}
            {spec.constraints.customRules.length > 0 && (
              <div className="mt-1">
                {spec.constraints.customRules.map((rule, i) => (
                  <p key={i} className="text-xs text-zinc-500 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-zinc-600" />
                    {rule}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Success criteria */}
          {spec.successCriteria.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase mb-0.5">Success Criteria</p>
              {spec.successCriteria.map((c, i) => (
                <p key={i} className="text-xs text-zinc-400">• {c}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {spec.status === "draft" && onActivate && (
              <button
                type="button"
                onClick={onActivate}
                className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Activate
              </button>
            )}
            {spec.status === "active" && onComplete && (
              <>
                <button
                  type="button"
                  onClick={() => onComplete("success")}
                  className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Complete
                </button>
                <button
                  type="button"
                  onClick={() => onComplete("cancelled")}
                  className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition flex items-center gap-1"
                >
                  <Square className="w-3 h-3" /> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Spec Form ────────────────────────────────────

function CreateSpecForm({
  pairId,
  templates,
  onCreated,
  onCancel,
}: {
  pairId: string;
  templates: SpecTemplate[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [template, setTemplate] = useState<SpecTemplateName>("custom");
  const [objective, setObjective] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [customRules, setCustomRules] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedTemplate = templates.find((t) => t.name === template);

  const handleSubmit = async () => {
    if (!objective.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/task-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId,
          objective: objective.trim(),
          description: description.trim() || undefined,
          template,
          timeLimitMinutes,
          customRules: customRules.trim()
            ? customRules.split("\n").map((r) => r.trim()).filter(Boolean)
            : undefined,
        }),
      });
      onCreated();
    } catch (e) {
      console.error("[CreateSpecForm] submit failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded border border-violet-500/20 bg-violet-500/5 p-3 mb-3 space-y-3">
      {/* Template picker */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Template</label>
        <div className="flex flex-wrap gap-1">
          {templates.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                setTemplate(t.name);
                setTimeLimitMinutes(t.suggestedTimeLimitMinutes);
              }}
              className={`text-xs px-2 py-1 rounded border transition ${
                template === t.name
                  ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {selectedTemplate && (
          <p className="text-xs text-zinc-500 mt-1">{selectedTemplate.description}</p>
        )}
      </div>

      {/* Objective */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">
          Objective <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="What should the agent do?"
          className="w-full text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional context (optional)"
          className="w-full text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Time limit */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">
          Time Limit (minutes)
        </label>
        <input
          type="number"
          value={timeLimitMinutes}
          onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value, 10) || 60)}
          min={5}
          max={1440}
          className="w-24 text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Custom rules */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">
          Custom Rules (one per line)
        </label>
        <textarea
          value={customRules}
          onChange={(e) => setCustomRules(e.target.value)}
          rows={3}
          placeholder="e.g. Do not post to social media&#10;Only read from RSS feeds"
          className="w-full text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!objective.trim() || submitting}
          className="text-xs px-3 py-1.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Spec"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
