import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { PhilosophyStep } from "@/components/onboard/PhilosophyStep";

export default function OnboardStep3Page() {
  return (
    <OnboardLayout step={3} totalSteps={4}>
      <PhilosophyStep />
    </OnboardLayout>
  );
}
