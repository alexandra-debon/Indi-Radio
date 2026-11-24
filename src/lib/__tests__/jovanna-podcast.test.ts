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
import { IN_APP_EPISODES, findInAppEpisode, chapterIndexAt, podcastStatsUrl, podcastListenCountUrl } from "../jovanna-podcast";
import { isExpired, OFFLINE_TTL_MS } from "../offline-audio";

describe("in-app listening", () => {
  it("plays episode 1 from the supplied m4a source", () => {
    expect(JOVANNA_EPISODE.audioUrl).toBe("https://indi-radio.indi-art-culture.com:2170/media/podcasts/Server_1/c%C3%A9tait-mieux-demain-jovanna/mix%20jovanna.m4a");
    expect(findInAppEpisode(JOVANNA_EPISODE.slug)).toBe(IN_APP_EPISODES[0]);
  });
  it("counts online plays through the Netlify counter URL", () => {
    expect(podcastStatsUrl(JOVANNA_EPISODE)).toBe(
      "https://podcast-indi-art-culture.netlify.app/e/1/aHR0cHM6Ly9pbmRpLXJhZGlvLmluZGktYXJ0LWN1bHR1cmUuY29tOjIxNzAvbWVkaWEvcG9kY2FzdHMvU2VydmVyXzEvYyVDMyVBOXRhaXQtbWlldXgtZGVtYWluLWpvdmFubmEvbWl4JTIwam92YW5uYS5tNGE.m4a?app=hub",
    );
  });
  it("builds the listen-count URL for episode 1", () => {
    expect(podcastListenCountUrl(JOVANNA_EPISODE)).toBe(
      `https://podcast-indi-art-culture.netlify.app/compteur.json?audio=${encodeURIComponent(JOVANNA_EPISODE.audioUrl)}`,
    );
  });
  it("expires offline episodes after 30 days", () => {
    expect(OFFLINE_TTL_MS).toBe(30 * 86400000);
    expect(isExpired({ expiresAt: 1000 }, 999)).toBe(false);
    expect(isExpired({ expiresAt: 1000 }, 1000)).toBe(true);
  });
});

describe("chapters", () => {
  it("starts SLIFT at 1:44 and finds the current chapter", () => {
    const ch = JOVANNA_EPISODE.chapters;
    expect(ch[1]).toMatchObject({ start: 104, artist: "SLIFT" });
    expect(chapterIndexAt(ch, 103)).toBe(0);
    expect(chapterIndexAt(ch, 104)).toBe(1);
    expect(chapterIndexAt(ch, 3700)).toBe(ch.length - 1);
  });
});
