// Stage 04: локальный режим и перенос жизни на сервер. Недоступность сервера имитируется ответом 503 на /api/health
import { expect, test, type Page } from "@playwright/test";

async function serverDown(page: Page) {
  await page.route("**/api/health", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"status":"down"}' }));
}

async function openTab(page: Page, tab: "event" | "character" | "timeline") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

/** Локальная жизнь: сервер «недоступен» при создании, несколько ходов в браузере */
async function localLife(page: Page, name: string): Promise<string> {
  await serverDown(page);
  await page.goto("/create/murim");
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await expect(page).toHaveURL(/\/play\/local-/);
  await expect(page.getByTestId("local-banner")).toBeVisible();
  await openTab(page, "event");
  for (let i = 0; i < 3; i++) {
    const card = page.getByTestId("event-card");
    if (await card.isVisible()) await card.locator("button:enabled").first().click();
    else await page.getByTestId("advance-1").click();
    await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", String(i + 2));
  }
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

test("без сервера жизнь создаётся в браузере; предупреждение видно и на телефоне; после обновления она на месте", async ({ page }) => {
  const id = await localLife(page, "Локальный Странник");
  await expect(page.getByTestId("store-badge")).toHaveAttribute("data-kind", "local");
  await expect(page.getByTestId("store-badge")).toBeVisible();
  // Страница не шире экрана: иначе на телефоне фиксированные вкладки внизу перестают нажиматься
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.reload();
  await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", "4");
  await page.goto("/");
  await expect(page.getByTestId("lives-list").getByRole("link", { name: /Локальный Странник/ })).toBeVisible();
  await expect(page.getByTestId("life-local").first()).toBeVisible();
  expect(id.startsWith("local-")).toBe(true);
});

test("перенос на сервер: жизнь продолжается в облаке, копия в браузере закрыта, в списке одна запись", async ({ page }) => {
  const localId = await localLife(page, "Переселенец");
  await openTab(page, "character");
  const age = await page.getByTestId("character-age").textContent();

  await page.unroute("**/api/health");
  await page.getByTestId("move-to-cloud").click();
  await expect(page).not.toHaveURL(/local-/);
  await expect(page.getByTestId("local-banner")).toHaveCount(0);
  await openTab(page, "character");
  await expect(page.getByTestId("character-name")).toHaveText("Переселенец");
  await expect(page.getByTestId("character-age")).toHaveText(age ?? "");
  await openTab(page, "timeline");
  await expect(page.getByText(/Жизнь перенесена из браузера/)).toBeVisible();

  // Ход на сервере
  await openTab(page, "event");
  const version = Number(await page.getByTestId("play-screen").getAttribute("data-version"));
  const card = page.getByTestId("event-card");
  if (await card.isVisible()) await card.locator("button:enabled").first().click();
  else await page.getByTestId("advance-1").click();
  await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", String(version + 1));
  const cloudId = new URL(page.url()).pathname.split("/").at(-1)!;

  // Старая ссылка на браузерную копию ведёт к жизни на сервере; в списке жизнь одна и уже не «в браузере»
  await page.goto(`/play/${localId}`);
  await expect(page).toHaveURL(new RegExp(`/play/${cloudId}$`));
  await page.goto("/");
  await expect(page.getByTestId("lives-list").getByRole("link", { name: /Переселенец/ })).toHaveCount(1);
  await expect(page.getByTestId("lives-list").getByRole("link", { name: /Переселенец/ }).getByTestId("life-local")).toHaveCount(0);
});

test("ошибка связи при переносе: жизнь остаётся в браузере, повтор переносит её один раз", async ({ page }) => {
  await localLife(page, "Терпеливый");
  await page.unroute("**/api/health");
  let failures = 0;
  await page.route("**/api/lives/import", (route) => {
    failures += 1;
    return route.abort("connectionrefused");
  });
  await page.getByTestId("move-to-cloud").click();
  await expect(page.getByTestId("move-message")).toBeVisible();
  expect(failures).toBeGreaterThanOrEqual(1);
  await expect(page).toHaveURL(/\/play\/local-/);
  await expect(page.getByTestId("local-banner")).toBeVisible();

  await page.unroute("**/api/lives/import");
  await page.getByTestId("move-to-cloud").click();
  await expect(page).not.toHaveURL(/local-/);
  await page.goto("/");
  await expect(page.getByTestId("lives-list").getByRole("link", { name: /Терпеливый/ })).toHaveCount(1);
});

test("предупреждение и перенос на английском", async ({ page }) => {
  await localLife(page, "Wanderer");
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("local-banner")).toContainText("stored only in this browser");
  await expect(page.getByTestId("move-to-cloud")).toHaveText("Move to the server");
});
