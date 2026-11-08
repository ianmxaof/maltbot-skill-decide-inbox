import { OnboardLayout } from "@/components/onboard/OnboardLayout";
import { ImportProjectStep } from "@/components/onboard/ImportProjectStep";

export default function OnboardStep2Page() {
  return (
    <OnboardLayout step={2} totalSteps={6}>
      <ImportProjectStep />
    </OnboardLayout>
  );
}
