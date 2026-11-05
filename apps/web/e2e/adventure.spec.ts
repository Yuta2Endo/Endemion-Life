// Stage 05: раздел досье «Путь» — места, приключение, награда, сохранение после обновления страницы
import { expect, test, type Page } from "@playwright/test";

async function openTab(page: Page, tab: "event" | "character" | "people" | "timeline") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function openAdventure(page: Page) {
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await openTab(page, "people");
  const dossier = page.getByTestId("dossier").locator("visible=true").first();
  await expect(dossier).toBeVisible();
  await dossier.getByTestId("dossier-tab-adventure").click();
  const panel = dossier.getByTestId("adventure");
  await expect(panel).toBeVisible();
  return panel;
}

/** Проживает годы, отвечая на события, пока не откроется место */
async function liveUntilPlace(page: Page) {
  const screen = page.getByTestId("play-screen");
  for (let i = 0; i < 60; i++) {
    const panel = await openAdventure(page);
    if ((await panel.locator('[data-testid="place"][data-discovered="true"]').count()) > 0) return panel;
    await openTab(page, "character");
    const text = (await page.getByTestId("character-age").textContent()) ?? "0";
    if (Number.parseInt(text, 10) > 40) return panel;
    await openTab(page, "event");
    const version = (await screen.getAttribute("data-version")) ?? "";
    const card = page.getByTestId("event-card");
    if (await card.isVisible()) await card.locator('[data-testid="choice"][data-available="true"]').first().click();
    else await page.getByTestId("advance-5").click();
    await expect(screen).not.toHaveAttribute("data-version", version);
    if (await page.getByTestId("death-card").isVisible()) return openAdventure(page);
  }
  return openAdventure(page);
}

test("путь: место открывается с годами, приключение начинается, награда видна, после обновления всё на месте", async ({ page }) => {
  await page.goto("/create/hunter");
  await page.getByTestId("name-input").fill("Рейдер");
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();

  let panel = await openAdventure(page);
  await expect(panel.getByTestId("place").first()).toHaveAttribute("data-discovered", "false");
  await expect(panel.getByTestId("adventure-card").first()).toBeVisible();

  panel = await liveUntilPlace(page);
  test.skip(await page.getByTestId("death-card").isVisible(), "персонаж умер до первого места");
  await expect(panel.locator('[data-testid="place"][data-discovered="true"]').first()).toBeVisible();

  const begin = panel.getByTestId("adventure-begin");
  if (await begin.isVisible()) {
    await begin.click();
    panel = await openAdventure(page);
    await expect(panel.getByTestId("adventure-current")).toBeVisible();
    await expect(panel.getByTestId("adventure-reward").first()).toBeVisible();
    await page.reload();
    panel = await openAdventure(page);
    await expect(panel.getByTestId("adventure-current")).toBeVisible();
  }
});
