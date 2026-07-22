import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end test: verifies that the FR/EN language toggle triggers
 * real-time translation of user-generated content (posts, comments, replies)
 * across the app. It targets public routes so no authentication is needed.
 *
 * The test relies on the following observable behavior:
 *  - The `<LanguageToggle />` in the header exposes two buttons with the
 *    accessible labels defined in `src/components/i18n/LanguageToggle.tsx`.
 *  - `<TranslatedText />` swaps its rendered content when `lang` changes
 *    (either immediately for cached translations or after the async fetch
 *    resolves), replacing the source text with the translated string.
 *
 * Override the target with E2E_BASE_URL when running against production.
 */

const FR_BUTTON = "Passer l'application en français";
const EN_BUTTON = "Switch the app to English";

async function setLang(page: Page, lang: "fr" | "en") {
  const label = lang === "fr" ? FR_BUTTON : EN_BUTTON;
  const button = page.getByRole("button", { name: label }).first();
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

/**
 * Wait until at least one node in `locator` renders text different from
 * `original`. This absorbs the async translation fetch (Gemini via server
 * function). Returns the new text.
 */
async function waitForTranslated(
  page: Page,
  selector: string,
  original: string,
): Promise<string> {
  const handle = await page.waitForFunction(
    ({ sel, orig }) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const n of nodes) {
        const t = (n.textContent ?? "").trim();
        if (t && t !== orig && !/^…|^\.\.\.$|translating|traduction/i.test(t)) {
          return t;
        }
      }
      return false;
    },
    { sel: selector, orig: original },
    { timeout: 30_000 },
  );
  return (await handle.jsonValue()) as string;
}

async function firstNonEmptyText(page: Page, selector: string): Promise<string> {
  return await page.waitForFunction(
    (sel) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const n of nodes) {
        const t = (n.textContent ?? "").trim();
        if (t.length > 12) return t;
      }
      return false;
    },
    selector,
    { timeout: 30_000 },
  ).then((h) => h.jsonValue() as Promise<string>);
}

test.describe("Real-time FR/EN translation of user content", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a deterministic starting language.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("indi.lang", "fr");
      } catch {}
    });
  });

  test("Language preference is persisted across reloads", async ({ page }) => {
    await page.goto("/");
    await setLang(page, "en");
    await page.reload();
    const enBtn = page.getByRole("button", { name: EN_BUTTON }).first();
    await expect(enBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("News feed posts translate when switching FR to EN", async ({ page }) => {
    await page.goto("/actus");
    // News article bodies are wrapped in <p class="whitespace-pre-wrap">.
    const selector = "article p.whitespace-pre-wrap";
    const originalFr = await firstNonEmptyText(page, selector);

    await setLang(page, "en");
    const translated = await waitForTranslated(page, selector, originalFr);
    expect(translated).not.toEqual(originalFr);

    // Switching back must restore the original (cached, immediate).
    await setLang(page, "fr");
    await expect
      .poll(async () => await firstNonEmptyText(page, selector), {
        timeout: 15_000,
      })
      .toBe(originalFr);
  });

  test("Coups de Cœur editorial content translates in real time", async ({ page }) => {
    await page.goto("/coups-de-coeur");
    // Editorial comment / discovery story rendered via <TranslatedText as="p">.
    const selector = "article p";
    const originalFr = await firstNonEmptyText(page, selector);

    await setLang(page, "en");
    const translated = await waitForTranslated(page, selector, originalFr);
    expect(translated).not.toEqual(originalFr);
  });

  test("Social Wall posts and comments update when toggling language", async ({ page }) => {
    await page.goto("/wall");
    const postSelector = "[data-testid='wall-post-body'], article p";
    const originalFr = await firstNonEmptyText(page, postSelector);

    await setLang(page, "en");
    const translated = await waitForTranslated(page, postSelector, originalFr);
    expect(translated).not.toEqual(originalFr);

    await setLang(page, "fr");
    await expect
      .poll(async () => await firstNonEmptyText(page, postSelector), {
        timeout: 15_000,
      })
      .toBe(originalFr);
  });
});