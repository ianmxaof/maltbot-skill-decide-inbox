import { DashboardTabs } from "@/components/DashboardTabs";
import { DashboardHeaderAuth } from "@/components/DashboardHeaderAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">THE NIGHTLY BUILD</h1>
            <p className="text-xs text-zinc-500">
              Agent-human pairs · Ship while you sleep
            </p>
          </div>
          <DashboardHeaderAuth />
        </div>
        <DashboardTabs />
      </header>
      <div className="pb-20 sm:pb-0">
        {children}
      </div>
    </div>
  );
}
