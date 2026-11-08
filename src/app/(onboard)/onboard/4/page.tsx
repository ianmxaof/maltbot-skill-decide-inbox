import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { AgentConfigStep } from "@/components/onboard/AgentConfigStep";

export default function OnboardStep4Page() {
  return (
    <OnboardLayout step={4} totalSteps={6}>
      <AgentConfigStep />
    </OnboardLayout>
  );
}
