import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { parseMediaUrl } from "@/lib/media-embed";
import { fetchVimeoThumbnail, vimeoThumbnail } from "@/lib/teevi-share-image";
import { ImageUploader } from "@/components/media/ImageUploader";
import { useTeeviTxt, type TeeviVideo } from "@/components/teevi/teevi-i18n";

export function TeeviVideoEditor({
  video,
  onDone,
  onCancel,
}: {
  video?: TeeviVideo;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const txt = useTeeviTxt();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(video?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(video?.video_url ?? "");
  const [summary, setSummary] = useState(video?.summary ?? "");
  const [tags, setTags] = useState((video?.tags ?? []).join(", "));
  const [published, setPublished] = useState(video?.published ?? true);
  const [ogImage, setOgImage] = useState(video?.og_image_url ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error(txt.titleRequired);
      const media = parseMediaUrl(videoUrl.trim());
      if (!media || media.kind !== "vimeo") throw new Error(txt.videoRequired);
      const url = videoUrl.trim();
      const auto = ogImage.trim()
        ? null
        : (await fetchVimeoThumbnail(url)) || vimeoThumbnail(url);
      const payload = {
        title: title.trim(),
        og_image_url: ogImage.trim() || auto,
        video_url: videoUrl.trim(),
        summary: summary.trim() || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12),
        published,
      };
      if (video) {
        const { error } = await supabase.from("teevi_videos").update(payload).eq("id", video.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("teevi_videos")
        .insert({ ...payload, author_id: session?.user.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.saved);
      qc.invalidateQueries({ queryKey: ["teevi-videos"] });
      qc.invalidateQueries({ queryKey: ["teevi-video"] });
      qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
      onDone?.();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="card-brut space-y-3 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="teevi-title">{txt.formTitle}</Label>
        <Input
          id="teevi-title"
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="teevi-url">{txt.formVideo}</Label>
        <Input
          id="teevi-url"
          inputMode="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://vimeo.com/…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="teevi-summary">{txt.formSummary}</Label>
        <Textarea
          id="teevi-summary"
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{txt.formImage}</Label>
        <ImageUploader
          value={ogImage}
          onChange={(v) => setOgImage(v ?? "")}
          folder="teevi"
          usage="cover"
          defaultRatio="16:9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="teevi-tags">{txt.formTags}</Label>
        <Input
          id="teevi-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={txt.formTagsHint}
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <Switch checked={published} onCheckedChange={setPublished} />
        {txt.published}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {txt.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {txt.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}
