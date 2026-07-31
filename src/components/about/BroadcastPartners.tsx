import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";
import { useT } from "@/lib/i18n";
import { sanitizePartnerHtml } from "@/lib/sanitize-partner-html";
import { getSurface, type Surface } from "@/lib/surface";

type Partner = {
  id: string;
  name: string;
  kind: "logo" | "html";
  logo_url: string | null;
  link_url: string | null;
  alt_text: string | null;
  html_snippet: string | null;
  visible_on?: string[] | null;
};

export function BroadcastPartners() {
  const t = useT();
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const { data } = useQuery({
    queryKey: ["broadcast-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_partners")
        .select("id,name,kind,logo_url,link_url,alt_text,html_snippet,visible_on")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
    staleTime: 60_000,
  });

  // Realtime: refresh the list as soon as an admin reorders/edits/toggles a partner.
  useEffect(() => {
    const channel = supabase
      .channel("broadcast_partners:public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_partners" },
        () => qc.invalidateQueries({ queryKey: ["broadcast-partners"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Masqué sur apps natives (App Store / Play Store)
  if (hydrated && isNative()) return null;
  if (!data || data.length === 0) return null;

  // Avant hydratation on ne connaît pas encore la surface : on rend tout
  // le monde pour éviter un flash, puis on filtre côté client.
  const surface: Surface | null = hydrated ? getSurface() : null;
  const visible = surface
    ? data.filter((p) => {
        const list = p.visible_on ?? ["web_desktop", "pwa_android", "pwa_ios"];
        return list.includes(surface);
      })
    : data;
  if (visible.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="section-title">{t("page.about.broadcasters.title")}</h2>
      <div className="card-brut p-4">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {visible.map((p) => (
            <PartnerItem key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnerItem({ p }: { p: Partner }) {
  const t = useT();
  const inner = renderPartnerMedia(p);
  if (!inner) return null;
  return (
    <figure className="flex flex-col items-center gap-1.5 text-center">
      <figcaption className="text-base font-bold text-white sm:text-lg">{p.name}</figcaption>
      {inner}
      <span className="text-[11px] leading-tight text-white/80">{t("page.about.broadcasters.cta")}</span>
    </figure>
  );
}

function renderPartnerMedia(p: Partner) {
  if (p.kind === "logo" && p.logo_url) {
    const altText = (p.alt_text?.trim() || `${p.name} — diffuseur InDi RaDio`);
    const img = (
      <img
        src={p.logo_url}
        alt={altText}
        loading="lazy"
        decoding="async"
        className="h-12 w-auto max-w-[140px] object-contain transition hover:scale-105 sm:h-16 sm:max-w-[180px] md:h-20 md:max-w-[220px]"
      />
    );
    return p.link_url ? (
      <a
        href={p.link_url}
        target="_blank"
        rel="noopener noreferrer"
        title={p.name}
        aria-label={`${p.name} (ouvre dans un nouvel onglet)`}
        className="inline-flex rounded outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {img}
      </a>
    ) : (
      <div title={p.name}>{img}</div>
    );
  }
  if (p.kind === "html" && p.html_snippet) {
    const clean = sanitizePartnerHtml(p.html_snippet);
    if (!clean) return null;
    return (
      <div
        className="broadcast-html [&_a]:inline-block [&_a]:rounded [&_a]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-primary [&_a:focus-visible]:ring-offset-2 [&_a:focus-visible]:ring-offset-background [&_img]:h-12 [&_img]:w-auto [&_img]:max-w-[180px] [&_img]:object-contain sm:[&_img]:h-16 sm:[&_img]:max-w-[220px] md:[&_img]:h-20 md:[&_img]:max-w-[260px]"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  return null;
}