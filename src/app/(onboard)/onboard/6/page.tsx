import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { PublicProfileStep } from "@/components/onboard/PublicProfileStep";

export default function OnboardStep6Page() {
  return (
    <OnboardLayout step={6} totalSteps={6}>
      <PublicProfileStep />
    </OnboardLayout>
  );
}
