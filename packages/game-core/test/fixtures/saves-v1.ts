// Сохранения формата 1, записанные игрой Stage 01 (SAVE_SCHEMA_VERSION = 1) до изменений Stage 02.
// Не редактировать: по ним проверяется перевод старых сохранений
export const SAVES_V1: Record<string, unknown> = {
 "dark-fantasy-young": {
  "schemaVersion": 1,
  "seed": "v1-dark-fantasy-young",
  "rngState": 1274679357,
  "version": 7,
  "character": {
   "name": "Вейла Пепельный",
   "gender": "female",
   "universeId": "dark-fantasy",
   "raceId": "human",
   "originId": "peasant",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 10,
    "intelligence": 9,
    "agility": 8,
    "vitality": 7,
    "wisdom": 7,
    "charisma": 9,
    "luck": 7,
    "willpower": 11
   },
   "resources": {
    "health": 68,
    "energy": 82,
    "mana": 42,
    "stamina": 74
   },
   "level": 1,
   "xp": 5,
   "reputation": 0,
   "karma": 0,
   "wealth": 3,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 5,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [],
  "occurrences": {
   "common.fever": 1,
   "common.first-friend": 1
  },
  "lastSeen": {
   "common.fever": 2,
   "common.first-friend": 5
  },
  "pending": {
   "eventId": "common.first-friend",
   "age": 5
  },
  "scheduled": [],
  "nextSeq": 8
 },
 "dark-fantasy-adult": {
  "schemaVersion": 1,
  "seed": "v1-dark-fantasy-adult",
  "rngState": 139163355,
  "version": 61,
  "character": {
   "name": "Катрис Пепельный",
   "gender": "female",
   "universeId": "dark-fantasy",
   "raceId": "graveborn",
   "originId": "mist-touched",
   "temperamentId": "brave",
   "stats": {
    "strength": 22,
    "intelligence": 16,
    "agility": 6,
    "vitality": 16,
    "wisdom": 11,
    "charisma": 15,
    "luck": 12,
    "willpower": 16
   },
   "resources": {
    "health": 156,
    "energy": 100,
    "mana": 104,
    "stamina": 126
   },
   "level": 3,
   "xp": 139,
   "reputation": 20,
   "karma": 50,
   "wealth": 202,
   "abilities": [
    "ember-ward"
   ],
   "track": {
    "points": 109,
    "rank": 2
   }
  },
  "life": {
   "age": 37,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "mist-mark",
   "childhood-friend",
   "mentor",
   "oath-sworn",
   "order-oath",
   "profession",
   "job-guard",
   "in-love",
   "married"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.study-or-play": 2,
   "common.lost-purse": 2,
   "df.plague": 2,
   "common.mentor": 1,
   "df.hollow": 3,
   "df.oath": 1,
   "common.calling": 1,
   "df.trial": 3,
   "df.relic": 2,
   "common.trade-offer": 2,
   "common.first-love": 1,
   "common.love-test": 1,
   "common.heir": 1
  },
  "lastSeen": {
   "common.night-fear": 4,
   "common.first-friend": 5,
   "common.study-or-play": 11,
   "common.lost-purse": 36,
   "df.plague": 33,
   "common.mentor": 13,
   "df.hollow": 27,
   "df.oath": 16,
   "common.calling": 17,
   "df.trial": 30,
   "df.relic": 35,
   "common.trade-offer": 34,
   "common.first-love": 29,
   "common.love-test": 32,
   "common.heir": 37
  },
  "pending": {
   "eventId": "common.heir",
   "age": 37
  },
  "scheduled": [],
  "nextSeq": 62
 },
 "isekai-young": {
  "schemaVersion": 1,
  "seed": "v1-isekai-young",
  "rngState": 3191568551,
  "version": 7,
  "character": {
   "name": "Аннет Брайт",
   "gender": "female",
   "universeId": "isekai",
   "raceId": "elf",
   "originId": "villager",
   "temperamentId": "cunning",
   "stats": {
    "strength": 5,
    "intelligence": 10,
    "agility": 12,
    "vitality": 9,
    "wisdom": 5,
    "charisma": 9,
    "luck": 10,
    "willpower": 7
   },
   "resources": {
    "health": 76,
    "energy": 74,
    "mana": 40,
    "stamina": 68
   },
   "level": 1,
   "xp": 0,
   "reputation": 0,
   "karma": -5,
   "wealth": 8,
   "abilities": [
    "modern-knowledge"
   ],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 4,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "reincarnated",
   "remembers"
  ],
  "occurrences": {
   "common.fever": 1,
   "is.memories": 1,
   "common.night-fear": 1
  },
  "lastSeen": {
   "common.fever": 2,
   "is.memories": 3,
   "common.night-fear": 4
  },
  "pending": {
   "eventId": "common.night-fear",
   "age": 4
  },
  "scheduled": [],
  "nextSeq": 8
 },
 "isekai-adult": {
  "schemaVersion": 1,
  "seed": "v1-isekai-adult",
  "rngState": 3955996034,
  "version": 61,
  "character": {
   "name": "Кайра Брайт",
   "gender": "female",
   "universeId": "isekai",
   "raceId": "human",
   "originId": "merchant-child",
   "temperamentId": "brave",
   "stats": {
    "strength": 20,
    "intelligence": 15,
    "agility": 10,
    "vitality": 15,
    "wisdom": 13,
    "charisma": 17,
    "luck": 10,
    "willpower": 16
   },
   "resources": {
    "health": 144,
    "energy": 92,
    "mana": 110,
    "stamina": 112
   },
   "level": 3,
   "xp": 15,
   "reputation": 30,
   "karma": 15,
   "wealth": 327,
   "abilities": [
    "modern-knowledge",
    "appraisal"
   ],
   "track": {
    "points": 45,
    "rank": 2
   }
  },
  "life": {
   "age": 37,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "reincarnated",
   "remembers",
   "childhood-friend",
   "mentor",
   "profession",
   "job-guard"
  ],
  "occurrences": {
   "is.memories": 1,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.fever": 1,
   "common.study-or-play": 1,
   "common.lost-purse": 1,
   "common.mentor": 1,
   "is.invention": 3,
   "is.slime": 5,
   "is.exam": 4,
   "common.calling": 1,
   "common.first-love": 1,
   "common.trade-offer": 2
  },
  "lastSeen": {
   "is.memories": 3,
   "common.night-fear": 4,
   "common.first-friend": 5,
   "common.fever": 7,
   "common.study-or-play": 8,
   "common.lost-purse": 13,
   "common.mentor": 15,
   "is.invention": 33,
   "is.slime": 32,
   "is.exam": 37,
   "common.calling": 21,
   "common.first-love": 28,
   "common.trade-offer": 35
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 62
 },
 "murim-young": {
  "schemaVersion": 1,
  "seed": "v1-murim-young",
  "rngState": 2398533487,
  "version": 7,
  "character": {
   "name": "Цзян Хо клана Су",
   "gender": "male",
   "universeId": "murim",
   "raceId": "human",
   "originId": "clan-heir",
   "temperamentId": "calm",
   "stats": {
    "strength": 8,
    "intelligence": 6,
    "agility": 6,
    "vitality": 8,
    "wisdom": 13,
    "charisma": 10,
    "luck": 6,
    "willpower": 12
   },
   "resources": {
    "health": 72,
    "energy": 84,
    "mana": 48,
    "stamina": 72
   },
   "level": 1,
   "xp": 0,
   "reputation": 10,
   "karma": 0,
   "wealth": 60,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 4,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "martial-school"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.night-fear": 1,
   "common.first-friend": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "common.night-fear": 3,
   "common.first-friend": 4
  },
  "pending": {
   "eventId": "common.first-friend",
   "age": 4
  },
  "scheduled": [],
  "nextSeq": 8
 },
 "murim-adult": {
  "schemaVersion": 1,
  "seed": "v1-murim-adult",
  "rngState": 1731284935,
  "version": 61,
  "character": {
   "name": "Мэй Инь клана Лун",
   "gender": "female",
   "universeId": "murim",
   "raceId": "human",
   "originId": "clan-heir",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 18,
    "intelligence": 21,
    "agility": 11,
    "vitality": 6,
    "wisdom": 15,
    "charisma": 13,
    "luck": 10,
    "willpower": 19
   },
   "resources": {
    "health": 89,
    "energy": 98,
    "mana": 102,
    "stamina": 90
   },
   "level": 3,
   "xp": 152,
   "reputation": 35,
   "karma": 30,
   "wealth": 0,
   "abilities": [],
   "track": {
    "points": 55,
    "rank": 1
   }
  },
  "life": {
   "age": 37,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "martial-school",
   "childhood-friend",
   "in-love",
   "married",
   "has-child"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.fever": 2,
   "common.study-or-play": 2,
   "common.lost-purse": 1,
   "mu.bottleneck": 5,
   "mu.duel": 5,
   "common.first-love": 1,
   "common.love-test": 1,
   "common.trade-offer": 1,
   "common.heir": 2,
   "mu.manual": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "common.night-fear": 3,
   "common.first-friend": 4,
   "common.fever": 29,
   "common.study-or-play": 9,
   "common.lost-purse": 10,
   "mu.bottleneck": 37,
   "mu.duel": 36,
   "common.first-love": 16,
   "common.love-test": 19,
   "common.trade-offer": 20,
   "common.heir": 33,
   "mu.manual": 24
  },
  "pending": {
   "eventId": "mu.bottleneck",
   "age": 37
  },
  "scheduled": [],
  "nextSeq": 62
 },
 "xianxia-young": {
  "schemaVersion": 1,
  "seed": "v1-xianxia-young",
  "rngState": 765587077,
  "version": 7,
  "character": {
   "name": "Жоу Янь Нефритовой реки",
   "gender": "female",
   "universeId": "xianxia",
   "raceId": "half-dragon",
   "originId": "beggar",
   "temperamentId": "kind",
   "stats": {
    "strength": 6,
    "intelligence": 5,
    "agility": 7,
    "vitality": 9,
    "wisdom": 7,
    "charisma": 11,
    "luck": 9,
    "willpower": 10
   },
   "resources": {
    "health": 76,
    "energy": 80,
    "mana": 34,
    "stamina": 70
   },
   "level": 1,
   "xp": 6,
   "reputation": 0,
   "karma": 10,
   "wealth": 0,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 5,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [],
  "occurrences": {
   "common.night-fear": 1,
   "common.first-friend": 1
  },
  "lastSeen": {
   "common.night-fear": 4,
   "common.first-friend": 5
  },
  "pending": {
   "eventId": "common.first-friend",
   "age": 5
  },
  "scheduled": [],
  "nextSeq": 8
 },
 "xianxia-adult": {
  "schemaVersion": 1,
  "seed": "v1-xianxia-adult",
  "rngState": 3216162218,
  "version": 61,
  "character": {
   "name": "Тянь Ло долины Ветров",
   "gender": "male",
   "universeId": "xianxia",
   "raceId": "half-dragon",
   "originId": "farm-child",
   "temperamentId": "curious",
   "stats": {
    "strength": 13,
    "intelligence": 25,
    "agility": 9,
    "vitality": 11,
    "wisdom": 8,
    "charisma": 9,
    "luck": 20,
    "willpower": 12
   },
   "resources": {
    "health": 140,
    "energy": 88,
    "mana": 122,
    "stamina": 96
   },
   "level": 3,
   "xp": 59,
   "reputation": 41,
   "karma": 25,
   "wealth": 271,
   "abilities": [
    "alchemy",
    "flying-sword"
   ],
   "track": {
    "points": 70,
    "rank": 2
   }
  },
  "life": {
   "age": 37,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend",
   "spirit-root",
   "profession",
   "job-guard"
  ],
  "occurrences": {
   "common.fever": 3,
   "common.first-friend": 1,
   "xx.root-test": 1,
   "common.night-fear": 1,
   "common.study-or-play": 1,
   "xx.tribulation": 4,
   "xx.herb": 4,
   "common.lost-purse": 2,
   "xx.alchemy": 1,
   "common.calling": 1,
   "common.trade-offer": 3,
   "common.first-love": 1
  },
  "lastSeen": {
   "common.fever": 23,
   "common.first-friend": 4,
   "xx.root-test": 6,
   "common.night-fear": 7,
   "common.study-or-play": 8,
   "xx.tribulation": 33,
   "xx.herb": 34,
   "common.lost-purse": 25,
   "xx.alchemy": 15,
   "common.calling": 17,
   "common.trade-offer": 37,
   "common.first-love": 28
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 62
 },
 "hunter-young": {
  "schemaVersion": 1,
  "seed": "v1-hunter-young",
  "rngState": 2473287083,
  "version": 7,
  "character": {
   "name": "Макс Ирвин",
   "gender": "male",
   "universeId": "hunter",
   "raceId": "human",
   "originId": "ordinary",
   "temperamentId": "brave",
   "stats": {
    "strength": 13,
    "intelligence": 7,
    "agility": 10,
    "vitality": 10,
    "wisdom": 5,
    "charisma": 9,
    "luck": 6,
    "willpower": 11
   },
   "resources": {
    "health": 80,
    "energy": 82,
    "mana": 34,
    "stamina": 86
   },
   "level": 1,
   "xp": 0,
   "reputation": 0,
   "karma": 5,
   "wealth": 15,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 4,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "common.first-friend": 1
  },
  "lastSeen": {
   "common.night-fear": 3,
   "common.first-friend": 4
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 8
 },
 "hunter-adult": {
  "schemaVersion": 1,
  "seed": "v1-hunter-adult",
  "rngState": 3722713298,
  "version": 61,
  "character": {
   "name": "Даниэль Хо",
   "gender": "male",
   "universeId": "hunter",
   "raceId": "human",
   "originId": "hunter-family",
   "temperamentId": "brave",
   "stats": {
    "strength": 21,
    "intelligence": 10,
    "agility": 9,
    "vitality": 21,
    "wisdom": 6,
    "charisma": 8,
    "luck": 10,
    "willpower": 21
   },
   "resources": {
    "health": 129,
    "energy": 102,
    "mana": 42,
    "stamina": 124
   },
   "level": 2,
   "xp": 91,
   "reputation": 49,
   "karma": 70,
   "wealth": 182,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 40,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend",
   "profession",
   "job-guard"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.fever": 4,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.study-or-play": 1,
   "hu.gate-break": 3,
   "common.lost-purse": 2,
   "hu.awakening": 2,
   "common.first-love": 1,
   "common.calling": 1,
   "common.trade-offer": 3
  },
  "lastSeen": {
   "common.first-steps": 2,
   "common.fever": 35,
   "common.night-fear": 4,
   "common.first-friend": 5,
   "common.study-or-play": 6,
   "hu.gate-break": 34,
   "common.lost-purse": 23,
   "hu.awakening": 19,
   "common.first-love": 17,
   "common.calling": 21,
   "common.trade-offer": 39
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 62
 },
 "academy-young": {
  "schemaVersion": 1,
  "seed": "v1-academy-young",
  "rngState": 1889025037,
  "version": 7,
  "character": {
   "name": "Кристоф фон Аштейн",
   "gender": "male",
   "universeId": "academy",
   "raceId": "human",
   "originId": "minor-noble",
   "temperamentId": "cunning",
   "stats": {
    "strength": 8,
    "intelligence": 12,
    "agility": 10,
    "vitality": 8,
    "wisdom": 5,
    "charisma": 12,
    "luck": 8,
    "willpower": 9
   },
   "resources": {
    "health": 72,
    "energy": 78,
    "mana": 44,
    "stamina": 72
   },
   "level": 1,
   "xp": 0,
   "reputation": 5,
   "karma": 0,
   "wealth": 40,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   }
  },
  "life": {
   "age": 4,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "noble",
   "childhood-friend"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.first-friend": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "common.first-friend": 4
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 8
 },
 "academy-adult": {
  "schemaVersion": 1,
  "seed": "v1-academy-adult",
  "rngState": 3561431447,
  "version": 61,
  "character": {
   "name": "Эвелин д’Эрмин",
   "gender": "female",
   "universeId": "academy",
   "raceId": "human",
   "originId": "scholarship",
   "temperamentId": "calm",
   "stats": {
    "strength": 12,
    "intelligence": 14,
    "agility": 4,
    "vitality": 24,
    "wisdom": 15,
    "charisma": 9,
    "luck": 9,
    "willpower": 22
   },
   "resources": {
    "health": 176,
    "energy": 104,
    "mana": 118,
    "stamina": 112
   },
   "level": 3,
   "xp": 53,
   "reputation": -52,
   "karma": 25,
   "wealth": 163,
   "abilities": [
    "arcane-shield"
   ],
   "track": {
    "points": 92,
    "rank": 2
   }
  },
  "life": {
   "age": 36,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend",
   "academy-student",
   "profession",
   "job-guard"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.fever": 3,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.study-or-play": 2,
   "common.lost-purse": 2,
   "ac.entrance": 2,
   "ac.ball": 3,
   "ac.duel": 4,
   "ac.circle": 2,
   "common.first-love": 1,
   "common.calling": 1,
   "common.trade-offer": 1
  },
  "lastSeen": {
   "common.first-steps": 2,
   "common.fever": 24,
   "common.night-fear": 4,
   "common.first-friend": 5,
   "common.study-or-play": 9,
   "common.lost-purse": 36,
   "ac.entrance": 14,
   "ac.ball": 31,
   "ac.duel": 32,
   "ac.circle": 28,
   "common.first-love": 19,
   "common.calling": 20,
   "common.trade-offer": 34
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 62
 }
};
