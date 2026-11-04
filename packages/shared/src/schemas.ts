// Схемы запросов к API. Сервер проверяет ими всё, что приходит от клиента; сайт — то, что отправляет
import { GENDERS, INTERACTIONS, LOCALES, MAX_ADVANCE_YEARS, NAME_MAX_LENGTH, SEED_MAX_LENGTH, UNIVERSE_IDS } from "@endemion/game-core";
import { z } from "zod";

const optionId = z.string().regex(/^[a-z0-9-]{1,40}$/, "Некорректный идентификатор");

export const createLifeSchema = z.strictObject({
  universeId: z.enum(UNIVERSE_IDS),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  gender: z.enum(GENDERS).optional(),
  raceId: optionId.optional(),
  originId: optionId.optional(),
  temperamentId: optionId.optional(),
  /** Свой seed для воспроизводимой жизни. Без него сервер выбирает случайный */
  seed: z.string().min(1).max(SEED_MAX_LENGTH).optional()
});
export type CreateLifeRequest = z.infer<typeof createLifeSchema>;

export const gameActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("advance"), years: z.int().min(1).max(MAX_ADVANCE_YEARS).optional() }),
  z.strictObject({ type: z.literal("choose"), choiceId: optionId }),
  /** Личное общение с NPC: id из профиля жизни (n1, n2…) */
  z.strictObject({ type: z.literal("interact"), npcId: z.string().regex(/^n[0-9]{1,6}$/, "Некорректный идентификатор"), interaction: z.enum(INTERACTIONS) })
]);

export const actionRequestSchema = z.strictObject({
  /** Идентификатор действия от клиента: повторная отправка того же действия не применяет его дважды */
  actionId: z.uuid(),
  /** Версия состояния, которую видел игрок. Если она устарела, действие отклоняется */
  expectedVersion: z.int().min(1),
  action: gameActionSchema
});
export type ActionRequest = z.infer<typeof actionRequestSchema>;

export const restoreSchema = z.strictObject({
  /** Версия сохранения, к которой вернуться */
  version: z.int().min(1),
  /** Текущая версия, которую видел игрок */
  expectedVersion: z.int().min(1)
});
export type RestoreRequest = z.infer<typeof restoreSchema>;

export const historyQuerySchema = z.object({
  /** Записи с номером меньше этого: постраничная загрузка истории вглубь */
  before: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const localeSchema = z.enum(LOCALES);
export const uuidSchema = z.uuid();
