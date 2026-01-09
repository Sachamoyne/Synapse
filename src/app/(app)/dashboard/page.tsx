"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/shell/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllCards, getCurrentStreak } from "@/store/decks";
import {
  getReviewStatsBetween,
  useReviewsByDay,
  useHeatmapData,
  useCardDistribution,
} from "@/lib/stats";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Flame, BarChart3, Sparkles, Target, TrendingUp } from "lucide-react";

type ReviewStats = Awaited<ReturnType<typeof getReviewStatsBetween>>;

const DAY_MS = 24 * 60 * 60 * 1000;

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 min";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
}

function AdvancedStatsSection({
  masteredPct,
  overallTotals,
}: {
  masteredPct: number;
  overallTotals: { total: number; mastered: number };
}) {
  const reviewsByDay = useReviewsByDay(30);
  const heatmapData = useHeatmapData(90);
  const cardDistribution = useCardDistribution();

  const formatChartDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  };

  const pieData = cardDistribution
    ? [
        { name: "Nouvelles", value: cardDistribution.new, color: "#3b82f6" },
        { name: "En apprentissage", value: cardDistribution.learning, color: "#f97316" },
        { name: "Apprises", value: cardDistribution.learned, color: "#22c55e" },
      ].filter((d) => d.value > 0)
    : [];

  const totalCards = pieData.reduce((sum, item) => sum + item.value, 0);

  const formatLegend = (value: string, entry: any) => {
    const cardValue = entry?.payload?.value ?? 0;
    const percentage = totalCards > 0 && cardValue > 0
      ? ((cardValue / totalCards) * 100).toFixed(1)
      : "0.0";
    const plural = cardValue > 1 ? "s" : "";
    return `${value} : ${cardValue} carte${plural} (${percentage}%)`;
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 p-2">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <CardTitle className="text-lg font-bold">Révisions par jour (30 jours)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {reviewsByDay !== undefined ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={reviewsByDay}>
                <defs>
                  <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8fafc" stopOpacity={0.95} />
                    <stop offset="60%" stopColor="#93c5fd" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.25} />
                    <stop offset="60%" stopColor="#1e3a8a" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <filter id="lineShadow" x="-10%" y="-10%" width="120%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.6" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="4 10" className="stroke-white/5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  className="text-xs"
                  stroke="currentColor"
                  opacity={0.4}
                />
                <YAxis className="text-xs" stroke="currentColor" opacity={0.35} />
                <RechartsTooltip
                  labelFormatter={(label) => formatChartDate(label)}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "0.9rem",
                    boxShadow: "0 14px 30px -12px rgba(0, 0, 0, 0.6)",
                    color: "#e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineGlow)"
                  strokeWidth={4}
                  filter="url(#lineShadow)"
                  dot={{ r: 4, fill: "#e2e8f0", strokeWidth: 2, stroke: "rgba(148, 163, 184, 0.6)" }}
                  activeDot={{ r: 7, fill: "#f8fafc", strokeWidth: 3, stroke: "#93c5fd" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="none"
                  fill="url(#areaGlow)"
                  fillOpacity={1}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              <div className="animate-pulse">Chargement...</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-base font-bold">Progression globale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Cartes maîtrisées</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-primary">{formatPercent(masteredPct)}</p>
                <p className="text-xs text-muted-foreground">{overallTotals.mastered} / {overallTotals.total}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Cartes apprises</p>
              <p className="text-2xl font-bold text-primary">{overallTotals.mastered}</p>
              <p className="text-xs text-muted-foreground">Total à ce jour</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 p-2">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">Activité (90 derniers jours)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            {heatmapData !== undefined ? (
              <ActivityHeatmap data={heatmapData} days={90} />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                <div className="animate-pulse">Chargement...</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 p-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">Répartition des cartes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-2 py-4">
            {cardDistribution !== undefined ? (
              pieData.length > 0 ? (
                <div className="w-full h-[260px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        height={60}
                        wrapperStyle={{
                          paddingTop: "20px",
                          fontSize: "14px",
                          fontWeight: "600",
                        }}
                        formatter={formatLegend}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="animate-pulse">Aucune carte</div>
                </div>
              )
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                <div className="animate-pulse">Chargement...</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [streak, setStreak] = useState(0);
  const [todayStats, setTodayStats] = useState<ReviewStats | null>(null);
  const [overallTotals, setOverallTotals] = useState({ total: 0, mastered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        const now = new Date();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [
          today,
          streakValue,
          allCards,
        ] = await Promise.all([
          getReviewStatsBetween(todayStart.toISOString(), now.toISOString()),
          getCurrentStreak(),
          listAllCards(),
        ]);

        if (!mounted) return;

        setTodayStats(today);
        setStreak(streakValue);

        const activeCards = allCards.filter((card) => !card.suspended);
        const totalCards = activeCards.length;
        const mastered = activeCards.filter((card) => card.state === "review").length;
        setOverallTotals({ total: totalCards, mastered });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const studiedToday = todayStats?.totalReviews ?? 0;
  const timeToday = todayStats?.totalMinutes ?? 0;

  const masteredPct = overallTotals.total > 0 ? overallTotals.mastered / overallTotals.total : 0;

  return (
    <>
      <Topbar title="Statistiques" />
      <div className="flex-1 overflow-y-auto p-10 bg-gradient-to-b from-background to-muted/25">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Votre progression</h1>
              <p className="text-muted-foreground">Un aperçu rapide de votre activité.</p>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg font-bold">Résumé du jour</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cartes revues</p>
                  <p className="text-3xl font-extrabold text-primary">{loading ? "…" : studiedToday}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Temps étudié</p>
                  <p className="text-3xl font-extrabold text-primary">{loading ? "…" : formatMinutes(timeToday)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Série</p>
                    <Flame className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-orange-500">{loading ? "…" : streak}</p>
                  <p className="text-xs text-muted-foreground">jours consécutifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <AdvancedStatsSection
            masteredPct={masteredPct}
            overallTotals={overallTotals}
          />
        </div>
      </div>
    </>
  );
}
