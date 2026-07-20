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

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  disabled?: boolean;
}

async function optimizeImage(file: File): Promise<{ blob: Blob; ext: string; type: string; width: number; height: number }> {
  // Keep SVG/GIF as-is (animation / vector)
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return { blob: file, ext: file.type === "image/svg+xml" ? "svg" : "gif", type: file.type, width: 0, height: 0 };
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: 0, height: 0 };
  const { width: w0, height: h0 } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const outType = file.type === "image/png" ? "image/webp" : "image/webp";
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), outType, JPEG_QUALITY));
  // Fallback if webp fails or ends up bigger than original
  if (!blob || blob.size > file.size) {
    return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type, width: w0, height: h0 };
  }
  return { blob, ext: "webp", type: "image/webp", width: w, height: h };
}

export function ImageUploader({ value, onChange, folder = "misc", label = "Image (optionnel)", disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; origSize: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (file.size > MAX_BYTES) { toast.error("Maximum 20 Mo"); return; }
    const url = URL.createObjectURL(file);
    setPreview({ file, url, origSize: file.size });
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
      const { blob, ext, type } = await optimizeImage(preview.file);
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
            <DialogTitle>Prévisualisation</DialogTitle>
            <DialogDescription>
              L'image sera redimensionnée (max {MAX_DIMENSION}px) et convertie en WebP pour un rendu rapide sur mobile.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-2">
              <img src={preview.url} alt="Aperçu" className="w-full max-h-[50vh] object-contain rounded border border-border bg-muted" />
              <p className="text-xs text-muted-foreground">
                Taille d'origine : {(preview.origSize / 1024).toFixed(0)} Ko
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