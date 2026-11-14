import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse-battery";

function uniqueEmail(): string {
  return `profile-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function createLife(page: Page, name: string) {
  await page.goto("/create/hunter");
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

test("профиль показывает статистику, редактируется и открывает публичную страницу", async ({ page }) => {
  await createLife(page, "Хроник Профиля");
  await page.goto("/account");
  await page.getByTestId("auth-tab-register").click();
  const email = uniqueEmail();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();

  await expect(page.getByTestId("profile-edit")).toBeVisible();
  await expect(page.getByTestId("profile-lives")).toContainText("Хроник Профиля");
  await expect(page.getByTestId("profile-badge").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.getByTestId("profile-edit").click();
  await page.getByTestId("profile-headline").fill("Голос Пепельного пути");
  await page.getByTestId("profile-bio").fill("Веду род через туман, пламя и память.");
  await page.getByTestId("profile-favorite").selectOption("dark-fantasy");
  await page.getByTestId("profile-visibility").selectOption("public");
  await page.getByTestId("profile-save").click();
  await expect(page.getByText("Голос Пепельного пути")).toBeVisible();

  await page.getByTestId("profile-public-link").click();
  await expect(page.getByTestId("public-profile")).toBeVisible();
  await expect(page.getByText("Голос Пепельного пути")).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
