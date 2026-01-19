import { Suspense } from "react";
import OnboardingSuccessClient from "./OnboardingSuccessClient";

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingSuccessClient />
    </Suspense>
  );
}
