import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPair } from "@/lib/agent-pair-store";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function RootPage() {
  const pair = await getPair();
  if (pair) {
    redirect("/home");
  }
  // Signed-in users with no pair → onboarding (context step, GitHub, etc.)
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/onboard/1");
  }
  return <LandingPage />;
}
