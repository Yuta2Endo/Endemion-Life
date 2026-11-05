-- Stage 16: журнал фактов. Только новая таблица. Жизни не меняются.
CREATE TABLE "insights" (
  "id" UUID NOT NULL,
  "name" VARCHAR(24) NOT NULL,
  "world" VARCHAR(32) NOT NULL DEFAULT '',
  "age" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 0,
  "amount" INTEGER NOT NULL DEFAULT 0,
  "ref" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insights_name_ref_key" ON "insights"("name", "ref");
CREATE INDEX "insights_created_at_idx" ON "insights"("created_at");
CREATE INDEX "insights_name_created_at_idx" ON "insights"("name", "created_at");
