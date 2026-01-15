"use client";

import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import { useTranslation } from "@/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/60 to-slate-950/90" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex w-full items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-md">
            <Link
              className="text-xs font-semibold tracking-[0.35em] text-white/85"
              href="/"
            >
              {APP_NAME}
            </Link>
            <nav className="hidden items-center gap-8 text-xs font-light tracking-[0.2em] text-white/75 sm:flex">
              <Link className="transition hover:text-white" href="/pricing">
                {t("nav.pricing")}
              </Link>
              <Link className="transition hover:text-white" href="/#about">
                {t("nav.about")}
              </Link>
              <Link className="transition hover:text-white" href="/login">
                {t("nav.login")}
              </Link>
              <LanguageToggle variant="landing" />
            </nav>
          </div>
        </header>

        <section className="relative z-10 mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-10">
          <h1 className={`${playfair.className} text-4xl text-white/90 sm:text-5xl`}>
            {t("pricing.title")}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/60">
            {t("pricing.subtitle")}
          </p>

          <div className="mt-12 grid w-full gap-6 sm:grid-cols-3">
            {/* Free Plan */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t("pricing.free")}</p>
              <p className="mt-3 text-3xl text-white/90">{t("pricing.freePrice")} €</p>
              <p className="mt-2 text-sm text-white/60">{t("pricing.freeDesc")}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                <li>✓ {t("pricing.freeFeature1")}</li>
                <li>✓ {t("pricing.freeFeature2")}</li>
                <li>✓ {t("pricing.freeFeature3")}</li>
                <li>✗ {t("pricing.freeFeature4")}</li>
              </ul>
            </div>

            {/* Starter Plan */}
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-left text-white/85 shadow-lg shadow-black/20">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("pricing.starter")}</p>
              <p className="mt-3 text-3xl text-white/95">{t("pricing.starterPrice")} €<span className="text-sm text-white/60">/mois</span></p>
              <p className="mt-2 text-sm text-white/70">{t("pricing.starterDesc")}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>✓ {t("pricing.starterFeature1")}</li>
                <li>✓ {t("pricing.starterFeature2")}</li>
                <li>✓ {t("pricing.starterFeature3")}</li>
                <li>✓ {t("pricing.starterFeature4")}</li>
              </ul>
              <a
                href="/api/checkout?plan=starter"
                className="mt-6 inline-block w-full rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-white/90"
              >
                {t("pricing.getStarted")}
              </a>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-left text-white/85 shadow-lg shadow-black/20">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("pricing.pro")}</p>
              <p className="mt-3 text-3xl text-white/95">{t("pricing.proPrice")} €<span className="text-sm text-white/60">/mois</span></p>
              <p className="mt-2 text-sm text-white/70">{t("pricing.proDesc")}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>✓ {t("pricing.proFeature1")}</li>
                <li>✓ {t("pricing.proFeature2")}</li>
                <li>✓ {t("pricing.proFeature3")}</li>
                <li>✓ {t("pricing.proFeature4")}</li>
              </ul>
              <a
                href="/api/checkout?plan=pro"
                className="mt-6 inline-block w-full rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-white/90"
              >
                {t("pricing.getStarted")}
              </a>
            </div>
          </div>

          {/* Organization Plan */}
          <div className="mt-8 w-full rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/70">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t("pricing.organization")}</p>
                <p className="mt-3 text-2xl text-white/90">{t("pricing.contactUs")}</p>
                <p className="mt-2 text-sm text-white/60">{t("pricing.orgDesc")}</p>
                <ul className="mt-4 space-y-2 text-sm text-white/60">
                  <li>✓ {t("pricing.orgFeature1")}</li>
                  <li>✓ {t("pricing.orgFeature2")}</li>
                  <li>✓ {t("pricing.orgFeature3")}</li>
                </ul>
              </div>
              <a
                href="mailto:contact@soma.app"
                className="ml-6 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                {t("pricing.contactUs")}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
