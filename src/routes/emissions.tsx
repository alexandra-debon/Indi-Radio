import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useState } from "react";
import { Mic2 } from "lucide-react";

export const Route = createFileRoute("/emissions")({
  head: () => ({
    meta: [
      { title: "Émissions & Animateurs — Indi Radio" },
      { name: "description", content: "Les émissions, chroniques et animateurs d'Indi Radio." },
      { property: "og:title", content: "Émissions & Animateurs — Indi Radio" },
      { property: "og:description", content: "Découvre les voix et les programmes d'Indi Radio." },
    ],
  }),
  component: EmissionsPage,
});

type ShowType = "emission" | "chronique" | "animateur";

function ShowsSection({ type, label }: { type: ShowType; label: string }) {
  const { data = [] } = useQuery({
    queryKey: ["shows", type],
    queryFn: async () => {
      const { data } = await supabase.from("shows").select("*").eq("type", type).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [idx, setIdx] = useState(0);
  const selected = data[idx];

  if (data.length === 0) {
    return <div className="card-brut p-4 text-center text-sm text-muted-foreground">Aucun{type === "emission" || type === "chronique" ? "e" : ""} {label.toLowerCase()} pour l'instant.</div>;
  }

  return (
    <div className="space-y-4">
      <Carousel opts={{ align: "start" }}>
        <CarouselContent>
          {data.map((s, i) => (
            <CarouselItem key={s.id} className="basis-1/2 md:basis-1/3">
              <button
                onClick={() => setIdx(i)}
                className={`card-brut relative block aspect-square w-full overflow-hidden ${i === idx ? "ring-2 ring-primary" : ""}`}
              >
                {s.cover_url ? (
                  <img src={s.cover_url} alt={s.title} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center bg-muted">
                    <Mic2 className="size-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-left text-xs font-semibold">{s.title}</div>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {selected && (
        <div className="card-brut p-4">
          <div className="text-[10px] uppercase tracking-widest text-primary">{label}</div>
          <h3 className="mt-1 text-lg font-bold">{selected.title}</h3>
          {selected.schedule && <div className="text-sm text-muted-foreground">{selected.schedule}</div>}
          {(selected as any).host && <div className="text-sm text-muted-foreground">Avec {(selected as any).host}</div>}
          {selected.description && <p className="mt-2 text-sm">{selected.description}</p>}
        </div>
      )}
    </div>
  );
}

function EmissionsPage() {
  return (
    <div className="space-y-4">
      <h1 className="section-title">Émissions & Animateurs</h1>
      <Tabs defaultValue="emission">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="emission">Émissions</TabsTrigger>
          <TabsTrigger value="chronique">Chroniques</TabsTrigger>
          <TabsTrigger value="animateur">Animateurs</TabsTrigger>
        </TabsList>
        <TabsContent value="emission" className="mt-4"><ShowsSection type="emission" label="Émission" /></TabsContent>
        <TabsContent value="chronique" className="mt-4"><ShowsSection type="chronique" label="Chronique" /></TabsContent>
        <TabsContent value="animateur" className="mt-4"><ShowsSection type="animateur" label="Animateur" /></TabsContent>
      </Tabs>
    </div>
  );
}