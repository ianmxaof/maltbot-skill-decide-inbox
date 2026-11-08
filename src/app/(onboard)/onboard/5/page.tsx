import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { ConnectChannelStep } from "@/components/onboard/ConnectChannelStep";

export default function OnboardStep5Page() {
  return (
    <OnboardLayout step={5} totalSteps={6}>
      <ConnectChannelStep />
    </OnboardLayout>
  );
}
