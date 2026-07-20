import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ImagePlus, X, Loader2, Check, AlertTriangle, Upload } from "lucide-react";

const MAX_BYTES = 20 * 1024 * 1024;
const BUCKET = "content-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;
const TARGET_RATIO = 16 / 9;
const MAX_FILES = 6;

type Status = "pending" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: Status;
  error?: string;
  url?: string;
}

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  disabled?: boolean;
  max?: number;
}

async function optimize(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return { blob: file, ext: file.type === "image/svg+xml" ? "svg" : "gif", type: file.type };
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type };
  const { width: w0, height: h0 } = bitmap;
  let sx = 0, sy = 0, sw = w0, sh = h0;
  const currentRatio = w0 / h0;
  if (currentRatio > TARGET_RATIO) {
    sw = Math.round(h0 * TARGET_RATIO); sx = Math.round((w0 - sw) / 2);
  } else if (currentRatio < TARGET_RATIO) {
    sh = Math.round(w0 / TARGET_RATIO); sy = Math.round((h0 - sh) / 2);
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
  const w = Math.round(sw * scale); const h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", QUALITY));
  if (!blob) return { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type };
  return { blob, ext: "webp", type: "image/webp" };
}

function validate(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Format image uniquement";
  if (file.size > MAX_BYTES) return "Maximum 20 Mo";
  return null;
}

export function MultiImageUploader({ values, onChange, folder = "misc", disabled, max = MAX_FILES }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  function addFiles(list: FileList | File[]) {
    const remaining = max - values.length - queue.length;
    if (remaining <= 0) { toast.error(`Maximum ${max} images`); return; }
    const arr = Array.from(list).slice(0, remaining);
    const items: QueueItem[] = arr.map((f) => {
      const err = validate(f);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: err ? "error" : "pending",
        error: err ?? undefined,
      };
    });
    setQueue((q) => [...q, ...items]);
  }

  function removeQueueItem(id: string) {
    setQueue((q) => {
      const it = q.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return q.filter((x) => x.id !== id);
    });
  }

  function removeUploaded(url: string) {
    onChange(values.filter((u) => u !== url));
  }

  async function uploadAll() {
    if (busy) return;
    const pending = queue.filter((q) => q.status === "pending");
    if (pending.length === 0) return;
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? "anon";
    const newlyUploaded: string[] = [];
    for (const item of pending) {
      setQueue((q) => q.map((x) => x.id === item.id ? { ...x, status: "uploading" } : x));
      try {
        const { blob, ext, type } = await optimize(item.file);
        const path = `${folder}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
          cacheControl: "3600", upsert: false, contentType: type,
        });
        if (upErr) throw upErr;
        const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
        if (signErr) throw signErr;
        newlyUploaded.push(signed.signedUrl);
        setQueue((q) => q.map((x) => x.id === item.id ? { ...x, status: "done", url: signed.signedUrl } : x));
      } catch (e: any) {
        setQueue((q) => q.map((x) => x.id === item.id ? { ...x, status: "error", error: e?.message ?? "Échec" } : x));
      }
    }
    if (newlyUploaded.length > 0) {
      onChange([...values, ...newlyUploaded]);
      toast.success(`${newlyUploaded.length} image(s) téléversée(s)`);
    }
    // Purge successfully uploaded items from queue after a short delay so user sees the check
    setTimeout(() => {
      setQueue((q) => {
        q.filter((x) => x.status === "done").forEach((x) => URL.revokeObjectURL(x.previewUrl));
        return q.filter((x) => x.status !== "done");
      });
    }, 600);
    setBusy(false);
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const totalCount = values.length + queue.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled || busy || totalCount >= max}
          onChange={(e) => { const list = e.target.files; if (list && list.length) addFiles(list); if (fileRef.current) fileRef.current.value = ""; }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy || totalCount >= max}
        >
          <ImagePlus className="mr-1 size-3.5" />
          Ajouter des images ({totalCount}/{max})
        </Button>
        {pendingCount > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={uploadAll}
            disabled={disabled || busy}
          >
            {busy ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Upload className="mr-1 size-3.5" />}
            Envoyer {pendingCount}
          </Button>
        )}
      </div>

      {(queue.length > 0 || values.length > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {values.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "16/9" }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeUploaded(url)}
                className="absolute right-1 top-1 rounded bg-background/80 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                aria-label="Retirer"
                disabled={disabled}
              >
                <X className="size-3" />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
                <Check className="inline size-2.5" />
              </span>
            </div>
          ))}
          {queue.map((it) => (
            <div key={it.id} className="group relative overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "16/9" }}>
              <img src={it.previewUrl} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeQueueItem(it.id)}
                className="absolute right-1 top-1 rounded bg-background/80 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                aria-label="Retirer"
                disabled={busy}
              >
                <X className="size-3" />
              </button>
              {it.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
              {it.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 text-center text-[10px] text-destructive-foreground">
                  <AlertTriangle className="size-4" />
                  <span className="px-1 leading-tight">{it.error}</span>
                </div>
              )}
              {it.status === "done" && (
                <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
                  <Check className="inline size-2.5" />
                </span>
              )}
              {it.status === "pending" && (
                <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1 py-0.5 text-[9px] font-bold">
                  En file
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Chaque image est validée (format, taille max 20 Mo), recadrée en 16:9 et convertie en WebP.
      </p>
    </div>
  );
}