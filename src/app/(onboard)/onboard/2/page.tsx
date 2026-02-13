import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { AgentConfigStep } from "@/components/onboard/AgentConfigStep";

export default function OnboardStep2Page() {
  return (
    <OnboardLayout step={2} totalSteps={4}>
      <AgentConfigStep />
    </OnboardLayout>
  );
}
