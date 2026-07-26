import DOMPurify from "dompurify";

/**
 * Strict sanitizer for broadcast-partner HTML snippets.
 *
 * Enforced rules:
 *  - Only a safe subset of tags/attributes is kept (no <script>, no <iframe>,
 *    no event handlers, no <style>, no data-* attributes).
 *  - <a> is normalized: target="_blank" + rel="noopener noreferrer nofollow",
 *    and only http(s) URLs are allowed. javascript:, data:, vbscript:... are stripped.
 *  - <img> only accepts http(s) URLs (no data: bombs, no javascript: pixels).
 *  - `style` attributes are dropped entirely so the render stays consistent
 *    across web, PWA and native shells.
 */
const ALLOWED_TAGS = ["a", "img", "span", "div", "br"] as const;
const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "class", "width", "height"] as const;

function isSafeUrl(url: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("//")) return true;
  try {
    const u = new URL(trimmed, "https://placeholder.local");
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

let hooksInstalled = false;
function ensureHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();

    if (tag === "a") {
      const href = node.getAttribute("href");
      if (!isSafeUrl(href)) node.removeAttribute("href");
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }

    if (tag === "img") {
      const src = node.getAttribute("src");
      if (!isSafeUrl(src)) {
        node.remove();
        return;
      }
      node.setAttribute("loading", "lazy");
      node.setAttribute("referrerpolicy", "no-referrer");
      if (!node.getAttribute("alt")) node.setAttribute("alt", "");
    }

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name.startsWith("data-")) {
        node.removeAttribute(attr.name);
      }
    }
  });
}

export function sanitizePartnerHtml(input: string | null | undefined): string {
  if (!input) return "";
  ensureHooks();
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ADD_ATTR: ["target", "rel", "loading", "referrerpolicy"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta", "form", "input"],
    FORBID_ATTR: ["style", "srcset", "onerror", "onload", "onclick"],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
    RETURN_TRUSTED_TYPE: false,
  }).trim();
}

/** True if the snippet still contains renderable content after sanitisation. */
export function hasRenderableHtml(input: string | null | undefined): boolean {
  const clean = sanitizePartnerHtml(input);
  if (!clean) return false;
  return /<(a|img|span|div)\b/i.test(clean);
}

export const PARTNER_HTML_MAX_LENGTH = 4000;
