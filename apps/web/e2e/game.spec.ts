import { expect, test, type Page } from "@playwright/test";

const WORLDS = ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"] as const;

/** На телефоне колонки игры — вкладки: открыть нужную */
async function openTab(page: Page, tab: "event" | "character" | "timeline") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function createLife(page: Page, world: string, name: string) {
  await page.goto(`/create/${world}`);
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

async function ageText(page: Page) {
  await openTab(page, "character");
  return (await page.getByTestId("character-age").textContent()) ?? "";
}

test("главная страница и выбор мира", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const world of WORLDS) await expect(page.getByTestId(`world-${world}`)).toBeVisible();
  await page.getByTestId("start-life").click();
  await expect(page).toHaveURL(/\/worlds$/);
  for (const world of WORLDS) await expect(page.getByTestId(`world-${world}`)).toBeVisible();
});

test("сохранения идут в облако, когда сервер доступен", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("store-badge")).toHaveAttribute("data-kind", "cloud");
});

for (const world of WORLDS) {
  test(`можно родиться в мире ${world}`, async ({ page }) => {
    await createLife(page, world, "Тестовый Герой");
    await openTab(page, "character");
    await expect(page.getByTestId("character-name")).toHaveText("Тестовый Герой");
  });
}

test("время идёт, события дают выбор, выбор меняет персонажа и попадает в хронику", async ({ page }) => {
  await createLife(page, "isekai", "Лиора");
  expect(await ageText(page)).toMatch(/^0 /);

  await openTab(page, "event");
  await page.getByTestId("advance-1").click();
  await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", "2");
  expect(await ageText(page)).toMatch(/^1 /);

  // Проживаем годы, пока не наступит событие
  await openTab(page, "event");
  for (let i = 0; i < 40 && !(await page.getByTestId("event-card").isVisible()); i++) {
    const version = await page.getByTestId("play-screen").getAttribute("data-version");
    await page.getByTestId("advance-1").click();
    await expect(page.getByTestId("play-screen")).not.toHaveAttribute("data-version", version ?? "");
  }
  await expect(page.getByTestId("event-card")).toBeVisible();
  const choices = page.locator('[data-testid="choice"][data-available="true"]');
  expect(await choices.count()).toBeGreaterThan(0);

  const before = await page.getByTestId("play-screen").getAttribute("data-version");
  await choices.first().click();
  await expect(page.getByTestId("play-screen")).not.toHaveAttribute("data-version", before ?? "");
  await expect(page.getByTestId("outcome")).toBeVisible();

  await openTab(page, "timeline");
  await expect(page.getByTestId("decision").first()).toBeVisible();
  await expect(page.locator('[data-testid="timeline-entry"][data-kind="birth"]')).toBeVisible();
});

test("жизнь сохраняется на сервере и открывается после перезагрузки", async ({ page }) => {
  await createLife(page, "murim", "Лин Юэ");
  await openTab(page, "event");
  await page.getByTestId("advance-1").click();
  await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", "2");
  await page.reload();
  expect(await ageText(page)).toMatch(/^1 /);
  await page.goto("/");
  await expect(page.getByTestId("lives-list")).toContainText("Лин Юэ");
});

test("переключение языка", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One life. A thousand choices.");
});
