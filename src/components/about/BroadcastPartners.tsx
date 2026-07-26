import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";
import { useT } from "@/lib/i18n";
import { sanitizePartnerHtml } from "@/lib/sanitize-partner-html";

type Partner = {
  id: string;
  name: string;
  kind: "logo" | "html";
  logo_url: string | null;
  link_url: string | null;
  alt_text: string | null;
  html_snippet: string | null;
};

export function BroadcastPartners() {
  const t = useT();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const { data } = useQuery({
    queryKey: ["broadcast-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_partners")
        .select("id,name,kind,logo_url,link_url,alt_text,html_snippet")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
    staleTime: 60_000,
  });

  // Masqué sur apps natives (App Store / Play Store)
  if (hydrated && isNative()) return null;
  if (!data || data.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="section-title">{t("page.about.broadcasters.title")}</h2>
      <div className="card-brut p-4">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {data.map((p) => (
            <PartnerItem key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnerItem({ p }: { p: Partner }) {
  if (p.kind === "logo" && p.logo_url) {
    const img = (
      <img
        src={p.logo_url}
        alt={p.alt_text ?? p.name}
        loading="lazy"
        className="h-16 w-auto max-w-[160px] object-contain transition hover:scale-105"
      />
    );
    return p.link_url ? (
      <a href={p.link_url} target="_blank" rel="noopener noreferrer" title={p.name} aria-label={p.name}>
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
        className="broadcast-html [&_a]:inline-block [&_img]:h-16 [&_img]:w-auto [&_img]:max-w-[220px] [&_img]:object-contain"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  return null;
}