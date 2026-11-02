import type { Locale } from "@endemion/game-core";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, msg, toLocale, type MessageKey, type MessageVars } from "./messages";

/** Язык из cookie. Сервер и браузер рисуют страницу на одном языке, без мерцания при загрузке */
export async function getLocale(): Promise<Locale> {
  return toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** Тексты интерфейса для серверных компонентов */
export async function getServerI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: MessageKey, vars?: MessageVars) => msg(locale, key, vars)
  };
}
