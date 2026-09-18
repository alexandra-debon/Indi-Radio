import { supabase } from "@/integrations/supabase/client";

export type ShopClickPayload = {
  itemId: string;
  artistId?: string | null;
  artistPseudo?: string | null;
  itemTitle: string;
  ctaKind?: string | null;
  format?: string | null;
  externalUrl?: string | null;
  source: "artist" | "boutique";
};

/** Enregistre un clic sur un bouton d'achat (best effort, jamais bloquant). */
export async function logShopClick(payload: ShopClickPayload) {
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from("shop_click_events").insert({
      item_id: payload.itemId,
      artist_id: payload.artistId ?? null,
      artist_pseudo: payload.artistPseudo ?? null,
      item_title: payload.itemTitle,
      cta_kind: payload.ctaKind ?? "buy",
      format: payload.format ?? null,
      external_url: payload.externalUrl ?? null,
      source: payload.source,
      user_id: data.session?.user.id ?? null,
    });
  } catch {
    /* le suivi ne doit jamais empêcher l'achat */
  }
}
