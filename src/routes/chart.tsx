import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, Trophy, Medal, Radio } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Chart des auditeurs — Indi Radio" },
      { name: "description", content: "Les titres les plus likés de la semaine et de tous les temps sur Indi Radio." },
      { property: "og:title", content: "Chart des auditeurs — Indi Radio" },
      { property: "og:description", content: "Top 10 des titres likés par les auditeurs d'Indi Radio." },
    ],
  }),
  component: ChartPage,
});

function useChart(view: "chart_week" | "chart_all_time") {
  return useQuery({
    queryKey: ["chart", view],
    queryFn: async () => {
      const { data, error } = await supabase.from(view).select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="size-5 text-primary" />;
  if (rank <= 3) return <Medal className="size-5 text-primary/70" />;
  return <span className="w-5 text-center text-sm text-muted-foreground">{rank}</span>;
}

function ChartList({ view }: { view: "chart_week" | "chart_all_time" }) {
  const t = useT();
  const { data = [], isLoading } = useChart(view);
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (data.length === 0) return <div className="card-brut p-4 text-center text-sm text-muted-foreground">{t("page.chart.empty")}</div>;
  return (
    <ol className="space-y-2">
      {data.map((row, i) => (
        <li key={row.id ?? i} className="card-brut flex items-center gap-3 p-3">
          <div className="grid size-8 place-items-center"><RankIcon rank={i + 1} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{row.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.artist}</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1" title="Likes">
              <Heart className="size-4 fill-primary text-primary" />
              <span className="font-bold tabular-nums">{row.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground" title={t("common.airplays")}>
              <Radio className="size-4" />
              <span className="font-semibold tabular-nums">{row.plays ?? 0}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChartPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <h1 className="section-title">{t("page.chart.title")}</h1>
      <Tabs defaultValue="week">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="week">{t("page.chart.tabs.week")}</TabsTrigger>
          <TabsTrigger value="all">{t("page.chart.tabs.all")}</TabsTrigger>
        </TabsList>
        <TabsContent value="week" className="mt-3"><ChartList view="chart_week" /></TabsContent>
        <TabsContent value="all" className="mt-3"><ChartList view="chart_all_time" /></TabsContent>
      </Tabs>
    </div>
  );
}