import { expect, test, type Page } from "@playwright/test";

/**
 * Stage 03: жизнь до конца, итоги, род, выбор наследника и следующее поколение.
 * При этом seed и политике «первый доступный вариант, иначе 10 лет» жизнь кончается примерно за 34 хода и оставляет наследников
 */
const DEATH_SEED = "e2e-legacy-hunter-244";

async function openTab(page: Page, tab: "event" | "character" | "people" | "timeline") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function createWithSeed(page: Page, world: string, seed: string) {
  await page.goto(`/create/${world}`);
  await page.getByTestId("create-choose").click();
  await page.getByTestId("create-step-3").click();
  await page.getByTestId("create-advanced").click();
  await page.getByTestId("seed-input").fill(seed);
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

/** Проживает жизнь через интерфейс до конца: только кнопки, исходы считает сервер */
async function liveToDeath(page: Page) {
  const screen = page.getByTestId("play-screen");
  for (let i = 0; i < 120; i++) {
    await openTab(page, "event");
    if (await page.getByTestId("death-card").isVisible()) return;
    const version = (await screen.getAttribute("data-version")) ?? "";
    const card = page.getByTestId("event-card");
    if (await card.isVisible()) await card.locator('[data-testid="choice"][data-available="true"]').first().click();
    else await page.getByTestId("advance-10").click();
    await expect(screen).not.toHaveAttribute("data-version", version);
  }
  await expect(page.getByTestId("death-card")).toBeVisible();
}

async function openLineage(page: Page) {
  await openTab(page, "people");
  const dossier = page.getByTestId("dossier").locator("visible=true").first();
  await expect(dossier).toBeVisible();
  await dossier.getByTestId("dossier-tab-lineage").click();
  await expect(dossier.getByTestId("lineage-panel")).toBeVisible();
  return dossier;
}

/** Выбирает первого доступного наследника и подтверждает. Возвращает его имя */
async function continueWithHeir(page: Page): Promise<string> {
  await openTab(page, "event");
  const selection = page.getByTestId("legacy-selection");
  await expect(selection).toBeVisible();
  const heir = selection.locator('[data-testid="heir"][data-available="true"]').first();
  const name = (await heir.getAttribute("data-name")) ?? "";
  expect(name.length).toBeGreaterThan(0);
  await heir.getByTestId("choose-heir").click();
  const dialog = page.getByTestId("heir-confirm");
  await expect(dialog).toBeVisible();
  // Отмена ничего не меняет
  await dialog.getByTestId("heir-confirm-no").click();
  await expect(dialog).toBeHidden();
  await heir.getByTestId("choose-heir").click();
  await dialog.getByTestId("heir-confirm-yes").click();
  return name;
}

test("компьютер и телефон: жизнь, итоги, род, наследник и следующее поколение", async ({ page }) => {
  test.setTimeout(180_000);
  await createWithSeed(page, "hunter", DEATH_SEED);
  const firstUrl = page.url();
  await liveToDeath(page);

  // Итоги жизни: оценка, звание, ключевые решения, наследники
  const summary = page.getByTestId("death-card");
  await expect(summary.getByTestId("life-score")).toBeVisible();
  await expect(summary.getByTestId("life-title")).not.toBeEmpty();
  await expect(summary.getByTestId("key-decisions")).toBeVisible();
  expect(await summary.locator('[data-testid="heir"][data-available="true"]').count()).toBeGreaterThan(0);
  await expect(page.getByTestId("advance-1")).toHaveCount(0);

  // Род: древо с умершим персонажем и наследниками, карточка человека, хроника рода, достижения
  const dossier = await openLineage(page);
  const tree = dossier.getByTestId("family-tree");
  await expect(tree).toBeVisible();
  await expect(tree.getByTestId("tree-you")).toHaveAttribute("data-alive", "false");
  await expect(tree.locator('[data-heir="true"]').first()).toBeVisible();
  await tree.locator('[data-testid="tree-node"]').first().click();
  await expect(dossier.getByTestId("person-card")).toBeVisible();
  const zoom = dossier.getByTestId("tree-scroll");
  await dossier.getByTestId("tree-zoom-in").click();
  await expect(zoom).toHaveAttribute("data-zoom", "2");

  await dossier.getByTestId("lineage-tab-chronicle").click();
  await expect(dossier.locator('[data-testid="chronicle-entry"][data-kind="origin"]')).toBeVisible();
  await expect(dossier.locator('[data-testid="chronicle-entry"][data-kind="death"]').first()).toBeVisible();
  await dossier.getByTestId("lineage-tab-achievements").click();
  await expect(dossier.getByTestId("achievements")).toBeVisible();

  // Продолжить за наследника: новая жизнь с новым адресом, второе поколение
  const heirName = await continueWithHeir(page);
  await expect(page).not.toHaveURL(firstUrl);
  await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", "1");
  await openTab(page, "character");
  await expect(page.getByTestId("character-name")).toHaveText(heirName);

  const next = await openLineage(page);
  await expect(next.getByTestId("lineage-panel")).toContainText("2");
  await next.getByTestId("lineage-tab-inheritance").click();
  await expect(next.getByTestId("inherit-gold")).toBeVisible();
  await next.getByTestId("lineage-tab-chronicle").click();
  await expect(next.locator('[data-testid="chronicle-entry"][data-kind="succession"]')).toBeVisible();
  await next.getByTestId("lineage-tab-tree").click();
  await expect(next.getByTestId("tree-you")).toContainText(heirName);

  // Жизнь наследника продолжается
  await openTab(page, "event");
  const screen = page.getByTestId("play-screen");
  const card = page.getByTestId("event-card");
  if (await card.isVisible()) await card.locator('[data-testid="choice"][data-available="true"]').first().click();
  else await page.getByTestId("advance-1").click();
  await expect(screen).toHaveAttribute("data-version", "2");

  // Прошлое поколение закрыто: открывается с итогами, род продолжен
  await page.goto(firstUrl);
  await openTab(page, "event");
  await expect(page.getByTestId("continued")).toContainText(heirName);
  await page.goto("/");
  await expect(page.getByTestId("lives-list")).toContainText(heirName);
});

test("итоги жизни и род на английском", async ({ page }) => {
  test.setTimeout(180_000);
  await createWithSeed(page, "hunter", DEATH_SEED);
  await liveToDeath(page);
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await openTab(page, "event");
  await expect(page.getByTestId("death-card")).toContainText("A life in review");
  await expect(page.getByTestId("legacy-selection")).toContainText("Continue the family");
  const dossier = await openLineage(page);
  await expect(dossier.getByTestId("dossier-tab-lineage")).toHaveText("Lineage");
  await dossier.getByTestId("lineage-tab-chronicle").click();
  await expect(dossier.locator('[data-testid="chronicle-entry"][data-kind="origin"]')).toContainText("line begins");
});
