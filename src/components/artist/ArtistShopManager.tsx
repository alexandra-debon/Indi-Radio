import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/media/ImageUploader";
import { toast } from "@/lib/toast";
import { ShoppingBag, Loader2, Trash2, Plus, Pencil, X, Store } from "lucide-react";
import { SHOP_FORMATS, SHOP_CTA_KINDS, useArtistShopItems, type ShopItem } from "@/components/artist/ArtistShop";
import { useLang } from "@/lib/i18n";
import { ARTIST_SPACE_TXT } from "@/components/artist/artist-space-i18n";

export function ArtistShopManager({ artistId }: { artistId: string }) {
  const qc = useQueryClient();
  const lang = useLang();
  const T = ARTIST_SPACE_TXT[lang === "en" ? "en" : "fr"];
  const CTA_LABEL: Record<string, string> = {
    buy: T.ctaBuy,
    preorder: T.ctaPreorder,
    ticket: T.ctaTicket,
  };
  const { data: items = [] } = useArtistShopItems(artistId, { onlyVisible: false });

  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<string>("Vinyle");
  const [image, setImage] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [ctaKind, setCtaKind] = useState<string>("buy");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setImage("");
    setSummary("");
    setUrl("");
    setFormat("Vinyle");
    setCtaKind("buy");
  };

  const startEdit = (it: ShopItem) => {
    setEditingId(it.id);
    setTitle(it.title);
    setFormat(it.format);
    setImage(it.image_url ?? "");
    setSummary(it.summary ?? "");
    setUrl(it.external_url ?? "");
    setCtaKind(it.cta_kind ?? "buy");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["artist-shop"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error(T.itemTitleRequired);
      if (url.trim() && !/^https?:\/\/.+\..+/.test(url.trim()))
        throw new Error(T.itemBadUrl);
      const payload = {
        title: title.trim(),
        format,
        image_url: image || null,
        summary: summary.trim() || null,
        external_url: url.trim() || null,
        cta_kind: ctaKind,
      };
      if (editingId) {
        const { error } = await supabase
          .from("artist_shop_items")
          .update(payload as any)
          .eq("id", editingId);
        if (error) throw error;
        return "update" as const;
      }
      const { error } = await supabase
        .from("artist_shop_items")
        .insert({ artist_id: artistId, ...payload } as any);
      if (error) throw error;
      return "insert" as const;
    },
    onSuccess: (mode) => {
      resetForm();
      toast.success(mode === "update" ? T.itemUpdated : T.itemAdded);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from("artist_shop_items")
        .update({ is_visible } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, in_public_shop }: { id: string; in_public_shop: boolean }) => {
      const { error } = await supabase
        .from("artist_shop_items")
        .update({ in_public_shop } as any)
        .eq("id", id);
      if (error) throw error;
      return in_public_shop;
    },
    onSuccess: (on) => {
      toast.success(
        on ? T.itemPublicOn : T.itemPublicOff,
      );
      invalidate();
      qc.invalidateQueries({ queryKey: ["global-shop-items"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_shop_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(T.itemDeleted);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <section className="card-brut space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
        <ShoppingBag className="size-4 text-primary" /> {T.myShop}
      </h2>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="shop-title">{T.shopTitle}</Label>
          <Input
            id="shop-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={T.shopTitlePlaceholder}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shop-format">{T.format}</Label>
          <select
            id="shop-format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full border-2 border-border bg-background px-2 py-2 text-sm font-semibold"
          >
            {SHOP_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shop-cta">{T.ctaLabel}</Label>
        <select
          id="shop-cta"
          value={ctaKind}
          onChange={(e) => setCtaKind(e.target.value)}
          className="w-full border-2 border-border bg-background px-2 py-2 text-sm font-semibold"
        >
          {SHOP_CTA_KINDS.map((k) => (
            <option key={k} value={k}>
              {CTA_LABEL[k]}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          {T.ctaHint}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>{T.shopPhoto}</Label>
        <ImageUploader
          value={image}
          onChange={setImage}
          folder={`shop/${artistId}`}
          label={T.shopPhotoLabel}
          usage="cover"
          defaultRatio="1:1"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shop-summary">{T.shopSummary}</Label>
        <Textarea
          id="shop-summary"
          rows={3}
          maxLength={600}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={T.shopSummaryPlaceholder}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shop-url">{T.shopUrl}</Label>
        <Input
          id="shop-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
        <p className="text-[11px] text-muted-foreground">
          {T.shopUrlHint}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => add.mutate()} disabled={add.isPending}>
          {add.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : editingId ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {editingId ? T.saveChanges : T.addToShop}
        </Button>
        {editingId && (
          <Button type="button" variant="ghost" onClick={resetForm}>
            <X className="size-4" /> {T.cancel}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.noItems}</p>
      ) : (
        <ul className="space-y-2 pt-2">
          {items.map((it: ShopItem) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center gap-2 border-2 border-border p-2 text-sm"
            >
              {it.image_url ? (
                <img
                  src={it.image_url}
                  alt=""
                  className="size-12 shrink-0 border-2 border-border object-cover"
                />
              ) : (
                <div className="grid size-12 shrink-0 place-items-center border-2 border-border bg-muted">
                  <ShoppingBag className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{it.title}</div>
                <div className="text-xs text-muted-foreground">
                  {it.format}
                  {(it.tags ?? []).length > 0 ? ` · ${(it.tags ?? []).join(", ")}` : ""}
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <Switch
                  checked={it.is_visible}
                  onCheckedChange={(v) => toggleVisible.mutate({ id: it.id, is_visible: v })}
                  aria-label={T.visibleAria}
                />
                {T.visible}
              </label>
              <Button
                type="button"
                size="sm"
                variant={it.in_public_shop ? "default" : "outline"}
                onClick={() =>
                  togglePublic.mutate({ id: it.id, in_public_shop: !it.in_public_shop })
                }
                className="gap-1.5"
              >
                <Store className="size-4" />
                {it.in_public_shop ? T.inPublicShop : T.putInPublicShop}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => startEdit(it)}
                aria-label={T.editItemAria}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(T.confirmDeleteItem)) remove.mutate(it.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        {T.shopFooter}
      </p>
    </section>
  );
}
