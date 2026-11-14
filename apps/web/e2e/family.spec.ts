import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse-battery";

function email(): string {
  return `family-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function register(page: Page) {
  await page.goto("/account");
  await page.getByTestId("auth-tab-register").click();
  await page.getByTestId("auth-email").fill(email());
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("profile-edit")).toBeVisible();
}

test("гость видит приглашение войти, аккаунт основывает семью и открывает её", async ({ page, browser }) => {
  await page.goto("/social");
  await expect(page.getByTestId("family-guest")).toBeVisible();

  const familyName = `Дом Пепельного Пути ${Date.now().toString(36)}`;
  const account = await browser.newContext();
  const accountPage = await account.newPage();
  await register(accountPage);
  await accountPage.goto("/social");
  await expect(accountPage.getByTestId("family-create-open")).toBeVisible();
  await accountPage.getByTestId("family-create-open").click();
  await accountPage.getByTestId("family-name").fill(familyName);
  await accountPage.getByTestId("family-create").click();
  await expect(accountPage.getByTestId("family-detail")).toContainText(familyName);
  await expect(accountPage.getByTestId("family-detail")).toContainText("глава");
  expect(await accountPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await account.close();
});
