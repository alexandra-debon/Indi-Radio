import { describe, expect, it } from "vitest";
import { artistShopPreviewImage, artistShopThumbnail } from "@/lib/artist-shop-seo";

describe("artist shop photo", () => {
  it("uses the first visible product rather than hidden merchandise", () => {
    expect(artistShopPreviewImage([
      { image_url: "https://example.com/hidden.jpg", is_visible: false },
      { image_url: "https://example.com/record.jpg", is_visible: true },
    ], "https://example.com/banner.jpg", null)).toBe("https://example.com/record.jpg");
  });
  it("falls back to the artist's photo when no product photo is available", () => {
    expect(artistShopPreviewImage([], "https://example.com/banner.jpg", "https://example.com/avatar.jpg")).toBe("https://example.com/banner.jpg");
    expect(artistShopPreviewImage([], null, "https://example.com/avatar.jpg")).toBe("https://example.com/avatar.jpg");
  });
  it("does not emit a relative or missing image", () => {
    expect(artistShopPreviewImage([{ image_url: "/local.jpg", is_visible: true }], null, null)).toBeNull();
  });
  it("requests a Facebook-sized JPEG of the same photo", () => {
    const url = new URL(artistShopThumbnail("https://example.com/record.webp"));
    expect(url.searchParams.get("url")).toBe("https://example.com/record.webp");
    expect(url.searchParams.get("w")).toBe("1200");
    expect(url.searchParams.get("h")).toBe("630");
    expect(url.searchParams.get("output")).toBe("jpg");
  });
});