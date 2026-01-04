"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function AICardGenerationDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Source text */}
      <div
        className={`rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-8 transition-all duration-500 ${
          step >= 1 ? "opacity-50 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Photosynthesis is the process by which plants convert light energy
            into chemical energy.
          </p>
          <p>
            It occurs in the chloroplasts and involves the absorption of light
            by chlorophyll. The overall equation is: 6CO₂ + 6H₂O + light →
            C₆H₁₂O₆ + 6O₂.
          </p>
        </div>
      </div>

      {/* AI processing indicator */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
          step === 1
            ? "opacity-100 scale-100"
            : "opacity-0 scale-50 pointer-events-none"
        }`}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-2xl animate-pulse-glow">
          <Sparkles className="h-12 w-12 text-white animate-spin" />
        </div>
      </div>

      {/* Generated cards */}
      <div
        className={`mt-8 grid gap-4 transition-all duration-700 ${
          step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Card 1 */}
        <div
          className={`rounded-xl border bg-card p-6 shadow-lg transition-all duration-500 hover:shadow-xl ${
            step >= 2 ? "animate-fade-in-up" : ""
          }`}
          style={{ animationDelay: "0ms" }}
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Front
          </div>
          <p className="text-sm font-medium">What is photosynthesis?</p>
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Back
            </div>
            <p className="text-sm text-muted-foreground">
              The process by which plants convert light energy into chemical
              energy, occurring in chloroplasts through chlorophyll absorption.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div
          className={`rounded-xl border bg-card p-6 shadow-lg transition-all duration-500 hover:shadow-xl ${
            step >= 3 ? "animate-fade-in-up" : ""
          }`}
          style={{ animationDelay: "200ms" }}
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Front
          </div>
          <p className="text-sm font-medium">
            What is the chemical equation for photosynthesis?
          </p>
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Back
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂
            </p>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div
        className={`absolute -right-4 -top-4 rounded-full bg-gradient-to-r from-accent to-primary px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all duration-500 ${
          step >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
      >
        ✨ AI Generated
      </div>
    </div>
  );
}
