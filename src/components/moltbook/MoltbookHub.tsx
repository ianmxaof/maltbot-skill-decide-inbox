"use client";

import { useState } from "react";
import { Globe, Zap, Shield, Users } from "lucide-react";
import { useMoltbookData } from "@/hooks/useMoltbookData";
import { AgentStatusBar } from "./widgets/AgentStatusBar";
import { AgentRosterPanel } from "./AgentRosterPanel";
import { OverviewPanel } from "./panels/OverviewPanel";
import { SignalsPanel } from "./panels/SignalsPanel";
import { SecurityPanel } from "./panels/SecurityPanel";
import { NetworkPanel } from "./panels/NetworkPanel";

const SUB_TABS = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "signals", label: "Intelligence", icon: Zap },
  { id: "security", label: "Social Security", icon: Shield },
  { id: "network", label: "Network", icon: Users },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function MoltbookHub() {
  const [activeTab, setActiveTab] = useState<SubTabId>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { roster, agent, signals, exposure, anomalies, socialPendingCount, isConfigured, refetch } = useMoltbookData(selectedAgentId);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex gap-6 mb-6">
        {/* Agent Status Bar */}
        <div className="flex-1">
          <AgentStatusBar agent={agent} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        </div>
        {/* Agent Roster */}
        <div className="w-64 shrink-0">
          <AgentRosterPanel selectedId={selectedAgentId} onSelect={setSelectedAgentId} />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm transition-all ${
              activeTab === tab.id
                ? "bg-zinc-800/80 text-white border-t border-x border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <OverviewPanel
          agent={agent}
          signals={signals}
          anomalies={anomalies}
          socialPendingCount={socialPendingCount}
          isConfigured={isConfigured}
          roster={roster}
        />
      )}
      {activeTab === "signals" && <SignalsPanel signals={signals} />}
      {activeTab === "security" && <SecurityPanel exposure={exposure} anomalies={anomalies} />}
      {activeTab === "network" && <NetworkPanel agent={agent} />}
    </div>
  );
}
