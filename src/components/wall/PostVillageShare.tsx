import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Feather, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploader } from "@/components/media/ImageUploader";
import { stripMediaUrls } from "@/lib/media-embed";
import {
  VillageCategoryPicker,
  type VillageCategory,
} from "@/components/village/VillageCategory";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function useTxt() {
  const { lang } = useLang();
  return lang === "en"
    ? {
        share: "Share in RéDaK'Village",
        already: "Already in RéDaK'Village",
        title: "Share this post in RéDaK'Village",
        titleLabel: "Article title",
        coverLabel: "Share thumbnail (used in the list and previews)",
        hint: "The article is public: you can edit or delete it at any time, but shares already made elsewhere may remain online.",
        confirm: "Publish",
        cancel: "Cancel",
        done: "Published in RéDaK'Village",
        needTitle: "Please add a title.",
        error: "Sharing failed, please retry.",
      }
    : {
        share: "Partager dans RéDaK'Village",
        already: "Déjà dans RéDaK'Village",
        title: "Partager cette publication dans RéDaK'Village",
        titleLabel: "Titre de l'article",
        coverLabel: "Vignette de partage (utilisée dans la liste et les aperçus)",
        hint: "L'article est public : vous pouvez le modifier ou le supprimer à tout moment, mais les partages déjà effectués ailleurs peuvent rester en ligne.",
        confirm: "Publier",
        cancel: "Annuler",
        done: "Publié dans RéDaK'Village",
        needTitle: "Ajoutez un titre.",
        error: "Partage impossible pour le moment.",
      };
}

/**
 * Bouton « Partager dans RéDaK'Village » sur une publication du mur.
 * Réservé à l'auteur de la publication (RLS : author_id = auth.uid()).
 */
export function PostVillageShare({
  post,
}: {
  post: {
    id: string;
    title: string | null;
    content: string;
    image_url: string | null;
    image_urls: string[] | null;
    category: string | null;
  };
}) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const txt = useTxt();
  const isOwner = session?.user.id != null && session.user.id.length > 0;
  const [open, setOpen] = useState(false);

  const plain = stripMediaUrls(post.content).trim();
  const [title, setTitle] = useState(post.title?.trim() || plain.slice(0, 80));
  const [cover, setCover] = useState<string | null>(
    post.image_url || post.image_urls?.[0] || null,
  );
  const [category, setCategory] = useState<VillageCategory | null>(
    (post.category as VillageCategory | null) ?? null,
  );

  const { data: existing } = useQuery({
    queryKey: ["post-village-share", post.id],
    enabled: isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("village_articles")
        .select("slug")
        .eq("source_post_id", post.id)
        .limit(1)
        .maybeSingle();
      return (data?.slug as string | undefined) ?? null;
    },
  });

  const share = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error(txt.error);
      const clean = title.trim();
      if (!clean) throw new Error(txt.needTitle);
      const { data, error } = await supabase
        .from("village_articles")
        .insert({
          author_id: session.user.id,
          title: clean,
          excerpt: plain.slice(0, 200) || clean,
          content: post.content,
          cover_url: cover,
          category,
          visibility: "feed",
          published: true,
          source_post_id: post.id,
        } as never)
        .select("slug")
        .single();
      if (error) throw error;
      return data.slug as string;
    },
    onSuccess: () => {
      toast.success(txt.done);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["post-village-share", post.id] });
      qc.invalidateQueries({ queryKey: ["village-articles"] });
      qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
      qc.invalidateQueries({ queryKey: ["admin-village-articles"] });
    },
    onError: (e) => toast.error((e as Error).message || txt.error),
  });

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted"
        aria-label={txt.share}
        title={txt.share}
      >
        <Feather className="size-3.5" />
        <span className="hidden sm:inline">{txt.share}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{txt.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {txt.titleLabel}
              </span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {txt.coverLabel}
              </span>
              <ImageUploader
                value={cover}
                onChange={setCover}
                folder="village"
                usage="cover"
                defaultRatio="16:9"
              />
            </div>
            <VillageCategoryPicker value={category} onChange={setCategory} />
            <p className="text-[11px] leading-snug text-muted-foreground">{txt.hint}</p>
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
