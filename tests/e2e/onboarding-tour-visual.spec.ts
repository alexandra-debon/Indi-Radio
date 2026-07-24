import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression tests for the OnboardingTour component.
 *
 * Captures screenshots of the intro (language + welcome) screens and of
 * a representative subset of tour steps on both a mobile and a desktop
 * viewport, so any accidental drift in the tour layout (bubble
 * placement, spotlight ring, sticky bottom bar, close button) is caught
 * by CI.
 *
 * Baselines live next to the spec under
 *   tests/e2e/onboarding-tour-visual.spec.ts-snapshots/
 * and are generated on first run with:
 *   bunx playwright test tests/e2e/onboarding-tour-visual.spec.ts --update-snapshots
 *
 * The tour uses fixed positioning + animations, so we disable animations
 * and stub time-based bits to keep snapshots deterministic.
 */

const VIEWPORTS = [
  // iPhone SE — the tightest common mobile viewport; catches tooltip
  // overflow and sticky-bar collisions on very short screens.
  { name: "iphone-se", width: 375, height: 667 },
  { name: "mobile", width: 390, height: 844 },
  // Small Android handset — taller viewport and higher density, covers
  // tooltip placement variations on modern narrow/tall screens.
  { name: "android-small", width: 412, height: 915 },
  // iPad portrait — mid-size layout where placement often flips between
  // bottom and right.
  { name: "tablet-portrait", width: 820, height: 1180 },
  { name: "desktop", width: 1280, height: 900 },
  // Wide desktop — ensures bubbles stay near their anchors rather than
  // drifting to the far edge on large monitors.
  { name: "desktop-wide", width: 1680, height: 1050 },
] as const;

// Tour steps to snapshot. Keep a small, representative subset covering
// header-anchored bubbles, mid-page targets and footer-anchored targets
// so we exercise the three main placement strategies of positionTooltip.
const STEP_SNAPSHOTS = [
  { index: 0, name: "step-01-login" }, // header target (top-right)
  { index: 3, name: "step-04-social-wall" }, // mid-page target
  { index: 10, name: "step-11-chat-team-indi" }, // MiniPlayer target (bottom)
] as const;

async function prepare(page: Page) {
  // Force FR + skip the "seen" gate so the tour can be opened
  // deterministically. Disable animations so snapshots are stable.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("indi.lang", "fr");
      window.localStorage.removeItem("indi.onboarding.v1");
    } catch {
      /* noop */
    }
  });
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  }).catch(() => { /* style tag added after nav below */ });
}

async function openTour(page: Page, phase: "welcome" | "summary" = "welcome") {
  await page.evaluate((p) => {
    window.dispatchEvent(
      new CustomEvent("indi:open-tour", { detail: { lang: "fr", phase: p } }),
    );
  }, phase);
}

async function goToStep(page: Page, targetIndex: number) {
  // Start the actual tour from the welcome screen.
  const startBtn = page
    .getByRole("button", { name: /(commencer le tour|start the tour|démarrer|start)/i })
    .first();
  await startBtn.click();
  for (let i = 0; i < targetIndex; i++) {
    const nextBtn = page
      .getByRole("button", { name: /(suivant|next)/i })
      .first();
    await nextBtn.click();
  }
  // Wait for the step counter to reflect the current step (e.g. "1 / 12").
  await page.waitForFunction(
    (idx) => {
      const nodes = Array.from(document.querySelectorAll("body *"));
      return nodes.some((n) =>
        new RegExp(`\\b${idx + 1}\\s*/\\s*\\d+\\b`).test(n.textContent || ""),
      );
    },
    targetIndex,
    { timeout: 5_000 },
  ).catch(() => { /* best-effort; snapshot will still be taken */ });
}

test.describe("OnboardingTour visual regression", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await prepare(page);
        await page.goto("/");
        // Re-add the animation-killer style now that a document exists.
        await page.addStyleTag({
          content: `*, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }`,
        });
        // Home content ready before tour opens.
        await page.waitForLoadState("networkidle").catch(() => {});
      });

      test("intro (language screen)", async ({ page }) => {
        // Force the tour to open on the language screen by removing the
        // stored language then dispatching the event.
        await page.evaluate(() => {
          try { window.localStorage.removeItem("indi.lang"); } catch {}
          window.dispatchEvent(new CustomEvent("indi:open-tour"));
        });
        const dialog = page.getByRole("dialog").first();
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveScreenshot(`intro-lang-${vp.name}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });

      test("welcome screen", async ({ page }) => {
        await openTour(page, "welcome");
        const dialog = page.getByRole("dialog").first();
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveScreenshot(`welcome-${vp.name}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });

      for (const s of STEP_SNAPSHOTS) {
        test(`tour ${s.name}`, async ({ page }) => {
          await openTour(page, "welcome");
          await goToStep(page, s.index);
          // Full-page shot so both the spotlight and the bubble are
          // captured (they live in different fixed layers).
          await expect(page).toHaveScreenshot(`${s.name}-${vp.name}.png`, {
            maxDiffPixelRatio: 0.03,
          });
        });
      }

      test("summary screen", async ({ page }) => {
        await openTour(page, "summary");
        const dialog = page.getByRole("dialog").first();
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveScreenshot(`summary-${vp.name}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });
    });
  }
});