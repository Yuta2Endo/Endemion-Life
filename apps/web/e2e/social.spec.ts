import { expect, test, type Page } from "@playwright/test";

async function serverDown(page: Page) {
  await page.route("**/api/health", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"status":"down"}' }));
}

async function openPeople(page: Page) {
  const tab = page.getByTestId("tab-people");
  if (await tab.isVisible()) await tab.click();
  const dossier = page.getByTestId("dossier").locator("visible=true").first();
  await expect(dossier).toBeVisible();
  await dossier.getByTestId("dossier-tab-people").click();
  return dossier;
}

async function localLife(page: Page, name: string) {
  await serverDown(page);
  await page.goto("/create/academy");
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await expect(page.getByTestId("local-banner")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const card = page.getByTestId("event-card");
    if (await card.isVisible()) await card.locator("button:enabled").first().click();
    else await page.getByTestId("advance-1").click();
    await expect(page.getByTestId("play-screen")).toHaveAttribute("data-version", String(i + 2));
  }
}

test("досье показывает связи, стадию жизни и события NPC после нескольких лет", async ({ page }) => {
  await localLife(page, "Связной");
  const dossier = await openPeople(page);
  await expect(dossier.getByTestId("dossier-people")).toBeVisible();
  await expect(dossier.getByTestId("connections")).toBeVisible();
  await expect(dossier.getByTestId("npc-stage").first()).toBeVisible();
  await expect(dossier.getByTestId("npc").first()).toBeVisible();
});

test("новые блоки досье локализованы на английский", async ({ page }) => {
  await localLife(page, "Envoy");
  await page.getByRole("button", { name: "en", exact: true }).click();
  const dossier = await openPeople(page);
  await expect(dossier.getByTestId("connections")).toContainText("Connections");
  await expect(dossier.getByTestId("npc-stage").first()).toContainText("Life stage");
});
