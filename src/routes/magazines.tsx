import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { FlipbookViewer } from "@/components/magazines/FlipbookViewer";
import { MagazineEntryEditor, type MagazineEntryDraft } from "@/components/magazines/MagazineEntryEditor";
import { ShareButton } from "@/components/share/ShareButton";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { useT, useLang } from "@/lib/i18n";
import { TranslatedText } from "@/components/i18n/TranslatedText";

const BASE_URL = "https://radio.indi-art-culture.com";

export const Route = createFileRoute("/magazines")({
  head: () => ({
    meta: [
      { title: "Magazine Indi Art Culture — Articles interactifs" },
      {
        name: "description",
        content:
          "Les articles interactifs du magazine Indi Art Culture : présentations éditoriales et magazines A4 feuilletables, publiés par la rédaction.",
      },
      { property: "og:title", content: "Magazine Indi Art Culture — Articles interactifs" },
      {
        property: "og:description",
        content: "Les articles interactifs du magazine Indi Art Culture : magazines A4 feuilletables et présentations éditoriales.",
      },
      { property: "og:url", content: `${BASE_URL}/magazines` },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/magazines` }],
  }),
  component: MagazinesPage,
});

interface MagazineRow {
  id: string;
  title: string;
  body: string | null;
  magazine_url: string;
  cover_url: string | null;
  author_id: string | null;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
}

function MagazinesPage() {
  const t = useT();
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);

  const { data: entries = [] } = useQuery<MagazineRow[]>({
    queryKey: ["magazine-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("magazine_entries")
        .select("*")
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MagazineRow[];
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h1 className="section-title">{t("page.magazines.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("page.magazines.subtitle")}</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title text-lg">{t("page.magazines.articles")}</h2>
          {isAdmin && !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" /> {t("page.clips.newEntry")}
            </Button>
          )}
        </div>

        {creating && <MagazineEntryEditor onDone={() => setCreating(false)} />}

        {entries.length === 0 && !creating && (
          <div className="card-brut p-4 text-center text-sm text-muted-foreground">
            {t("page.magazines.empty")}
          </div>
        )}

        <ul className="space-y-4">
          {entries.map((e) => (
            <MagazineCard key={e.id} entry={e} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function MagazineCard({ entry }: { entry: MagazineRow }) {
  const { isAdmin } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("magazine_entries").delete().eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article supprimé");
      qc.invalidateQueries({ queryKey: ["magazine-entries"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (editing) {
    const draft: MagazineEntryDraft = {
      id: entry.id,
      title: entry.title,
      body: entry.body,
      magazine_url: entry.magazine_url,
      cover_url: entry.cover_url,
    };
    return <MagazineEntryEditor initial={draft} onDone={() => setEditing(false)} />;
  }

  return (
    <li id={`mag-${entry.id}`} className="card-brut scroll-mt-24 space-y-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <TranslatedText as="h3" className="text-lg font-bold leading-tight" entityType="magazine_entry" entityKey={entry.id} field="title" text={entry.title} />
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: lang === "en" ? enUS : fr })}
          </span>
          <ShareButton
            target={{
              url: `/magazines/${entry.id}`,
              title: `${entry.title} — Magazine Indi Art Culture`,
              text: entry.body?.slice(0, 200) || entry.title,
            }}
          />
        </div>
      </div>

      {entry.body && (
        <TranslatedText as="p" className="whitespace-pre-wrap text-sm text-foreground" entityType="magazine_entry" entityKey={entry.id} field="body" text={entry.body} />
      )}
      {entry.body && <UrlEmbeds text={entry.body} />}

      <FlipbookViewer url={entry.magazine_url} title={entry.title} coverUrl={entry.cover_url} />

      {isAdmin && (
        <div className="flex justify-end gap-1 pt-1">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("action.edit")}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => { if (confirm("Supprimer cet article ?")) del.mutate(); }}
            className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            aria-label={t("action.delete")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}