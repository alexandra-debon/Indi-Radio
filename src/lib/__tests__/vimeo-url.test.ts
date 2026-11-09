import { describe, expect, it } from "vitest";
import { parseMediaUrl } from "../media-embed";

describe("Vimeo links accepted by InDi TeeVi", () => {
  it.each([
    "https://vimeo.com/76979871",
    "https://www.vimeo.com/76979871?share=copy",
    "https://vimeo.com/channels/staffpicks/76979871",
    "https://vimeo.com/showcase/123456/video/76979871",
    "vimeo.com/76979871",
    "www.vimeo.com/76979871",
    "  https://vimeo.com/76979871  ",
  ])("accepts %s with the correct video ID", (url) => {
    expect(parseMediaUrl(url)).toMatchObject({
      kind: "vimeo",
      id: "76979871",
      embedUrl: "https://player.vimeo.com/video/76979871",
    });
  });

  it.each([
    "https://vimeo.com/76979871/abcdef1234",
    "https://player.vimeo.com/video/76979871?h=abcdef1234&share=copy",
  ])("preserves the unlisted access key in %s", (url) => {
    expect(parseMediaUrl(url)?.embedUrl).toBe(
      "https://player.vimeo.com/video/76979871?h=abcdef1234",
    );
  });

  it.each([
    "https://vimeo.com.evil.example/76979871",
    "javascript:alert(76979871)",
    "https://vimeo.com/showcase/123456",
    "https://vimeo.com/manage/videos",
  ])("rejects non-video URLs: %s", (url) => {
    expect(parseMediaUrl(url)).toBeNull();
  });
});