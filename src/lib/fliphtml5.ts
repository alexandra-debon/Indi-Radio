// Utilities for FlipHTML5 magazine URLs.
// Public flipbook URLs come in several shapes, all sharing the same
// trailing `/<...>/<bookId>/` structure:
//   - https://online.fliphtml5.com/<userId>/<bookId>/            (default)
//   - https://<custom-domain>/books/<bookId>/                    (custom, e.g. Indi Art Culture)
//   - https://<custom-domain>/<userId>/<bookId>/                 (other custom setups)
// The same URL can be embedded inside an <iframe>, and the cover
// thumbnail is always served at `<book-root>/files/shot.jpg`.

export function isValidFlipHtml5Url(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    // Accept any host — custom domains are common — as long as the path
    // has at least one segment identifying the book.
    return u.pathname.split("/").filter(Boolean).length >= 1;
  } catch {
    return false;
  }
}

export function normalizeFlipHtml5Url(url: string): string {
  try {
    const u = new URL(url);
    // Ensure trailing slash on the book path so the viewer loads correctly.
    if (!u.pathname.endsWith("/")) u.pathname += "/";
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * FlipHTML5 publishes each flipbook's cover thumbnail at a deterministic URL:
 *   https://online.fliphtml5.com/<userId>/<bookId>/files/shot.jpg
 * We use it as the default og:image for shared magazine articles so link
 * previews show the magazine cover automatically, without any manual upload.
 */
export function flipHtml5ThumbnailUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 1) return null;
    // The thumbnail lives at `<book-root>/files/shot.jpg`, regardless of
    // how many path segments precede the book id (custom domains use
    // `/books/<bookId>/`, the default host uses `/<userId>/<bookId>/`).
    const bookPath = parts.join("/");
    return `${u.origin}/${bookPath}/files/shot.jpg`;
  } catch {
    return null;
  }
}