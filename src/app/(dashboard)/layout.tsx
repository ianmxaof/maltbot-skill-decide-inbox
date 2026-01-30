import { DashboardTabs } from "@/components/DashboardTabs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-white">Maltbot</h1>
          <p className="text-xs text-zinc-500">
            Continuously running R&D · human decision choke-point
          </p>
        </div>
        <DashboardTabs />
      </header>
      {children}
    </div>
  );
}
