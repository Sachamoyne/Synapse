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

        <section className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-10">
          <h1 className={`${playfair.className} text-4xl text-white/90 sm:text-5xl`}>
            {t("pricing.title")}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/60">
            {t("pricing.subtitle")}
          </p>

          <div className="mt-12 grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Free Plan */}
            <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                {t("pricing.free")}
              </p>
              <p className="mt-3 text-3xl text-white/90">
                {t("pricing.freePrice")}
              </p>
              <p className="mt-2 text-sm text-white/60">
                {t("pricing.freeDesc")}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/60">
                <li>{t("pricing.freeFeature1")}</li>
                <li>{t("pricing.freeFeature2")}</li>
                <li>{t("pricing.freeFeature3")}</li>
              </ul>
              <Link
                href="/login"
                className="mt-6 block rounded-full border border-white/20 bg-transparent px-4 py-2 text-center text-sm text-white/70 transition hover:bg-white/5"
              >
                {t("pricing.getStarted")}
              </Link>
            </div>

            {/* Starter Plan */}
            <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                {t("pricing.starter")}
              </p>
              <p className="mt-3 text-3xl text-white/90">
                {t("pricing.starterPrice")}
                <span className="text-lg text-white/50">{t("pricing.perMonth")}</span>
              </p>
              <p className="mt-2 text-sm text-white/60">
                {t("pricing.starterDesc")}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/60">
                <li>{t("pricing.starterFeature1")}</li>
                <li>{t("pricing.starterFeature2")}</li>
                <li>{t("pricing.starterFeature3")}</li>
              </ul>
              <button
                disabled
                className="mt-6 cursor-not-allowed rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white/50 opacity-60"
              >
                {t("pricing.subscribe")}
              </button>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="relative flex flex-col rounded-3xl border border-white/20 bg-white/10 p-6 text-left text-white/85 shadow-lg shadow-black/20">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900">
                {t("pricing.popular")}
              </span>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                {t("pricing.pro")}
              </p>
              <p className="mt-3 text-3xl text-white/95">
                {t("pricing.proPrice")}
                <span className="text-lg text-white/50">{t("pricing.perMonth")}</span>
              </p>
              <p className="mt-2 text-sm text-white/70">
                {t("pricing.proDesc")}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/70">
                <li>{t("pricing.proFeature1")}</li>
                <li>{t("pricing.proFeature2")}</li>
                <li>{t("pricing.proFeature3")}</li>
              </ul>
              <button
                disabled
                className="mt-6 cursor-not-allowed rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-900 opacity-60"
              >
                {t("pricing.subscribe")}
              </button>
            </div>

            {/* Organization Plan */}
            <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                {t("pricing.organization")}
              </p>
              <p className="mt-3 text-3xl text-white/90">{t("pricing.custom")}</p>
              <p className="mt-2 text-sm text-white/60">
                {t("pricing.orgDesc")}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/60">
                <li>{t("pricing.orgFeature1")}</li>
                <li>{t("pricing.orgFeature2")}</li>
                <li>{t("pricing.orgFeature3")}</li>
              </ul>
              <a
                href="mailto:contact@soma.app"
                className="mt-6 block rounded-full border border-white/20 bg-transparent px-4 py-2 text-center text-sm text-white/70 transition hover:bg-white/5"
              >
                {t("pricing.contactUs")}
              </a>
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/10 bg-slate-950/90">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
              <div className="text-xs text-white/60">
                © {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
                <Link
                  href="/confidentialite"
                  className="transition hover:text-white/80"
                >
                  Politique de Confidentialité
                </Link>
                <Link
                  href="/cgu-cgv"
                  className="transition hover:text-white/80"
                >
                  CGU / CGV
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
