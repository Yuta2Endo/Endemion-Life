import { describe, expect, it } from "vitest";
import { AppLogger, redact, requestContext, scrubText } from "./logger.js";

describe("логгер", () => {
  it("пароли, токены, cookie и коды не попадают в лог", () => {
    const value = redact({
      email: "a@b.co",
      password: "hunter2-secret",
      token: "abc",
      sessionId: "s1",
      code: "123456",
      nested: { authorization: "Bearer x", smtpUrl: "smtp://u:p@h", ok: 1 }
    }) as Record<string, unknown>;
    expect(value).toMatchObject({ email: "a@b.co", password: "[redacted]", token: "[redacted]", sessionId: "[redacted]", code: "[redacted]" });
    expect(value.nested).toEqual({ authorization: "[redacted]", smtpUrl: "[redacted]", ok: 1 });
  });

  it("пароль из адреса подключения и значение cookie сессии вырезаются из текста", () => {
    expect(scrubText("connect postgresql://user:s3cr3t@db:5432/x failed")).toBe("connect postgresql://user:***@db:5432/x failed");
    expect(scrubText("Cookie: el_session=AbC123_-xyz; other=1")).toBe("Cookie: el_session=***; other=1");
  });

  it("json: одна строка JSON с уровнем, контекстом и request id", () => {
    const lines: string[] = [];
    const logger = new AppLogger({ level: "info", format: "json" }, (line) => lines.push(line));
    requestContext.run({ requestId: "req-12345678" }, () => logger.warn({ msg: "медленно", durationMs: 1200, password: "x" }, "HTTP"));
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(record).toMatchObject({ level: "warn", context: "HTTP", msg: "медленно", requestId: "req-12345678", durationMs: 1200, password: "[redacted]" });
    expect(typeof record.time).toBe("string");
  });

  it("уровень отсекает менее важные сообщения", () => {
    const lines: string[] = [];
    const logger = new AppLogger({ level: "warn", format: "json" }, (line) => lines.push(line));
    logger.log("info");
    logger.debug("debug");
    logger.error("error");
    expect(lines.map((line) => (JSON.parse(line) as { level: string }).level)).toEqual(["error"]);
  });

  it("ошибка записывается с сообщением и стеком без секретов", () => {
    const lines: string[] = [];
    const logger = new AppLogger({ level: "info", format: "json" }, (line) => lines.push(line));
    logger.error({ msg: "сбой", error: new Error("no db at postgresql://u:pw@h/db") });
    const record = JSON.parse(lines[0]!) as { error: { message: string; stack: string } };
    expect(record.error.message).toBe("no db at postgresql://u:***@h/db");
    expect(record.error.stack).not.toContain(":pw@");
  });
});
