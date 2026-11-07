// Схемы запросов к API. Сервер проверяет ими всё, что приходит от клиента; сайт — то, что отправляет
import { AUTO_MODES, CHANGE_KINDS, GENDERS, HISTORY_KINDS, INTERACTIONS, LOCALES, MAX_ADVANCE_YEARS, MAX_TRADE_QTY, NAME_MAX_LENGTH, SEED_MAX_LENGTH, TRADE_SIDES, UNIVERSE_IDS } from "@endemion/game-core";
import { z } from "zod";

/** id контента: буквы, цифры, дефис и точка (места и приключения — «мир.имя») */
const optionId = z.string().regex(/^[a-z0-9-]{1,40}$/, "Некорректный идентификатор");
const contentId = z.string().regex(/^[a-z0-9.-]{1,40}$/, "Некорректный идентификатор");

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
  z.strictObject({ type: z.literal("setMode"), mode: z.enum(AUTO_MODES) }),
  z.strictObject({ type: z.literal("choose"), choiceId: optionId }),
  /** Личное общение с NPC: id из профиля жизни (n1, n2…) */
  z.strictObject({ type: z.literal("interact"), npcId: z.string().regex(/^n[0-9]{1,6}$/, "Некорректный идентификатор"), interaction: z.enum(INTERACTIONS) }),
  /** Stage 04: купить или продать товар рынка. Клиент называет товар, сторону и количество; цену считает сервер */
  z.strictObject({ type: z.literal("trade"), goodId: optionId, side: z.enum(TRADE_SIDES), qty: z.int().min(1).max(MAX_TRADE_QTY) }),
  /** Stage 05: начать приключение (adventureId), сделать шаг (choiceId) или сдаться (пустое) */
  z.strictObject({ type: z.literal("venture"), adventureId: contentId.optional(), choiceId: optionId.optional() })
]);

export const actionRequestSchema = z.strictObject({
  /** Идентификатор действия от клиента: повторная отправка того же действия не применяет его дважды */
  actionId: z.uuid(),
  /** Версия состояния, которую видел игрок. Если она устарела, действие отклоняется */
  expectedVersion: z.int().min(1),
  action: gameActionSchema
});
export type ActionRequest = z.infer<typeof actionRequestSchema>;

/**
 * Продолжить род за наследника. Клиент называет только наследника: кто может наследовать, что он получит
 * и какой будет новая жизнь, решает сервер
 */
export const successionSchema = z.strictObject({
  /** Повторная отправка с тем же actionId возвращает ту же новую жизнь */
  actionId: z.uuid(),
  expectedVersion: z.int().min(1),
  heirId: z.string().regex(/^n[0-9]{1,6}$/, "Некорректный идентификатор")
});
export type SuccessionRequest = z.infer<typeof successionSchema>;

export const restoreSchema = z.strictObject({
  /** Версия сохранения, к которой вернуться */
  version: z.int().min(1),
  /** Текущая версия, которую видел игрок */
  expectedVersion: z.int().min(1),
  /**
   * Ключ этого отката. Повтор с тем же ключом возвращает тот же результат и не откатывает второй раз.
   * Старые клиенты ключ не шлют: для них откат остаётся как был
   */
  actionId: z.uuid().optional()
});
export type RestoreRequest = z.infer<typeof restoreSchema>;

export const historyQuerySchema = z.object({
  /** Записи с номером меньше этого: постраничная загрузка истории вглубь */
  before: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

/** Stage 04: столько записей истории хранит браузер (lib/store/local.ts) — больше при переносе не принимается */
export const IMPORT_MAX_HISTORY = 2000;

const textSchema = z.strictObject({ ru: z.string().max(4000), en: z.string().max(4000) });

/** Запись истории из браузера. Это только текст для хронологии: на состояние игры она не влияет, но проверяется строго */
const importEntrySchema = z.strictObject({
  seq: z.int().min(1),
  age: z.int().min(0),
  kind: z.enum(HISTORY_KINDS),
  title: textSchema,
  text: textSchema,
  eventId: z.string().max(80).optional(),
  choiceId: z.string().max(80).optional(),
  choice: textSchema.optional(),
  outcome: textSchema.optional(),
  sourceEventId: z.string().max(80).optional(),
  consequenceOf: z.string().max(80).optional(),
  check: z.strictObject({ chance: z.number().min(0).max(1), success: z.boolean() }).optional(),
  changes: z
    .array(
      z.strictObject({
        kind: z.enum(CHANGE_KINDS),
        key: z.string().max(80).optional(),
        delta: z.number().finite().optional(),
        value: z.union([z.number().finite(), z.string().max(200)]).optional()
      })
    )
    .max(100)
});

/**
 * Stage 04: перенос жизни из браузера на сервер. state проверяет game-core (parseSave и prepareImport):
 * схема здесь только ограничивает форму. Повтор с тем же importId возвращает ту же жизнь
 */
export const importLifeSchema = z.strictObject({
  importId: z.uuid(),
  state: z.record(z.string(), z.unknown()),
  history: z.array(importEntrySchema).max(IMPORT_MAX_HISTORY)
});
export type ImportLifeRequest = z.infer<typeof importLifeSchema>;

export const localeSchema = z.enum(LOCALES);
export const uuidSchema = z.uuid();
