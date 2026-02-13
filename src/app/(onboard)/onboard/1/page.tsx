import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { ContextStep } from "@/components/onboard/ContextStep";

export default function OnboardStep1Page() {
  return (
    <OnboardLayout step={1} totalSteps={4}>
      <ContextStep />
    </OnboardLayout>
  );
}
