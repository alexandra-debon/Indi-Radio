import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { Download, Upload, ChevronDown, ChevronUp } from "lucide-react";
import {
  parseBulkArticles,
  serializeBulkArticles,
  BULK_TEMPLATE,
  type BulkArticle,
  type ExportablePost,
} from "@/lib/news-bulk";
import { sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { ResponsiveEmbedPreview } from "@/components/media/ResponsiveEmbedPreview";

/**
 * Import / export en lot des articles du blog. N'interfère pas avec le
 * formulaire de rédaction manuelle : c'est un panneau repliable additionnel.
 */
export function NewsBulkImportExport({
  authorId,
  posts,
}: {
  authorId: string;
  posts: readonly ExportablePost[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");

  let parsed: BulkArticle[] = [];
  let parseError: string | null = null;
  try {
    parsed = parseBulkArticles(raw);
  } catch (e) {
    parseError = (e as Error).message;
  }
  const valid = parsed.filter((a) => !a.error);
  const invalid = parsed.filter((a) => a.error);

  const importAll = useMutation({
    mutationFn: async () => {
      if (valid.length === 0) throw new Error("Aucun article valide à importer.");
      const rows = valid.map((a) => ({
        author_id: authorId,
        title: a.title,
        content: a.content,
        image_url: null,
        image_urls: [] as string[],
        social_links: sanitizeLinks(a.social_links as unknown as SocialLinks),
        embed_url: a.embed_url,
        embed_height: a.embed_height,
      }));
      const { error } = await supabase.from("news_posts").insert(rows as any);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} article${n > 1 ? "s" : ""} importé${n > 1 ? "s" : ""} !`);
      setRaw("");
      qc.invalidateQueries({ queryKey: ["news-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const doExport = () => {
    const json = serializeBulkArticles([...posts]);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog-indi-art-culture-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(json).catch(() => {});
    toast.success("Export téléchargé (et copié dans le presse-papiers).");
  };

  return (
    <div className="card-brut border-2 border-primary/50 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Import / export en lot d'articles
        </span>
        {open ? <ChevronUp className="size-4 text-primary" /> : <ChevronDown className="size-4 text-primary" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] italic leading-tight text-muted-foreground">
            Colle plusieurs articles d'un coup, en JSON ou en blocs séparés par une ligne
            <code className="mx-1">===</code>. Chaque code d'intégration est validé et rendu dans une
            iframe sandboxée. La rédaction manuelle et la barre de liens restent inchangées.
          </p>
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            spellCheck={false}
            lang="fr"
            placeholder={BULK_TEMPLATE}
            className="font-mono text-[11px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRaw(BULK_TEMPLATE)}
              className="h-7 text-[11px]"
            >
              Insérer un modèle
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={doExport} className="h-7 text-[11px]">
              <Download className="mr-1 size-3" /> Exporter ({posts.length})
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={valid.length === 0 || importAll.isPending}
              onClick={() => importAll.mutate()}
              className="h-7 text-[11px]"
            >
              <Upload className="mr-1 size-3" />
              Importer {valid.length > 0 ? `(${valid.length})` : ""}
            </Button>
          </div>

          {parseError && <p className="text-[11px] font-semibold text-destructive">{parseError}</p>}

          {invalid.length > 0 && (
            <ul className="space-y-1">
              {invalid.map((a, i) => (
                <li key={i} className="text-[11px] font-semibold text-destructive">
                  « {a.title || "sans titre"} » — {a.error}
                </li>
              ))}
            </ul>
          )}

          {valid.length > 0 && (
            <div className="space-y-2 rounded border border-dashed border-border bg-muted/30 p-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Aperçu — {valid.length} article{valid.length > 1 ? "s" : ""}
              </p>
              {valid.map((a, i) => (
                <div key={i} className="space-y-1 border-t border-border/50 pt-1 first:border-0 first:pt-0">
                  <p className="text-xs font-bold">{a.title}</p>
                  {a.content && (
                    <p className="line-clamp-3 whitespace-pre-wrap text-[11px] text-muted-foreground">{a.content}</p>
                  )}
                  {a.embed_url && (
                    <ResponsiveEmbedPreview url={a.embed_url} height={a.embed_height} title={`Aperçu — ${a.title}`} />
                  )}
                  {Object.keys(a.social_links).length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Liens : {Object.keys(a.social_links).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
