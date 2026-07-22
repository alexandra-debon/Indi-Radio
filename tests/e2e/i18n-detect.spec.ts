import { test, expect, type BrowserContext } from "@playwright/test";

/**
 * End-to-end test: verifies that on a *first visit* (no persisted choice in
 * localStorage, no `?hl=` override) the app auto-detects the browser's
 * preferred language from `navigator.languages` — which mirrors the
 * Accept-Language header — and renders the corresponding FR/EN UI before
 * any user interaction.
 *
 * Uses fresh browser contexts per case so localStorage never leaks between
 * scenarios. Each context is created with a specific `locale` (which drives
 * `navigator.language`/`navigator.languages`) plus an explicit
 * `Accept-Language` header for parity with the SSR request.
 */

const FR_BUTTON_LABEL = "Passer l'application en français";
const EN_BUTTON_LABEL = "Switch the app to English";

async function firstVisit(
  context: BrowserContext,
  url: string,
) {
  const page = await context.newPage();
  // Guarantee a clean first-visit state: no persisted choice, no query param.
  await page.addInitScript(() => {
    try { window.localStorage.removeItem("indi.lang"); } catch {}
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

test.describe("First-visit language auto-detection", () => {
  test("English browser locale renders EN before any click", async ({ browser }) => {
    const context = await browser.newContext({
      locale: "en-US",
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });
    try {
      const page = await firstVisit(context, "/");

      // The EN toggle button must be marked active without any interaction.
      const enButton = page.getByRole("button", { name: EN_BUTTON_LABEL }).first();
      const frButton = page.getByRole("button", { name: FR_BUTTON_LABEL }).first();
      await expect(enButton).toHaveAttribute("aria-pressed", "true");
      await expect(frButton).toHaveAttribute("aria-pressed", "false");

      // <html lang> should reflect the detected language.
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("en");

      // The detected choice must be persisted for subsequent visits.
      const stored = await page.evaluate(() => window.localStorage.getItem("indi.lang"));
      expect(stored).toBe("en");
    } finally {
      await context.close();
    }
  });

  test("French browser locale renders FR before any click", async ({ browser }) => {
    const context = await browser.newContext({
      locale: "fr-FR",
      extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    try {
      const page = await firstVisit(context, "/");

      const enButton = page.getByRole("button", { name: EN_BUTTON_LABEL }).first();
      const frButton = page.getByRole("button", { name: FR_BUTTON_LABEL }).first();
      await expect(frButton).toHaveAttribute("aria-pressed", "true");
      await expect(enButton).toHaveAttribute("aria-pressed", "false");

      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("fr");

      const stored = await page.evaluate(() => window.localStorage.getItem("indi.lang"));
      expect(stored).toBe("fr");
    } finally {
      await context.close();
    }
  });

  test("Unsupported locale (de-DE) falls back to FR", async ({ browser }) => {
    const context = await browser.newContext({
      locale: "de-DE",
      extraHTTPHeaders: { "Accept-Language": "de-DE,de;q=0.9" },
    });
    try {
      const page = await firstVisit(context, "/");
      const frButton = page.getByRole("button", { name: FR_BUTTON_LABEL }).first();
      await expect(frButton).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("fr");
    } finally {
      await context.close();
    }
  });

  test("Multi-tag Accept-Language picks the first supported (en over de)", async ({ browser }) => {
    // navigator.languages = ["de-DE", "en-GB"] → first supported is EN.
    const context = await browser.newContext({
      locale: "de-DE",
      extraHTTPHeaders: { "Accept-Language": "de-DE,de;q=0.9,en-GB;q=0.8,en;q=0.7" },
    });
    try {
      const page = await browser.contexts()[browser.contexts().length - 1].newPage();
      await page.addInitScript(() => {
        try { window.localStorage.removeItem("indi.lang"); } catch {}
        Object.defineProperty(navigator, "languages", {
          get: () => ["de-DE", "en-GB", "en"],
        });
      });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const enButton = page.getByRole("button", { name: EN_BUTTON_LABEL }).first();
      await expect(enButton).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("en");

      const stored = await page.evaluate(() => window.localStorage.getItem("indi.lang"));
      expect(stored).toBe("en");
    } finally {
      await context.close();
    }
  });

  test("Persisted choice wins over browser locale on second visit", async ({ browser }) => {
    // Start with EN locale, but pre-seed localStorage with "fr" — the stored
    // choice must take priority over detection.
    const context = await browser.newContext({
      locale: "en-US",
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        try { window.localStorage.setItem("indi.lang", "fr"); } catch {}
      });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const frButton = page.getByRole("button", { name: FR_BUTTON_LABEL }).first();
      await expect(frButton).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("fr");
    } finally {
      await context.close();
    }
  });
});