-- Вход через Endemion ID (auth.endemion.online, OpenID Connect).
-- Только новые столбцы и таблица: аккаунты, гостевые сессии и сохранения не меняются.
-- Откат без восстановления базы: ENDEMION_ID=false, и старый вход по почте снова работает

-- Постоянный идентификатор пользователя в Endemion ID (claim sub). Жизни и действия привязаны к игроку,
-- игрок — к sub. Смена username или почты в Endemion ID не меняет ни игрока, ни прогресс
ALTER TABLE "players" ADD COLUMN "endemion_sub" UUID;
-- Профиль из Endemion ID для показа в игре. Обновляется при каждой сверке сессии
ALTER TABLE "players" ADD COLUMN "id_username" VARCHAR(24);
ALTER TABLE "players" ADD COLUMN "id_display_name" VARCHAR(40);
ALTER TABLE "players" ADD COLUMN "id_avatar_url" VARCHAR(512);
ALTER TABLE "players" ADD COLUMN "id_email" VARCHAR(254);
CREATE UNIQUE INDEX "players_endemion_sub_key" ON "players"("endemion_sub");

-- Сессия после входа через Endemion ID: зашифрованный refresh token и время сверок с провайдером
ALTER TABLE "sessions" ADD COLUMN "refresh_token" TEXT;
ALTER TABLE "sessions" ADD COLUMN "refreshed_at" TIMESTAMPTZ(3);
ALTER TABLE "sessions" ADD COLUMN "last_ok_at" TIMESTAMPTZ(3);

-- Начатые входы: PKCE verifier, nonce и страница возврата. Ключ — SHA-256 от state из cookie браузера
CREATE TABLE "oidc_logins" (
    "state_hash" CHAR(64) NOT NULL,
    "code_verifier" VARCHAR(128) NOT NULL,
    "nonce" VARCHAR(128) NOT NULL,
    "return_to" VARCHAR(512) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "oidc_logins_pkey" PRIMARY KEY ("state_hash")
);
CREATE INDEX "oidc_logins_expires_at_idx" ON "oidc_logins"("expires_at");
