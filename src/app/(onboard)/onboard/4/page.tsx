import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { PublicProfileStep } from "@/components/onboard/PublicProfileStep";

export default function OnboardStep4Page() {
  return (
    <OnboardLayout step={4} totalSteps={4}>
      <PublicProfileStep />
    </OnboardLayout>
  );
}
