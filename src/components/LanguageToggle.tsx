"use client";

import { useLanguage, type Language } from "@/i18n";
import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";

interface LanguageToggleProps {
  className?: string;
  variant?: "default" | "minimal" | "landing";
}

export function LanguageToggle({ className, variant = "default" }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  if (variant === "landing") {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          "flex items-center gap-1.5 text-xs font-light tracking-[0.2em] text-white/75 transition hover:text-white",
          className
        )}
        aria-label={`Switch to ${language === "en" ? "French" : "English"}`}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{language === "en" ? "FR" : "EN"}</span>
      </button>
    );
  }

  if (variant === "minimal") {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          "flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors",
          className
        )}
        aria-label={`Switch to ${language === "en" ? "French" : "English"}`}
      >
        <span className={language === "en" ? "text-white" : "text-white/40"}>EN</span>
        <span className="text-white/30">/</span>
        <span className={language === "fr" ? "text-white" : "text-white/40"}>FR</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors",
        className
      )}
      aria-label={`Switch to ${language === "en" ? "French" : "English"}`}
    >
      <Globe className="h-4 w-4" />
      <span>{language === "en" ? "EN" : "FR"}</span>
    </button>
  );
}
