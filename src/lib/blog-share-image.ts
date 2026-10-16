/** Blog photos are shared across languages; only the surrounding text is localized. */
export function blogShareImage(frenchImage: string | null | undefined, articleImage: string): string {
  return frenchImage?.trim() || articleImage;
}