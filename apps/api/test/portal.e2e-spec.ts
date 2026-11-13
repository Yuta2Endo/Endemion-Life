import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./helpers.js";

let disabled: TestApp;
let enabled: TestApp;

beforeAll(async () => {
  disabled = await createTestApp();
  enabled = await createTestApp({
    PORTAL_INTEGRATION_ENABLED: "true",
    PORTAL_JWT_ISSUER: "https://endemion.online",
    PORTAL_JWT_AUDIENCE: "https://life.endemion.online",
    PORTAL_JWKS_URL: "http://127.0.0.1:1/.well-known/jwks.json",
    PORTAL_JWKS_MIN_REFRESH_MS: "0"
  });
});

afterAll(async () => {
  await enabled?.app.close();
  await disabled?.app.close();
});

describe("Portal integration wiring", () => {
  it("disabled: route returns 404 and no-store", async () => {
    const res = await request(disabled.app.getHttpServer()).get("/api/portal/profile");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.headers["cache-control"]).toContain("no-store");
  });

  it("enabled: missing bearer returns 401 without exposing route internals", async () => {
    const res = await request(enabled.app.getHttpServer()).get("/api/portal/profile");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.headers["cache-control"]).toContain("no-store");
  });

  it("enabled: malformed bearer returns 401 INVALID_TOKEN", async () => {
    const res = await request(enabled.app.getHttpServer())
      .get("/api/portal/profile")
      .set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
    expect(res.headers["cache-control"]).toContain("no-store");
  });
});
