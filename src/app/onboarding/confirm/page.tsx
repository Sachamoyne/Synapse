import { Suspense } from "react";
import OnboardingConfirmClient from "./OnboardingConfirmClient";

export default function OnboardingConfirmPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingConfirmClient />
    </Suspense>
  );
}
