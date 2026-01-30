import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Context Hub — Maltbot UI",
  description: "Project-centric lab. Here's my problem space.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
