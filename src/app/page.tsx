import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import {
  Brain,
  BookOpen,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { AICardGenerationDemo } from "@/components/AICardGenerationDemo";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-32">
        {/* Gradient orbs */}
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-40 top-60 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-primary/10 px-4 py-2 text-sm font-medium text-primary animate-fade-in-up">
                <Sparkles className="h-4 w-4" />
                AI-Powered Learning
              </div>

              <h1 className="mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl lg:text-7xl animate-fade-in-up">
                Master anything,
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  remember everything
                </span>
              </h1>

              <p className="mb-8 text-lg text-muted-foreground sm:text-xl lg:text-2xl animate-fade-in-up leading-relaxed">
                {APP_TAGLINE}. Powered by AI and backed by science.
              </p>

              <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start animate-fade-in-up">
                {user ? (
                  <Link href="/decks">
                    <Button size="lg" className="group w-full gap-2 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/40 sm:w-auto">
                      Go to My Decks
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button size="lg" className="group w-full gap-2 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/40 sm:w-auto">
                        Start Learning Free
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                    <Link href="#features">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full border-2 transition-all hover:border-primary/50 hover:bg-primary/5 sm:w-auto"
                      >
                        See how it works
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground lg:justify-start">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>AI-powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Science-backed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Anki compatible</span>
                </div>
              </div>
            </div>

            {/* Right: AI Animation */}
            <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <AICardGenerationDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border/50 bg-gradient-to-b from-background to-muted/30 px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              Everything you need to excel
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Combine proven learning science with cutting-edge AI to
              supercharge your memory
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-2xl border-2 bg-card p-8 shadow-lg transition-all hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">
                Spaced Repetition
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Study smarter with our scientifically-proven algorithm. See
                cards exactly when you need to, maximizing retention with
                minimal effort.
              </p>
              <div className="absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-2xl border-2 bg-card p-8 shadow-lg transition-all hover:shadow-2xl hover:border-accent/50 hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg shadow-accent/25">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">AI-Powered Import</h3>
              <p className="text-muted-foreground leading-relaxed">
                Turn any content into flashcards instantly. Upload PDFs, images,
                or text and let AI generate high-quality cards in seconds.
              </p>
              <div className="absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-accent/5 blur-2xl transition-all group-hover:bg-accent/10" />
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-2xl border-2 bg-card p-8 shadow-lg transition-all hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-accent to-primary shadow-lg shadow-primary/25">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">Beautiful & Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Modern interface that stays out of your way. Smooth animations,
                keyboard shortcuts, and offline support for learning anywhere.
              </p>
              <div className="absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              Simple, yet powerful
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Get started in minutes and master any subject
            </p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="group flex flex-col items-start gap-8 sm:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-2xl font-bold text-white shadow-lg shadow-primary/25 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/40">
                1
              </div>
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-bold">
                    Create or Import Decks
                  </h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Start by creating a new deck or importing content from PDFs,
                  images, or Anki files. Add flashcards manually or let AI
                  generate them for you in seconds.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group flex flex-col items-start gap-8 sm:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 text-2xl font-bold text-white shadow-lg shadow-accent/25 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-accent/40">
                2
              </div>
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <Brain className="h-6 w-6 text-accent" />
                  <h3 className="text-2xl font-bold">Study Daily</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Review cards as they come due. Our spaced repetition algorithm
                  adapts to your performance, scheduling reviews at exactly the
                  right time for maximum retention.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group flex flex-col items-start gap-8 sm:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-primary text-2xl font-bold text-white shadow-lg shadow-primary/25 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/40">
                3
              </div>
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-bold">Track & Improve</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Monitor your learning journey with beautiful analytics. See
                  your streak, cards mastered, and review history. Stay
                  motivated and watch your knowledge grow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden border-y border-border/50 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 px-4 py-20">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ready to transform your learning?
          </h2>
          <p className="mb-10 text-xl text-muted-foreground">
            Join thousands of learners mastering new skills with Synapse
          </p>
          <Link href="/login">
            <Button size="lg" className="group gap-2 px-8 py-6 text-lg shadow-2xl shadow-primary/30 transition-all hover:shadow-3xl hover:shadow-primary/50">
              Start Learning Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {APP_NAME} - Powered by AI, backed by science
          </p>
          <p className="mt-2 text-xs text-muted-foreground/75">
            Built for learners who want to remember everything
          </p>
        </div>
      </footer>
    </div>
  );
}

