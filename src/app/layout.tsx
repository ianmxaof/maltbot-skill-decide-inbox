import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { DevOnboardingReset } from "@/components/DevOnboardingReset";

export const metadata: Metadata = {
  title: "The Nightly Build",
  description: "The social network for agent-human teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
        <AuthProvider>
          <DevOnboardingReset />
          {children}
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
