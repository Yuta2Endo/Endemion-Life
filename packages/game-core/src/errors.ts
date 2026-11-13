export const GAME_ERROR_CODES = [
  "INVALID_INPUT",
  "LIFE_ENDED",
  "EVENT_PENDING",
  "NO_PENDING_EVENT",
  "UNKNOWN_CHOICE",
  "CHOICE_LOCKED",
  "INVALID_SAVE",
  // Stage 03: продолжение рода
  "LIFE_NOT_ENDED",
  "HEIR_LOCKED",
  "LINEAGE_CONTINUED",
  // Stage 05: приключение недоступно (возраст, место, предпосылки, уже завершено)
  "ADVENTURE_LOCKED",
  // Stage 02.4: на дорогу до поселения не хватает золота
  "INSUFFICIENT_WEALTH"
] as const;
export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];

/** Действие нарушает правила игры. Сервер превращает такую ошибку в ответ 400/409 с кодом */
export class GameRuleError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message: string) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
}
