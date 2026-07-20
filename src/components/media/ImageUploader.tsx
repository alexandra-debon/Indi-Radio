import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { ImagePlus, X, Loader2, Upload } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const MAX_BYTES = 20 * 1024 * 1024;
const BUCKET = "content-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

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
}

async function optimizeImage(
  file: File,
  ratio: number | null,
): Promise<{ blob: Blob; ext: string; type: string; width: number; height: number }> {
  // Keep SVG/GIF as-is (animation / vector)
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return { blob: file, ext: file.type === "image/svg+xml" ? "svg" : "gif", type: file.type, width: 0, height: 0 };
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: 0, height: 0 };
  const { width: w0, height: h0 } = bitmap;
  // Center-crop to target ratio when set
  let sx = 0, sy = 0, sw = w0, sh = h0;
  if (ratio && ratio > 0) {
    const currentRatio = w0 / h0;
    if (currentRatio > ratio) {
      sw = Math.round(h0 * ratio);
      sx = Math.round((w0 - sw) / 2);
    } else if (currentRatio < ratio) {
      sh = Math.round(w0 / ratio);
      sy = Math.round((h0 - sh) / 2);
    }
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close?.();
  const outType = "image/webp";
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), outType, JPEG_QUALITY));
  // Fallback if webp fails or ends up bigger than original
  if (!blob || (ratio == null && blob.size > file.size)) {
    return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: w0, height: h0 };
  }
  return { blob, ext: "webp", type: "image/webp", width: w, height: h };
}

export function ImageUploader({ value, onChange, folder = "misc", label = "Image (optionnel)", disabled, defaultRatio = "16:9" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; origSize: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [ratio, setRatio] = useState<Ratio>(defaultRatio);

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (file.size > MAX_BYTES) { toast.error("Maximum 20 Mo"); return; }
    const url = URL.createObjectURL(file);
    setPreview({ file, url, origSize: file.size });
    setRatio(defaultRatio);
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
      const { blob, ext, type } = await optimizeImage(preview.file, RATIO_VALUES[ratio]);
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
      toast.success(savedPct > 0 ? `Image optimisée (${kb} Ko, −${savedPct}%)` : `Image téléversée (${kb} Ko)`);
      closePreview();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
      setOptimizing(false);
    }
  }

  const ratioValue = RATIO_VALUES[ratio];
  const cropStyle: React.CSSProperties = ratioValue ? { aspectRatio: String(ratioValue) } : {};

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
              Choisis un format : l'image sera recadrée automatiquement (centre), redimensionnée (max {MAX_DIMENSION}px) et convertie en WebP.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
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
              <div
                className="w-full max-h-[50vh] overflow-hidden rounded border border-border bg-muted mx-auto"
                style={cropStyle}
              >
                <img
                  src={preview.url}
                  alt="Aperçu"
                  className={ratioValue ? "w-full h-full object-cover" : "w-full h-auto object-contain"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Format : {RATIO_LABEL[ratio]} · Taille d'origine : {(preview.origSize / 1024).toFixed(0)} Ko
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