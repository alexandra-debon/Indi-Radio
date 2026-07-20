import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { ImagePlus, X, Loader2, Upload, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  optimizeImageSmart,
  USAGE_PRESETS,
  USAGE_LABEL,
  type ImageUsage,
} from "@/lib/image-optimize";

const MAX_BYTES = 50 * 1024 * 1024;
const BUCKET = "content-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

type Ratio = "free" | "1:1" | "4:5" | "16:9";
const RATIO_VALUES: Record<Ratio, number | null> = {
  free: null,
  "1:1": 1,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
};
const RATIO_LABEL: Record<Ratio, string> = {
  free: "Libre",
  "1:1": "Carré 1:1",
  "4:5": "Portrait 4:5",
  "16:9": "Paysage 16:9",
};

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  disabled?: boolean;
  /** Ratio par défaut pour le recadrage automatique (centré). */
  defaultRatio?: Ratio;
  /** Usage cible pour l'auto-optimisation (vignette, bannière, cover…). */
  usage?: ImageUsage;
}

export function ImageUploader({ value, onChange, folder = "misc", label = "Image (optionnel)", disabled, defaultRatio = "16:9", usage }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; origSize: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [ratio, setRatio] = useState<Ratio>(defaultRatio);
  const [auto, setAuto] = useState<boolean>(true);
  const [usageChoice, setUsageChoice] = useState<ImageUsage>(usage ?? "banner");

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (file.size > MAX_BYTES) { toast.error("Maximum 50 Mo"); return; }
    const url = URL.createObjectURL(file);
    setPreview({ file, url, origSize: file.size });
    setRatio(defaultRatio);
    setAuto(true);
    setUsageChoice(usage ?? "banner");
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirmUpload() {
    if (!preview) return;
    setUploading(true);
    setOptimizing(true);
    try {
      const { blob, ext, type } = await optimizeImageSmart(preview.file, auto
        ? { auto: true, usage: usageChoice }
        : { auto: false, ratio: RATIO_VALUES[ratio], maxDim: 1600 });
      setOptimizing(false);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? "anon";
      const path = `${folder}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
        cacheControl: "3600", upsert: false, contentType: type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr) throw signErr;
      onChange(signed.signedUrl);
      const kb = (blob.size / 1024).toFixed(0);
      const savedPct = Math.max(0, Math.round((1 - blob.size / preview.origSize) * 100));
      const fmt = ext.toUpperCase();
      toast.success(savedPct > 0 ? `Image ${fmt} (${kb} Ko, −${savedPct}%)` : `Image ${fmt} (${kb} Ko)`);
      closePreview();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
      setOptimizing(false);
    }
  }

  const effectiveRatio = auto ? USAGE_PRESETS[usageChoice].ratio : RATIO_VALUES[ratio];
  const cropStyle: React.CSSProperties = effectiveRatio ? { aspectRatio: String(effectiveRatio) } : {};

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <ImagePlus className="mr-1 size-3.5" />}
          {value ? "Remplacer l'image" : "Téléverser une image"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")} disabled={disabled || uploading}>
            <X className="mr-1 size-3.5" /> Retirer
          </Button>
        )}
      </div>
      <Input
        type="url"
        placeholder={label + " — ou colle une URL"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || uploading}
        className="h-8 text-xs"
      />
      {value && (
        <img src={value} alt="" className="max-h-40 rounded border border-border object-cover" />
      )}

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o && !uploading) closePreview(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aperçu avant publication</DialogTitle>
            <DialogDescription>
              Choisis l'usage ou un ratio manuel. En mode auto, le meilleur format (AVIF ou WebP) et la résolution sont sélectionnés automatiquement.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={auto ? "default" : "outline"}
                  onClick={() => setAuto((a) => !a)}
                  disabled={uploading}
                  className="h-7 px-2 text-xs"
                >
                  <Sparkles className="mr-1 size-3.5" />
                  Auto-optimiser {auto ? "· ON" : "· OFF"}
                </Button>
              </div>
              {auto ? (
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(USAGE_PRESETS) as ImageUsage[]).map((u) => (
                    <Button
                      key={u}
                      type="button"
                      size="sm"
                      variant={usageChoice === u ? "default" : "outline"}
                      onClick={() => setUsageChoice(u)}
                      disabled={uploading}
                      className="h-7 px-2 text-xs"
                    >
                      {USAGE_LABEL[u]}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(RATIO_VALUES) as Ratio[]).map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={ratio === r ? "default" : "outline"}
                      onClick={() => setRatio(r)}
                      disabled={uploading}
                      className="h-7 px-2 text-xs"
                    >
                      {RATIO_LABEL[r]}
                    </Button>
                  ))}
                </div>
              )}
              <div
                className="w-full max-h-[50vh] overflow-hidden rounded border border-border bg-muted mx-auto"
                style={cropStyle}
              >
                <img
                  src={preview.url}
                  alt="Aperçu"
                  className={effectiveRatio ? "w-full h-full object-cover" : "w-full h-auto object-contain"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {auto
                  ? `Auto · ${USAGE_LABEL[usageChoice]} (max ${USAGE_PRESETS[usageChoice].maxDim}px)`
                  : `Manuel · ${RATIO_LABEL[ratio]}`} · Origine : {(preview.origSize / 1024).toFixed(0)} Ko
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closePreview} disabled={uploading}>Annuler</Button>
            <Button type="button" onClick={confirmUpload} disabled={uploading}>
              {uploading ? (
                <><Loader2 className="mr-1 size-3.5 animate-spin" /> {optimizing ? "Optimisation…" : "Envoi…"}</>
              ) : (
                <><Upload className="mr-1 size-3.5" /> Confirmer et envoyer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}