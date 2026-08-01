/**
 * Shared rule: quoted work titles (songs, albums, films...) must keep their
 * original wording when content is rendered in French. Used by the server-side
 * translator AND by every display component (SocialWall, actus, chroniques...)
 * through <TranslatedText />, so cached/legacy translations are repaired too.
 */
export const QUOTED_WORK_RE = /([«“"])([^«»“”"\n]+)([»”"])/g;

export function extractQuotedWorks(text: string): string[] {
  return text.match(QUOTED_WORK_RE) ?? [];
}

export function protectQuotedWorks(text: string) {
  const originals: string[] = [];
  const protectedText = text.replace(QUOTED_WORK_RE, (match) => {
    const index = originals.push(match) - 1;
    return `⟦INDI_ORIGINAL_${index}⟧`;
  });
  return { protectedText, originals };
}

export function restoreQuotedWorks(text: string, originals: string[]) {
  return originals.reduce(
    (result, original, index) =>
      result.replace(new RegExp(`⟦INDI_ORIGINAL_${index}⟧`, "g"), original),
    text,
  );
}

/**
 * Re-injects the original quoted titles into a translated string, in order.
 * Only meaningful when rendering in French; English rendering is a full
 * translation and is returned untouched.
 */
export function preserveQuotedWorks(
  original: string | null | undefined,
  translated: string,
  targetLang: "fr" | "en",
): string {
  if (targetLang !== "fr" || !original) return translated;
  const originals = extractQuotedWorks(original);
  if (originals.length === 0) return translated;
  let i = 0;
  return translated.replace(QUOTED_WORK_RE, (match) => {
    const source = originals[i++];
    return source ?? match;
  });
}
