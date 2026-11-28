import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent, trackPageview } from "../plausible";

afterEach(() => vi.unstubAllGlobals());

describe("Plausible single tracker", () => {
  it("does not duplicate automatic pageviews after consent", async () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });
    vi.stubGlobal("localStorage", { getItem: () => "accepted" });
    trackPageview("https://www.radio.indi-art-culture.com/podcasts");
    await Promise.resolve();
    expect(plausible).not.toHaveBeenCalled();
  });

  it("does not send a pageview when consent is refused", async () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });
    vi.stubGlobal("localStorage", { getItem: () => "refused" });
    trackPageview("https://www.radio.indi-art-culture.com/");
    await Promise.resolve();
    expect(plausible).not.toHaveBeenCalled();
  });

  it("still sends custom events once after consent", async () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });
    vi.stubGlobal("localStorage", { getItem: () => "accepted" });
    trackEvent("radio_play");
    await Promise.resolve();
    expect(plausible).toHaveBeenCalledExactlyOnceWith("radio_play", {});
  });

  it("keeps custom events blocked without consent", async () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });
    vi.stubGlobal("localStorage", { getItem: () => null });
    trackEvent("radio_play");
    await Promise.resolve();
    expect(plausible).not.toHaveBeenCalled();
  });
});