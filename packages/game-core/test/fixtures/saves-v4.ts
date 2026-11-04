// Сохранения формата 4, записанные игрой Stage 04 (SAVE_SCHEMA_VERSION = 4, коммит e242ac9) до среза 4 (рынок).
// Не редактировать: по ним проверяется перевод сохранений формата 4
export const SAVES_V4: Record<string, unknown> = {
 "dark-fantasy-adult": {
  "schemaVersion": 4,
  "seed": "v4-dark-fantasy-adult",
  "rngState": 2913104994,
  "version": 48,
  "character": {
   "name": "Рианнон Вранов",
   "gender": "female",
   "universeId": "dark-fantasy",
   "raceId": "ashborn",
   "originId": "mist-touched",
   "temperamentId": "curious",
   "stats": {
    "strength": 9,
    "intelligence": 16,
    "agility": 14,
    "vitality": 8,
    "wisdom": 10,
    "charisma": 6,
    "luck": 19,
    "willpower": 10
   },
   "resources": {
    "health": 77,
    "energy": 80,
    "mana": 62,
    "stamina": 74
   },
   "level": 2,
   "xp": 52,
   "reputation": -7,
   "karma": -2,
   "wealth": 61,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   },
   "socialClassId": "outcast",
   "talents": [],
   "weaknesses": [],
   "skills": {
    "survival": 5,
    "stealth": 3,
    "lore": 10
   },
   "professionId": null,
   "educationId": "df-letters",
   "specializationId": null,
   "factions": {
    "mist-cult": 10,
    "crown": 10,
    "order-of-ash": -8
   }
  },
  "life": {
   "age": 30,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "mist-mark",
   "childhood-friend"
  ],
  "occurrences": {
   "common.sibling-quarrel": 1,
   "common.first-friend": 1,
   "df.chapel-school": 1,
   "df.plague": 1,
   "common.fever": 1,
   "common.lost-purse": 1,
   "common.rival-appears": 1,
   "df.oath": 1,
   "common.potential-sign": 1,
   "df.hollow": 2,
   "df.relic": 1,
   "df.eco-tithe": 1,
   "legacy.lost-returns": 1,
   "legacy.relative-vanishes": 1,
   "common.first-love": 1,
   "common.love-test": 1,
   "common.friend-needs-help": 1
  },
  "lastSeen": {
   "common.sibling-quarrel": 4,
   "common.first-friend": 5,
   "df.chapel-school": 7,
   "df.plague": 10,
   "common.fever": 11,
   "common.lost-purse": 13,
   "common.rival-appears": 14,
   "df.oath": 16,
   "common.potential-sign": 17,
   "df.hollow": 28,
   "df.relic": 19,
   "df.eco-tithe": 20,
   "legacy.lost-returns": 21,
   "legacy.relative-vanishes": 23,
   "common.first-love": 26,
   "common.love-test": 29,
   "common.friend-needs-help": 30
  },
  "pending": {
   "eventId": "common.friend-needs-help",
   "age": 30
  },
  "scheduled": [],
  "nextSeq": 53,
  "background": {
   "familyName": "Вранов",
   "birthplace": {
    "ru": "приют при соборе Последнего Огня",
    "en": "the shelter of the Cathedral of the Last Flame"
   },
   "omen": {
    "ru": "Свечи в часовне в ту ночь горели ровно, без копоти.",
    "en": "That night the chapel candles burned steady, without soot."
   },
   "familyHistory": {
    "ru": "Мать вынашивала ребёнка в год, когда Мгла подошла к самым стенам. Соседи шепчутся, что она ходила за стену по ночам.",
    "en": "Mother carried the child in the year the Mist reached the very walls. Neighbours whisper that she walked beyond the wall at night."
   },
   "biography": [
    {
     "ru": "Рианнон Вранов родилась: приют при соборе Последнего Огня. Свечи в часовне в ту ночь горели ровно, без копоти.",
     "en": "Рианнон Вранов was born: the shelter of the Cathedral of the Last Flame. That night the chapel candles burned steady, without soot."
    },
    {
     "ru": "Мать вынашивала ребёнка в год, когда Мгла подошла к самым стенам. Соседи шепчутся, что она ходила за стену по ночам.",
     "en": "Mother carried the child in the year the Mist reached the very walls. Neighbours whisper that she walked beyond the wall at night."
    },
    {
     "ru": "Мать — Элдра Вранов, могильщик. Об отце мать не говорит никогда. Братья и сёстры: Рианнон, Катрис.",
     "en": "Mother: Элдра Вранов, gravedigger. Mother never speaks of the father. Siblings: Рианнон, Катрис."
    }
   ]
  },
  "hidden": {
   "potential": 5,
   "destiny": 3,
   "dormantTalents": [
    "ash-blessed"
   ],
   "familySecret": null,
   "revealed": [
    "potential",
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "mother",
    "name": "Элдра Вранов",
    "gender": "female",
    "bornAt": -28,
    "temperamentId": "curious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Могильщик",
     "en": "Gravedigger"
    },
    "bio": {
     "ru": "Могильщик. Живёт наполовину в выдуманных мирах. Характер: любопытный.",
     "en": "Gravedigger. Lives half in imagined worlds. Temperament: curious."
    },
    "affinity": 50,
    "alive": false,
    "diedAt": 2,
    "metAt": 0,
    "power": 37,
    "skillId": "survival",
    "interactedAt": null,
    "familyName": "Вранов",
    "status": "deceased",
    "cause": "accident",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "ashborn",
    "socialClassId": "outcast",
    "educationTier": 1,
    "goal": "wealth",
    "professionId": "hollow-hunter",
    "careerRank": 0,
    "factionId": null,
    "health": 99,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "sibling",
    "name": "Рианнон Вранов",
    "gender": "female",
    "bornAt": -5,
    "temperamentId": "calm",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Стражник",
     "en": "Guard"
    },
    "bio": {
     "ru": "Сестра. Гнев вспыхивает быстро и быстро гаснет. Характер: спокойный.",
     "en": "Sister. Anger flares fast and fades fast. Temperament: calm."
    },
    "affinity": 31,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 38,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Вранов",
    "status": "missing",
    "cause": null,
    "parents": [
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "ashborn",
    "socialClassId": "outcast",
    "educationTier": 1,
    "goal": null,
    "professionId": "guard",
    "careerRank": 2,
    "factionId": null,
    "health": 100,
    "wealth": 70,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 8,
      "kind": "ill"
     },
     {
      "at": 9,
      "kind": "education",
      "value": "df-letters"
     },
     {
      "at": 11,
      "kind": "job",
      "value": "guard"
     },
     {
      "at": 17,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 23,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 23,
      "kind": "missing"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Катрис Вранов",
    "gender": "female",
    "bornAt": -4,
    "temperamentId": "calm",
    "traitId": "secretive",
    "occupation": {
     "ru": "Фонарщик",
     "en": "Lamplighter"
    },
    "bio": {
     "ru": "Сестра. О прошлом молчит, даже когда спрашивают. Характер: спокойный.",
     "en": "Sister. Stays silent about the past even when asked. Temperament: calm."
    },
    "affinity": 29,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 27,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Вранов",
    "status": "alive",
    "cause": null,
    "parents": [
     "n1"
    ],
    "spouseId": "n6",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "ashborn",
    "socialClassId": "outcast",
    "educationTier": 1,
    "goal": null,
    "professionId": "lamplighter",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 14,
    "talentId": "iron-body",
    "weaknessId": null,
    "log": [
     {
      "at": 3,
      "kind": "education",
      "value": "df-letters"
     },
     {
      "at": 4,
      "kind": "ill"
     },
     {
      "at": 13,
      "kind": "job",
      "value": "lamplighter"
     },
     {
      "at": 14,
      "kind": "married",
      "value": "n6"
     },
     {
      "at": 16,
      "kind": "missing"
     },
     {
      "at": 21,
      "kind": "returned"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Морра Пепельный",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "calm",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Подёнщик",
     "en": "Day labourer"
    },
    "bio": {
     "ru": "Подкидыш из приюта. Мечтает о большем и ждёт того же от близких. Характер: спокойный.",
     "en": "Foundling from the shelter. Dreams of more and expects the same of those close to them. Temperament: calm."
    },
    "affinity": 20,
    "alive": true,
    "diedAt": null,
    "metAt": 5,
    "power": 20,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Пепельный",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "ashborn",
    "socialClassId": "outcast",
    "educationTier": 2,
    "goal": null,
    "professionId": "laborer",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 24,
    "talentId": "mist-sensitive",
    "weaknessId": null,
    "log": [
     {
      "at": 9,
      "kind": "education",
      "value": "df-letters"
     },
     {
      "at": 13,
      "kind": "education",
      "value": "df-squire"
     },
     {
      "at": 21,
      "kind": "job",
      "value": "laborer"
     },
     {
      "at": 29,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "teacher",
    "name": "Ульрен Грейвольд",
    "gender": "male",
    "bornAt": -23,
    "temperamentId": "ambitious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Торговец",
     "en": "Merchant"
    },
    "bio": {
     "ru": "Сестра часовни. Живёт наполовину в выдуманных мирах. Характер: честолюбивый.",
     "en": "Chapel sister. Lives half in imagined worlds. Temperament: ambitious."
    },
    "affinity": 4,
    "alive": true,
    "diedAt": null,
    "metAt": 7,
    "power": 62,
    "skillId": "lore",
    "interactedAt": null,
    "familyName": "Грейвольд",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "ashborn",
    "socialClassId": "nobility",
    "educationTier": 2,
    "goal": "family",
    "professionId": "merchant",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 163,
    "talentId": "golden-hands",
    "weaknessId": null,
    "log": [
     {
      "at": 15,
      "kind": "promotion",
      "value": "3"
     },
     {
      "at": 18,
      "kind": "ill"
     },
     {
      "at": 21,
      "kind": "job-loss",
      "value": "relic-dealer"
     },
     {
      "at": 23,
      "kind": "job",
      "value": "merchant"
     },
     {
      "at": 30,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "in-law",
    "name": "Эшер Вранов",
    "gender": "male",
    "bornAt": -6,
    "temperamentId": "curious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Родственник",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственник. Живёт наполовину в выдуманных мирах. Характер: любопытный.",
     "en": "Relative. Lives half in imagined worlds. Temperament: curious."
    },
    "affinity": 19,
    "alive": true,
    "diedAt": null,
    "metAt": 14,
    "power": 37,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Вранов",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n3",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "ashborn",
    "socialClassId": "serf",
    "educationTier": 1,
    "goal": "rise",
    "professionId": "guard",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 46,
    "talentId": null,
    "weaknessId": "night-terrors",
    "log": [
     {
      "at": 14,
      "kind": "married",
      "value": "n3"
     },
     {
      "at": 16,
      "kind": "class-up",
      "value": "serf"
     },
     {
      "at": 16,
      "kind": "goal",
      "value": "rise"
     },
     {
      "at": 18,
      "kind": "education",
      "value": "df-letters"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n7",
    "role": "rival",
    "name": "Алдрик Грейвольд",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "curious",
    "traitId": "caring",
    "occupation": {
     "ru": "Фонарщик",
     "en": "Lamplighter"
    },
    "bio": {
     "ru": "Сын старосты. Всегда замечает, когда другим плохо. Характер: любопытный.",
     "en": "The reeve's son. Always notices when others are hurting. Temperament: curious."
    },
    "affinity": -13,
    "alive": true,
    "diedAt": null,
    "metAt": 14,
    "power": 18,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Грейвольд",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "serf",
    "educationTier": 1,
    "goal": "mastery",
    "professionId": "lamplighter",
    "careerRank": 1,
    "factionId": "mist-cult",
    "health": 59,
    "wealth": 42,
    "talentId": "grave-strength",
    "weaknessId": "reckless",
    "log": [
     {
      "at": 16,
      "kind": "job",
      "value": "lamplighter"
     },
     {
      "at": 20,
      "kind": "ill"
     },
     {
      "at": 23,
      "kind": "education",
      "value": "df-letters"
     },
     {
      "at": 29,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 30,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n8",
    "role": "ex-partner",
    "name": "Рианнон Пепельный",
    "gender": "female",
    "bornAt": -5,
    "temperamentId": "cunning",
    "traitId": "drinker",
    "occupation": {
     "ru": "Человек с праздника",
     "en": "Someone from the festival"
    },
    "bio": {
     "ru": "Человек с праздника. Кружка за кружкой топит какую-то старую беду. Характер: хитрый.",
     "en": "Someone from the festival. Drowns some old sorrow mug after mug. Temperament: cunning."
    },
    "affinity": 21,
    "alive": true,
    "diedAt": null,
    "metAt": 26,
    "power": 12,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Пепельный",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "serf",
    "educationTier": 1,
    "goal": "mastery",
    "professionId": "scholar",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 35,
    "talentId": null,
    "weaknessId": null,
    "log": [],
    "lifeGen": null
   }
  ],
  "nextNpcId": 9,
  "meters": {
   "corruption": 15,
   "ember": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.friend-needs-help",
   "common.love-test",
   "df.hollow",
   "common.first-love"
  ],
  "lineage": {
   "name": "Вранов",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n1"
   ],
   "selfAdopted": false,
   "renown": 0,
   "startRenown": 0,
   "lives": [],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "dark-fantasy",
      "origin": "mist-touched",
      "race": "ashborn",
      "family": "Вранов",
      "n0": "Рианнон Вранов",
      "g0": "f"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 2,
     "gen": 1,
     "kind": "tragedy",
     "who": [
      "n1"
     ],
     "v": {
      "cause": "accident",
      "role": "mother",
      "age": 30,
      "n0": "Элдра Вранов",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 2,
     "gen": 1,
     "kind": "inheritance",
     "who": [
      "n1",
      "self"
     ],
     "v": {
      "sum": 1,
      "law": "ash-primogeniture",
      "n0": "Элдра Вранов",
      "g0": "f",
      "n1": "Рианнон Вранов",
      "g1": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 4,
     "year": 14,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n3",
      "n6"
     ],
     "v": {
      "n0": "Катрис Вранов",
      "g0": "f",
      "n1": "Эшер Вранов",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 16,
     "gen": 1,
     "kind": "missing",
     "who": [
      "n3"
     ],
     "v": {
      "role": "sibling",
      "n0": "Катрис Вранов",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 16,
     "gen": 1,
     "kind": "class",
     "who": [
      "n6"
     ],
     "v": {
      "cls": "serf",
      "dir": 1,
      "n0": "Эшер Вранов",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 7,
     "year": 17,
     "gen": 1,
     "kind": "achievement",
     "who": [
      "self"
     ],
     "v": {
      "achievement": "know-thyself",
      "n0": "Рианнон Вранов",
      "g0": "f"
     },
     "src": "achievement",
     "link": null
    },
    {
     "id": 8,
     "year": 21,
     "gen": 1,
     "kind": "return",
     "who": [
      "n3"
     ],
     "v": {
      "role": "sibling",
      "n0": "Катрис Вранов",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 9,
     "year": 21,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.lost-returns",
      "choice": "embrace",
      "ok": "",
      "n0": "Рианнон Вранов",
      "g0": "f"
     },
     "src": "legacy.lost-returns",
     "link": null
    },
    {
     "id": 10,
     "year": 23,
     "gen": 1,
     "kind": "missing",
     "who": [
      "n2"
     ],
     "v": {
      "role": "sibling",
      "n0": "Рианнон Вранов",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 11,
     "year": 23,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.relative-vanishes",
      "choice": "wait",
      "ok": "",
      "n0": "Рианнон Вранов",
      "g0": "f"
     },
     "src": "legacy.relative-vanishes",
     "link": null
    }
   ],
   "nextEntry": 12,
   "achievements": [
    {
     "id": "know-thyself",
     "gen": 1,
     "age": 17
    }
   ],
   "traits": {
    "talents": {},
    "weaknesses": {}
   },
   "threads": [],
   "pending": [],
   "stories": {
    "legacy.lost-returns": 1,
    "legacy.relative-vanishes": 1
   },
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 5,
    "eventId": "common.first-friend",
    "choiceId": "defend",
    "success": true,
    "weight": 6
   },
   {
    "age": 7,
    "eventId": "df.chapel-school",
    "choiceId": "learn",
    "success": null,
    "weight": 4
   },
   {
    "age": 10,
    "eventId": "df.plague",
    "choiceId": "help",
    "success": false,
    "weight": 5
   },
   {
    "age": 11,
    "eventId": "common.fever",
    "choiceId": "herbs",
    "success": true,
    "weight": 4
   },
   {
    "age": 14,
    "eventId": "common.rival-appears",
    "choiceId": "befriend",
    "success": false,
    "weight": 4
   },
   {
    "age": 19,
    "eventId": "df.relic",
    "choiceId": "take",
    "success": false,
    "weight": 3
   },
   {
    "age": 20,
    "eventId": "df.eco-tithe",
    "choiceId": "crown",
    "success": true,
    "weight": 4
   },
   {
    "age": 21,
    "eventId": "legacy.lost-returns",
    "choiceId": "embrace",
    "success": null,
    "weight": 9
   },
   {
    "age": 23,
    "eventId": "legacy.relative-vanishes",
    "choiceId": "wait",
    "success": null,
    "weight": 6
   },
   {
    "age": 26,
    "eventId": "common.first-love",
    "choiceId": "gift",
    "success": true,
    "weight": 4
   },
   {
    "age": 28,
    "eventId": "df.hollow",
    "choiceId": "mercy",
    "success": false,
    "weight": 3
   },
   {
    "age": 29,
    "eventId": "common.love-test",
    "choiceId": "stay",
    "success": false,
    "weight": 8
   }
  ],
  "economy": {
   "cycle": "normal",
   "cycleSince": 15,
   "hardship": 0,
   "last": {
    "age": 30,
    "lines": [],
    "shortfall": 0
   },
   "years": []
  }
 },
 "isekai-adult": {
  "schemaVersion": 4,
  "seed": "v4-isekai-adult",
  "rngState": 1430111298,
  "version": 55,
  "character": {
   "name": "Эфи Келлен",
   "gender": "female",
   "universeId": "isekai",
   "raceId": "dwarf",
   "originId": "merchant-child",
   "temperamentId": "calm",
   "stats": {
    "strength": 10,
    "intelligence": 10,
    "agility": 6,
    "vitality": 14,
    "wisdom": 17,
    "charisma": 10,
    "luck": 10,
    "willpower": 21
   },
   "resources": {
    "health": 116,
    "energy": 102,
    "mana": 86,
    "stamina": 88
   },
   "level": 2,
   "xp": 119,
   "reputation": 0,
   "karma": 0,
   "wealth": 216,
   "abilities": [],
   "track": {
    "points": 19,
    "rank": 1
   },
   "socialClassId": "burgher",
   "talents": [
    "forge-blood"
   ],
   "weaknesses": [
    "spendthrift"
   ],
   "skills": {
    "trade": 15,
    "craft": 7,
    "athletics": 4,
    "guild-craft": 8,
    "invention": 4
   },
   "professionId": "merchant",
   "educationId": null,
   "specializationId": null,
   "factions": {
    "merchant-league": 15
   }
  },
  "life": {
   "age": 30,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "reincarnated",
   "childhood-friend",
   "profession",
   "job-merchant",
   "married"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.fever": 2,
   "is.memories": 1,
   "common.first-friend": 1,
   "common.parent-lesson": 2,
   "common.rival-appears": 1,
   "common.lost-purse": 1,
   "is.slime": 2,
   "is.mother-illness": 1,
   "is.exam": 3,
   "common.first-love": 1,
   "is.guild-licence": 1,
   "common.love-test": 1,
   "common.destiny-save": 1,
   "common.calling": 1,
   "common.parent-illness": 1,
   "legacy.marriage-alliance": 1,
   "common.talent-awakens": 1,
   "common.overcome-weakness": 1,
   "legacy.adopt-heir": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "common.fever": 10,
   "is.memories": 4,
   "common.first-friend": 6,
   "common.parent-lesson": 13,
   "common.rival-appears": 8,
   "common.lost-purse": 11,
   "is.slime": 24,
   "is.mother-illness": 14,
   "is.exam": 28,
   "common.first-love": 16,
   "is.guild-licence": 17,
   "common.love-test": 19,
   "common.destiny-save": 20,
   "common.calling": 22,
   "common.parent-illness": 23,
   "legacy.marriage-alliance": 25,
   "common.talent-awakens": 26,
   "common.overcome-weakness": 29,
   "legacy.adopt-heir": 30
  },
  "pending": {
   "eventId": "legacy.adopt-heir",
   "age": 30
  },
  "scheduled": [],
  "nextSeq": 66,
  "background": {
   "familyName": "Келлен",
   "birthplace": {
    "ru": "торговый квартал столицы Арденвейла",
    "en": "the merchant quarter of Ardenvale's capital"
   },
   "omen": {
    "ru": "Над домом прошла радуга, хотя дождя не было.",
    "en": "A rainbow passed over the house though there was no rain."
   },
   "familyHistory": {
    "ru": "Лавка деда пережила две войны и одного дракона. Отец мечтает о собственном караване.",
    "en": "Grandfather's shop survived two wars and one dragon. Father dreams of his own caravan."
   },
   "biography": [
    {
     "ru": "Эфи Келлен родилась: торговый квартал столицы Арденвейла. Над домом прошла радуга, хотя дождя не было.",
     "en": "Эфи Келлен was born: the merchant quarter of Ardenvale's capital. A rainbow passed over the house though there was no rain."
    },
    {
     "ru": "Лавка деда пережила две войны и одного дракона. Отец мечтает о собственном караване.",
     "en": "Grandfather's shop survived two wars and one dragon. Father dreams of his own caravan."
    },
    {
     "ru": "Отец — Дорен Келлен, лавочник. Мать — Кайра Келлен, мастер цеха.",
     "en": "Father: Дорен Келлен, shopkeeper. Mother: Кайра Келлен, guild master."
    },
    {
     "ru": "Мать хранит меч, который никто не может вынуть из ножен.",
     "en": "Mother keeps a sword no one can draw from its sheath."
    }
   ]
  },
  "hidden": {
   "potential": 6,
   "destiny": 8,
   "dormantTalents": [
    "golden-hands"
   ],
   "familySecret": "is-hero-blood",
   "revealed": [
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Дорен Келлен",
    "gender": "male",
    "bornAt": -31,
    "temperamentId": "brave",
    "traitId": "drinker",
    "occupation": {
     "ru": "Лавочник",
     "en": "Shopkeeper"
    },
    "bio": {
     "ru": "Лавочник. Кружка за кружкой топит какую-то старую беду. Характер: отважный.",
     "en": "Shopkeeper. Drowns some old sorrow mug after mug. Temperament: brave."
    },
    "affinity": 48,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 38,
    "skillId": "athletics",
    "interactedAt": null,
    "familyName": "Келлен",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [
     "n2"
    ],
    "adopted": false,
    "raceId": "dwarf",
    "socialClassId": "burgher",
    "educationTier": 1,
    "goal": "family",
    "professionId": "scholar",
    "careerRank": 3,
    "factionId": "merchant-league",
    "health": 100,
    "wealth": 213,
    "talentId": "golden-hands",
    "weaknessId": "frail",
    "log": [
     {
      "at": 1,
      "kind": "child",
      "value": "n3"
     },
     {
      "at": 4,
      "kind": "divorced",
      "value": "n2"
     },
     {
      "at": 12,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 16,
      "kind": "ill"
     },
     {
      "at": 19,
      "kind": "promotion",
      "value": "3"
     },
     {
      "at": 25,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Кайра Келлен",
    "gender": "female",
    "bornAt": -28,
    "temperamentId": "kind",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Мастер цеха",
     "en": "Guild master"
    },
    "bio": {
     "ru": "Мастер цеха. Гнев вспыхивает быстро и быстро гаснет. Характер: добрый.",
     "en": "Guild master. Anger flares fast and fades fast. Temperament: kind."
    },
    "affinity": 64,
    "alive": false,
    "diedAt": 23,
    "metAt": 0,
    "power": 28,
    "skillId": "craft",
    "interactedAt": null,
    "familyName": "Келлен",
    "status": "deceased",
    "cause": "event",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [
     "n1"
    ],
    "adopted": false,
    "raceId": "dwarf",
    "socialClassId": "gentry",
    "educationTier": 2,
    "goal": "rise",
    "professionId": "wanderer",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": "mana-affinity",
    "weaknessId": null,
    "log": [
     {
      "at": 1,
      "kind": "child",
      "value": "n3"
     },
     {
      "at": 4,
      "kind": "divorced",
      "value": "n1"
     },
     {
      "at": 9,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 10,
      "kind": "class-up",
      "value": "gentry"
     },
     {
      "at": 10,
      "kind": "goal",
      "value": "rise"
     },
     {
      "at": 19,
      "kind": "missing"
     },
     {
      "at": 23,
      "kind": "returned"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Сола Келлен",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "calm",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Стражник",
     "en": "Guard"
    },
    "bio": {
     "ru": "Ребёнок. Гнев вспыхивает быстро и быстро гаснет. Характер: спокойный.",
     "en": "Child. Anger flares fast and fades fast. Temperament: calm."
    },
    "affinity": 9,
    "alive": true,
    "diedAt": null,
    "metAt": 1,
    "power": 10,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Келлен",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": "n8",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "dwarf",
    "socialClassId": "burgher",
    "educationTier": 1,
    "goal": null,
    "professionId": "guard",
    "careerRank": 0,
    "factionId": null,
    "health": 75,
    "wealth": 73,
    "talentId": "silver-tongue",
    "weaknessId": null,
    "log": [
     {
      "at": 11,
      "kind": "ill"
     },
     {
      "at": 12,
      "kind": "education",
      "value": "is-temple"
     },
     {
      "at": 13,
      "kind": "ill"
     },
     {
      "at": 17,
      "kind": "ill"
     },
     {
      "at": 27,
      "kind": "job",
      "value": "guard"
     },
     {
      "at": 28,
      "kind": "married",
      "value": "n8"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Мирэ Брайт",
    "gender": "female",
    "bornAt": -2,
    "temperamentId": "brave",
    "traitId": "stern",
    "occupation": {
     "ru": "Зверолюд-разведчик",
     "en": "Beastkin scout"
    },
    "bio": {
     "ru": "Зверолюд-разведчик. Хвалит редко, требует много. Характер: отважный.",
     "en": "Beastkin scout. Praises rarely and demands much. Temperament: brave."
    },
    "affinity": 21,
    "alive": false,
    "diedAt": 9,
    "metAt": 6,
    "power": 25,
    "skillId": "medicine",
    "interactedAt": null,
    "familyName": "Брайт",
    "status": "deceased",
    "cause": "accident",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "gentry",
    "educationTier": 1,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": null,
    "health": 89,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 7,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "rival",
    "name": "Ирек Арденвейл",
    "gender": "male",
    "bornAt": 2,
    "temperamentId": "curious",
    "traitId": "stern",
    "occupation": {
     "ru": "Изобретатель",
     "en": "Inventor"
    },
    "bio": {
     "ru": "Сын соседнего барона. Хвалит редко, требует много. Характер: любопытный.",
     "en": "Neighbouring baron's son. Praises rarely and demands much. Temperament: curious."
    },
    "affinity": -21,
    "alive": true,
    "diedAt": null,
    "metAt": 8,
    "power": 26,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Арденвейл",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "dwarf",
    "socialClassId": "burgher",
    "educationTier": 1,
    "goal": null,
    "professionId": "inventor",
    "careerRank": 0,
    "factionId": "crown",
    "health": 100,
    "wealth": 47,
    "talentId": "steady-heart",
    "weaknessId": null,
    "log": [
     {
      "at": 11,
      "kind": "education",
      "value": "is-temple"
     },
     {
      "at": 12,
      "kind": "ill"
     },
     {
      "at": 21,
      "kind": "job",
      "value": "inventor"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "ex-partner",
    "name": "Лукан Келлен",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "secretive",
    "occupation": {
     "ru": "Маг при бароне",
     "en": "Baron's mage"
    },
    "bio": {
     "ru": "Человек с праздника. О прошлом молчит, даже когда спрашивают. Характер: честолюбивый.",
     "en": "Someone from the festival. Stays silent about the past even when asked. Temperament: ambitious."
    },
    "affinity": 25,
    "alive": true,
    "diedAt": null,
    "metAt": 16,
    "power": 29,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Келлен",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "burgher",
    "educationTier": 2,
    "goal": "knowledge",
    "professionId": "court-mage",
    "careerRank": 0,
    "factionId": "guild",
    "health": 100,
    "wealth": 40,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 19,
      "kind": "education",
      "value": "is-temple"
     },
     {
      "at": 24,
      "kind": "education",
      "value": "is-guild-course"
     },
     {
      "at": 27,
      "kind": "job",
      "value": "court-mage"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n7",
    "role": "spouse",
    "name": "Ровена Келлен",
    "gender": "female",
    "bornAt": -1,
    "temperamentId": "cunning",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Жена",
     "en": "Wife"
    },
    "bio": {
     "ru": "Жена. Гнев вспыхивает быстро и быстро гаснет. Характер: хитрый.",
     "en": "Wife. Anger flares fast and fades fast. Temperament: cunning."
    },
    "affinity": 57,
    "alive": true,
    "diedAt": null,
    "metAt": 25,
    "power": 25,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Келлен",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "self",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "beastkin",
    "socialClassId": "burgher",
    "educationTier": 1,
    "goal": "wealth",
    "professionId": "wanderer",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 30,
    "talentId": null,
    "weaknessId": null,
    "log": [],
    "lifeGen": null
   },
   {
    "id": "n8",
    "role": "in-law",
    "name": "Дорен Келлен",
    "gender": "male",
    "bornAt": -4,
    "temperamentId": "kind",
    "traitId": "stern",
    "occupation": {
     "ru": "Родственник",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственник. Хвалит редко, требует много. Характер: добрый.",
     "en": "Relative. Praises rarely and demands much. Temperament: kind."
    },
    "affinity": -4,
    "alive": true,
    "diedAt": null,
    "metAt": 28,
    "power": 25,
    "skillId": null,
    "interactedAt": null,
    "familyName": "Келлен",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n3",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "dwarf",
    "socialClassId": "burgher",
    "educationTier": 2,
    "goal": "family",
    "professionId": "guard",
    "careerRank": 2,
    "factionId": "merchant-league",
    "health": 100,
    "wealth": 41,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 28,
      "kind": "married",
      "value": "n3"
     },
     {
      "at": 30,
      "kind": "promotion",
      "value": "2"
     }
    ],
    "lifeGen": null
   }
  ],
  "nextNpcId": 9,
  "meters": {
   "system-favor": 0
  },
  "consequences": [],
  "quest": {
   "id": "is.q-weakness",
   "since": 30
  },
  "questsDone": [],
  "recentEvents": [
   "legacy.adopt-heir",
   "common.overcome-weakness",
   "is.exam",
   "common.talent-awakens"
  ],
  "lineage": {
   "name": "Келлен",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n2",
    "n1"
   ],
   "selfAdopted": false,
   "renown": 6,
   "startRenown": 0,
   "lives": [],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "isekai",
      "origin": "merchant-child",
      "race": "dwarf",
      "family": "Келлен",
      "n0": "Эфи Келлен",
      "g0": "f"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 1,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n3",
      "n2",
      "n1"
     ],
     "v": {
      "n0": "Сола Келлен",
      "g0": "f",
      "n1": "Кайра Келлен",
      "g1": "f",
      "n2": "Дорен Келлен",
      "g2": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 4,
     "gen": 1,
     "kind": "divorce",
     "who": [
      "n2",
      "n1"
     ],
     "v": {
      "n0": "Кайра Келлен",
      "g0": "f",
      "n1": "Дорен Келлен",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 4,
     "year": 10,
     "gen": 1,
     "kind": "class",
     "who": [
      "n2"
     ],
     "v": {
      "cls": "gentry",
      "dir": 1,
      "n0": "Кайра Келлен",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 19,
     "gen": 1,
     "kind": "career",
     "who": [
      "n1"
     ],
     "v": {
      "profession": "scholar",
      "n0": "Дорен Келлен",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 19,
     "gen": 1,
     "kind": "missing",
     "who": [
      "n2"
     ],
     "v": {
      "role": "mother",
      "n0": "Кайра Келлен",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 7,
     "year": 23,
     "gen": 1,
     "kind": "return",
     "who": [
      "n2"
     ],
     "v": {
      "role": "mother",
      "n0": "Кайра Келлен",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 8,
     "year": 23,
     "gen": 1,
     "kind": "death",
     "who": [
      "n2"
     ],
     "v": {
      "cause": "event",
      "role": "mother",
      "age": 51,
      "n0": "Кайра Келлен",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 9,
     "year": 23,
     "gen": 1,
     "kind": "inheritance",
     "who": [
      "n2",
      "self"
     ],
     "v": {
      "sum": 38,
      "law": "ardenvale-partition",
      "n0": "Кайра Келлен",
      "g0": "f",
      "n1": "Эфи Келлен",
      "g1": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 10,
     "year": 25,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "self",
      "n7"
     ],
     "v": {
      "n0": "Эфи Келлен",
      "g0": "f",
      "n1": "Ровена Келлен",
      "g1": "f"
     },
     "src": "legacy.marriage-alliance",
     "link": null
    },
    {
     "id": 11,
     "year": 25,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.marriage-alliance",
      "choice": "accept",
      "ok": "",
      "n0": "Эфи Келлен",
      "g0": "f"
     },
     "src": "legacy.marriage-alliance",
     "link": null
    },
    {
     "id": 12,
     "year": 25,
     "gen": 1,
     "kind": "achievement",
     "who": [
      "self"
     ],
     "v": {
      "achievement": "wedding",
      "n0": "Эфи Келлен",
      "g0": "f"
     },
     "src": "achievement",
     "link": null
    },
    {
     "id": 13,
     "year": 28,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n3",
      "n8"
     ],
     "v": {
      "n0": "Сола Келлен",
      "g0": "f",
      "n1": "Дорен Келлен",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    }
   ],
   "nextEntry": 14,
   "achievements": [
    {
     "id": "wedding",
     "gen": 1,
     "age": 25
    }
   ],
   "traits": {
    "talents": {},
    "weaknesses": {}
   },
   "threads": [],
   "pending": [],
   "stories": {
    "legacy.marriage-alliance": 1
   },
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 2,
    "eventId": "common.fever",
    "choiceId": "herbs",
    "success": false,
    "weight": 5
   },
   {
    "age": 6,
    "eventId": "common.first-friend",
    "choiceId": "defend",
    "success": false,
    "weight": 6
   },
   {
    "age": 10,
    "eventId": "common.fever",
    "choiceId": "herbs",
    "success": false,
    "weight": 5
   },
   {
    "age": 12,
    "eventId": "is.slime",
    "choiceId": "magic",
    "success": false,
    "weight": 5
   },
   {
    "age": 16,
    "eventId": "common.first-love",
    "choiceId": "gift",
    "success": true,
    "weight": 4
   },
   {
    "age": 19,
    "eventId": "common.love-test",
    "choiceId": "stay",
    "success": false,
    "weight": 8
   },
   {
    "age": 21,
    "eventId": "is.exam",
    "choiceId": "duel",
    "success": false,
    "weight": 4
   },
   {
    "age": 22,
    "eventId": "common.calling",
    "choiceId": "merchant",
    "success": null,
    "weight": 4
   },
   {
    "age": 23,
    "eventId": "common.parent-illness",
    "choiceId": "nurse",
    "success": false,
    "weight": 7
   },
   {
    "age": 24,
    "eventId": "is.slime",
    "choiceId": "sword",
    "success": false,
    "weight": 4
   },
   {
    "age": 25,
    "eventId": "legacy.marriage-alliance",
    "choiceId": "accept",
    "success": null,
    "weight": 8
   },
   {
    "age": 28,
    "eventId": "is.exam",
    "choiceId": "theory",
    "success": true,
    "weight": 4
   }
  ],
  "economy": {
   "cycle": "normal",
   "cycleSince": 29,
   "hardship": 0,
   "last": {
    "age": 30,
    "lines": [
     {
      "id": "profession",
      "amount": 7
     },
     {
      "id": "class",
      "amount": 3
     },
     {
      "id": "thrift",
      "amount": -3
     },
     {
      "id": "living",
      "amount": -1
     }
    ],
    "shortfall": 0
   },
   "years": [
    {
     "age": 21,
     "income": 3,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 22,
     "income": 3,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 23,
     "income": 10,
     "expenses": 4,
     "shortfall": 0
    },
    {
     "age": 24,
     "income": 10,
     "expenses": 4,
     "shortfall": 0
    },
    {
     "age": 25,
     "income": 10,
     "expenses": 4,
     "shortfall": 0
    },
    {
     "age": 26,
     "income": 10,
     "expenses": 5,
     "shortfall": 0
    },
    {
     "age": 27,
     "income": 10,
     "expenses": 5,
     "shortfall": 0
    },
    {
     "age": 28,
     "income": 10,
     "expenses": 5,
     "shortfall": 0
    },
    {
     "age": 29,
     "income": 10,
     "expenses": 4,
     "shortfall": 0
    },
    {
     "age": 30,
     "income": 10,
     "expenses": 4,
     "shortfall": 0
    }
   ]
  }
 },
 "murim-adult": {
  "schemaVersion": 4,
  "seed": "v4-murim-adult",
  "rngState": 3399653018,
  "version": 48,
  "character": {
   "name": "Ци Минь дома Тан",
   "gender": "male",
   "universeId": "murim",
   "raceId": "human",
   "originId": "physician-child",
   "temperamentId": "curious",
   "stats": {
    "strength": 11,
    "intelligence": 17,
    "agility": 30,
    "vitality": 8,
    "wisdom": 13,
    "charisma": 8,
    "luck": 15,
    "willpower": 10
   },
   "resources": {
    "health": 77,
    "energy": 80,
    "mana": 70,
    "stamina": 78
   },
   "level": 2,
   "xp": 130,
   "reputation": 46,
   "karma": -25,
   "wealth": 86,
   "abilities": [],
   "track": {
    "points": 20,
    "rank": 0
   },
   "socialClassId": "commoner",
   "talents": [
    "keen-eye"
   ],
   "weaknesses": [],
   "skills": {
    "medicine": 10,
    "martial-arts": 22,
    "stealth": 12,
    "trade": 15
   },
   "professionId": "merchant",
   "educationId": null,
   "specializationId": null,
   "factions": {
    "demonic-cult": 72,
    "orthodox-alliance": -26
   }
  },
  "life": {
   "age": 30,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "martial-school",
   "demonic-path",
   "profession",
   "job-merchant"
  ],
  "occurrences": {
   "common.fever": 1,
   "common.sibling-quarrel": 1,
   "mu.village-school": 1,
   "common.parent-lesson": 1,
   "mu.outer-court": 1,
   "mu.school": 1,
   "common.rival-appears": 1,
   "common.study-or-play": 1,
   "mu.bottleneck": 1,
   "mu.rival-challenge": 2,
   "common.parent-illness": 1,
   "mu.bandits": 1,
   "common.calling": 1,
   "mu.deviation-crisis": 1,
   "mu.duel": 1,
   "mu.manual": 1
  },
  "lastSeen": {
   "common.fever": 4,
   "common.sibling-quarrel": 5,
   "mu.village-school": 6,
   "common.parent-lesson": 7,
   "mu.outer-court": 8,
   "mu.school": 9,
   "common.rival-appears": 11,
   "common.study-or-play": 12,
   "mu.bottleneck": 13,
   "mu.rival-challenge": 29,
   "common.parent-illness": 16,
   "mu.bandits": 17,
   "common.calling": 19,
   "mu.deviation-crisis": 21,
   "mu.duel": 25,
   "mu.manual": 28
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 56,
  "background": {
   "familyName": "дома Тан",
   "birthplace": {
    "ru": "ворота праведной секты на горе Хуа",
    "en": "the gate of a righteous sect on Mount Hua"
   },
   "omen": {
    "ru": "Над рекой всю ночь кричали журавли.",
    "en": "Cranes cried over the river all night."
   },
   "familyHistory": {
    "ru": "Род лекарей лечит всех: праведных, тёмных и бандитов. Поэтому их не трогает никто.",
    "en": "A line of physicians treats everyone: righteous, demonic and bandits alike. That is why no one touches them."
   },
   "biography": [
    {
     "ru": "Ци Минь дома Тан родился: ворота праведной секты на горе Хуа. Над рекой всю ночь кричали журавли.",
     "en": "Ци Минь дома Тан was born: the gate of a righteous sect on Mount Hua. Cranes cried over the river all night."
    },
    {
     "ru": "Род лекарей лечит всех: праведных, тёмных и бандитов. Поэтому их не трогает никто.",
     "en": "A line of physicians treats everyone: righteous, demonic and bandits alike. That is why no one touches them."
    },
    {
     "ru": "Отец — Гао Шань дома Тан, торговка лепёшками. Мать — Тан Ми дома Тан, носильщик. Братья и сёстры: Юэ, Цзян.",
     "en": "Father: Гао Шань дома Тан, flatbread seller. Mother: Тан Ми дома Тан, porter. Siblings: Юэ, Цзян."
    },
    {
     "ru": "Дед перед смертью шептал о тайнике под третьей ступенью храма.",
     "en": "Before dying, grandfather whispered of a cache beneath the temple's third step."
    },
    {
     "ru": "С первых дней заметно: замечает то, мимо чего проходят другие.",
     "en": "It shows from the first days: notices what others walk past."
    },
    {
     "ru": "Старая повитуха долго смотрит на ребёнка и говорит, что в нём спит что-то большее.",
     "en": "The old midwife studies the child for a long time and says something greater sleeps within."
    }
   ]
  },
  "hidden": {
   "potential": 8,
   "destiny": 3,
   "dormantTalents": [
    "silver-tongue"
   ],
   "familySecret": "mu-lost-manual",
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Гао Шань дома Тан",
    "gender": "male",
    "bornAt": -22,
    "temperamentId": "ambitious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Подёнщик",
     "en": "Day labourer"
    },
    "bio": {
     "ru": "Торговка лепёшками. Кружка за кружкой топит какую-то старую беду. Характер: честолюбивый.",
     "en": "Flatbread seller. Drowns some old sorrow mug after mug. Temperament: ambitious."
    },
    "affinity": 12,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 55,
    "skillId": "persuasion",
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [
     "n2"
    ],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 0,
    "goal": "family",
    "professionId": "laborer",
    "careerRank": 0,
    "factionId": null,
    "health": 78,
    "wealth": 114,
    "talentId": "steady-heart",
    "weaknessId": null,
    "log": [
     {
      "at": 1,
      "kind": "child",
      "value": "n6"
     },
     {
      "at": 4,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 16,
      "kind": "widowed",
      "value": "n2"
     },
     {
      "at": 23,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 24,
      "kind": "job-loss",
      "value": "merchant"
     },
     {
      "at": 27,
      "kind": "job",
      "value": "laborer"
     },
     {
      "at": 30,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Тан Ми дома Тан",
    "gender": "female",
    "bornAt": -21,
    "temperamentId": "calm",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Носильщик",
     "en": "Porter"
    },
    "bio": {
     "ru": "Носильщик. Мечтает о большем и ждёт того же от близких. Характер: спокойный.",
     "en": "Porter. Dreams of more and expects the same of those close to them. Temperament: calm."
    },
    "affinity": 55,
    "alive": false,
    "diedAt": 16,
    "metAt": 0,
    "power": 30,
    "skillId": null,
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "deceased",
    "cause": "event",
    "parents": [
     "n5"
    ],
    "spouseId": "n1",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "disciple",
    "educationTier": 1,
    "goal": "family",
    "professionId": null,
    "careerRank": 0,
    "factionId": "beggars-sect",
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": "blocked-meridian",
    "log": [
     {
      "at": 1,
      "kind": "child",
      "value": "n6"
     },
     {
      "at": 2,
      "kind": "education",
      "value": "mu-village-school"
     },
     {
      "at": 4,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 7,
      "kind": "ill"
     },
     {
      "at": 9,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 11,
      "kind": "class-up",
      "value": "disciple"
     },
     {
      "at": 16,
      "kind": "job-loss",
      "value": "wanderer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Юэ Цин дома Тан",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "calm",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Сестра",
     "en": "Sister"
    },
    "bio": {
     "ru": "Сестра. Живёт наполовину в выдуманных мирах. Характер: спокойный.",
     "en": "Sister. Lives half in imagined worlds. Temperament: calm."
    },
    "affinity": 24,
    "alive": false,
    "diedAt": 10,
    "metAt": 0,
    "power": 24,
    "skillId": null,
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "deceased",
    "cause": "accident",
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 1,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": "orthodox-alliance",
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 1,
      "kind": "ill"
     },
     {
      "at": 8,
      "kind": "education",
      "value": "mu-village-school"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Цзян Хо дома Тан",
    "gender": "male",
    "bornAt": -3,
    "temperamentId": "ambitious",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Охрана караванов",
     "en": "Caravan escort"
    },
    "bio": {
     "ru": "Брат. Мечтает о большем и ждёт того же от близких. Характер: честолюбивый.",
     "en": "Brother. Dreams of more and expects the same of those close to them. Temperament: ambitious."
    },
    "affinity": 11,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 27,
    "skillId": null,
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "disciple",
    "educationTier": 2,
    "goal": null,
    "professionId": "escort",
    "careerRank": 0,
    "factionId": null,
    "health": 83,
    "wealth": 82,
    "talentId": null,
    "weaknessId": "short-temper",
    "log": [
     {
      "at": 5,
      "kind": "education",
      "value": "mu-village-school"
     },
     {
      "at": 7,
      "kind": "ill"
     },
     {
      "at": 20,
      "kind": "job",
      "value": "physician"
     },
     {
      "at": 21,
      "kind": "education",
      "value": "mu-outer-court"
     },
     {
      "at": 24,
      "kind": "class-up",
      "value": "disciple"
     },
     {
      "at": 25,
      "kind": "ill"
     },
     {
      "at": 27,
      "kind": "job-change",
      "value": "escort"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "grandparent",
    "name": "Вэй Ян дома Тан",
    "gender": "male",
    "bornAt": -55,
    "temperamentId": "brave",
    "traitId": "stern",
    "occupation": {
     "ru": "Носильщик",
     "en": "Porter"
    },
    "bio": {
     "ru": "Носильщик. Хвалит редко, требует много. Характер: отважный.",
     "en": "Porter. Praises rarely and demands much. Temperament: brave."
    },
    "affinity": 28,
    "alive": false,
    "diedAt": 7,
    "metAt": 0,
    "power": 14,
    "skillId": "athletics",
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "deceased",
    "cause": "old-age",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 0,
    "goal": "rise",
    "professionId": "laborer",
    "careerRank": 3,
    "factionId": "demonic-cult",
    "health": 100,
    "wealth": 0,
    "talentId": "iron-skin",
    "weaknessId": null,
    "log": [
     {
      "at": 1,
      "kind": "mentor",
      "value": "athletics"
     },
     {
      "at": 4,
      "kind": "retired",
      "value": "laborer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "sibling",
    "name": "Юэ Цин дома Тан",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "ambitious",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Подёнщик",
     "en": "Day labourer"
    },
    "bio": {
     "ru": "Ребёнок. Гнев вспыхивает быстро и быстро гаснет. Характер: честолюбивый.",
     "en": "Child. Anger flares fast and fades fast. Temperament: ambitious."
    },
    "affinity": 1,
    "alive": true,
    "diedAt": null,
    "metAt": 1,
    "power": 11,
    "skillId": null,
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": "n8",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 2,
    "goal": null,
    "professionId": "laborer",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 44,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 6,
      "kind": "ill"
     },
     {
      "at": 9,
      "kind": "education",
      "value": "mu-village-school"
     },
     {
      "at": 15,
      "kind": "education",
      "value": "mu-outer-court"
     },
     {
      "at": 17,
      "kind": "job",
      "value": "laborer"
     },
     {
      "at": 27,
      "kind": "married",
      "value": "n8"
     },
     {
      "at": 30,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n7",
    "role": "rival",
    "name": "Бай Лин клана Лун",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "kind",
    "traitId": "wise",
    "occupation": {
     "ru": "Охрана караванов",
     "en": "Caravan escort"
    },
    "bio": {
     "ru": "Гордый ученик соседней секты. Говорит мало, но к словам прислушиваются. Характер: добрый.",
     "en": "Proud disciple of a rival sect. Says little, but people listen. Temperament: kind."
    },
    "affinity": 15,
    "alive": true,
    "diedAt": null,
    "metAt": 11,
    "power": 25,
    "skillId": null,
    "interactedAt": null,
    "familyName": "клана Лун",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "wanderer",
    "educationTier": 2,
    "goal": null,
    "professionId": "escort",
    "careerRank": 0,
    "factionId": "orthodox-alliance",
    "health": 100,
    "wealth": 35,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 14,
      "kind": "education",
      "value": "mu-village-school"
     },
     {
      "at": 22,
      "kind": "job",
      "value": "escort"
     },
     {
      "at": 25,
      "kind": "education",
      "value": "mu-outer-court"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n8",
    "role": "in-law",
    "name": "Чэн Фэн дома Тан",
    "gender": "male",
    "bornAt": -2,
    "temperamentId": "cunning",
    "traitId": "stern",
    "occupation": {
     "ru": "Родственник",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственник. Хвалит редко, требует много. Характер: хитрый.",
     "en": "Relative. Praises rarely and demands much. Temperament: cunning."
    },
    "affinity": 9,
    "alive": true,
    "diedAt": null,
    "metAt": 27,
    "power": 34,
    "skillId": null,
    "interactedAt": null,
    "familyName": "дома Тан",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n6",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 1,
    "goal": "mastery",
    "professionId": "wanderer",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 13,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 27,
      "kind": "married",
      "value": "n6"
     }
    ],
    "lifeGen": null
   }
  ],
  "nextNpcId": 9,
  "meters": {
   "qi-deviation": 43
  },
  "consequences": [
   {
    "id": "mu.c-duel-fame",
    "age": 31,
    "source": "mu.rival-challenge"
   }
  ],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "mu.rival-challenge",
   "mu.manual",
   "mu.duel",
   "mu.deviation-crisis"
  ],
  "lineage": {
   "name": "дома Тан",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n2",
    "n1"
   ],
   "selfAdopted": false,
   "renown": 0,
   "startRenown": 0,
   "lives": [],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "murim",
      "origin": "physician-child",
      "race": "human",
      "family": "дома Тан",
      "n0": "Ци Минь дома Тан",
      "g0": "m"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 1,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n6",
      "n1",
      "n2"
     ],
     "v": {
      "n0": "Юэ Цин дома Тан",
      "g0": "f",
      "n1": "Гао Шань дома Тан",
      "g1": "m",
      "n2": "Тан Ми дома Тан",
      "g2": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 7,
     "gen": 1,
     "kind": "death",
     "who": [
      "n5"
     ],
     "v": {
      "cause": "old-age",
      "role": "grandparent",
      "age": 62,
      "n0": "Вэй Ян дома Тан",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 4,
     "year": 10,
     "gen": 1,
     "kind": "tragedy",
     "who": [
      "n3"
     ],
     "v": {
      "cause": "accident",
      "role": "sibling",
      "age": 10,
      "n0": "Юэ Цин дома Тан",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 11,
     "gen": 1,
     "kind": "class",
     "who": [
      "n2"
     ],
     "v": {
      "cls": "disciple",
      "dir": 1,
      "n0": "Тан Ми дома Тан",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 16,
     "gen": 1,
     "kind": "death",
     "who": [
      "n2"
     ],
     "v": {
      "cause": "event",
      "role": "mother",
      "age": 37,
      "n0": "Тан Ми дома Тан",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 7,
     "year": 16,
     "gen": 1,
     "kind": "inheritance",
     "who": [
      "n2",
      "self"
     ],
     "v": {
      "sum": 5,
      "law": "clan-merit",
      "n0": "Тан Ми дома Тан",
      "g0": "f",
      "n1": "Ци Минь дома Тан",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 8,
     "year": 24,
     "gen": 1,
     "kind": "class",
     "who": [
      "n4"
     ],
     "v": {
      "cls": "disciple",
      "dir": 1,
      "n0": "Цзян Хо дома Тан",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 9,
     "year": 27,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n6",
      "n8"
     ],
     "v": {
      "n0": "Юэ Цин дома Тан",
      "g0": "f",
      "n1": "Чэн Фэн дома Тан",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    }
   ],
   "nextEntry": 10,
   "achievements": [],
   "traits": {
    "talents": {},
    "weaknesses": {}
   },
   "threads": [],
   "pending": [],
   "stories": {},
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 4,
    "eventId": "common.fever",
    "choiceId": "endure",
    "success": false,
    "weight": 4
   },
   {
    "age": 8,
    "eventId": "mu.outer-court",
    "choiceId": "skip",
    "success": null,
    "weight": 5
   },
   {
    "age": 11,
    "eventId": "common.rival-appears",
    "choiceId": "compete",
    "success": null,
    "weight": 3
   },
   {
    "age": 12,
    "eventId": "common.study-or-play",
    "choiceId": "read",
    "success": false,
    "weight": 3
   },
   {
    "age": 13,
    "eventId": "mu.bottleneck",
    "choiceId": "seclusion",
    "success": false,
    "weight": 4
   },
   {
    "age": 14,
    "eventId": "mu.rival-challenge",
    "choiceId": "duel",
    "success": true,
    "weight": 5
   },
   {
    "age": 16,
    "eventId": "common.parent-illness",
    "choiceId": "away",
    "success": null,
    "weight": 6
   },
   {
    "age": 17,
    "eventId": "mu.bandits",
    "choiceId": "join",
    "success": false,
    "weight": 3
   },
   {
    "age": 19,
    "eventId": "common.calling",
    "choiceId": "merchant",
    "success": null,
    "weight": 4
   },
   {
    "age": 25,
    "eventId": "mu.duel",
    "choiceId": "accept",
    "success": true,
    "weight": 4
   },
   {
    "age": 28,
    "eventId": "mu.manual",
    "choiceId": "study",
    "success": true,
    "weight": 3
   },
   {
    "age": 29,
    "eventId": "mu.rival-challenge",
    "choiceId": "duel",
    "success": true,
    "weight": 5
   }
  ],
  "economy": {
   "cycle": "slump",
   "cycleSince": 30,
   "hardship": 0,
   "last": {
    "age": 30,
    "lines": [
     {
      "id": "profession",
      "amount": 8
     },
     {
      "id": "class",
      "amount": 1
     },
     {
      "id": "cycle",
      "amount": -2
     },
     {
      "id": "living",
      "amount": -1
     }
    ],
    "shortfall": 0
   },
   "years": [
    {
     "age": 21,
     "income": 8,
     "expenses": 3,
     "shortfall": 0
    },
    {
     "age": 22,
     "income": 8,
     "expenses": 3,
     "shortfall": 0
    },
    {
     "age": 23,
     "income": 8,
     "expenses": 3,
     "shortfall": 0
    },
    {
     "age": 24,
     "income": 8,
     "expenses": 3,
     "shortfall": 0
    },
    {
     "age": 25,
     "income": 9,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 26,
     "income": 9,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 27,
     "income": 9,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 28,
     "income": 9,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 29,
     "income": 9,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 30,
     "income": 9,
     "expenses": 3,
     "shortfall": 0
    }
   ]
  }
 },
 "xianxia-adult": {
  "schemaVersion": 4,
  "seed": "v4-xianxia-adult",
  "rngState": 2099588897,
  "version": 53,
  "character": {
   "name": "Шуй Лань с Облачного пика",
   "gender": "female",
   "universeId": "xianxia",
   "raceId": "human",
   "originId": "farm-child",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 14,
    "intelligence": 17,
    "agility": 11,
    "vitality": 11,
    "wisdom": 11,
    "charisma": 10,
    "luck": 9,
    "willpower": 25
   },
   "resources": {
    "health": 89,
    "energy": 110,
    "mana": 66,
    "stamina": 90
   },
   "level": 2,
   "xp": 69,
   "reputation": 4,
   "karma": 10,
   "wealth": 50,
   "abilities": [],
   "track": {
    "points": 15,
    "rank": 0
   },
   "socialClassId": "mortal",
   "talents": [
    "pill-sense"
   ],
   "weaknesses": [],
   "skills": {
    "survival": 5,
    "athletics": 3,
    "alchemy": 11,
    "cultivation": 10
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {
    "cloud-peak": 10
   }
  },
  "life": {
   "age": 30,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend",
   "spirit-root"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.night-fear": 1,
   "common.fever": 1,
   "common.first-friend": 1,
   "xx.taoist": 1,
   "common.grandparent-tale": 1,
   "common.parent-lesson": 1,
   "xx.root-test": 1,
   "xx.hidden-root": 1,
   "common.potential-sign": 1,
   "xi.eco-spirit-share": 1,
   "common.mentor": 1,
   "xx.tribulation": 2,
   "xx.blood-moon-offer": 1,
   "common.rival-appears": 1,
   "xx.alchemy": 1,
   "common.first-love": 1,
   "xx.herb": 1,
   "common.friend-needs-help": 1,
   "common.secret-surfaces": 1,
   "common.trade-offer": 1,
   "eco.hard-times": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "common.night-fear": 3,
   "common.fever": 4,
   "common.first-friend": 7,
   "xx.taoist": 8,
   "common.grandparent-tale": 9,
   "common.parent-lesson": 10,
   "xx.root-test": 11,
   "xx.hidden-root": 13,
   "common.potential-sign": 14,
   "xi.eco-spirit-share": 15,
   "common.mentor": 16,
   "xx.tribulation": 23,
   "xx.blood-moon-offer": 18,
   "common.rival-appears": 19,
   "xx.alchemy": 21,
   "common.first-love": 22,
   "xx.herb": 24,
   "common.friend-needs-help": 25,
   "common.secret-surfaces": 26,
   "common.trade-offer": 29,
   "eco.hard-times": 30
  },
  "pending": {
   "eventId": "eco.hard-times",
   "age": 30
  },
  "scheduled": [],
  "nextSeq": 59,
  "background": {
   "familyName": "с Облачного пика",
   "birthplace": {
    "ru": "сарай у городских ворот",
    "en": "a shed by the city gate"
   },
   "omen": {
    "ru": "Ветер принёс запах персиков, хотя стояла зима.",
    "en": "The wind carried the scent of peaches, though it was winter."
   },
   "familyHistory": {
    "ru": "Семья выращивает рис у подножия священной горы. Деды говорят, что когда-то в роду был бессмертный.",
    "en": "The family grows rice at the foot of a sacred mountain. The elders say there was once an immortal in the line."
   },
   "biography": [
    {
     "ru": "Шуй Лань с Облачного пика родилась: сарай у городских ворот. Ветер принёс запах персиков, хотя стояла зима.",
     "en": "Шуй Лань с Облачного пика was born: a shed by the city gate. The wind carried the scent of peaches, though it was winter."
    },
    {
     "ru": "Семья выращивает рис у подножия священной горы. Деды говорят, что когда-то в роду был бессмертный.",
     "en": "The family grows rice at the foot of a sacred mountain. The elders say there was once an immortal in the line."
    },
    {
     "ru": "Отец — Хань Ци с Облачного пика, дровосек. Мать — Нин Шуан с Облачного пика, дровосек. Братья и сёстры: Шуй, Сюэ.",
     "en": "Father: Хань Ци с Облачного пика, woodcutter. Mother: Нин Шуан с Облачного пика, woodcutter. Siblings: Шуй, Сюэ."
    },
    {
     "ru": "На семейном алтаре стоит табличка без имени, перед которой мать каждый день зажигает благовоние.",
     "en": "On the family altar stands a nameless tablet before which mother lights incense every day."
    },
    {
     "ru": "С первых дней заметно: слышит, когда пилюля готова.",
     "en": "It shows from the first days: hears when a pill is ready."
    }
   ]
  },
  "hidden": {
   "potential": 3,
   "destiny": 7,
   "dormantTalents": [
    "dragon-vein"
   ],
   "familySecret": "xx-immortal-ancestor",
   "revealed": [
    "potential",
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Хань Ци с Облачного пика",
    "gender": "male",
    "bornAt": -23,
    "temperamentId": "kind",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Дровосек",
     "en": "Woodcutter"
    },
    "bio": {
     "ru": "Дровосек. Живёт наполовину в выдуманных мирах. Характер: добрый.",
     "en": "Woodcutter. Lives half in imagined worlds. Temperament: kind."
    },
    "affinity": 57,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 45,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n2",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 2,
    "goal": "mastery",
    "professionId": "merchant",
    "careerRank": 2,
    "factionId": null,
    "health": 100,
    "wealth": 158,
    "talentId": "quick-learner",
    "weaknessId": null,
    "log": [
     {
      "at": 10,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 16,
      "kind": "promotion",
      "value": "2"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Нин Шуан с Облачного пика",
    "gender": "female",
    "bornAt": -29,
    "temperamentId": "brave",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Мастер талисманов",
     "en": "Talisman maker"
    },
    "bio": {
     "ru": "Дровосек. Гнев вспыхивает быстро и быстро гаснет. Характер: отважный.",
     "en": "Woodcutter. Anger flares fast and fades fast. Temperament: brave."
    },
    "affinity": 53,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 28,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [
     "n5"
    ],
    "spouseId": "n1",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "outer-sect",
    "educationTier": 1,
    "goal": "rise",
    "professionId": "talisman-maker",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 117,
    "talentId": "iron-body",
    "weaknessId": null,
    "log": [
     {
      "at": 5,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 8,
      "kind": "job-loss",
      "value": "laborer"
     },
     {
      "at": 10,
      "kind": "class-up",
      "value": "outer-sect"
     },
     {
      "at": 10,
      "kind": "goal",
      "value": "rise"
     },
     {
      "at": 17,
      "kind": "job",
      "value": "scholar"
     },
     {
      "at": 23,
      "kind": "job-change",
      "value": "talisman-maker"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Шуй Лань с Облачного пика",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Подёнщик",
     "en": "Day labourer"
    },
    "bio": {
     "ru": "Сестра. Смех слышно издалека. Характер: честолюбивый.",
     "en": "Sister. Their laughter carries far. Temperament: ambitious."
    },
    "affinity": 30,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 19,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 1,
    "goal": null,
    "professionId": "laborer",
    "careerRank": 0,
    "factionId": null,
    "health": 54,
    "wealth": 22,
    "talentId": null,
    "weaknessId": "spendthrift",
    "log": [
     {
      "at": 1,
      "kind": "ill"
     },
     {
      "at": 3,
      "kind": "ill"
     },
     {
      "at": 4,
      "kind": "ill"
     },
     {
      "at": 10,
      "kind": "education",
      "value": "xx-village"
     },
     {
      "at": 27,
      "kind": "job",
      "value": "laborer"
     },
     {
      "at": 28,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Сюэ Хуа с Облачного пика",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "kind",
    "traitId": "caring",
    "occupation": {
     "ru": "Собиратель трав",
     "en": "Herb gatherer"
    },
    "bio": {
     "ru": "Сестра. Всегда замечает, когда другим плохо. Характер: добрый.",
     "en": "Sister. Always notices when others are hurting. Temperament: kind."
    },
    "affinity": 35,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 17,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": "n8",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 2,
    "goal": null,
    "professionId": "herb-gatherer",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 42,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 4,
      "kind": "ill"
     },
     {
      "at": 6,
      "kind": "education",
      "value": "xx-village"
     },
     {
      "at": 10,
      "kind": "ill"
     },
     {
      "at": 12,
      "kind": "education",
      "value": "xx-outer-court"
     },
     {
      "at": 17,
      "kind": "job",
      "value": "herb-gatherer"
     },
     {
      "at": 20,
      "kind": "married",
      "value": "n8"
     },
     {
      "at": 23,
      "kind": "child",
      "value": "n9"
     },
     {
      "at": 26,
      "kind": "child",
      "value": "n10"
     },
     {
      "at": 29,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "grandparent",
    "name": "Цин Ли с Облачного пика",
    "gender": "female",
    "bornAt": -51,
    "temperamentId": "cunning",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Учёный",
     "en": "Scholar"
    },
    "bio": {
     "ru": "Дровосек. Живёт наполовину в выдуманных мирах. Характер: хитрый.",
     "en": "Woodcutter. Lives half in imagined worlds. Temperament: cunning."
    },
    "affinity": 38,
    "alive": false,
    "diedAt": 16,
    "metAt": 0,
    "power": 18,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "deceased",
    "cause": "old-age",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 1,
    "goal": "knowledge",
    "professionId": "scholar",
    "careerRank": 1,
    "factionId": "cloud-peak",
    "health": 57,
    "wealth": 0,
    "talentId": null,
    "weaknessId": "spendthrift",
    "log": [
     {
      "at": 2,
      "kind": "job-change",
      "value": "scholar"
     },
     {
      "at": 12,
      "kind": "ill"
     },
     {
      "at": 14,
      "kind": "retired",
      "value": "scholar"
     },
     {
      "at": 15,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Мин Хао долины Ветров",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "calm",
    "traitId": "proud",
    "occupation": {
     "ru": "Алхимик",
     "en": "Alchemist"
    },
    "bio": {
     "ru": "Сын собирателя трав. Не прощает обид и не просит помощи. Характер: спокойный.",
     "en": "Herb gatherer's son. Never forgives a slight and never asks for help. Temperament: calm."
    },
    "affinity": 35,
    "alive": true,
    "diedAt": null,
    "metAt": 7,
    "power": 24,
    "skillId": "athletics",
    "interactedAt": null,
    "familyName": "долины Ветров",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "fox-spirit",
    "socialClassId": "outer-sect",
    "educationTier": 2,
    "goal": null,
    "professionId": "alchemist",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 35,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 24,
      "kind": "job",
      "value": "alchemist"
     },
     {
      "at": 25,
      "kind": "education",
      "value": "xx-outer-court"
     },
     {
      "at": 26,
      "kind": "missing"
     },
     {
      "at": 28,
      "kind": "returned"
     },
     {
      "at": 30,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n7",
    "role": "rival",
    "name": "Сяо Чэнь долины Ветров",
    "gender": "male",
    "bornAt": 1,
    "temperamentId": "cunning",
    "traitId": "drinker",
    "occupation": {
     "ru": "Гордый наследник клана Лю",
     "en": "Proud heir of the Liu clan"
    },
    "bio": {
     "ru": "Гордый наследник клана Лю. Кружка за кружкой топит какую-то старую беду. Характер: хитрый.",
     "en": "Proud heir of the Liu clan. Drowns some old sorrow mug after mug. Temperament: cunning."
    },
    "affinity": -34,
    "alive": true,
    "diedAt": null,
    "metAt": 19,
    "power": 24,
    "skillId": null,
    "interactedAt": null,
    "familyName": "долины Ветров",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-dragon",
    "socialClassId": "mortal",
    "educationTier": 2,
    "goal": "family",
    "professionId": null,
    "careerRank": 0,
    "factionId": "blood-moon",
    "health": 100,
    "wealth": 17,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 22,
      "kind": "job-loss",
      "value": "wanderer"
     },
     {
      "at": 23,
      "kind": "education",
      "value": "xx-outer-court"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n8",
    "role": "in-law",
    "name": "Цзинь Мо с Облачного пика",
    "gender": "male",
    "bornAt": -3,
    "temperamentId": "kind",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Родственник",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственник. Смех слышно издалека. Характер: добрый.",
     "en": "Relative. Their laughter carries far. Temperament: kind."
    },
    "affinity": 18,
    "alive": true,
    "diedAt": null,
    "metAt": 20,
    "power": 38,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n4",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 3,
    "goal": "mastery",
    "professionId": null,
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 39,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 20,
      "kind": "married",
      "value": "n4"
     },
     {
      "at": 21,
      "kind": "education",
      "value": "xx-inner-peak"
     },
     {
      "at": 23,
      "kind": "child",
      "value": "n9"
     },
     {
      "at": 23,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 26,
      "kind": "child",
      "value": "n10"
     },
     {
      "at": 27,
      "kind": "job-loss",
      "value": "herb-gatherer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n9",
    "role": "nibling",
    "name": "Цин Ли с Облачного пика",
    "gender": "female",
    "bornAt": 23,
    "temperamentId": "ambitious",
    "traitId": "stern",
    "occupation": {
     "ru": "Ребёнок",
     "en": "Child"
    },
    "bio": {
     "ru": "Ребёнок. Хвалит редко, требует много. Характер: честолюбивый.",
     "en": "Child. Praises rarely and demands much. Temperament: ambitious."
    },
    "affinity": -5,
    "alive": true,
    "diedAt": null,
    "metAt": 23,
    "power": 13,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [
     "n4",
     "n8"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 1,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": "cloud-peak",
    "health": 100,
    "wealth": 5,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 29,
      "kind": "education",
      "value": "xx-village"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n10",
    "role": "nibling",
    "name": "Сяо Чэнь с Облачного пика",
    "gender": "male",
    "bornAt": 26,
    "temperamentId": "curious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Ребёнок",
     "en": "Child"
    },
    "bio": {
     "ru": "Ребёнок. Кружка за кружкой топит какую-то старую беду. Характер: любопытный.",
     "en": "Child. Drowns some old sorrow mug after mug. Temperament: curious."
    },
    "affinity": 4,
    "alive": true,
    "diedAt": null,
    "metAt": 26,
    "power": 10,
    "skillId": null,
    "interactedAt": null,
    "familyName": "с Облачного пика",
    "status": "alive",
    "cause": null,
    "parents": [
     "n4",
     "n8"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "mortal",
    "educationTier": 0,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": "blood-moon",
    "health": 63,
    "wealth": 1,
    "talentId": "lucky-star",
    "weaknessId": null,
    "log": [
     {
      "at": 29,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   }
  ],
  "nextNpcId": 11,
  "meters": {
   "dao-heart": 35,
   "karmic-debt": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "eco.hard-times",
   "common.trade-offer",
   "common.secret-surfaces",
   "common.friend-needs-help"
  ],
  "lineage": {
   "name": "с Облачного пика",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n2",
    "n1"
   ],
   "selfAdopted": false,
   "renown": 0,
   "startRenown": 0,
   "lives": [],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "xianxia",
      "origin": "farm-child",
      "race": "human",
      "family": "с Облачного пика",
      "n0": "Шуй Лань с Облачного пика",
      "g0": "f"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 10,
     "gen": 1,
     "kind": "class",
     "who": [
      "n2"
     ],
     "v": {
      "cls": "outer-sect",
      "dir": 1,
      "n0": "Нин Шуан с Облачного пика",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 14,
     "gen": 1,
     "kind": "achievement",
     "who": [
      "self"
     ],
     "v": {
      "achievement": "know-thyself",
      "n0": "Шуй Лань с Облачного пика",
      "g0": "f"
     },
     "src": "achievement",
     "link": null
    },
    {
     "id": 4,
     "year": 16,
     "gen": 1,
     "kind": "death",
     "who": [
      "n5"
     ],
     "v": {
      "cause": "old-age",
      "role": "grandparent",
      "age": 67,
      "n0": "Цин Ли с Облачного пика",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 20,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n4",
      "n8"
     ],
     "v": {
      "n0": "Сюэ Хуа с Облачного пика",
      "g0": "f",
      "n1": "Цзинь Мо с Облачного пика",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 23,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n9",
      "n4",
      "n8"
     ],
     "v": {
      "n0": "Цин Ли с Облачного пика",
      "g0": "f",
      "n1": "Сюэ Хуа с Облачного пика",
      "g1": "f",
      "n2": "Цзинь Мо с Облачного пика",
      "g2": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 7,
     "year": 26,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n10",
      "n4",
      "n8"
     ],
     "v": {
      "n0": "Сяо Чэнь с Облачного пика",
      "g0": "m",
      "n1": "Сюэ Хуа с Облачного пика",
      "g1": "f",
      "n2": "Цзинь Мо с Облачного пика",
      "g2": "m"
     },
     "src": "npc",
     "link": null
    }
   ],
   "nextEntry": 8,
   "achievements": [
    {
     "id": "know-thyself",
     "gen": 1,
     "age": 14
    }
   ],
   "traits": {
    "talents": {},
    "weaknesses": {}
   },
   "threads": [],
   "pending": [],
   "stories": {},
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 1,
    "eventId": "common.first-steps",
    "choiceId": "stairs",
    "success": false,
    "weight": 4
   },
   {
    "age": 4,
    "eventId": "common.fever",
    "choiceId": "endure",
    "success": true,
    "weight": 3
   },
   {
    "age": 7,
    "eventId": "common.first-friend",
    "choiceId": "defend",
    "success": false,
    "weight": 6
   },
   {
    "age": 8,
    "eventId": "xx.taoist",
    "choiceId": "fields",
    "success": null,
    "weight": 3
   },
   {
    "age": 10,
    "eventId": "common.parent-lesson",
    "choiceId": "bored",
    "success": null,
    "weight": 3
   },
   {
    "age": 13,
    "eventId": "xx.hidden-root",
    "choiceId": "grasp",
    "success": true,
    "weight": 4
   },
   {
    "age": 15,
    "eventId": "xi.eco-spirit-share",
    "choiceId": "challenge",
    "success": true,
    "weight": 4
   },
   {
    "age": 16,
    "eventId": "common.mentor",
    "choiceId": "test",
    "success": false,
    "weight": 3
   },
   {
    "age": 17,
    "eventId": "xx.tribulation",
    "choiceId": "face",
    "success": false,
    "weight": 4
   },
   {
    "age": 19,
    "eventId": "common.rival-appears",
    "choiceId": "compete",
    "success": null,
    "weight": 5
   },
   {
    "age": 25,
    "eventId": "common.friend-needs-help",
    "choiceId": "stand",
    "success": false,
    "weight": 4
   },
   {
    "age": 26,
    "eventId": "common.secret-surfaces",
    "choiceId": "burn",
    "success": null,
    "weight": 2
   }
  ],
  "economy": {
   "cycle": "slump",
   "cycleSince": 23,
   "hardship": 0,
   "last": {
    "age": 30,
    "lines": [
     {
      "id": "class",
      "amount": 1
     },
     {
      "id": "living",
      "amount": -1
     }
    ],
    "shortfall": 0
   },
   "years": [
    {
     "age": 21,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 22,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 23,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 24,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 25,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 26,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 27,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 28,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 29,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 30,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    }
   ]
  }
 },
 "hunter-adult": {
  "schemaVersion": 4,
  "seed": "v4-hunter-adult",
  "rngState": 756090151,
  "version": 49,
  "character": {
   "name": "Макс Ирвин",
   "gender": "male",
   "universeId": "hunter",
   "raceId": "human",
   "originId": "ordinary",
   "temperamentId": "cunning",
   "stats": {
    "strength": 9,
    "intelligence": 19,
    "agility": 11,
    "vitality": 10,
    "wisdom": 16,
    "charisma": 18,
    "luck": 9,
    "willpower": 11
   },
   "resources": {
    "health": 85,
    "energy": 82,
    "mana": 80,
    "stamina": 78
   },
   "level": 2,
   "xp": 80,
   "reputation": 3,
   "karma": -30,
   "wealth": 125,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   },
   "socialClassId": "citizen",
   "talents": [
    "gate-born",
    "keen-eye"
   ],
   "weaknesses": [
    "gate-trauma"
   ],
   "skills": {
    "athletics": 3,
    "lore": 6,
    "survival": 20,
    "stealth": 6
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {
    "association": 15
   }
  },
  "life": {
   "age": 30,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.fever": 1,
   "common.first-friend": 1,
   "common.study-or-play": 1,
   "common.night-fear": 1,
   "common.parent-lesson": 1,
   "common.parent-illness": 1,
   "common.mentor": 1,
   "hu.awakening": 1,
   "common.lost-purse": 2,
   "hu.district-break": 2,
   "hu.gate-break": 1,
   "common.friend-needs-help": 1,
   "common.talent-awakens": 1,
   "common.grandparent-tale": 1,
   "common.trade-offer": 1,
   "legacy.betrayal": 1
  },
  "lastSeen": {
   "common.first-steps": 2,
   "common.fever": 3,
   "common.first-friend": 4,
   "common.study-or-play": 6,
   "common.night-fear": 7,
   "common.parent-lesson": 8,
   "common.parent-illness": 12,
   "common.mentor": 13,
   "hu.awakening": 14,
   "common.lost-purse": 26,
   "hu.district-break": 28,
   "hu.gate-break": 17,
   "common.friend-needs-help": 18,
   "common.talent-awakens": 19,
   "common.grandparent-tale": 23,
   "common.trade-offer": 24,
   "legacy.betrayal": 30
  },
  "pending": {
   "eventId": "legacy.betrayal",
   "age": 30
  },
  "scheduled": [],
  "nextSeq": 53,
  "background": {
   "familyName": "",
   "birthplace": {
    "ru": "государственный приют в Мапхо",
    "en": "a state orphanage in Mapo"
   },
   "omen": {
    "ru": "Город спал спокойно: ни одной тревоги за ночь.",
    "en": "The city slept peacefully: not a single alarm all night."
   },
   "familyHistory": {
    "ru": "Квартира в спальном районе, кредит за неё и отец, который работает в две смены.",
    "en": "A flat in a commuter district, the loan on it, and a father working double shifts."
   },
   "biography": [
    {
     "ru": "Макс Ирвин родился: государственный приют в Мапхо. Город спал спокойно: ни одной тревоги за ночь.",
     "en": "Макс Ирвин was born: a state orphanage in Mapo. The city slept peacefully: not a single alarm all night."
    },
    {
     "ru": "Квартира в спальном районе, кредит за неё и отец, который работает в две смены.",
     "en": "A flat in a commuter district, the loan on it, and a father working double shifts."
    },
    {
     "ru": "Отец — Макс Ирвин, офисный работник. Мать — Ника Хан, медсестра. Братья и сёстры: Ана.",
     "en": "Father: Макс Ирвин, office worker. Mother: Ника Хан, nurse. Siblings: Ана."
    },
    {
     "ru": "Отец никогда не ходит в подземелья, но по ночам его вызывают люди в чёрном.",
     "en": "Father never enters dungeons, yet men in black summon him at night."
    },
    {
     "ru": "С первых дней заметно: чувствует разломы раньше датчиков.",
     "en": "It shows from the first days: senses rifts before the sensors do."
    },
    {
     "ru": "Старая повитуха долго смотрит на ребёнка и говорит, что в нём спит что-то большее.",
     "en": "The old midwife studies the child for a long time and says something greater sleeps within."
    }
   ]
  },
  "hidden": {
   "potential": 8,
   "destiny": 5,
   "dormantTalents": [],
   "familySecret": "hu-father-rank",
   "revealed": [
    "familySecret"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Макс Ирвин",
    "gender": "male",
    "bornAt": -33,
    "temperamentId": "brave",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Офисный работник",
     "en": "Office worker"
    },
    "bio": {
     "ru": "Офисный работник. Гнев вспыхивает быстро и быстро гаснет. Характер: отважный.",
     "en": "Office worker. Anger flares fast and fades fast. Temperament: brave."
    },
    "affinity": 45,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 47,
    "skillId": "survival",
    "interactedAt": null,
    "familyName": "",
    "status": "retired",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [
     "n2"
    ],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "citizen",
    "educationTier": 0,
    "goal": "wealth",
    "professionId": "merchant",
    "careerRank": 2,
    "factionId": null,
    "health": 57,
    "wealth": 172,
    "talentId": "iron-body",
    "weaknessId": "stutter",
    "log": [
     {
      "at": 12,
      "kind": "widowed",
      "value": "n2"
     },
     {
      "at": 18,
      "kind": "ill"
     },
     {
      "at": 22,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 23,
      "kind": "ill"
     },
     {
      "at": 26,
      "kind": "ill"
     },
     {
      "at": 27,
      "kind": "retired",
      "value": "merchant"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Ника Хан",
    "gender": "female",
    "bornAt": -28,
    "temperamentId": "calm",
    "traitId": "caring",
    "occupation": {
     "ru": "Охотник-стример",
     "en": "Hunter streamer"
    },
    "bio": {
     "ru": "Медсестра. Всегда замечает, когда другим плохо. Характер: спокойный.",
     "en": "Nurse. Always notices when others are hurting. Temperament: calm."
    },
    "affinity": 85,
    "alive": false,
    "diedAt": 12,
    "metAt": 0,
    "power": 29,
    "skillId": null,
    "interactedAt": null,
    "familyName": "",
    "status": "deceased",
    "cause": "event",
    "parents": [
     "n4"
    ],
    "spouseId": "n1",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "citizen",
    "educationTier": 0,
    "goal": "wealth",
    "professionId": "hunter-streamer",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": "iron-body",
    "weaknessId": "reckless",
    "log": [
     {
      "at": 2,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 3,
      "kind": "job-loss",
      "value": "merchant"
     },
     {
      "at": 6,
      "kind": "job",
      "value": "hunter-streamer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Ана Вэй",
    "gender": "female",
    "bornAt": -7,
    "temperamentId": "cunning",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Стражник",
     "en": "Guard"
    },
    "bio": {
     "ru": "Сестра. Смех слышно издалека. Характер: хитрый.",
     "en": "Sister. Their laughter carries far. Temperament: cunning."
    },
    "affinity": 18,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 47,
    "skillId": null,
    "interactedAt": null,
    "familyName": "",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "citizen",
    "educationTier": 3,
    "goal": null,
    "professionId": "guard",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 65,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 6,
      "kind": "education",
      "value": "hu-hunter-academy"
     },
     {
      "at": 8,
      "kind": "ill"
     },
     {
      "at": 12,
      "kind": "education",
      "value": "hu-gate-institute"
     },
     {
      "at": 15,
      "kind": "ill"
     },
     {
      "at": 16,
      "kind": "job",
      "value": "guard"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "grandparent",
    "name": "Ян Со",
    "gender": "male",
    "bornAt": -44,
    "temperamentId": "curious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Офисный работник",
     "en": "Office worker"
    },
    "bio": {
     "ru": "Офисный работник. Живёт наполовину в выдуманных мирах. Характер: любопытный.",
     "en": "Office worker. Lives half in imagined worlds. Temperament: curious."
    },
    "affinity": 38,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 28,
    "skillId": null,
    "interactedAt": null,
    "familyName": "",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [
     "n5"
    ],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "licensed-hunter",
    "educationTier": 0,
    "goal": "family",
    "professionId": "wanderer",
    "careerRank": 2,
    "factionId": "association",
    "health": 100,
    "wealth": 184,
    "talentId": "iron-body",
    "weaknessId": "night-terrors",
    "log": [
     {
      "at": 2,
      "kind": "married",
      "value": "n5"
     },
     {
      "at": 3,
      "kind": "class-up",
      "value": "licensed-hunter"
     },
     {
      "at": 28,
      "kind": "widowed",
      "value": "n5"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "in-law",
    "name": "Дана Рё",
    "gender": "female",
    "bornAt": -42,
    "temperamentId": "brave",
    "traitId": "wise",
    "occupation": {
     "ru": "Родственница",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственница. Говорит мало, но к словам прислушиваются. Характер: отважный.",
     "en": "Relative. Says little, but people listen. Temperament: brave."
    },
    "affinity": 0,
    "alive": false,
    "diedAt": 28,
    "metAt": 2,
    "power": 12,
    "skillId": null,
    "interactedAt": null,
    "familyName": "",
    "status": "deceased",
    "cause": "old-age",
    "parents": [],
    "spouseId": "n4",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "citizen",
    "educationTier": 1,
    "goal": "rise",
    "professionId": "hunter-streamer",
    "careerRank": 2,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": "stutter",
    "log": [
     {
      "at": 2,
      "kind": "married",
      "value": "n4"
     },
     {
      "at": 10,
      "kind": "class-up",
      "value": "citizen"
     },
     {
      "at": 10,
      "kind": "goal",
      "value": "rise"
     },
     {
      "at": 24,
      "kind": "retired",
      "value": "hunter-streamer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Лео Кан",
    "gender": "male",
    "bornAt": -2,
    "temperamentId": "kind",
    "traitId": "wise",
    "occupation": {
     "ru": "Торговец",
     "en": "Merchant"
    },
    "bio": {
     "ru": "Друг детства из приюта. Говорит мало, но к словам прислушиваются. Характер: добрый.",
     "en": "Childhood friend from the orphanage. Says little, but people listen. Temperament: kind."
    },
    "affinity": 42,
    "alive": true,
    "diedAt": null,
    "metAt": 4,
    "power": 35,
    "skillId": "trade",
    "interactedAt": null,
    "familyName": "",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "citizen",
    "educationTier": 0,
    "goal": null,
    "professionId": "merchant",
    "careerRank": 1,
    "factionId": null,
    "health": 94,
    "wealth": 68,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 15,
      "kind": "job",
      "value": "merchant"
     },
     {
      "at": 22,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 26,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n7",
    "role": "rival",
    "name": "Макс Ирвин",
    "gender": "male",
    "bornAt": 1,
    "temperamentId": "brave",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Наследник «Белого тигра»",
     "en": "Heir of the White Tiger"
    },
    "bio": {
     "ru": "Наследник «Белого тигра». Смех слышно издалека. Характер: отважный.",
     "en": "Heir of the White Tiger. Their laughter carries far. Temperament: brave."
    },
    "affinity": -13,
    "alive": false,
    "diedAt": 29,
    "metAt": 23,
    "power": 33,
    "skillId": null,
    "interactedAt": null,
    "familyName": "",
    "status": "deceased",
    "cause": "battle",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "licensed-hunter",
    "educationTier": 2,
    "goal": "knowledge",
    "professionId": "guard",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 25,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   }
  ],
  "nextNpcId": 8,
  "meters": {
   "gate-threat": 46,
   "fame": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "legacy.betrayal",
   "hu.district-break",
   "common.lost-purse",
   "common.trade-offer"
  ],
  "lineage": {
   "name": "Макс Ирвин",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n2",
    "n1"
   ],
   "selfAdopted": false,
   "renown": 0,
   "startRenown": 0,
   "lives": [],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "hunter",
      "origin": "ordinary",
      "race": "human",
      "family": "Макс Ирвин",
      "n0": "Макс Ирвин",
      "g0": "m"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 2,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n4",
      "n5"
     ],
     "v": {
      "n0": "Ян Со",
      "g0": "m",
      "n1": "Дана Рё",
      "g1": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 3,
     "gen": 1,
     "kind": "class",
     "who": [
      "n4"
     ],
     "v": {
      "cls": "licensed-hunter",
      "dir": 1,
      "n0": "Ян Со",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 4,
     "year": 10,
     "gen": 1,
     "kind": "class",
     "who": [
      "n5"
     ],
     "v": {
      "cls": "citizen",
      "dir": 1,
      "n0": "Дана Рё",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 12,
     "gen": 1,
     "kind": "death",
     "who": [
      "n2"
     ],
     "v": {
      "cause": "event",
      "role": "mother",
      "age": 40,
      "n0": "Ника Хан",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 12,
     "gen": 1,
     "kind": "inheritance",
     "who": [
      "n2",
      "self"
     ],
     "v": {
      "sum": 10,
      "law": "civil-code",
      "n0": "Ника Хан",
      "g0": "f",
      "n1": "Макс Ирвин",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 7,
     "year": 28,
     "gen": 1,
     "kind": "death",
     "who": [
      "n5"
     ],
     "v": {
      "cause": "old-age",
      "role": "in-law",
      "age": 70,
      "n0": "Дана Рё",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    }
   ],
   "nextEntry": 8,
   "achievements": [],
   "traits": {
    "talents": {},
    "weaknesses": {}
   },
   "threads": [],
   "pending": [],
   "stories": {},
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 3,
    "eventId": "common.fever",
    "choiceId": "endure",
    "success": false,
    "weight": 4
   },
   {
    "age": 4,
    "eventId": "common.first-friend",
    "choiceId": "defend",
    "success": true,
    "weight": 6
   },
   {
    "age": 6,
    "eventId": "common.study-or-play",
    "choiceId": "read",
    "success": true,
    "weight": 5
   },
   {
    "age": 8,
    "eventId": "common.parent-lesson",
    "choiceId": "learn",
    "success": null,
    "weight": 3
   },
   {
    "age": 12,
    "eventId": "common.parent-illness",
    "choiceId": "away",
    "success": null,
    "weight": 7
   },
   {
    "age": 13,
    "eventId": "common.mentor",
    "choiceId": "test",
    "success": false,
    "weight": 3
   },
   {
    "age": 16,
    "eventId": "hu.district-break",
    "choiceId": "flee",
    "success": null,
    "weight": 3
   },
   {
    "age": 18,
    "eventId": "common.friend-needs-help",
    "choiceId": "stand",
    "success": true,
    "weight": 4
   },
   {
    "age": 19,
    "eventId": "common.talent-awakens",
    "choiceId": "fear",
    "success": true,
    "weight": 4
   },
   {
    "age": 23,
    "eventId": "common.grandparent-tale",
    "choiceId": "listen",
    "success": null,
    "weight": 5
   },
   {
    "age": 24,
    "eventId": "common.trade-offer",
    "choiceId": "invest",
    "success": false,
    "weight": 4
   },
   {
    "age": 28,
    "eventId": "hu.district-break",
    "choiceId": "evacuate",
    "success": false,
    "weight": 7
   }
  ],
  "economy": {
   "cycle": "boom",
   "cycleSince": 29,
   "hardship": 0,
   "last": {
    "age": 30,
    "lines": [
     {
      "id": "class",
      "amount": 2
     },
     {
      "id": "living",
      "amount": -2
     }
    ],
    "shortfall": 0
   },
   "years": [
    {
     "age": 21,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 22,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 23,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 24,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 25,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 26,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 27,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 28,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 29,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    },
    {
     "age": 30,
     "income": 2,
     "expenses": 2,
     "shortfall": 0
    }
   ]
  }
 },
 "academy-adult": {
  "schemaVersion": 4,
  "seed": "v4-academy-adult",
  "rngState": 4250569125,
  "version": 50,
  "character": {
   "name": "Феликс фон Аштейн",
   "gender": "male",
   "universeId": "academy",
   "raceId": "half-elf",
   "originId": "scholarship",
   "temperamentId": "brave",
   "stats": {
    "strength": 20,
    "intelligence": 8,
    "agility": 11,
    "vitality": 16,
    "wisdom": 15,
    "charisma": 12,
    "luck": 8,
    "willpower": 18
   },
   "resources": {
    "health": 109,
    "energy": 96,
    "mana": 56,
    "stamina": 112
   },
   "level": 2,
   "xp": 75,
   "reputation": 3,
   "karma": -11,
   "wealth": 155,
   "abilities": [],
   "track": {
    "points": 15,
    "rank": 0
   },
   "socialClassId": "commoner",
   "talents": [],
   "weaknesses": [],
   "skills": {
    "lore": 18,
    "etiquette": 10,
    "arcana": 16,
    "duelling": 10
   },
   "professionId": null,
   "educationId": "ac-astrein",
   "specializationId": null,
   "factions": {
    "magic-tower": 20
   }
  },
  "life": {
   "age": 30,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend",
   "academy-student",
   "court-secret"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "common.sibling-quarrel": 1,
   "ac.tutor": 1,
   "common.first-friend": 1,
   "common.study-or-play": 1,
   "common.grandparent-tale": 1,
   "common.lost-purse": 2,
   "common.potential-sign": 1,
   "common.rival-appears": 1,
   "common.friend-needs-help": 1,
   "ac.entrance": 1,
   "ac.ball": 1,
   "ac.circle": 2,
   "ac.duel": 1,
   "ac.eco-crown-levy": 1,
   "ac.secret": 1,
   "legacy.betrayal": 1,
   "legacy.relative-vanishes": 1
  },
  "lastSeen": {
   "common.night-fear": 3,
   "common.sibling-quarrel": 4,
   "ac.tutor": 5,
   "common.first-friend": 7,
   "common.study-or-play": 8,
   "common.grandparent-tale": 9,
   "common.lost-purse": 26,
   "common.potential-sign": 12,
   "common.rival-appears": 14,
   "common.friend-needs-help": 15,
   "ac.entrance": 17,
   "ac.ball": 19,
   "ac.circle": 27,
   "ac.duel": 23,
   "ac.eco-crown-levy": 24,
   "ac.secret": 25,
   "legacy.betrayal": 29,
   "legacy.relative-vanishes": 30
  },
  "pending": {
   "eventId": "legacy.relative-vanishes",
   "age": 30
  },
  "scheduled": [],
  "nextSeq": 58,
  "background": {
   "familyName": "фон Аштейн",
   "birthplace": {
    "ru": "тайный загородный дом графа",
    "en": "a count's secret country house"
   },
   "omen": {
    "ru": "В ночь рождения во дворце давали бал, и музыка была слышна по всей реке.",
    "en": "On the night of the birth a ball was held at the palace, and the music carried along the river."
   },
   "familyHistory": {
    "ru": "Мать — прачка в квартале у порта. Она откладывала каждый медяк на книги.",
    "en": "Mother is a laundress in the harbour quarter. She saved every copper for books."
   },
   "biography": [
    {
     "ru": "Феликс фон Аштейн родился: тайный загородный дом графа. В ночь рождения во дворце давали бал, и музыка была слышна по всей реке.",
     "en": "Феликс фон Аштейн was born: a count's secret country house. On the night of the birth a ball was held at the palace, and the music carried along the river."
    },
    {
     "ru": "Мать — прачка в квартале у порта. Она откладывала каждый медяк на книги.",
     "en": "Mother is a laundress in the harbour quarter. She saved every copper for books."
    },
    {
     "ru": "Отец — Люсьен фон Аштейн, писарь. Мать — Аурелия фон Аштейн, писарь.",
     "en": "Father: Люсьен фон Аштейн, clerk. Mother: Аурелия фон Аштейн, clerk."
    },
    {
     "ru": "Мать получает письма с печатью Башни магов и сжигает их не читая.",
     "en": "Mother receives letters sealed by the Mage Tower and burns them unread."
    }
   ]
  },
  "hidden": {
   "potential": 4,
   "destiny": 2,
   "dormantTalents": [
    "golden-hands",
    "quick-learner"
   ],
   "familySecret": "ac-tower-debt",
   "revealed": [
    "potential",
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Люсьен фон Аштейн",
    "gender": "male",
    "bornAt": -24,
    "temperamentId": "brave",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Писарь",
     "en": "Clerk"
    },
    "bio": {
     "ru": "Писарь. Гнев вспыхивает быстро и быстро гаснет. Характер: отважный.",
     "en": "Clerk. Anger flares fast and fades fast. Temperament: brave."
    },
    "affinity": 30,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 26,
    "skillId": null,
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n2",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "lesser-noble",
    "educationTier": 2,
    "goal": "rise",
    "professionId": null,
    "careerRank": 0,
    "factionId": "magic-tower",
    "health": 63,
    "wealth": 139,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 2,
      "kind": "class-up",
      "value": "service"
     },
     {
      "at": 2,
      "kind": "goal",
      "value": "rise"
     },
     {
      "at": 3,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 10,
      "kind": "child",
      "value": "n7"
     },
     {
      "at": 11,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 14,
      "kind": "child",
      "value": "n8"
     },
     {
      "at": 20,
      "kind": "promotion",
      "value": "3"
     },
     {
      "at": 21,
      "kind": "class-up",
      "value": "lesser-noble"
     },
     {
      "at": 21,
      "kind": "goal",
      "value": "rise"
     },
     {
      "at": 23,
      "kind": "job-loss",
      "value": "scholar"
     },
     {
      "at": 24,
      "kind": "ill"
     },
     {
      "at": 27,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Аурелия фон Аштейн",
    "gender": "female",
    "bornAt": -25,
    "temperamentId": "brave",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Дипломат",
     "en": "Diplomat"
    },
    "bio": {
     "ru": "Писарь. Гнев вспыхивает быстро и быстро гаснет. Характер: отважный.",
     "en": "Clerk. Anger flares fast and fades fast. Temperament: brave."
    },
    "affinity": 43,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 42,
    "skillId": "craft",
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "alive",
    "cause": null,
    "parents": [
     "n3"
    ],
    "spouseId": "n1",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "service",
    "educationTier": 0,
    "goal": "wealth",
    "professionId": null,
    "careerRank": 0,
    "factionId": "rose-society",
    "health": 100,
    "wealth": 76,
    "talentId": null,
    "weaknessId": "reckless",
    "log": [
     {
      "at": 1,
      "kind": "child",
      "value": "n4"
     },
     {
      "at": 10,
      "kind": "child",
      "value": "n7"
     },
     {
      "at": 11,
      "kind": "job-change",
      "value": "diplomat"
     },
     {
      "at": 14,
      "kind": "child",
      "value": "n8"
     },
     {
      "at": 14,
      "kind": "class-up",
      "value": "service"
     },
     {
      "at": 17,
      "kind": "job-loss",
      "value": "diplomat"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "grandparent",
    "name": "Розалин фон Аштейн",
    "gender": "female",
    "bornAt": -55,
    "temperamentId": "kind",
    "traitId": "proud",
    "occupation": {
     "ru": "Прачка",
     "en": "Laundress"
    },
    "bio": {
     "ru": "Прачка. Не прощает обид и не просит помощи. Характер: добрый.",
     "en": "Laundress. Never forgives a slight and never asks for help. Temperament: kind."
    },
    "affinity": 35,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 22,
    "skillId": "arcana",
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "lesser-noble",
    "educationTier": 0,
    "goal": "family",
    "professionId": "court-mage",
    "careerRank": 3,
    "factionId": "imperial-court",
    "health": 100,
    "wealth": 250,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 3,
      "kind": "ill"
     },
     {
      "at": 5,
      "kind": "mentor",
      "value": "arcana"
     },
     {
      "at": 6,
      "kind": "ill"
     },
     {
      "at": 7,
      "kind": "class-up",
      "value": "service"
     },
     {
      "at": 17,
      "kind": "class-up",
      "value": "lesser-noble"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Селестина фон Аштейн",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "brave",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Торговец",
     "en": "Merchant"
    },
    "bio": {
     "ru": "Ребёнок. Гнев вспыхивает быстро и быстро гаснет. Характер: отважный.",
     "en": "Child. Anger flares fast and fades fast. Temperament: brave."
    },
    "affinity": 23,
    "alive": true,
    "diedAt": null,
    "metAt": 1,
    "power": 8,
    "skillId": null,
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": "n10",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "commoner",
    "educationTier": 1,
    "goal": null,
    "professionId": "merchant",
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 39,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 12,
      "kind": "education",
      "value": "ac-tutor"
     },
     {
      "at": 13,
      "kind": "ill"
     },
     {
      "at": 19,
      "kind": "job",
      "value": "merchant"
     },
     {
      "at": 30,
      "kind": "married",
      "value": "n10"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "teacher",
    "name": "Рафаэль де Валлейн",
    "gender": "male",
    "bornAt": -55,
    "temperamentId": "cunning",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Профессор академии Астрейн",
     "en": "Astrein professor"
    },
    "bio": {
     "ru": "Профессор академии Астрейн. Мечтает о большем и ждёт того же от близких. Характер: хитрый.",
     "en": "Astrein professor. Dreams of more and expects the same of those close to them. Temperament: cunning."
    },
    "affinity": 16,
    "alive": false,
    "diedAt": 23,
    "metAt": 5,
    "power": 57,
    "skillId": "lore",
    "interactedAt": null,
    "familyName": "де Валлейн",
    "status": "deceased",
    "cause": "old-age",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "high-noble",
    "educationTier": 1,
    "goal": "wealth",
    "professionId": "laborer",
    "careerRank": 2,
    "factionId": null,
    "health": 81,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 12,
      "kind": "retired",
      "value": "laborer"
     },
     {
      "at": 17,
      "kind": "ill"
     },
     {
      "at": 18,
      "kind": "ill"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Аурелия фон Аштейн",
    "gender": "female",
    "bornAt": -1,
    "temperamentId": "calm",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Младший сын маркиза",
     "en": "Marquis's younger son"
    },
    "bio": {
     "ru": "Младший сын маркиза. Смех слышно издалека. Характер: спокойный.",
     "en": "Marquis's younger son. Their laughter carries far. Temperament: calm."
    },
    "affinity": 59,
    "alive": false,
    "diedAt": 17,
    "metAt": 7,
    "power": 16,
    "skillId": null,
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "deceased",
    "cause": "accident",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 1,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [],
    "lifeGen": null
   },
   {
    "id": "n7",
    "role": "sibling",
    "name": "Октавия фон Аштейн",
    "gender": "female",
    "bornAt": 10,
    "temperamentId": "cunning",
    "traitId": "wise",
    "occupation": {
     "ru": "Учёный",
     "en": "Scholar"
    },
    "bio": {
     "ru": "Ребёнок. Говорит мало, но к словам прислушиваются. Характер: хитрый.",
     "en": "Child. Says little, but people listen. Temperament: cunning."
    },
    "affinity": 18,
    "alive": true,
    "diedAt": null,
    "metAt": 10,
    "power": 8,
    "skillId": null,
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "alive",
    "cause": null,
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "commoner",
    "educationTier": 1,
    "goal": null,
    "professionId": "scholar",
    "careerRank": 0,
    "factionId": "rose-society",
    "health": 65,
    "wealth": 8,
    "talentId": "silver-tongue",
    "weaknessId": null,
    "log": [
     {
      "at": 11,
      "kind": "ill"
     },
     {
      "at": 14,
      "kind": "ill"
     },
     {
      "at": 17,
      "kind": "education",
      "value": "ac-tutor"
     },
     {
      "at": 20,
      "kind": "ill"
     },
     {
      "at": 23,
      "kind": "ill"
     },
     {
      "at": 28,
      "kind": "job",
      "value": "scholar"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n8",
    "role": "sibling",
    "name": "Октавия фон Аштейн",
    "gender": "female",
    "bornAt": 14,
    "temperamentId": "cunning",
    "traitId": "wise",
    "occupation": {
     "ru": "Ребёнок",
     "en": "Child"
    },
    "bio": {
     "ru": "Ребёнок. Говорит мало, но к словам прислушиваются. Характер: хитрый.",
     "en": "Child. Says little, but people listen. Temperament: cunning."
    },
    "affinity": 18,
    "alive": false,
    "diedAt": 23,
    "metAt": 14,
    "power": 9,
    "skillId": null,
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "deceased",
    "cause": "accident",
    "parents": [
     "n2",
     "n1"
    ],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "service",
    "educationTier": 1,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": null,
    "health": 73,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 16,
      "kind": "ill"
     },
     {
      "at": 18,
      "kind": "ill"
     },
     {
      "at": 22,
      "kind": "education",
      "value": "ac-tutor"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n9",
    "role": "friend",
    "name": "Кристоф д’Эрмин",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "calm",
    "traitId": "proud",
    "occupation": {
     "ru": "Стражник",
     "en": "Guard"
    },
    "bio": {
     "ru": "Младший сын маркиза. Не прощает обид и не просит помощи. Характер: спокойный.",
     "en": "Marquis's younger son. Never forgives a slight and never asks for help. Temperament: calm."
    },
    "affinity": 29,
    "alive": true,
    "diedAt": null,
    "metAt": 14,
    "power": 37,
    "skillId": null,
    "interactedAt": null,
    "familyName": "д’Эрмин",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "service",
    "educationTier": 1,
    "goal": "knowledge",
    "professionId": "guard",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 56,
    "talentId": null,
    "weaknessId": "gambler",
    "log": [
     {
      "at": 18,
      "kind": "job",
      "value": "guard"
     },
     {
      "at": 20,
      "kind": "education",
      "value": "ac-tutor"
     },
     {
      "at": 22,
      "kind": "missing"
     },
     {
      "at": 24,
      "kind": "returned"
     },
     {
      "at": 28,
      "kind": "promotion",
      "value": "1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n10",
    "role": "in-law",
    "name": "Эдмунд фон Аштейн",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "cunning",
    "traitId": "proud",
    "occupation": {
     "ru": "Родственник",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственник. Не прощает обид и не просит помощи. Характер: хитрый.",
     "en": "Relative. Never forgives a slight and never asks for help. Temperament: cunning."
    },
    "affinity": -3,
    "alive": true,
    "diedAt": null,
    "metAt": 30,
    "power": 17,
    "skillId": null,
    "interactedAt": null,
    "familyName": "фон Аштейн",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": "n4",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "half-elf",
    "socialClassId": "commoner",
    "educationTier": 0,
    "goal": "family",
    "professionId": "laborer",
    "careerRank": 1,
    "factionId": "imperial-court",
    "health": 99,
    "wealth": 9,
    "talentId": null,
    "weaknessId": "low-birth-shame",
    "log": [
     {
      "at": 30,
      "kind": "married",
      "value": "n4"
     }
    ],
    "lifeGen": null
   }
  ],
  "nextNpcId": 11,
  "meters": {
   "court-favor": 13,
   "scandal": 16
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "legacy.relative-vanishes",
   "legacy.betrayal",
   "ac.circle",
   "common.lost-purse"
  ],
  "lineage": {
   "name": "фон Аштейн",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n2",
    "n1"
   ],
   "selfAdopted": false,
   "renown": 0,
   "startRenown": 0,
   "lives": [],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "academy",
      "origin": "scholarship",
      "race": "half-elf",
      "family": "фон Аштейн",
      "n0": "Феликс фон Аштейн",
      "g0": "m"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 1,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n4",
      "n2",
      "n1"
     ],
     "v": {
      "n0": "Селестина фон Аштейн",
      "g0": "f",
      "n1": "Аурелия фон Аштейн",
      "g1": "f",
      "n2": "Люсьен фон Аштейн",
      "g2": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 2,
     "gen": 1,
     "kind": "class",
     "who": [
      "n1"
     ],
     "v": {
      "cls": "service",
      "dir": 1,
      "n0": "Люсьен фон Аштейн",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 4,
     "year": 7,
     "gen": 1,
     "kind": "class",
     "who": [
      "n3"
     ],
     "v": {
      "cls": "service",
      "dir": 1,
      "n0": "Розалин фон Аштейн",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 10,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n7",
      "n2",
      "n1"
     ],
     "v": {
      "n0": "Октавия фон Аштейн",
      "g0": "f",
      "n1": "Аурелия фон Аштейн",
      "g1": "f",
      "n2": "Люсьен фон Аштейн",
      "g2": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 12,
     "gen": 1,
     "kind": "achievement",
     "who": [
      "self"
     ],
     "v": {
      "achievement": "know-thyself",
      "n0": "Феликс фон Аштейн",
      "g0": "m"
     },
     "src": "achievement",
     "link": null
    },
    {
     "id": 7,
     "year": 14,
     "gen": 1,
     "kind": "birth",
     "who": [
      "n8",
      "n1",
      "n2"
     ],
     "v": {
      "n0": "Октавия фон Аштейн",
      "g0": "f",
      "n1": "Люсьен фон Аштейн",
      "g1": "m",
      "n2": "Аурелия фон Аштейн",
      "g2": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 8,
     "year": 14,
     "gen": 1,
     "kind": "class",
     "who": [
      "n2"
     ],
     "v": {
      "cls": "service",
      "dir": 1,
      "n0": "Аурелия фон Аштейн",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 9,
     "year": 17,
     "gen": 1,
     "kind": "class",
     "who": [
      "n3"
     ],
     "v": {
      "cls": "lesser-noble",
      "dir": 1,
      "n0": "Розалин фон Аштейн",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 10,
     "year": 20,
     "gen": 1,
     "kind": "career",
     "who": [
      "n1"
     ],
     "v": {
      "profession": "scholar",
      "n0": "Люсьен фон Аштейн",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 11,
     "year": 21,
     "gen": 1,
     "kind": "class",
     "who": [
      "n1"
     ],
     "v": {
      "cls": "lesser-noble",
      "dir": 1,
      "n0": "Люсьен фон Аштейн",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 12,
     "year": 23,
     "gen": 1,
     "kind": "tragedy",
     "who": [
      "n8"
     ],
     "v": {
      "cause": "accident",
      "role": "sibling",
      "age": 9,
      "n0": "Октавия фон Аштейн",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 13,
     "year": 29,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.betrayal",
      "choice": "forgive",
      "ok": "",
      "n0": "Феликс фон Аштейн",
      "g0": "m"
     },
     "src": "legacy.betrayal",
     "link": null
    },
    {
     "id": 14,
     "year": 30,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n4",
      "n10"
     ],
     "v": {
      "n0": "Селестина фон Аштейн",
      "g0": "f",
      "n1": "Эдмунд фон Аштейн",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    }
   ],
   "nextEntry": 15,
   "achievements": [
    {
     "id": "know-thyself",
     "gen": 1,
     "age": 12
    }
   ],
   "traits": {
    "talents": {},
    "weaknesses": {}
   },
   "threads": [
    {
     "id": "betrayal",
     "year": 29,
     "gen": 1,
     "src": "legacy.betrayal"
    }
   ],
   "pending": [],
   "stories": {
    "legacy.betrayal": 1
   },
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 4,
    "eventId": "common.sibling-quarrel",
    "choiceId": "apologize",
    "success": null,
    "weight": 3
   },
   {
    "age": 5,
    "eventId": "ac.tutor",
    "choiceId": "obey",
    "success": null,
    "weight": 5
   },
   {
    "age": 7,
    "eventId": "common.first-friend",
    "choiceId": "defend",
    "success": true,
    "weight": 6
   },
   {
    "age": 8,
    "eventId": "common.study-or-play",
    "choiceId": "play",
    "success": null,
    "weight": 3
   },
   {
    "age": 11,
    "eventId": "common.lost-purse",
    "choiceId": "return",
    "success": null,
    "weight": 3
   },
   {
    "age": 14,
    "eventId": "common.rival-appears",
    "choiceId": "befriend",
    "success": true,
    "weight": 4
   },
   {
    "age": 15,
    "eventId": "common.friend-needs-help",
    "choiceId": "stand",
    "success": false,
    "weight": 4
   },
   {
    "age": 17,
    "eventId": "ac.entrance",
    "choiceId": "magic",
    "success": true,
    "weight": 8
   },
   {
    "age": 19,
    "eventId": "ac.ball",
    "choiceId": "listen",
    "success": true,
    "weight": 3
   },
   {
    "age": 23,
    "eventId": "ac.duel",
    "choiceId": "words",
    "success": false,
    "weight": 3
   },
   {
    "age": 24,
    "eventId": "ac.eco-crown-levy",
    "choiceId": "petition",
    "success": false,
    "weight": 4
   },
   {
    "age": 29,
    "eventId": "legacy.betrayal",
    "choiceId": "forgive",
    "success": null,
    "weight": 7
   }
  ],
  "economy": {
   "cycle": "normal",
   "cycleSince": 30,
   "hardship": 0,
   "last": {
    "age": 30,
    "lines": [
     {
      "id": "class",
      "amount": 1
     },
     {
      "id": "living",
      "amount": -1
     }
    ],
    "shortfall": 0
   },
   "years": [
    {
     "age": 21,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 22,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 23,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 24,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 25,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 26,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 27,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 28,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 29,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 30,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    }
   ]
  }
 },
 "murim-dead": {
  "schemaVersion": 4,
  "seed": "v4-murim-dead-1",
  "rngState": 3726721884,
  "version": 104,
  "character": {
   "name": "Чэн Фэн клана Цзян",
   "gender": "male",
   "universeId": "murim",
   "raceId": "human",
   "originId": "street-rat",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 13,
    "intelligence": 19,
    "agility": 13,
    "vitality": 9,
    "wisdom": 18,
    "charisma": 12,
    "luck": 9,
    "willpower": 24
   },
   "resources": {
    "health": 0,
    "energy": 108,
    "mana": 104,
    "stamina": 86
   },
   "level": 3,
   "xp": 196,
   "reputation": -27,
   "karma": -1,
   "wealth": 117,
   "abilities": [],
   "track": {
    "points": 55,
    "rank": 1
   },
   "socialClassId": "commoner",
   "talents": [
    "quick-learner",
    "meridian-prodigy"
   ],
   "weaknesses": [],
   "skills": {
    "stealth": 8,
    "athletics": 3,
    "martial-arts": 24,
    "lore": 23,
    "medicine": 5,
    "inner-cultivation": 4
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {
    "beggars-sect": 20
   }
  },
  "life": {
   "age": 65,
   "stage": "elder",
   "alive": false,
   "deathAge": 65,
   "deathCause": {
    "ru": "Тихо угас от старости",
    "en": "Passed away peacefully of old age"
   }
  },
  "flags": [
   "childhood-friend",
   "martial-school"
  ],
  "occurrences": {
   "common.fever": 2,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.sibling-quarrel": 1,
   "mu.outer-court": 1,
   "mu.village-school": 1,
   "common.parent-lesson": 1,
   "common.potential-sign": 1,
   "mu.school": 1,
   "common.mentor": 1,
   "mu.bandits": 2,
   "mu.bottleneck": 3,
   "mu.duel": 3,
   "common.talent-awakens": 2,
   "eco.hard-times": 1,
   "legacy.betrayal": 1,
   "mu.eco-clan-granary": 2,
   "mu.manual": 1,
   "legacy.adopt-heir": 1,
   "common.friend-needs-help": 1,
   "common.parent-illness": 1,
   "common.secret-surfaces": 1,
   "common.lost-purse": 2,
   "legacy.relative-vanishes": 1,
   "common.reunion": 1,
   "common.trade-offer": 1,
   "eco.boom-chance": 1,
   "common.rival-reconcile": 1,
   "common.old-wound": 1
  },
  "lastSeen": {
   "common.fever": 11,
   "common.night-fear": 3,
   "common.first-friend": 5,
   "common.sibling-quarrel": 6,
   "mu.outer-court": 8,
   "mu.village-school": 9,
   "common.parent-lesson": 10,
   "common.potential-sign": 12,
   "mu.school": 14,
   "common.mentor": 15,
   "mu.bandits": 58,
   "mu.bottleneck": 62,
   "mu.duel": 50,
   "common.talent-awakens": 53,
   "eco.hard-times": 26,
   "legacy.betrayal": 27,
   "mu.eco-clan-granary": 46,
   "mu.manual": 30,
   "legacy.adopt-heir": 31,
   "common.friend-needs-help": 32,
   "common.parent-illness": 34,
   "common.secret-surfaces": 35,
   "common.lost-purse": 64,
   "legacy.relative-vanishes": 39,
   "common.reunion": 40,
   "common.trade-offer": 51,
   "eco.boom-chance": 54,
   "common.rival-reconcile": 56,
   "common.old-wound": 57
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 111,
  "background": {
   "familyName": "клана Цзян",
   "birthplace": {
    "ru": "ворота праведной секты на горе Хуа",
    "en": "the gate of a righteous sect on Mount Hua"
   },
   "omen": {
    "ru": "Над рекой всю ночь кричали журавли.",
    "en": "Cranes cried over the river all night."
   },
   "familyHistory": {
    "ru": "Мать торгует лепёшками у пристани. Отец ушёл в цзянху и не вернулся.",
    "en": "Mother sells flatbreads at the pier. Father left for the jianghu and never returned."
   },
   "biography": [
    {
     "ru": "Чэн Фэн клана Цзян родился: ворота праведной секты на горе Хуа. Над рекой всю ночь кричали журавли.",
     "en": "Чэн Фэн клана Цзян was born: the gate of a righteous sect on Mount Hua. Cranes cried over the river all night."
    },
    {
     "ru": "Мать торгует лепёшками у пристани. Отец ушёл в цзянху и не вернулся.",
     "en": "Mother sells flatbreads at the pier. Father left for the jianghu and never returned."
    },
    {
     "ru": "Мать — Хуа Жун клана Цзян, лодочник. Об отце мать не говорит никогда. Братья и сёстры: Ма.",
     "en": "Mother: Хуа Жун клана Цзян, boatman. Mother never speaks of the father. Siblings: Ма."
    },
    {
     "ru": "Раз в год семья молча зажигает свечу за человека, имени которого не называют.",
     "en": "Once a year the family silently lights a candle for someone whose name is never spoken."
    }
   ]
  },
  "hidden": {
   "potential": 5,
   "destiny": 2,
   "dormantTalents": [],
   "familySecret": "mu-blood-feud",
   "revealed": [
    "familySecret"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "mother",
    "name": "Хуа Жун клана Цзян",
    "gender": "female",
    "bornAt": -25,
    "temperamentId": "brave",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Лодочник",
     "en": "Boatman"
    },
    "bio": {
     "ru": "Лодочник. Живёт наполовину в выдуманных мирах. Характер: отважный.",
     "en": "Boatman. Lives half in imagined worlds. Temperament: brave."
    },
    "affinity": 73,
    "alive": false,
    "diedAt": 41,
    "metAt": 0,
    "power": 44,
    "skillId": "trade",
    "interactedAt": null,
    "familyName": "клана Цзян",
    "status": "deceased",
    "cause": "old-age",
    "parents": [],
    "spouseId": "n4",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "disciple",
    "educationTier": 0,
    "goal": "mastery",
    "professionId": "wanderer",
    "careerRank": 2,
    "factionId": "beggars-sect",
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 10,
      "kind": "married",
      "value": "n4"
     },
     {
      "at": 11,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 24,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 27,
      "kind": "class-up",
      "value": "disciple"
     },
     {
      "at": 33,
      "kind": "retired",
      "value": "wanderer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n2",
    "role": "sibling",
    "name": "Ма Цзюнь клана Цзян",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Странник",
     "en": "Wanderer"
    },
    "bio": {
     "ru": "Брат. Живёт наполовину в выдуманных мирах. Характер: честолюбивый.",
     "en": "Brother. Lives half in imagined worlds. Temperament: ambitious."
    },
    "affinity": 59,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 23,
    "skillId": null,
    "interactedAt": null,
    "familyName": "клана Цзян",
    "status": "alive",
    "cause": null,
    "parents": [
     "n1"
    ],
    "spouseId": "n5",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 2,
    "goal": null,
    "professionId": null,
    "careerRank": 0,
    "factionId": "beggars-sect",
    "health": 70,
    "wealth": 104,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 3,
      "kind": "ill"
     },
     {
      "at": 6,
      "kind": "education",
      "value": "mu-village-school"
     },
     {
      "at": 9,
      "kind": "ill"
     },
     {
      "at": 16,
      "kind": "job",
      "value": "physician"
     },
     {
      "at": 22,
      "kind": "job-change",
      "value": "wanderer"
     },
     {
      "at": 23,
      "kind": "married",
      "value": "n5"
     },
     {
      "at": 26,
      "kind": "education",
      "value": "mu-outer-court"
     },
     {
      "at": 36,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 39,
      "kind": "missing"
     },
     {
      "at": 46,
      "kind": "returned"
     },
     {
      "at": 48,
      "kind": "job-loss",
      "value": "wanderer"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n3",
    "role": "friend",
    "name": "Чэн Фэн клана Лун",
    "gender": "male",
    "bornAt": 1,
    "temperamentId": "brave",
    "traitId": "wise",
    "occupation": {
     "ru": "Охрана караванов",
     "en": "Caravan escort"
    },
    "bio": {
     "ru": "Дочь лодочника. Говорит мало, но к словам прислушиваются. Характер: отважный.",
     "en": "Boatman's daughter. Says little, but people listen. Temperament: brave."
    },
    "affinity": 31,
    "alive": true,
    "diedAt": null,
    "metAt": 5,
    "power": 55,
    "skillId": "athletics",
    "interactedAt": null,
    "familyName": "клана Лун",
    "status": "alive",
    "cause": null,
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "disciple",
    "educationTier": 1,
    "goal": null,
    "professionId": "escort",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 182,
    "talentId": "steady-heart",
    "weaknessId": null,
    "log": [
     {
      "at": 8,
      "kind": "education",
      "value": "mu-village-school"
     },
     {
      "at": 12,
      "kind": "ill"
     },
     {
      "at": 22,
      "kind": "job",
      "value": "escort"
     },
     {
      "at": 29,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 49,
      "kind": "class-up",
      "value": "disciple"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n4",
    "role": "in-law",
    "name": "Ма Цзюнь клана Цзян",
    "gender": "male",
    "bornAt": -21,
    "temperamentId": "curious",
    "traitId": "caring",
    "occupation": {
     "ru": "Родственник",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственник. Всегда замечает, когда другим плохо. Характер: любопытный.",
     "en": "Relative. Always notices when others are hurting. Temperament: curious."
    },
    "affinity": 14,
    "alive": false,
    "diedAt": 41,
    "metAt": 10,
    "power": 14,
    "skillId": "craft",
    "interactedAt": null,
    "familyName": "клана Цзян",
    "status": "deceased",
    "cause": "old-age",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [
     "n1"
    ],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "disciple",
    "educationTier": 0,
    "goal": "mastery",
    "professionId": "laborer",
    "careerRank": 2,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 10,
      "kind": "married",
      "value": "n1"
     },
     {
      "at": 13,
      "kind": "ill"
     },
     {
      "at": 23,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 25,
      "kind": "mentor",
      "value": "craft"
     },
     {
      "at": 26,
      "kind": "class-up",
      "value": "disciple"
     },
     {
      "at": 35,
      "kind": "retired",
      "value": "laborer"
     },
     {
      "at": 41,
      "kind": "widowed",
      "value": "n1"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n5",
    "role": "in-law",
    "name": "Хуа Жун клана Цзян",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "cunning",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Родственница",
     "en": "Relative"
    },
    "bio": {
     "ru": "Родственница. Живёт наполовину в выдуманных мирах. Характер: хитрый.",
     "en": "Relative. Lives half in imagined worlds. Temperament: cunning."
    },
    "affinity": 11,
    "alive": true,
    "diedAt": null,
    "metAt": 23,
    "power": 54,
    "skillId": "lore",
    "interactedAt": null,
    "familyName": "клана Цзян",
    "status": "retired",
    "cause": null,
    "parents": [],
    "spouseId": "n2",
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "clan",
    "educationTier": 0,
    "goal": "knowledge",
    "professionId": "scholar",
    "careerRank": 2,
    "factionId": null,
    "health": 100,
    "wealth": 178,
    "talentId": null,
    "weaknessId": null,
    "log": [
     {
      "at": 23,
      "kind": "married",
      "value": "n2"
     },
     {
      "at": 39,
      "kind": "promotion",
      "value": "1"
     },
     {
      "at": 46,
      "kind": "class-up",
      "value": "disciple"
     },
     {
      "at": 49,
      "kind": "promotion",
      "value": "2"
     },
     {
      "at": 57,
      "kind": "ill"
     },
     {
      "at": 59,
      "kind": "class-up",
      "value": "clan"
     },
     {
      "at": 62,
      "kind": "retired",
      "value": "scholar"
     },
     {
      "at": 63,
      "kind": "mentor",
      "value": "lore"
     }
    ],
    "lifeGen": null
   },
   {
    "id": "n6",
    "role": "rival",
    "name": "Ци Минь реки Ло",
    "gender": "male",
    "bornAt": 2,
    "temperamentId": "calm",
    "traitId": "wise",
    "occupation": {
     "ru": "Гордый ученик соседней секты",
     "en": "Proud disciple of a rival sect"
    },
    "bio": {
     "ru": "Гордый ученик соседней секты. Говорит мало, но к словам прислушиваются. Характер: спокойный.",
     "en": "Proud disciple of a rival sect. Says little, but people listen. Temperament: calm."
    },
    "affinity": -14,
    "alive": false,
    "diedAt": 45,
    "metAt": 35,
    "power": 22,
    "skillId": null,
    "interactedAt": null,
    "familyName": "реки Ло",
    "status": "deceased",
    "cause": "accident",
    "parents": [],
    "spouseId": null,
    "formerSpouses": [],
    "adopted": false,
    "raceId": "human",
    "socialClassId": "commoner",
    "educationTier": 2,
    "goal": "mastery",
    "professionId": "laborer",
    "careerRank": 1,
    "factionId": null,
    "health": 100,
    "wealth": 0,
    "talentId": null,
    "weaknessId": null,
    "log": [],
    "lifeGen": null
   }
  ],
  "nextNpcId": 7,
  "meters": {
   "qi-deviation": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.lost-purse",
   "mu.bottleneck",
   "mu.bandits",
   "common.old-wound"
  ],
  "lineage": {
   "name": "клана Цзян",
   "generation": 1,
   "epoch": 0,
   "selfParents": [
    "n1"
   ],
   "selfAdopted": false,
   "renown": 0,
   "startRenown": 0,
   "lives": [
    {
     "gen": 1,
     "name": "Чэн Фэн клана Цзян",
     "gender": "male",
     "raceId": "human",
     "originId": "street-rat",
     "born": 0,
     "age": 65,
     "cause": {
      "ru": "Тихо угас от старости",
      "en": "Passed away peacefully of old age"
     },
     "professionId": null,
     "socialClassId": "commoner",
     "score": 20,
     "titleId": "quiet",
     "npcId": null,
     "heirName": null
    }
   ],
   "chronicle": [
    {
     "id": 1,
     "year": 0,
     "gen": 1,
     "kind": "origin",
     "who": [
      "self"
     ],
     "v": {
      "world": "murim",
      "origin": "street-rat",
      "race": "human",
      "family": "клана Цзян",
      "n0": "Чэн Фэн клана Цзян",
      "g0": "m"
     },
     "src": "birth",
     "link": null
    },
    {
     "id": 2,
     "year": 10,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n1",
      "n4"
     ],
     "v": {
      "n0": "Хуа Жун клана Цзян",
      "g0": "f",
      "n1": "Ма Цзюнь клана Цзян",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 3,
     "year": 23,
     "gen": 1,
     "kind": "marriage",
     "who": [
      "n2",
      "n5"
     ],
     "v": {
      "n0": "Ма Цзюнь клана Цзян",
      "g0": "m",
      "n1": "Хуа Жун клана Цзян",
      "g1": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 4,
     "year": 26,
     "gen": 1,
     "kind": "class",
     "who": [
      "n4"
     ],
     "v": {
      "cls": "disciple",
      "dir": 1,
      "n0": "Ма Цзюнь клана Цзян",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 5,
     "year": 27,
     "gen": 1,
     "kind": "class",
     "who": [
      "n1"
     ],
     "v": {
      "cls": "disciple",
      "dir": 1,
      "n0": "Хуа Жун клана Цзян",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 6,
     "year": 27,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.betrayal",
      "choice": "forgive",
      "ok": "",
      "n0": "Чэн Фэн клана Цзян",
      "g0": "m"
     },
     "src": "legacy.betrayal",
     "link": null
    },
    {
     "id": 7,
     "year": 31,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.adopt-heir",
      "choice": "pass",
      "ok": "",
      "n0": "Чэн Фэн клана Цзян",
      "g0": "m"
     },
     "src": "legacy.adopt-heir",
     "link": null
    },
    {
     "id": 8,
     "year": 39,
     "gen": 1,
     "kind": "missing",
     "who": [
      "n2"
     ],
     "v": {
      "role": "sibling",
      "n0": "Ма Цзюнь клана Цзян",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 9,
     "year": 39,
     "gen": 1,
     "kind": "story",
     "who": [
      "self"
     ],
     "v": {
      "story": "legacy.relative-vanishes",
      "choice": "wait",
      "ok": "",
      "n0": "Чэн Фэн клана Цзян",
      "g0": "m"
     },
     "src": "legacy.relative-vanishes",
     "link": null
    },
    {
     "id": 10,
     "year": 41,
     "gen": 1,
     "kind": "death",
     "who": [
      "n1"
     ],
     "v": {
      "cause": "old-age",
      "role": "mother",
      "age": 66,
      "n0": "Хуа Жун клана Цзян",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 11,
     "year": 41,
     "gen": 1,
     "kind": "inheritance",
     "who": [
      "n1",
      "self"
     ],
     "v": {
      "sum": 12,
      "law": "clan-merit",
      "n0": "Хуа Жун клана Цзян",
      "g0": "f",
      "n1": "Чэн Фэн клана Цзян",
      "g1": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 12,
     "year": 41,
     "gen": 1,
     "kind": "death",
     "who": [
      "n4"
     ],
     "v": {
      "cause": "old-age",
      "role": "in-law",
      "age": 62,
      "n0": "Ма Цзюнь клана Цзян",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 13,
     "year": 46,
     "gen": 1,
     "kind": "class",
     "who": [
      "n5"
     ],
     "v": {
      "cls": "disciple",
      "dir": 1,
      "n0": "Хуа Жун клана Цзян",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 14,
     "year": 46,
     "gen": 1,
     "kind": "return",
     "who": [
      "n2"
     ],
     "v": {
      "role": "sibling",
      "n0": "Ма Цзюнь клана Цзян",
      "g0": "m"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 15,
     "year": 59,
     "gen": 1,
     "kind": "class",
     "who": [
      "n5"
     ],
     "v": {
      "cls": "clan",
      "dir": 1,
      "n0": "Хуа Жун клана Цзян",
      "g0": "f"
     },
     "src": "npc",
     "link": null
    },
    {
     "id": 16,
     "year": 65,
     "gen": 1,
     "kind": "death",
     "who": [
      "self"
     ],
     "v": {
      "cause": "life",
      "age": 65,
      "score": 20,
      "title": "quiet",
      "n0": "Чэн Фэн клана Цзян",
      "g0": "m"
     },
     "src": "life",
     "link": null
    }
   ],
   "nextEntry": 17,
   "achievements": [],
   "traits": {
    "talents": {
     "quick-learner": 1,
     "meridian-prodigy": 1
    },
    "weaknesses": {}
   },
   "threads": [
    {
     "id": "betrayal",
     "year": 27,
     "gen": 1,
     "src": "legacy.betrayal"
    }
   ],
   "pending": [],
   "stories": {
    "legacy.betrayal": 1,
    "legacy.adopt-heir": 1,
    "legacy.relative-vanishes": 1
   },
   "continuedBy": null,
   "archived": 0,
   "inheritance": null,
   "names": {}
  },
  "memory": [
   {
    "age": 5,
    "eventId": "common.first-friend",
    "choiceId": "defend",
    "success": true,
    "weight": 6
   },
   {
    "age": 18,
    "eventId": "mu.bandits",
    "choiceId": "join",
    "success": true,
    "weight": 5
   },
   {
    "age": 22,
    "eventId": "mu.duel",
    "choiceId": "accept",
    "success": false,
    "weight": 5
   },
   {
    "age": 27,
    "eventId": "legacy.betrayal",
    "choiceId": "forgive",
    "success": null,
    "weight": 7
   },
   {
    "age": 39,
    "eventId": "legacy.relative-vanishes",
    "choiceId": "wait",
    "success": null,
    "weight": 6
   },
   {
    "age": 43,
    "eventId": "mu.bottleneck",
    "choiceId": "seclusion",
    "success": true,
    "weight": 6
   },
   {
    "age": 50,
    "eventId": "mu.duel",
    "choiceId": "accept",
    "success": false,
    "weight": 5
   },
   {
    "age": 51,
    "eventId": "common.trade-offer",
    "choiceId": "invest",
    "success": false,
    "weight": 4
   },
   {
    "age": 53,
    "eventId": "common.talent-awakens",
    "choiceId": "fear",
    "success": true,
    "weight": 4
   },
   {
    "age": 56,
    "eventId": "common.rival-reconcile",
    "choiceId": "reconcile",
    "success": null,
    "weight": 4
   },
   {
    "age": 58,
    "eventId": "mu.bandits",
    "choiceId": "join",
    "success": true,
    "weight": 5
   },
   {
    "age": 62,
    "eventId": "mu.bottleneck",
    "choiceId": "seclusion",
    "success": false,
    "weight": 4
   }
  ],
  "economy": {
   "cycle": "normal",
   "cycleSince": 65,
   "hardship": 0,
   "last": {
    "age": 65,
    "lines": [
     {
      "id": "class",
      "amount": 1
     },
     {
      "id": "living",
      "amount": -1
     }
    ],
    "shortfall": 0
   },
   "years": [
    {
     "age": 56,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 57,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 58,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 59,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 60,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 61,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 62,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 63,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 64,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    },
    {
     "age": 65,
     "income": 1,
     "expenses": 1,
     "shortfall": 0
    }
   ]
  }
 }
};
