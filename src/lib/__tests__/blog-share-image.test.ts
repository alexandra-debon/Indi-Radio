import { describe, expect, it } from "vitest";
import { blogShareImage } from "@/lib/blog-share-image";

describe("shared bilingual blog photo", () => {
  it("uses the French thumbnail for both language versions", () => {
    const photo = "https://www.radio.indi-art-culture.com/bernhoft.jpg";
    expect(blogShareImage(photo, "https://i.ytimg.com/vi/LMYe6rtq3lc/hqdefault.jpg")).toBe(photo);
  });
  it("keeps the article photo when there is no custom French thumbnail", () => {
    const photo = "https://www.radio.indi-art-culture.com/article.jpg";
    expect(blogShareImage(null, photo)).toBe(photo);
    expect(blogShareImage("  ", photo)).toBe(photo);
  });
});