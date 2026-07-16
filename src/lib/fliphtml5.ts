// Utilities for FlipHTML5 magazine URLs.
// Public flipbook URLs look like:
//   https://online.fliphtml5.com/<userId>/<bookId>/
// The same URL can be embedded inside an <iframe>.

export function isValidFlipHtml5Url(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "online.fliphtml5.com" || u.hostname.endsWith(".fliphtml5.com")) &&
      u.pathname.split("/").filter(Boolean).length >= 2
    );
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
    if (parts.length < 2) return null;
    const [userId, bookId] = parts;
    return `${u.origin}/${userId}/${bookId}/files/shot.jpg`;
  } catch {
    return null;
  }
}