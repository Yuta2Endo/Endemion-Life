// Stage 04: раздел досье «Хозяйство» — пустое состояние ребёнка, доходы и расходы взрослого, язык, обновление страницы
import { expect, test, type Page } from "@playwright/test";

async function openTab(page: Page, tab: "event" | "character" | "people" | "timeline") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function openEconomy(page: Page) {
  // После обновления страницы вкладки появляются только когда жизнь загрузилась: isVisible() не ждёт
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await openTab(page, "people");
  const dossier = page.getByTestId("dossier").locator("visible=true");
  await expect(dossier).toBeVisible();
  await dossier.getByTestId("dossier-tab-economy").click();
  const panel = dossier.getByTestId("dossier-economy");
  await expect(panel).toBeVisible();
  return panel;
}

/** Проживает годы до возраста age: события получают первый доступный вариант */
async function liveTo(page: Page, age: number) {
  const screen = page.getByTestId("play-screen");
  for (let i = 0; i < 80; i++) {
    await openTab(page, "character");
    const text = (await page.getByTestId("character-age").textContent()) ?? "0";
    if (Number.parseInt(text, 10) >= age) return;
    await openTab(page, "event");
    const version = (await screen.getAttribute("data-version")) ?? "";
    const card = page.getByTestId("event-card");
    if (await card.isVisible()) await card.locator('[data-testid="choice"][data-available="true"]').first().click();
    else await page.getByTestId("advance-5").click();
    await expect(screen).not.toHaveAttribute("data-version", version);
    if (await page.getByTestId("death-card").isVisible()) return;
  }
}

test("хозяйство: у ребёнка — пояснение, у взрослого — статьи года, итог и состояние мира; после обновления на месте", async ({ page }) => {
  await page.goto("/create/isekai");
  await page.getByTestId("name-input").fill("Казначей");
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();

  let panel = await openEconomy(page);
  await expect(panel.getByTestId("economy-empty")).toBeVisible();
  await expect(panel.getByTestId("economy-cycle")).toBeVisible();
  // Положение в обществе: сословие и три фракции мира
  await expect(panel.getByTestId("society-class")).not.toHaveText("—");
  await expect(panel.getByTestId("society-factions").locator("li")).toHaveCount(3);

  await liveTo(page, 18);
  test.skip(await page.getByTestId("death-card").isVisible(), "персонаж умер раньше 18 лет при этом seed");
  panel = await openEconomy(page);
  const lines = panel.getByTestId("economy-lines");
  await expect(lines).toBeVisible();
  await expect(lines.locator('[data-line="living"]')).toBeVisible();
  // Итог года — сумма статей
  const amounts = await lines.locator("tbody tr").evaluateAll((rows) => rows.map((row) => Number(row.getAttribute("data-amount"))));
  const net = Number(await panel.getByTestId("economy-net").getAttribute("data-value"));
  expect(amounts.reduce((a, b) => a + b, 0)).toBe(net);
  const wealth = await panel.getByTestId("economy-wealth").textContent();

  await page.reload();
  panel = await openEconomy(page);
  await expect(panel.getByTestId("economy-wealth")).toHaveText(wealth ?? "");
  await expect(panel.getByTestId("economy-lines")).toBeVisible();

  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  panel = await openEconomy(page);
  await expect(panel).toContainText("Net for the year");
  await expect(panel.locator('[data-line="living"]')).toContainText("Cost of living");
  await expect(panel.getByTestId("economy-society")).toContainText("Standing in society");
});

test("вкладки досье доступны с клавиатуры, раздел хозяйства — в их числе", async ({ page }) => {
  await page.goto("/create/hunter");
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await openTab(page, "people");
  const tab = page.getByTestId("dossier").locator("visible=true").getByTestId("dossier-tab-economy");
  await tab.focus();
  await page.keyboard.press("Enter");
  await expect(tab).toHaveAttribute("aria-selected", "true");
  // Страница не шире экрана: на телефоне вкладки внизу остаются нажимаемыми
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
