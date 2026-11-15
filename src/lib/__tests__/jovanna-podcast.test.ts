import { describe, expect, it } from "vitest";
import { JOVANNA_EPISODE, jovannaListeningUrl } from "../jovanna-podcast";

describe("Jovanna's first podcast", () => {
  it("links French visitors to the French listening page", () => {
    expect(jovannaListeningUrl("fr")).toBe("https://www.indi-art-culture.com/cetait-mieux-demain/episode-01");
    expect(JOVANNA_EPISODE.episode).toBe(1);
  });
  it("links English visitors only to the English listening page", () => {
    expect(jovannaListeningUrl("en")).toBe("https://www.indi-art-culture.com/en/cetait-mieux-demain/episode-01");
  });
  it("uses the broadcast date and duration from the episode page", () => {
    expect(JOVANNA_EPISODE.publishedAt).toBe("2026-11-13");
    expect(JOVANNA_EPISODE.durationSeconds).toBe(62 * 60 + 14);
  });
});