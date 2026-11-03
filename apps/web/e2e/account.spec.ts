import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

// В разработке и в тестах API без SMTP пишет письма в файлы (MAIL_DRIVER=file, папка .mail-outbox в корне)
const OUTBOX = fileURLToPath(new URL("../../../.mail-outbox", import.meta.url));
const PASSWORD = "correct-horse-battery";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Последний код подтверждения, отправленный на адрес. Ждёт появления письма */
async function codeFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((name) => name.endsWith(".json")).sort().reverse();
    for (const name of files) {
      const message = JSON.parse(await readFile(join(OUTBOX, name), "utf8")) as { to: string; text: string };
      if (message.to !== email) continue;
      const code = message.text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Письмо с кодом для ${email} не найдено в ${OUTBOX}`);
}

async function createLife(page: Page, name: string) {
  await page.goto("/create/hunter");
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("create-submit").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

test("гость регистрируется, подтверждает почту, и его жизнь остаётся в аккаунте", async ({ page }) => {
  const email = uniqueEmail("register");
  await createLife(page, "Гость Ким");

  await page.goto("/account");
  await expect(page.getByTestId("guest-note")).toBeVisible();
  await page.getByTestId("auth-tab-register").click();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();

  await expect(page.getByTestId("account-email")).toHaveText(email);
  await expect(page.getByTestId("account-verified")).toHaveAttribute("data-verified", "false");
  await page.getByTestId("verify-code").fill(await codeFor(email));
  await page.getByTestId("verify-submit").click();
  await expect(page.getByTestId("account-verified")).toHaveAttribute("data-verified", "true");
  await expect(page.getByTestId("session-item")).toHaveCount(1);

  await page.goto("/");
  await expect(page.getByTestId("lives-list")).toContainText("Гость Ким");
  await expect(page.getByTestId("account-link")).toHaveAttribute("data-state", "account");
});

test("вход переносит жизнь гостя в существующий аккаунт; выход возвращает к гостю", async ({ page, browser }) => {
  const email = uniqueEmail("login");
  // Аккаунт создаётся в другом браузере
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/account");
  await otherPage.getByTestId("auth-tab-register").click();
  await otherPage.getByTestId("auth-email").fill(email);
  await otherPage.getByTestId("auth-password").fill(PASSWORD);
  await otherPage.getByTestId("auth-submit").click();
  await expect(otherPage.getByTestId("account-email")).toHaveText(email);

  // В этом браузере гость начинает жизнь, затем входит
  await createLife(page, "Странник Ён");
  await page.goto("/account");
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("auth-info")).toContainText("1");
  await expect(page.getByTestId("session-item")).toHaveCount(2);

  // Жизнь теперь видна и во втором браузере того же аккаунта
  await otherPage.goto("/");
  await expect(otherPage.getByTestId("lives-list")).toContainText("Странник Ён");

  // Выход со всех остальных устройств: второй браузер теряет доступ
  await page.getByTestId("revoke-others").click();
  await otherPage.goto("/account");
  await expect(otherPage.getByTestId("auth-submit")).toBeVisible();

  await page.getByTestId("logout").click();
  await expect(page.getByTestId("auth-submit")).toBeVisible();
  await other.close();
});

test("неверный пароль показывает ошибку и не входит", async ({ page }) => {
  await page.goto("/account");
  await page.getByTestId("auth-email").fill(uniqueEmail("nobody"));
  await page.getByTestId("auth-password").fill("wrong-password-1");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("account-view")).toHaveCount(0);
});
