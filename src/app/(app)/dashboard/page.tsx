"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/shell/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listDecks,
  getDueCount,
  getCardsStudiedToday,
  getCurrentStreak,
  getTotalReviews,
} from "@/store/decks";
import {
  useReviewsByDay,
  useHeatmapData,
  useCardStateBreakdown,
  useCardDistribution,
} from "@/lib/stats";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  LineChart,
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
import {
  Brain,
  Flame,
  Target,
  BarChart3,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const [deckCount, setDeckCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [studiedToday, setStudiedToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  // Live queries for charts
  const reviewsByDay = useReviewsByDay(30);
  const heatmapData = useHeatmapData(90);
  const cardBreakdown = useCardStateBreakdown();
  const cardDistribution = useCardDistribution();

  useEffect(() => {
    async function loadStats() {
      try {
        const decks = await listDecks();

        // Calculate total due count: sum of all decks
        // Note: parent_deck_id column doesn't exist yet, so no filtering needed
        let totalDue = 0;
        for (const deck of decks) {
          totalDue += await getDueCount(deck.id);
        }

        const [studied, currentStreak, total] = await Promise.all([
          getCardsStudiedToday(),
          getCurrentStreak(),
          getTotalReviews(),
        ]);

        setDeckCount(decks.length);
        // Card count will be set from cardDistribution hook
        setDueCount(totalDue);
        setStudiedToday(studied);
        setStreak(currentStreak);
        setTotalReviews(total);
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Update due count and card count when card distribution changes
  useEffect(() => {
    if (cardBreakdown) {
      setDueCount(
        cardBreakdown.new + cardBreakdown.learning + cardBreakdown.review
      );
    }
  }, [cardBreakdown]);

  // Update total card count from card distribution
  useEffect(() => {
    if (cardDistribution) {
      setCardCount(
        cardDistribution.new + cardDistribution.learning + cardDistribution.learned
      );
    }
  }, [cardDistribution]);

  // Format date for chart
  const formatChartDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  };

  // Prepare pie chart data based on card distribution (reps + state)
  const pieData = cardDistribution
    ? [
        { name: "Nouvelles", value: cardDistribution.new, color: "#3b82f6" },
        {
          name: "En apprentissage",
          value: cardDistribution.learning,
          color: "#f97316",
        },
        { name: "Apprises", value: cardDistribution.learned, color: "#22c55e" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <>
      <Topbar title="Statistiques" />
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-background to-muted/20">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Welcome header */}
          <div className="animate-fade-in-up">
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
              Bienvenue sur votre tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Suivez vos progrès et continuez votre parcours d'apprentissage
            </p>
          </div>

          {/* Top KPI row */}
          <div className="grid gap-6 md:grid-cols-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            {/* Due Cards */}
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    À réviser aujourd&apos;hui
                  </CardTitle>
                  <div className="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-2.5 shadow-lg shadow-primary/25">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-4xl font-extrabold text-muted-foreground/50">...</p>
                ) : (
                  <p className="text-4xl font-extrabold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {dueCount}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Studied Today */}
            <Card className="group relative overflow-hidden border-2 hover:border-accent/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Étudiées aujourd&apos;hui
                  </CardTitle>
                  <div className="rounded-lg bg-gradient-to-br from-accent to-accent/80 p-2.5 shadow-lg shadow-accent/25">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-4xl font-extrabold text-muted-foreground/50">...</p>
                ) : (
                  <p className="text-4xl font-extrabold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                    {studiedToday}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Streak */}
            <Card className="group relative overflow-hidden border-2 hover:border-orange-500/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Série actuelle
                  </CardTitle>
                  <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 shadow-lg shadow-orange-500/25">
                    <Flame className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-4xl font-extrabold text-muted-foreground/50">...</p>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                      {streak}
                    </p>
                    <p className="text-lg font-semibold text-muted-foreground">
                      jour{streak !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main charts: two columns */}
          <div className="grid gap-6 md:grid-cols-2 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            {/* Heatmap */}
            <Card className="border-2 hover:border-primary/30 transition-all">
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

            {/* Line chart */}
            <Card className="border-2 hover:border-accent/30 transition-all">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 p-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </div>
                  <CardTitle className="text-lg font-bold">Révisions par jour (30 derniers jours)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {reviewsByDay !== undefined ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={reviewsByDay}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatChartDate}
                        className="text-xs"
                        stroke="currentColor"
                        opacity={0.6}
                      />
                      <YAxis className="text-xs" stroke="currentColor" opacity={0.6} />
                      <RechartsTooltip
                        labelFormatter={(label) => formatChartDate(label)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "2px solid hsl(var(--border))",
                          borderRadius: "1rem",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                        activeDot={{ r: 6 }}
                        fill="url(#colorCount)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                    <div className="animate-pulse">Chargement...</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom: Breakdown + Total reviews */}
          <div className="grid gap-6 md:grid-cols-2 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            {/* Card breakdown */}
            <Card className="border-2 hover:border-primary/30 transition-all">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 p-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold">Répartition des cartes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-2 py-4">
                {cardDistribution !== undefined ? (
                  pieData.length > 0 ? (
                    <div className="w-full h-[280px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  fill="white"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  className="text-sm font-bold drop-shadow"
                                >
                                  {`${(percent * 100).toFixed(0)}%`}
                                </text>
                              );
                            }}
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
                            height={36}
                            wrapperStyle={{
                              paddingTop: "10px",
                              fontSize: "14px",
                              fontWeight: "600"
                            }}
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

            {/* Secondary KPIs */}
            <Card className="border-2 hover:border-accent/30 transition-all">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 p-2">
                    <BarChart3 className="h-4 w-4 text-accent" />
                  </div>
                  <CardTitle className="text-lg font-bold">Statistiques globales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="group cursor-default rounded-xl border-2 border-transparent p-4 transition-all hover:border-primary/20 hover:bg-primary/5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decks</p>
                  <p className="text-3xl font-extrabold text-primary">{deckCount}</p>
                </div>
                <div className="group cursor-default rounded-xl border-2 border-transparent p-4 transition-all hover:border-accent/20 hover:bg-accent/5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cartes totales</p>
                  <p className="text-3xl font-extrabold text-accent">{cardCount}</p>
                </div>
                <div className="group cursor-default rounded-xl border-2 border-transparent p-4 transition-all hover:border-green-500/20 hover:bg-green-500/5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Révisions totales</p>
                  <p className="text-3xl font-extrabold text-green-600">{totalReviews}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
