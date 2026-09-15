import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/media/ImageUploader";
import {
  VillageCategoryPicker,
  type VillageCategory,
} from "@/components/village/VillageCategory";
import { toast } from "@/lib/toast";
import { isValidVideoUrl } from "@/lib/media-embed";
import { Loader2, PenSquare, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVillageTxt } from "@/components/village/village-i18n";

export interface VillageArticle {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  video_url: string | null;
  category: string | null;
  free_tag: string | null;
  magazine_url?: string | null;
  source_kind?: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    pseudo: string;
    role: "admin" | "artiste" | "animateur" | "auditeur";
    is_certified: boolean;
    is_team_indi: boolean;
    badges: string[];
    level: number;
  } | null;
}

const ACK_KEY = "indi.villageShareAck";

export function VillageArticleEditor({
  article,
  onDone,
  onCancel,
}: {
  article?: VillageArticle;
  onDone?: (slug: string) => void;
  onCancel?: () => void;
}) {
  const txt = useVillageTxt();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [cover, setCover] = useState(article?.cover_url ?? "");
  const [video, setVideo] = useState(article?.video_url ?? "");
  const [category, setCategory] = useState<VillageCategory | null>(
    (article?.category as VillageCategory | null) ?? null,
  );
  const [freeTag, setFreeTag] = useState(article?.free_tag ?? "");
  const [onFeed, setOnFeed] = useState((article?.visibility ?? "feed") === "feed");
  const [warnOpen, setWarnOpen] = useState(false);
  const [ack, setAck] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error(txt.signIn);
      if (!title.trim()) throw new Error(txt.titleRequired);
      if (!content.trim()) throw new Error(txt.contentRequired);
      const v = video.trim();
      if (v && !isValidVideoUrl(v)) throw new Error("YouTube / Vimeo");
      const payload = {
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim(),
        cover_url: cover || null,
        video_url: v || null,
        category,
        free_tag: freeTag.trim().slice(0, 40) || null,
        visibility: onFeed ? "feed" : "village_only",
      };
      if (article) {
        const { data, error } = await supabase
          .from("village_articles")
          .update(payload as never)
          .eq("id", article.id)
          .select("slug")
          .single();
        if (error) throw error;
        return data.slug as string;
      }
      const { data, error } = await supabase
        .from("village_articles")
        .insert({ ...payload, author_id: session.user.id } as never)
        .select("slug")
        .single();
      if (error) throw error;
      return data.slug as string;
    },
    onSuccess: (slug) => {
      toast.success(article ? txt.updated : txt.saved);
      qc.invalidateQueries({ queryKey: ["village-articles"] });
      qc.invalidateQueries({ queryKey: ["village-article"] });
      qc.invalidateQueries({ queryKey: ["wall-compact"] });
      onDone?.(slug);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const submit = () => {
    try {
      if (localStorage.getItem(ACK_KEY) === "1") {
        save.mutate();
        return;
      }
    } catch {
      /* stockage indisponible : on affiche l'avertissement */
    }
    setAck(false);
    setWarnOpen(true);
  };

  return (
    <div className="card-brut space-y-3 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="village-title">{txt.title}</Label>
        <Input
          id="village-title"
          value={title}
          maxLength={140}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="village-excerpt">{txt.excerpt}</Label>
        <Textarea
          id="village-excerpt"
          rows={2}
          maxLength={300}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="village-content">{txt.content}</Label>
        <Textarea
          id="village-content"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{txt.cover}</Label>
        <ImageUploader
          value={cover}
          onChange={setCover}
          folder="village"
          usage="cover"
          defaultRatio="16:9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="village-video">{txt.video}</Label>
        <Input
          id="village-video"
          inputMode="url"
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <VillageCategoryPicker value={category} onChange={setCategory} />

      <div className="space-y-1.5">
        <Label htmlFor="village-tag">{txt.freeTag}</Label>
        <Input
          id="village-tag"
          value={freeTag}
          maxLength={40}
          onChange={(e) => setFreeTag(e.target.value)}
          placeholder={txt.freeTagHint}
        />
      </div>

      <fieldset className="space-y-1 rounded-sm border-2 border-primary/60 bg-primary/5 p-3">
        <legend className="px-1 text-[11px] font-black uppercase tracking-widest">
          {txt.diffusion}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="village-visibility"
            checked={onFeed}
            onChange={() => setOnFeed(true)}
            className="size-4 accent-primary"
          />
          <span>{txt.onFeed}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="village-visibility"
            checked={!onFeed}
            onChange={() => setOnFeed(false)}
            className="size-4 accent-primary"
          />
          <span>{txt.villageOnly}</span>
        </label>
      </fieldset>

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>{txt.warnBody}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={submit} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PenSquare className="size-4" />
          )}
          {article ? txt.update : txt.publish}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {txt.cancel}
          </Button>
        )}
      </div>

      <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt.warnTitle}</DialogTitle>
            <DialogDescription>{txt.warnBody}</DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>{txt.warnAck}</span>
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWarnOpen(false)}>
              {txt.cancel}
            </Button>
            <Button
              disabled={!ack || save.isPending}
              onClick={() => {
                try {
                  localStorage.setItem(ACK_KEY, "1");
                } catch {
                  /* ignore */
                }
                setWarnOpen(false);
                save.mutate();
              }}
            >
              {txt.warnConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
