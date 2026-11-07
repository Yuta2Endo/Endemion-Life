import { expect, test, type Page } from "@playwright/test";

const WORLDS = ["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"] as const;

/** На телефоне колонки игры — вкладки: открыть нужную */
async function openTab(page: Page, tab: "event" | "character" | "people" | "timeline") {
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

/** Досье: на компьютере — под кнопками времени, на телефоне — отдельная вкладка «Жизнь» */
async function openDossier(page: Page) {
  const tab = page.getByTestId("tab-people");
  if (await tab.isVisible()) await tab.click();
  const dossier = page.getByTestId("dossier").locator("visible=true").first();
  await expect(dossier).toBeVisible();
  return dossier;
}

test("досье: биография, происхождение, семейное древо, навыки и шкалы мира", async ({ page }) => {
  await createLife(page, "dark-fantasy", "Гаррет");
  const dossier = await openDossier(page);
  await expect(dossier.getByTestId("dossier-bio")).toBeVisible();
  await expect(dossier.getByTestId("social-class")).not.toHaveText("—");
  await expect(dossier.getByTestId("world-meters").locator("[data-meter=corruption]")).toBeVisible();

  await dossier.getByTestId("dossier-tab-family").click();
  await expect(dossier.getByTestId("family-tree")).toBeVisible();
  await expect(dossier.getByTestId("tree-you")).toContainText("Гаррет");

  await dossier.getByTestId("dossier-tab-skills").click();
  await expect(dossier.getByTestId("dossier-skills")).toBeVisible();

  await dossier.getByTestId("dossier-tab-people").click();
  await expect(dossier.getByTestId("dossier-people")).toBeVisible();
});

/** Одно действие: ответить на событие или прожить год. Ждёт, пока сервер примет действие */
async function step(page: Page) {
  await openTab(page, "event");
  const screen = page.getByTestId("play-screen");
  const version = (await screen.getAttribute("data-version")) ?? "";
  const card = page.getByTestId("event-card");
  if (await card.isVisible()) await card.locator('[data-testid="choice"][data-available="true"]').first().click();
  else await page.getByTestId("advance-1").click();
  await expect(screen).not.toHaveAttribute("data-version", version);
}

test("общение с близким человеком меняет отношение и попадает в хронику", async ({ page }) => {
  await createLife(page, "academy", "Селестина");
  // Подрасти: разговор доступен с четырёх лет; событие должно быть закрыто, иначе общение недоступно
  for (let i = 0; i < 60; i++) {
    const age = Number.parseInt(await ageText(page), 10);
    await openTab(page, "event");
    if (age >= 5 && !(await page.getByTestId("event-card").isVisible())) break;
    await step(page);
  }

  const dossier = await openDossier(page);
  await dossier.getByTestId("dossier-tab-people").click();
  const npc = dossier.locator('[data-testid="npc"]').filter({ has: page.locator('[data-interaction="talk"]') }).first();
  await expect(npc).toBeVisible();
  const npcId = await npc.getAttribute("data-npc");
  const version = (await page.getByTestId("play-screen").getAttribute("data-version")) ?? "";
  await npc.locator('[data-interaction="talk"]').click();
  await expect(page.getByTestId("play-screen")).not.toHaveAttribute("data-version", version);

  // Разговор с этим человеком в этом году уже был
  const again = await openDossier(page);
  await again.getByTestId("dossier-tab-people").click();
  await expect(again.locator(`[data-npc="${npcId}"] [data-interaction="talk"]`)).toHaveCount(0);

  await openTab(page, "timeline");
  await expect(page.locator('[data-testid="timeline-entry"][data-kind="people"]').first()).toBeVisible();
});

test("досье переведено на английский", async ({ page }) => {
  await createLife(page, "hunter", "Kai Ren");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const dossier = await openDossier(page);
  await expect(dossier.getByRole("heading", { name: "Dossier" })).toBeVisible();
  await expect(dossier.getByTestId("dossier-tab-family")).toHaveText("Family");
  await expect(dossier.getByTestId("world-meters")).toContainText("Gate threat");
});

test("режим рубежей останавливает жизнь и показывает current summary", async ({ page }) => {
  await createLife(page, "academy", "Мира");
  await page.getByTestId("mode-milestones").click();
  await page.getByTestId("advance-10").click();
  await expect(page.getByTestId("event-card")).toBeVisible();
  await expect(page.getByTestId("play-screen")).toContainText("Возрастной рубеж");
  await openTab(page, "character");
  await expect(page.getByTestId("character-age")).toContainText("7");
});

test("живой мир доступен в досье и feed не ломает мобильную ширину", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createLife(page, "hunter", "Юна");
  await openTab(page, "people");
  await page.getByTestId("dossier-tab-world").click();
  await expect(page.getByTestId("world-panel")).toBeVisible();
  await expect(page.getByTestId("world-settlement").first()).toBeVisible();
  const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
