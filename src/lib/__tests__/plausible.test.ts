import { afterEach, describe, expect, it, vi } from "vitest";
import { trackPageview } from "../plausible";

afterEach(() => vi.unstubAllGlobals());

describe("Plausible single tracker", () => {
  it("sends one pageview through the head tracker after consent", async () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });
    vi.stubGlobal("localStorage", { getItem: () => "accepted" });
    trackPageview("https://www.radio.indi-art-culture.com/podcasts");
    await Promise.resolve();
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("pageview", {
      url: "https://www.radio.indi-art-culture.com/podcasts",
    });
  });

  it("does not send a pageview when consent is refused", async () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });
    vi.stubGlobal("localStorage", { getItem: () => "refused" });
    trackPageview("https://www.radio.indi-art-culture.com/");
    await Promise.resolve();
    expect(plausible).not.toHaveBeenCalled();
  });
});