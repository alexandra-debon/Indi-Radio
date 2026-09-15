import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Feather, Check, Loader2 } from "lucide-react";
import { flipHtml5ThumbnailUrl } from "@/lib/fliphtml5";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAGAZINE_SOURCE_KINDS,
  useMagazineShareTxt,
  useMagazineSourceLabel,
  type MagazineSourceKind,
} from "@/components/village/MagazineSource";

/**
 * Bouton admin : publie un article magazine interactif dans RéDaK'Village,
 * avec la mention choisie (article interactif ou extrait magazine).
 */
export function MagazineVillageShare({
  entry,
}: {
  entry: { id: string; title: string; body: string | null; magazine_url: string; cover_url: string | null };
}) {
  const { session, isAdmin } = useAuth();
  const qc = useQueryClient();
  const txt = useMagazineShareTxt();
  const label = useMagazineSourceLabel();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MagazineSourceKind>("article_interactif");

  const { data: existing } = useQuery({
    queryKey: ["magazine-village-share", entry.magazine_url],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("village_articles")
        .select("slug")
        .eq("magazine_url", entry.magazine_url)
        .limit(1)
        .maybeSingle();
      return (data?.slug as string | undefined) ?? null;
    },
  });

  const share = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error(txt.error);
      const body = (entry.body ?? "").trim();
      const { data, error } = await supabase
        .from("village_articles")
        .insert({
          author_id: session.user.id,
          title: entry.title,
          excerpt: body.slice(0, 200) || label(kind),
          content: body || label(kind),
          cover_url: entry.cover_url || flipHtml5ThumbnailUrl(entry.magazine_url),
          magazine_url: entry.magazine_url,
          source_kind: kind,
          category: "art",
          visibility: "feed",
          published: true,
        } as never)
        .select("slug")
        .single();
      if (error) throw error;
      return data.slug as string;
    },
    onSuccess: () => {
      toast.success(txt.shared);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["magazine-village-share", entry.magazine_url] });
      qc.invalidateQueries({ queryKey: ["village-articles"] });
      qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
      qc.invalidateQueries({ queryKey: ["admin-village-articles"] });
    },
    onError: (e) => toast.error((e as Error).message || txt.error),
  });

  if (!isAdmin) return null;

  if (existing) {
    return (
      <Link
        to="/redak-village/$slug"
        params={{ slug: existing }}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-primary hover:underline"
      >
        <Check className="size-3.5" /> {txt.already}
      </Link>
    );
  }

  return (
    <>
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setOpen(true)}>
        <Feather className="size-3.5" /> {txt.share}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt.choose}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {MAGAZINE_SOURCE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`w-full rounded-md border-2 px-3 py-2 text-left text-sm font-bold transition ${
                  kind === k ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {label(k)}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {txt.cancel}
            </Button>
            <Button size="sm" disabled={share.isPending} onClick={() => share.mutate()}>
              {share.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Feather className="size-3.5" />
              )}{" "}
              {txt.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
