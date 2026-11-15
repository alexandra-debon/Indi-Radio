import { describe, expect, it } from "vitest";
import { JOVANNA_EPISODE } from "../jovanna-podcast";

describe("Jovanna's first podcast", () => {
  it("links to the listening page supplied for episode 01", () => {
    expect(JOVANNA_EPISODE.listeningUrl).toBe("https://www.indi-art-culture.com/cetait-mieux-demain/episode-01");
    expect(JOVANNA_EPISODE.episode).toBe(1);
  });
  it("uses the broadcast date and duration from the episode page", () => {
    expect(JOVANNA_EPISODE.publishedAt).toBe("2026-11-13");
    expect(JOVANNA_EPISODE.durationSeconds).toBe(62 * 60 + 14);
  });
});