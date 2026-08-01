import { describe, expect, it } from "vitest";
import {
  extractQuotedWorks,
  preserveQuotedWorks,
  protectQuotedWorks,
  restoreQuotedWorks,
} from "@/lib/quoted-works";

describe("quoted-works", () => {
  it("extracts quoted titles with both quote styles", () => {
    expect(extractQuotedWorks('Écoutez « Dick on the Floor » et "Vincent\'s Tale" !')).toEqual([
      "« Dick on the Floor »",
      '"Vincent\'s Tale"',
    ]);
  });

  it("protects and restores titles round-trip", () => {
    const src = "Nouvelle chronique de « Vincent's Tale » ce soir";
    const { protectedText, originals } = protectQuotedWorks(src);
    expect(protectedText).toContain("⟦INDI_ORIGINAL_0⟧");
    expect(restoreQuotedWorks(protectedText, originals)).toBe(src);
  });

  it("restores original titles when rendering in French", () => {
    const original = 'New review of "Dick on the Floor" out now';
    const translated = 'Nouvelle chronique de « Bite sur le sol » disponible';
    expect(preserveQuotedWorks(original, translated, "fr")).toBe(
      'Nouvelle chronique de "Dick on the Floor" disponible',
    );
  });

  it("leaves English rendering fully translated", () => {
    const original = "Chronique de « Vincent's Tale »";
    const translated = 'Review of "Vincent\'s Tale"';
    expect(preserveQuotedWorks(original, translated, "en")).toBe(translated);
  });

  it("is a no-op when there is no quoted title", () => {
    expect(preserveQuotedWorks("Bonjour", "Hello", "fr")).toBe("Hello");
  });
});
