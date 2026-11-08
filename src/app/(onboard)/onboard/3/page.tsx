import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { PowerAgentStep } from "@/components/onboard/PowerAgentStep";

export default function OnboardStep3Page() {
  return (
    <OnboardLayout step={3} totalSteps={6}>
      <PowerAgentStep />
    </OnboardLayout>
  );
}
