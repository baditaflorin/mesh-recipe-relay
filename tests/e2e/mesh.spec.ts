import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (!(await settings.isVisible().catch(() => false))) return;
  const close = settings.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(settings).toBeHidden();
}

async function pageWhoseTurn(a: Page, b: Page): Promise<Page> {
  await expect
    .poll(async () => {
      if (
        await a
          .locator('[data-turn-state="my-turn"]')
          .isVisible()
          .catch(() => false)
      ) {
        return "a";
      }
      if (
        await b
          .locator('[data-turn-state="my-turn"]')
          .isVisible()
          .catch(() => false)
      ) {
        return "b";
      }
      return "";
    })
    .not.toBe("");

  return (await a
    .locator('[data-turn-state="my-turn"]')
    .isVisible()
    .catch(() => false))
    ? a
    : b;
}

/**
 * Generic mesh-presence test — works for any mesh-* app without modification.
 * Opens two pages in the same browser context so y-webrtc's BroadcastChannel
 * fallback syncs them with no signaling server / no network.
 *
 * Apps that show a peer count in the UI should pass this. Apps that don't
 * surface peer count can override or skip this test.
 */
test("two peers in the same room can both load", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // A legitimate first-visit Settings sheet hides page content from the
    // accessibility tree. Close it on each peer before asserting the shared
    // app surface, without changing the app's onboarding behavior.
    await Promise.all([closeInitiallyOpenSettings(a), closeInitiallyOpenSettings(b)]);
    await expect(a.locator("[data-mesh-app-shell]")).toBeVisible();
    await expect(b.locator("[data-mesh-app-shell]")).toBeVisible();
    // Both should reach a non-loading state within the timeout. Modern shells
    // carry their source/version in Settings rather than a floating legacy
    // footer, so the app shell and primary content are the useful contract.
    await expect(a.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(b.getByRole("heading", { level: 1 }).first()).toBeVisible();
  } finally {
    await cleanup();
  }
});

test("two cooks relay a real shared recipe in turn order", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });

  try {
    await Promise.all([closeInitiallyOpenSettings(a), closeInitiallyOpenSettings(b)]);
    await Promise.all([
      a.getByLabel("Cook name").fill("Ari"),
      b.getByLabel("Cook name").fill("Bea"),
    ]);

    const first = await pageWhoseTurn(a, b);
    const second = first === a ? b : a;
    const firstInstruction = "Toast the cumin until fragrant.";

    await first.getByLabel("Next instruction").fill(firstInstruction);
    await expect(first.getByTestId("relay-primary-action")).toBeEnabled();
    await first.getByTestId("relay-primary-action").click();

    await Promise.all([
      expect(a.getByTestId("recipe-step")).toContainText(firstInstruction),
      expect(b.getByTestId("recipe-step")).toContainText(firstInstruction),
    ]);
    await expect(first.locator('[data-turn-state="complete"]')).toBeVisible();
    await expect(second.locator('[data-turn-state="my-turn"]')).toBeVisible();

    const secondInstruction = "Fold in tomatoes and simmer for five minutes.";
    await second.getByLabel("Next instruction").fill(secondInstruction);
    await second.getByTestId("relay-primary-action").click();

    await Promise.all([
      expect(a.getByTestId("recipe-step").filter({ hasText: secondInstruction })).toBeVisible(),
      expect(b.getByTestId("recipe-step").filter({ hasText: secondInstruction })).toBeVisible(),
      expect(a.getByTestId("recipe-step")).toHaveCount(2),
      expect(b.getByTestId("recipe-step")).toHaveCount(2),
    ]);
  } finally {
    await cleanup();
  }
});

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "short desktop", width: 1141, height: 602 },
]) {
  test(`first view stays actionable and accessible on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("./");
    await closeInitiallyOpenSettings(page);

    await expect(
      page.getByRole("heading", {
        name: "Make the recipe together, one good instruction at a time.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Cook name")).toBeVisible();
    await expect(page.getByLabel("Next instruction")).toBeVisible();
    await expect(page.getByTestId("relay-primary-action")).toBeInViewport();

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  });
}
