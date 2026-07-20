import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX_BYTES = 20 * 1024 * 1024;
const BUCKET = "content-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, folder = "misc", label = "Image (optionnel)", disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Format image uniquement"); return; }
    if (file.size > MAX_BYTES) { toast.error("Maximum 20 Mo"); return; }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? "anon";
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr) throw signErr;
      onChange(signed.signedUrl);
      toast.success("Image téléversée");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
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
    </div>
  );
}