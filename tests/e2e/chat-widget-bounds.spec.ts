import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end test: opens the "Chat Team Indi" widget on several mobile
 * viewport sizes and asserts that the panel never overflows above the
 * header nor below the MiniPlayer (the two fixed chrome regions of the
 * app). Regression guard for the dynamic `dvh`-based sizing in
 * `src/components/chat/AdminChatWidget.tsx`.
 *
 * Auth is required for the widget to render. Provide credentials via
 * env vars `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` (a regular, non-admin
 * account — the widget is hidden for admins by design). The test is
 * skipped automatically when credentials are absent so CI without
 * secrets stays green.
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

const VIEWPORTS = [
  { name: "iPhone SE", width: 320, height: 568 },
  { name: "iPhone 12", width: 390, height: 844 },
  { name: "Pixel 7", width: 412, height: 915 },
  { name: "Small tablet portrait", width: 600, height: 960 },
] as const;

async function signIn(page: Page) {
  await page.goto("/");
  // Open auth dialog via the header account button. Fallbacks cover
  // both FR and EN labels.
  const trigger = page
    .getByRole("button", { name: /(connexion|connecter|sign in|log in|compte)/i })
    .first();
  await trigger.click();
  await page.getByLabel(/e-?mail/i).fill(EMAIL!);
  await page.getByLabel(/mot de passe|password/i).first().fill(PASSWORD!);
  await page
    .getByRole("button", { name: /(se connecter|connexion|sign in|log in)/i })
    .first()
    .click();
  // Wait until the AdminChatWidget-eligible session is live: the global
  // open event handler is registered only after mount, and MiniPlayer's
  // chat trigger becomes interactive.
  await page.waitForFunction(
    () => !!window.localStorage.getItem("sb-ceqmejsvjpgpvfiannhj-auth-token"),
    null,
    { timeout: 15_000 },
  );
}

async function openChat(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("indi:open-admin-chat"));
  });
}

test.describe("Chat widget stays within header/MiniPlayer bounds", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem("indi.lang", "fr"); } catch {}
    });
  });

  for (const vp of VIEWPORTS) {
    test(`fits on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page);
      await openChat(page);

      // The panel is the fixed container rendered by AdminChatWidget.
      // We locate it by the header text emitted from the i18n dict
      // ("chat.title" — "Chat Team Indi" / "InDi Team Chat"), then walk
      // up to the outer fixed wrapper.
      const panelHeader = page
        .getByText(/(chat team indi|indi team chat)/i)
        .first();
      await expect(panelHeader).toBeVisible({ timeout: 10_000 });
      const panel = panelHeader.locator(
        'xpath=ancestor::div[contains(@class, "fixed")][1]',
      );

      // Measure header height. The site header is rendered as <header>
      // at the top of AppShell; fall back to 64px (Tailwind h-16) when
      // absent.
      const headerBottom = await page
        .locator("header")
        .first()
        .evaluate((el) => (el ? el.getBoundingClientRect().bottom : 64))
        .catch(() => 64);

      // Measure MiniPlayer top. The MiniPlayer bar is a fixed element
      // near the bottom of the screen; we detect it via its aria-label
      // fallback: it contains the "On air" / "En direct" indicator.
      const miniPlayerTop = await page.evaluate(() => {
        const bars = Array.from(
          document.querySelectorAll<HTMLElement>('[class*="fixed"]'),
        ).filter((el) => {
          const t = el.textContent ?? "";
          const r = el.getBoundingClientRect();
          return (
            r.top > window.innerHeight / 2 &&
            r.bottom >= window.innerHeight - 4 &&
            /on\s*air|en\s*direct|indi\s*radio/i.test(t)
          );
        });
        if (bars.length === 0) return window.innerHeight;
        return Math.min(...bars.map((b) => b.getBoundingClientRect().top));
      });

      const box = await panel.boundingBox();
      expect(box, "chat panel must have a bounding box").not.toBeNull();
      const rect = box!;

      // Assertions: the panel sits strictly between the header and the
      // MiniPlayer, and never leaves the viewport horizontally.
      expect.soft(rect.y).toBeGreaterThanOrEqual(headerBottom - 1);
      expect.soft(rect.y + rect.height).toBeLessThanOrEqual(miniPlayerTop + 1);
      expect.soft(rect.x).toBeGreaterThanOrEqual(0);
      expect.soft(rect.x + rect.width).toBeLessThanOrEqual(vp.width);
      // And it must still be tall enough to be usable.
      expect(rect.height).toBeGreaterThan(160);
    });
  }
});
