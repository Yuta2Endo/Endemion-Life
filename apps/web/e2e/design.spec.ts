import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PUBLIC_PAGES = ["/", "/worlds", "/create/hunter", "/account", "/social"];
const WIDTHS = [320, 390, 1440];

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(overflow.document, `${page.url()} document overflows at ${overflow.viewport}px`).toBeLessThanOrEqual(
    overflow.viewport
  );
  expect(overflow.body, `${page.url()} body overflows at ${overflow.viewport}px`).toBeLessThanOrEqual(overflow.viewport);
}

test("public pages never scroll sideways", async ({ page }) => {
  for (const path of PUBLIC_PAGES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      await open(page, path);
      await expectNoHorizontalOverflow(page);
    }
  }
});

test("home atlas shows six distinct world plates", async ({ page }) => {
  await open(page, "/");
  const worlds = ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"];
  for (const world of worlds) {
    await expect(page.getByTestId(`world-${world}`)).toBeVisible();
    await expect(page.getByTestId(`world-art-${world}`)).toBeVisible();
  }
  await expect(page.locator('[data-testid^="world-art-"]')).toHaveCount(worlds.length);
});

test("skip link is the first keyboard stop and reaches main content", async ({ page }) => {
  await open(page, "/");
  await page.keyboard.press("Tab");
  const skip = page.locator('a[href="#main-content"]');
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("public surfaces pass WCAG 2.2 AA axe rules", async ({ page }) => {
  for (const path of PUBLIC_PAGES) {
    await open(page, path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      target: violation.nodes.map((node) => node.target.join(" "))
    }));
    expect(violations, `${path} has accessibility violations`).toEqual([]);
  }
});

test("the life desk passes WCAG 2.2 AA axe rules", async ({ page }) => {
  await open(page, "/create/hunter");
  await page.getByTestId("name-input").fill("Axe Walker");
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    target: violation.nodes.map((node) => node.target.join(" "))
  }));
  expect(violations).toEqual([]);
});

test("home transfer budget stays inside the regression ceiling", async ({ page }) => {
  await open(page, "/");
  await page.waitForTimeout(300);
  const sizes = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const sum = (predicate: (name: string) => boolean) =>
      resources.filter((entry) => predicate(entry.name)).reduce((total, entry) => total + (entry.encodedBodySize || 0), 0);
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return {
      js: sum((name) => name.includes("/_next/static/chunks/")),
      css: sum((name) => name.endsWith(".css")),
      font: sum((name) => name.endsWith(".woff2")),
      document: nav?.encodedBodySize || 0
    };
  });
  const total = sizes.js + sizes.css + sizes.font + sizes.document;
  expect(sizes.js, "initial JavaScript transfer").toBeLessThan(600_000);
  expect(total, "initial home transfer").toBeLessThan(750_000);
});
