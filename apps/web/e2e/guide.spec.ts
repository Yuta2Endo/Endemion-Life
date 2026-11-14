import { expect, test } from "@playwright/test";

test("первый жизненный гид объясняет главу и ведёт к следующему году", async ({ page }) => {
  await page.goto("/create/hunter");
  await page.getByTestId("name-input").fill("Гид Первой Жизни");
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await expect(page.getByTestId("life-guide")).toBeVisible();
  await expect(page.getByTestId("life-guide")).toContainText("Ранние годы");
  await expect(page.getByTestId("guide-checklist")).toBeVisible();
  await page.getByTestId("guide-next").click();
  await expect(page.getByTestId("character-age")).toContainText("1");
  await expect(page.getByTestId("life-guide")).toBeVisible();
});
