/**
 * Import / export en lot des articles du Blog InDi ArT CulTuRe.
 *
 * Format d'échange : JSON (tableau d'objets) ou, pour un collage rapide,
 * une suite de blocs séparés par une ligne `---`.
 *
 * Bloc texte :
 *   Titre: Mon article
 *   Embed: <iframe src="https://gamma.app/embed/xxx"></iframe>
 *   Lien: https://instagram.com/...
 *   ---
 *   Corps de l'article sur plusieurs lignes
 *
 * L'import n'écrase jamais la rédaction manuelle : chaque bloc crée un
 * nouvel article, et les codes d'intégration passent par la même validation
 * stricte (`parseEmbedCode`) que la saisie unitaire.
 */
import { parseEmbedCode } from "@/lib/embed-code";

export interface BulkArticle {
  title: string;
  content: string;
  embed_url: string | null;
  embed_height: number | null;
  social_links: Record<string, string>;
  /** Erreur bloquante détectée à l'analyse (embed non autorisé, titre vide…). */
  error?: string;
}

const LINK_KEYS = [
  "website",
  "facebook",
  "instagram",
  "youtube",
  "spotify",
  "bandcamp",
  "soundcloud",
  "tiktok",
  "deezer",
  "apple_music",
];

function normalizeLinks(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = k.toLowerCase().trim();
    if (typeof v !== "string" || !v.trim()) continue;
    if (!LINK_KEYS.includes(key)) continue;
    const val = v.trim();
    if (!/^https?:\/\//i.test(val)) continue;
    out[key] = val;
  }
  return out;
}

function guessLinkKey(url: string): string {
  const u = url.toLowerCase();
  const found = LINK_KEYS.find((k) => u.includes(k === "apple_music" ? "music.apple" : k.replace("_", ".")));
  return found ?? "website";
}

function buildArticle(raw: {
  title?: unknown;
  content?: unknown;
  embed?: unknown;
  links?: unknown;
}): BulkArticle {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  const article: BulkArticle = {
    title,
    content,
    embed_url: null,
    embed_height: null,
    social_links: normalizeLinks(raw.links),
  };
  const embedRaw = typeof raw.embed === "string" ? raw.embed.trim() : "";
  if (embedRaw) {
    try {
      const parsed = parseEmbedCode(embedRaw);
      article.embed_url = parsed?.url ?? null;
      article.embed_height = parsed?.height ?? null;
    } catch (e) {
      article.error = (e as Error).message;
    }
  }
  if (!article.error && !title) article.error = "Titre manquant.";
  if (!article.error && !content && !article.embed_url) {
    article.error = "Article vide : ajoute un texte ou un code d'intégration.";
  }
  if (title.length > 120) article.error = "Titre trop long (120 caractères max).";
  return article;
}

function parseTextBlocks(input: string): BulkArticle[] {
  const blocks = input
    .split(/^\s*(?:---|===)\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  // Un bloc = entêtes `Clé: valeur` puis le corps.
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const raw: { title?: string; content?: string; embed?: string; links: Record<string, string> } = { links: {} };
    const body: string[] = [];
    let inBody = false;
    for (const line of lines) {
      const m = !inBody ? /^\s*(titre|title|embed|integration|intégration|lien|link|url)\s*:\s*(.+)$/i.exec(line) : null;
      if (m) {
        const key = m[1].toLowerCase();
        const value = m[2].trim();
        if (key === "titre" || key === "title") raw.title = value;
        else if (key === "embed" || key === "integration" || key === "intégration") raw.embed = value;
        else raw.links[guessLinkKey(value)] = value;
        continue;
      }
      if (!inBody && !line.trim()) continue;
      inBody = true;
      body.push(line);
    }
    raw.content = body.join("\n").trim();
    return buildArticle(raw);
  });
}

/** Analyse un collage JSON ou texte et renvoie la liste normalisée. */
export function parseBulkArticles(input: string): BulkArticle[] {
  const text = (input ?? "").trim();
  if (!text) return [];

  if (text.startsWith("[") || text.startsWith("{")) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("JSON invalide : vérifie les virgules et les guillemets.");
    }
    const list = Array.isArray(json) ? json : [json];
    return list.map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return buildArticle({
        title: o.title ?? o.titre,
        content: o.content ?? o.contenu ?? o.body,
        embed: o.embed ?? o.embed_code ?? o.embed_url ?? o.iframe,
        links: o.links ?? o.social_links ?? o.reseaux,
      });
    });
  }

  return parseTextBlocks(text);
}

export interface ExportablePost {
  title: string;
  content: string;
  embed_url?: string | null;
  embed_height?: number | null;
  social_links?: Record<string, unknown> | null;
  created_at?: string;
}

/** Sérialise les articles existants en JSON réimportable. */
export function serializeBulkArticles(posts: ExportablePost[]): string {
  return JSON.stringify(
    posts.map((p) => ({
      title: p.title,
      content: p.content,
      embed: p.embed_url ?? "",
      embed_height: p.embed_height ?? null,
      links: (p.social_links ?? {}) as Record<string, unknown>,
      created_at: p.created_at ?? null,
    })),
    null,
    2,
  );
}

export const BULK_TEMPLATE = `Titre: Mon premier article
Embed: <iframe src="https://gamma.app/embed/xxxxxxxx"></iframe>
Lien: https://www.instagram.com/mon-compte

Texte de l'article, rédigé normalement.
Plusieurs lignes possibles.
===
Titre: Second article
Embed: https://open.spotify.com/embed/album/xxxxxxxx

Chronique de l'album.`;
