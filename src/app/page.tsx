import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPair } from "@/lib/agent-pair-store";
import { LandingPage } from "@/components/landing/LandingPage";

type Props = { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function RootPage(props: Props) {
  const searchParams = await props.searchParams;
  const previewLanding =
    searchParams?.preview === "landing" || searchParams?.preview === "1";

  // During development: show landing every time if env is set (e.g. npm run dev with DEV_ALWAYS_LANDING=true)
  const devAlwaysLanding =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_ALWAYS_LANDING === "true";

  if (previewLanding || devAlwaysLanding) {
    return <LandingPage />;
  }

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
