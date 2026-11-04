// Сохранения формата 2, записанные игрой Stage 02 (SAVE_SCHEMA_VERSION = 2, коммит 8fdc012) до изменений Stage 03.
// Не редактировать: по ним проверяется перевод сохранений Stage 02
export const SAVES_V2: Record<string, unknown> = {
 "dark-fantasy-young": {
  "schemaVersion": 2,
  "seed": "v2-dark-fantasy-young",
  "rngState": 2123311133,
  "version": 13,
  "character": {
   "name": "Сельвина Грейвольд",
   "gender": "female",
   "universeId": "dark-fantasy",
   "raceId": "human",
   "originId": "peasant",
   "temperamentId": "brave",
   "stats": {
    "strength": 14,
    "intelligence": 8,
    "agility": 7,
    "vitality": 14,
    "wisdom": 5,
    "charisma": 11,
    "luck": 7,
    "willpower": 17
   },
   "resources": {
    "health": 96,
    "energy": 94,
    "mana": 36,
    "stamina": 96
   },
   "level": 1,
   "xp": 25,
   "reputation": 0,
   "karma": 5,
   "wealth": 3,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   },
   "socialClassId": "serf",
   "talents": [],
   "weaknesses": [],
   "skills": {
    "survival": 5,
    "athletics": 3
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 9,
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
   "common.first-friend": 1,
   "common.fever": 1,
   "common.parent-lesson": 1
  },
  "lastSeen": {
   "common.night-fear": 3,
   "common.first-friend": 4,
   "common.fever": 5,
   "common.parent-lesson": 9
  },
  "pending": {
   "eventId": "common.parent-lesson",
   "age": 9
  },
  "scheduled": [],
  "nextSeq": 14,
  "background": {
   "familyName": "Грейвольд",
   "birthplace": {
    "ru": "деревня у Чёрной реки, где никогда не тает лёд",
    "en": "a village by the Black River where the ice never melts"
   },
   "omen": {
    "ru": "Вороны кружили над крышей до рассвета.",
    "en": "Ravens circled the roof until dawn."
   },
   "familyHistory": {
    "ru": "Род пахарей держится за мёрзлую землю барона уже семь поколений. Каждую зиму кто-то не доживает до весны.",
    "en": "A ploughman's line has clung to the baron's frozen soil for seven generations. Every winter someone does not live to spring."
   },
   "biography": [
    {
     "ru": "Сельвина Грейвольд родилась: деревня у Чёрной реки, где никогда не тает лёд. Вороны кружили над крышей до рассвета.",
     "en": "Сельвина Грейвольд was born: a village by the Black River where the ice never melts. Ravens circled the roof until dawn."
    },
    {
     "ru": "Род пахарей держится за мёрзлую землю барона уже семь поколений. Каждую зиму кто-то не доживает до весны.",
     "en": "A ploughman's line has clung to the baron's frozen soil for seven generations. Every winter someone does not live to spring."
    },
    {
     "ru": "Отец — Ульрен Грейвольд, углежог. Мать — Тисса Грейвольд, пахарь. Братья и сёстры: Ирвен.",
     "en": "Father: Ульрен Грейвольд, charcoal burner. Mother: Тисса Грейвольд, ploughman. Siblings: Ирвен."
    },
    {
     "ru": "Под очагом семья хранит что-то, что нельзя продавать даже в голод.",
     "en": "Under the hearth the family keeps something that must not be sold even in famine."
    },
    {
     "ru": "Старая повитуха долго смотрит на ребёнка и говорит, что в нём спит что-то большее.",
     "en": "The old midwife studies the child for a long time and says something greater sleeps within."
    }
   ]
  },
  "hidden": {
   "potential": 7,
   "destiny": 6,
   "dormantTalents": [
    "keen-eye"
   ],
   "familySecret": "df-buried-relic",
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Ульрен Грейвольд",
    "gender": "male",
    "bornAt": -29,
    "temperamentId": "cunning",
    "traitId": "drinker",
    "occupation": {
     "ru": "Углежог",
     "en": "Charcoal burner"
    },
    "bio": {
     "ru": "Углежог. Кружка за кружкой топит какую-то старую беду. Характер: хитрый.",
     "en": "Charcoal burner. Drowns some old sorrow mug after mug. Temperament: cunning."
    },
    "affinity": 32,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 31,
    "skillId": "craft",
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Тисса Грейвольд",
    "gender": "female",
    "bornAt": -28,
    "temperamentId": "cunning",
    "traitId": "proud",
    "occupation": {
     "ru": "Пахарь",
     "en": "Ploughman"
    },
    "bio": {
     "ru": "Пахарь. Не прощает обид и не просит помощи. Характер: хитрый.",
     "en": "Ploughman. Never forgives a slight and never asks for help. Temperament: cunning."
    },
    "affinity": 46,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 15,
    "skillId": "craft",
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Ирвен Грейвольд",
    "gender": "female",
    "bornAt": -6,
    "temperamentId": "kind",
    "traitId": "caring",
    "occupation": {
     "ru": "Сестра",
     "en": "Sister"
    },
    "bio": {
     "ru": "Сестра. Всегда замечает, когда другим плохо. Характер: добрый.",
     "en": "Sister. Always notices when others are hurting. Temperament: kind."
    },
    "affinity": 47,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 21,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Алдрик Морнхейм",
    "gender": "male",
    "bornAt": -2,
    "temperamentId": "ambitious",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Дочь фонарщика",
     "en": "Lamplighter's daughter"
    },
    "bio": {
     "ru": "Дочь фонарщика. Смех слышно издалека. Характер: честолюбивый.",
     "en": "Lamplighter's daughter. Their laughter carries far. Temperament: ambitious."
    },
    "affinity": 41,
    "alive": true,
    "diedAt": null,
    "metAt": 4,
    "power": 13,
    "skillId": "athletics",
    "interactedAt": null
   }
  ],
  "nextNpcId": 5,
  "meters": {
   "corruption": 0,
   "ember": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.parent-lesson",
   "common.fever",
   "common.first-friend",
   "common.night-fear"
  ]
 },
 "dark-fantasy-family": {
  "schemaVersion": 2,
  "seed": "v2-dark-fantasy-adult-24",
  "rngState": 3370663627,
  "version": 161,
  "character": {
   "name": "Элдра Пепельный",
   "gender": "female",
   "universeId": "dark-fantasy",
   "raceId": "graveborn",
   "originId": "peasant",
   "temperamentId": "brave",
   "stats": {
    "strength": 15,
    "intelligence": 10,
    "agility": 12,
    "vitality": 23,
    "wisdom": 19,
    "charisma": 13,
    "luck": 11,
    "willpower": 39
   },
   "resources": {
    "health": 217,
    "energy": 152,
    "mana": 132,
    "stamina": 134
   },
   "level": 5,
   "xp": 6,
   "reputation": 69,
   "karma": 70,
   "wealth": 1153,
   "abilities": [
    "ember-ward",
    "cinder-blade"
   ],
   "track": {
    "points": 240,
    "rank": 3
   },
   "socialClassId": "serf",
   "talents": [
    "steady-heart",
    "golden-hands"
   ],
   "weaknesses": [],
   "skills": {
    "survival": 28,
    "athletics": 3,
    "craft": 47,
    "medicine": 41,
    "hollow-hunting": 10,
    "melee": 68,
    "oathcraft": 52
   },
   "professionId": "guard",
   "educationId": null,
   "specializationId": "mistwalker",
   "factions": {
    "order-of-ash": 30
   }
  },
  "life": {
   "age": 95,
   "stage": "elder",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "oath-sworn",
   "order-oath",
   "profession",
   "job-guard",
   "in-love",
   "married",
   "has-child"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.night-fear": 1,
   "common.fever": 3,
   "df.chapel-school": 1,
   "common.first-friend": 1,
   "common.study-or-play": 1,
   "common.rival-appears": 1,
   "common.talent-awakens": 1,
   "df.plague": 4,
   "common.parent-lesson": 1,
   "df.squire": 1,
   "df.hollow": 4,
   "df.oath": 1,
   "common.calling": 1,
   "common.parent-illness": 1,
   "common.lost-purse": 2,
   "df.ember-vigil": 7,
   "df.trial": 7,
   "df.relic": 6,
   "common.first-love": 1,
   "common.potential-sign": 1,
   "common.love-test": 1,
   "common.friend-needs-help": 2,
   "common.midlife": 1,
   "df.rival-knight": 2,
   "common.overcome-weakness": 2,
   "common.heir": 1,
   "common.child-grows": 3,
   "common.trade-offer": 2,
   "common.rival-reconcile": 1,
   "df.specialize": 1,
   "common.old-wound": 1,
   "common.reunion": 1
  },
  "lastSeen": {
   "common.first-steps": 2,
   "common.night-fear": 3,
   "common.fever": 67,
   "df.chapel-school": 6,
   "common.first-friend": 7,
   "common.study-or-play": 8,
   "common.rival-appears": 9,
   "common.talent-awakens": 10,
   "df.plague": 84,
   "common.parent-lesson": 12,
   "df.squire": 13,
   "df.hollow": 74,
   "df.oath": 17,
   "common.calling": 18,
   "common.parent-illness": 21,
   "common.lost-purse": 68,
   "df.ember-vigil": 89,
   "df.trial": 91,
   "df.relic": 85,
   "common.first-love": 28,
   "common.potential-sign": 30,
   "common.love-test": 31,
   "common.friend-needs-help": 51,
   "common.midlife": 39,
   "df.rival-knight": 54,
   "common.overcome-weakness": 82,
   "common.heir": 43,
   "common.child-grows": 81,
   "common.trade-offer": 64,
   "common.rival-reconcile": 47,
   "df.specialize": 52,
   "common.old-wound": 59,
   "common.reunion": 60
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 174,
  "background": {
   "familyName": "Пепельный",
   "birthplace": {
    "ru": "деревня у Чёрной реки, где никогда не тает лёд",
    "en": "a village by the Black River where the ice never melts"
   },
   "omen": {
    "ru": "Вороны кружили над крышей до рассвета.",
    "en": "Ravens circled the roof until dawn."
   },
   "familyHistory": {
    "ru": "Род пахарей держится за мёрзлую землю барона уже семь поколений. Каждую зиму кто-то не доживает до весны.",
    "en": "A ploughman's line has clung to the baron's frozen soil for seven generations. Every winter someone does not live to spring."
   },
   "biography": [
    {
     "ru": "Элдра Пепельный родилась: деревня у Чёрной реки, где никогда не тает лёд. Вороны кружили над крышей до рассвета.",
     "en": "Элдра Пепельный was born: a village by the Black River where the ice never melts. Ravens circled the roof until dawn."
    },
    {
     "ru": "Род пахарей держится за мёрзлую землю барона уже семь поколений. Каждую зиму кто-то не доживает до весны.",
     "en": "A ploughman's line has clung to the baron's frozen soil for seven generations. Every winter someone does not live to spring."
    },
    {
     "ru": "Отец — Мейрон Пепельный, пахарь. Мать — Катрис Пепельный, углежог.",
     "en": "Father: Мейрон Пепельный, ploughman. Mother: Катрис Пепельный, charcoal burner."
    },
    {
     "ru": "С первых дней заметно: страх и боль отступают перед упрямством.",
     "en": "It shows from the first days: fear and pain give way to stubbornness."
    }
   ]
  },
  "hidden": {
   "potential": 6,
   "destiny": 5,
   "dormantTalents": [],
   "familySecret": null,
   "revealed": [
    "potential",
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Мейрон Пепельный",
    "gender": "male",
    "bornAt": -34,
    "temperamentId": "curious",
    "traitId": "stern",
    "occupation": {
     "ru": "Пахарь",
     "en": "Ploughman"
    },
    "bio": {
     "ru": "Пахарь. Хвалит редко, требует много. Характер: любопытный.",
     "en": "Ploughman. Praises rarely and demands much. Temperament: curious."
    },
    "affinity": 44,
    "alive": false,
    "diedAt": 25,
    "metAt": 0,
    "power": 37,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Катрис Пепельный",
    "gender": "female",
    "bornAt": -26,
    "temperamentId": "ambitious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Углежог",
     "en": "Charcoal burner"
    },
    "bio": {
     "ru": "Углежог. Живёт наполовину в выдуманных мирах. Характер: честолюбивый.",
     "en": "Charcoal burner. Lives half in imagined worlds. Temperament: ambitious."
    },
    "affinity": 64,
    "alive": false,
    "diedAt": 32,
    "metAt": 0,
    "power": 23,
    "skillId": "athletics",
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "grandparent",
    "name": "Корвин Пепельный",
    "gender": "male",
    "bornAt": -54,
    "temperamentId": "ambitious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Пахарь",
     "en": "Ploughman"
    },
    "bio": {
     "ru": "Пахарь. Живёт наполовину в выдуманных мирах. Характер: честолюбивый.",
     "en": "Ploughman. Lives half in imagined worlds. Temperament: ambitious."
    },
    "affinity": 47,
    "alive": false,
    "diedAt": 2,
    "metAt": 0,
    "power": 21,
    "skillId": "persuasion",
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "rival",
    "name": "Тисса Пепельный",
    "gender": "female",
    "bornAt": -2,
    "temperamentId": "curious",
    "traitId": "secretive",
    "occupation": {
     "ru": "Подкидыш из приюта",
     "en": "Foundling from the shelter"
    },
    "bio": {
     "ru": "Подкидыш из приюта. О прошлом молчит, даже когда спрашивают. Характер: любопытный.",
     "en": "Foundling from the shelter. Stays silent about the past even when asked. Temperament: curious."
    },
    "affinity": 6,
    "alive": false,
    "diedAt": 55,
    "metAt": 9,
    "power": 13,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "spouse",
    "name": "Торвальд Грейвольд",
    "gender": "male",
    "bornAt": 2,
    "temperamentId": "cunning",
    "traitId": "secretive",
    "occupation": {
     "ru": "Человек с праздника",
     "en": "Someone from the festival"
    },
    "bio": {
     "ru": "Человек с праздника. О прошлом молчит, даже когда спрашивают. Характер: хитрый.",
     "en": "Someone from the festival. Stays silent about the past even when asked. Temperament: cunning."
    },
    "affinity": 53,
    "alive": false,
    "diedAt": 63,
    "metAt": 28,
    "power": 23,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Ульрен Грейвольд",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "ambitious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Дочь фонарщика",
     "en": "Lamplighter's daughter"
    },
    "bio": {
     "ru": "Дочь фонарщика. Живёт наполовину в выдуманных мирах. Характер: честолюбивый.",
     "en": "Lamplighter's daughter. Lives half in imagined worlds. Temperament: ambitious."
    },
    "affinity": 28,
    "alive": false,
    "diedAt": 58,
    "metAt": 32,
    "power": 20,
    "skillId": "survival",
    "interactedAt": null
   },
   {
    "id": "n7",
    "role": "child",
    "name": "Эшер Пепельный",
    "gender": "male",
    "bornAt": 43,
    "temperamentId": "kind",
    "traitId": "proud",
    "occupation": {
     "ru": "Сын",
     "en": "Son"
    },
    "bio": {
     "ru": "Сын. Не прощает обид и не просит помощи. Характер: добрый.",
     "en": "Son. Never forgives a slight and never asks for help. Temperament: kind."
    },
    "affinity": 84,
    "alive": true,
    "diedAt": null,
    "metAt": 43,
    "power": 9,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n8",
    "role": "friend",
    "name": "Катрис из Тихой Топи",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "calm",
    "traitId": "secretive",
    "occupation": {
     "ru": "Подкидыш из приюта",
     "en": "Foundling from the shelter"
    },
    "bio": {
     "ru": "Подкидыш из приюта. О прошлом молчит, даже когда спрашивают. Характер: спокойный.",
     "en": "Foundling from the shelter. Stays silent about the past even when asked. Temperament: calm."
    },
    "affinity": 42,
    "alive": false,
    "diedAt": 61,
    "metAt": 60,
    "power": 45,
    "skillId": "craft",
    "interactedAt": null
   },
   {
    "id": "n9",
    "role": "friend",
    "name": "Морра из Тихой Топи",
    "gender": "female",
    "bornAt": -2,
    "temperamentId": "brave",
    "traitId": "drinker",
    "occupation": {
     "ru": "Дочь фонарщика",
     "en": "Lamplighter's daughter"
    },
    "bio": {
     "ru": "Дочь фонарщика. Кружка за кружкой топит какую-то старую беду. Характер: отважный.",
     "en": "Lamplighter's daughter. Drowns some old sorrow mug after mug. Temperament: brave."
    },
    "affinity": 28,
    "alive": false,
    "diedAt": 76,
    "metAt": 75,
    "power": 18,
    "skillId": null,
    "interactedAt": null
   }
  ],
  "nextNpcId": 10,
  "meters": {
   "corruption": 0,
   "ember": 100
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "df.trial",
   "df.ember-vigil",
   "df.relic",
   "df.plague"
  ]
 },
 "isekai-young": {
  "schemaVersion": 2,
  "seed": "v2-isekai-young",
  "rngState": 508820544,
  "version": 13,
  "character": {
   "name": "Лукан Арденвейл",
   "gender": "male",
   "universeId": "isekai",
   "raceId": "elf",
   "originId": "orphan",
   "temperamentId": "calm",
   "stats": {
    "strength": 3,
    "intelligence": 12,
    "agility": 10,
    "vitality": 11,
    "wisdom": 12,
    "charisma": 8,
    "luck": 8,
    "willpower": 21
   },
   "resources": {
    "health": 84,
    "energy": 102,
    "mana": 58,
    "stamina": 68
   },
   "level": 1,
   "xp": 26,
   "reputation": 0,
   "karma": 5,
   "wealth": 0,
   "abilities": [
    "modern-knowledge"
   ],
   "track": {
    "points": 2,
    "rank": 0
   },
   "socialClassId": "commoner",
   "talents": [],
   "weaknesses": [],
   "skills": {
    "stealth": 5,
    "guild-craft": 1
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 8,
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
   "common.first-steps": 1,
   "is.memories": 1,
   "common.night-fear": 1,
   "common.fever": 1,
   "common.rival-appears": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "is.memories": 3,
   "common.night-fear": 6,
   "common.fever": 7,
   "common.rival-appears": 8
  },
  "pending": {
   "eventId": "common.rival-appears",
   "age": 8
  },
  "scheduled": [],
  "nextSeq": 14,
  "background": {
   "familyName": "Арденвейл",
   "birthplace": {
    "ru": "пограничный замок барона",
    "en": "a baron's border castle"
   },
   "omen": {
    "ru": "Хор Системы пропел в храме среди ночи, хотя служба давно кончилась.",
    "en": "The System Choir sang in the temple at midnight, though the service had long ended."
   },
   "familyHistory": {
    "ru": "Родители погибли при набеге гоблинов. Приют при храме Хора стал первым домом.",
    "en": "The parents died in a goblin raid. The orphanage at the Choir's temple became the first home."
   },
   "biography": [
    {
     "ru": "Лукан Арденвейл родился: пограничный замок барона. Хор Системы пропел в храме среди ночи, хотя служба давно кончилась.",
     "en": "Лукан Арденвейл was born: a baron's border castle. The System Choir sang in the temple at midnight, though the service had long ended."
    },
    {
     "ru": "Родители погибли при набеге гоблинов. Приют при храме Хора стал первым домом.",
     "en": "The parents died in a goblin raid. The orphanage at the Choir's temple became the first home."
    },
    {
     "ru": "Отец — Ольвен Арденвейл, мельник. Мать — Мирэ Арденвейл, охотник. Оба родителя погибли, когда ребёнку не было и года.",
     "en": "Father: Ольвен Арденвейл, miller. Mother: Мирэ Арденвейл, hunter. Both parents died before the child's first year."
    }
   ]
  },
  "hidden": {
   "potential": 2,
   "destiny": 4,
   "dormantTalents": [
    "iron-body"
   ],
   "familySecret": null,
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Ольвен Арденвейл",
    "gender": "male",
    "bornAt": -36,
    "temperamentId": "calm",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Мельник",
     "en": "Miller"
    },
    "bio": {
     "ru": "Мельник. Мечтает о большем и ждёт того же от близких. Характер: спокойный.",
     "en": "Miller. Dreams of more and expects the same of those close to them. Temperament: calm."
    },
    "affinity": 53,
    "alive": false,
    "diedAt": 0,
    "metAt": 0,
    "power": 38,
    "skillId": "medicine",
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Мирэ Арденвейл",
    "gender": "female",
    "bornAt": -22,
    "temperamentId": "cunning",
    "traitId": "secretive",
    "occupation": {
     "ru": "Охотник",
     "en": "Hunter"
    },
    "bio": {
     "ru": "Охотник. О прошлом молчит, даже когда спрашивают. Характер: хитрый.",
     "en": "Hunter. Stays silent about the past even when asked. Temperament: cunning."
    },
    "affinity": 56,
    "alive": false,
    "diedAt": 0,
    "metAt": 0,
    "power": 44,
    "skillId": "medicine",
    "interactedAt": null
   }
  ],
  "nextNpcId": 3,
  "meters": {
   "system-favor": 20
  },
  "consequences": [
   {
    "id": "is.c-rival-reincarnator",
    "age": 13,
    "source": "is.memories"
   }
  ],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.rival-appears",
   "common.fever",
   "common.night-fear",
   "is.memories"
  ]
 },
 "isekai-family": {
  "schemaVersion": 2,
  "seed": "v2-isekai-adult-1",
  "rngState": 2337506359,
  "version": 161,
  "character": {
   "name": "Ирек Брайт",
   "gender": "male",
   "universeId": "isekai",
   "raceId": "elf",
   "originId": "villager",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 19,
    "intelligence": 17,
    "agility": 12,
    "vitality": 11,
    "wisdom": 24,
    "charisma": 17,
    "luck": 10,
    "willpower": 28
   },
   "resources": {
    "health": 179,
    "energy": 116,
    "mana": 186,
    "stamina": 110
   },
   "level": 4,
   "xp": 388,
   "reputation": 28,
   "karma": -14,
   "wealth": 757,
   "abilities": [
    "appraisal",
    "spell-weave"
   ],
   "track": {
    "points": 200,
    "rank": 4
   },
   "socialClassId": "commoner",
   "talents": [
    "mana-affinity",
    "iron-body"
   ],
   "weaknesses": [],
   "skills": {
    "survival": 5,
    "athletics": 49,
    "spellcraft": 56,
    "guild-craft": 39,
    "lore": 10,
    "trade": 8,
    "invention": 54
   },
   "professionId": "inventor",
   "educationId": "is-temple",
   "specializationId": "artificer",
   "factions": {}
  },
  "life": {
   "age": 112,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "reincarnated",
   "childhood-friend",
   "in-love",
   "married",
   "has-child",
   "profession"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "is.memories": 1,
   "common.first-friend": 1,
   "common.fever": 2,
   "common.sibling-quarrel": 2,
   "common.talent-awakens": 1,
   "is.temple-school": 1,
   "common.parent-lesson": 1,
   "common.rival-appears": 1,
   "common.mentor": 1,
   "is.guild-licence": 1,
   "is.slime": 5,
   "common.first-love": 1,
   "is.exam": 5,
   "common.parent-illness": 1,
   "common.love-test": 1,
   "common.heir": 1,
   "common.friend-needs-help": 4,
   "common.potential-sign": 1,
   "common.lost-purse": 2,
   "common.child-grows": 4,
   "common.trade-offer": 3,
   "common.midlife": 1,
   "common.rival-reconcile": 1,
   "common.reunion": 1,
   "common.old-wound": 3,
   "is.specialize": 1
  },
  "lastSeen": {
   "common.first-steps": 2,
   "is.memories": 3,
   "common.first-friend": 4,
   "common.fever": 63,
   "common.sibling-quarrel": 14,
   "common.talent-awakens": 8,
   "is.temple-school": 9,
   "common.parent-lesson": 11,
   "common.rival-appears": 12,
   "common.mentor": 15,
   "is.guild-licence": 17,
   "is.slime": 75,
   "common.first-love": 19,
   "is.exam": 94,
   "common.parent-illness": 21,
   "common.love-test": 22,
   "common.heir": 23,
   "common.friend-needs-help": 74,
   "common.potential-sign": 28,
   "common.lost-purse": 46,
   "common.child-grows": 78,
   "common.trade-offer": 70,
   "common.midlife": 40,
   "common.rival-reconcile": 44,
   "common.reunion": 54,
   "common.old-wound": 79,
   "is.specialize": 60
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 197,
  "background": {
   "familyName": "Брайт",
   "birthplace": {
    "ru": "приют при храме Хора",
    "en": "the orphanage of the Choir's temple"
   },
   "omen": {
    "ru": "В момент рождения перед глазами повитухи вспыхнуло синее окно: «Получен новый пользователь».",
    "en": "At the moment of birth a blue window flashed before the midwife: 'New user received'."
   },
   "familyHistory": {
    "ru": "Деревня у края леса живёт охотой и дружбой с соседним эльфийским родом.",
    "en": "The village at the forest's edge lives by hunting and friendship with a neighbouring elven clan."
   },
   "biography": [
    {
     "ru": "Ирек Брайт родился: приют при храме Хора. В момент рождения перед глазами повитухи вспыхнуло синее окно: «Получен новый пользователь».",
     "en": "Ирек Брайт was born: the orphanage of the Choir's temple. At the moment of birth a blue window flashed before the midwife: 'New user received'."
    },
    {
     "ru": "Деревня у края леса живёт охотой и дружбой с соседним эльфийским родом.",
     "en": "The village at the forest's edge lives by hunting and friendship with a neighbouring elven clan."
    },
    {
     "ru": "Отец — Ольвен Брайт, травница. Мать — Ровена Брайт, мельник. Братья и сёстры: Кассиан.",
     "en": "Father: Ольвен Брайт, herbalist. Mother: Ровена Брайт, miller. Siblings: Кассиан."
    },
    {
     "ru": "С первых дней заметно: мана течёт сама, без усилий.",
     "en": "It shows from the first days: mana flows on its own, effortlessly."
    }
   ]
  },
  "hidden": {
   "potential": 6,
   "destiny": 4,
   "dormantTalents": [],
   "familySecret": null,
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Ольвен Брайт",
    "gender": "male",
    "bornAt": -32,
    "temperamentId": "calm",
    "traitId": "secretive",
    "occupation": {
     "ru": "Травница",
     "en": "Herbalist"
    },
    "bio": {
     "ru": "Травница. О прошлом молчит, даже когда спрашивают. Характер: спокойный.",
     "en": "Herbalist. Stays silent about the past even when asked. Temperament: calm."
    },
    "affinity": 20,
    "alive": false,
    "diedAt": 38,
    "metAt": 0,
    "power": 24,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Ровена Брайт",
    "gender": "female",
    "bornAt": -23,
    "temperamentId": "calm",
    "traitId": "stern",
    "occupation": {
     "ru": "Мельник",
     "en": "Miller"
    },
    "bio": {
     "ru": "Мельник. Хвалит редко, требует много. Характер: спокойный.",
     "en": "Miller. Praises rarely and demands much. Temperament: calm."
    },
    "affinity": 47,
    "alive": false,
    "diedAt": 21,
    "metAt": 0,
    "power": 38,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Кассиан Брайт",
    "gender": "male",
    "bornAt": -4,
    "temperamentId": "ambitious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. Кружка за кружкой топит какую-то старую беду. Характер: честолюбивый.",
     "en": "Brother. Drowns some old sorrow mug after mug. Temperament: ambitious."
    },
    "affinity": 31,
    "alive": false,
    "diedAt": 65,
    "metAt": 0,
    "power": 32,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "rival",
    "name": "Таэль Келлен",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "ambitious",
    "traitId": "proud",
    "occupation": {
     "ru": "Зверолюд-разведчик",
     "en": "Beastkin scout"
    },
    "bio": {
     "ru": "Зверолюд-разведчик. Не прощает обид и не просит помощи. Характер: честолюбивый.",
     "en": "Beastkin scout. Never forgives a slight and never asks for help. Temperament: ambitious."
    },
    "affinity": 0,
    "alive": false,
    "diedAt": 73,
    "metAt": 4,
    "power": 26,
    "skillId": "athletics",
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "teacher",
    "name": "Ольвен Келлен",
    "gender": "male",
    "bornAt": -32,
    "temperamentId": "cunning",
    "traitId": "wise",
    "occupation": {
     "ru": "Жрица Хора",
     "en": "Choir priestess"
    },
    "bio": {
     "ru": "Жрица Хора. Говорит мало, но к словам прислушиваются. Характер: хитрый.",
     "en": "Choir priestess. Says little, but people listen. Temperament: cunning."
    },
    "affinity": 20,
    "alive": false,
    "diedAt": 39,
    "metAt": 9,
    "power": 33,
    "skillId": "lore",
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "rival",
    "name": "Кассиан Арденвейл",
    "gender": "male",
    "bornAt": 2,
    "temperamentId": "calm",
    "traitId": "wise",
    "occupation": {
     "ru": "Подмастерье кузнеца",
     "en": "Smith's apprentice"
    },
    "bio": {
     "ru": "Подмастерье кузнеца. Говорит мало, но к словам прислушиваются. Характер: спокойный.",
     "en": "Smith's apprentice. Says little, but people listen. Temperament: calm."
    },
    "affinity": -13,
    "alive": false,
    "diedAt": 74,
    "metAt": 12,
    "power": 17,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n7",
    "role": "spouse",
    "name": "Лукан Хартвуд",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "proud",
    "occupation": {
     "ru": "Человек с праздника",
     "en": "Someone from the festival"
    },
    "bio": {
     "ru": "Человек с праздника. Не прощает обид и не просит помощи. Характер: честолюбивый.",
     "en": "Someone from the festival. Never forgives a slight and never asks for help. Temperament: ambitious."
    },
    "affinity": 53,
    "alive": false,
    "diedAt": 81,
    "metAt": 19,
    "power": 22,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n8",
    "role": "child",
    "name": "Кассиан Брайт",
    "gender": "male",
    "bornAt": 23,
    "temperamentId": "brave",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Сын",
     "en": "Son"
    },
    "bio": {
     "ru": "Сын. Смех слышно издалека. Характер: отважный.",
     "en": "Son. Their laughter carries far. Temperament: brave."
    },
    "affinity": 80,
    "alive": false,
    "diedAt": 102,
    "metAt": 23,
    "power": 7,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n9",
    "role": "friend",
    "name": "Фельт Хартвуд",
    "gender": "male",
    "bornAt": 1,
    "temperamentId": "ambitious",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Подмастерье кузнеца",
     "en": "Smith's apprentice"
    },
    "bio": {
     "ru": "Подмастерье кузнеца. Мечтает о большем и ждёт того же от близких. Характер: честолюбивый.",
     "en": "Smith's apprentice. Dreams of more and expects the same of those close to them. Temperament: ambitious."
    },
    "affinity": 94,
    "alive": false,
    "diedAt": 78,
    "metAt": 54,
    "power": 25,
    "skillId": "craft",
    "interactedAt": null
   }
  ],
  "nextNpcId": 10,
  "meters": {
   "system-favor": 0
  },
  "consequences": [],
  "quest": {
   "id": "is.q-learn",
   "since": 111
  },
  "questsDone": [
   "is.q-gold",
   "is.q-friend"
  ],
  "recentEvents": [
   "is.exam",
   "common.old-wound",
   "common.child-grows",
   "is.slime"
  ]
 },
 "murim-young": {
  "schemaVersion": 2,
  "seed": "v2-murim-young",
  "rngState": 4152987645,
  "version": 13,
  "character": {
   "name": "Юэ Цин клана Лун",
   "gender": "female",
   "universeId": "murim",
   "raceId": "human",
   "originId": "physician-child",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 11,
    "intelligence": 10,
    "agility": 8,
    "vitality": 7,
    "wisdom": 12,
    "charisma": 9,
    "luck": 9,
    "willpower": 18
   },
   "resources": {
    "health": 68,
    "energy": 96,
    "mana": 54,
    "stamina": 76
   },
   "level": 1,
   "xp": 20,
   "reputation": 0,
   "karma": 5,
   "wealth": 18,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   },
   "socialClassId": "commoner",
   "talents": [],
   "weaknesses": [],
   "skills": {
    "medicine": 10
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 7,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.fever": 1,
   "common.study-or-play": 1
  },
  "lastSeen": {
   "common.first-steps": 2,
   "common.night-fear": 3,
   "common.first-friend": 4,
   "common.fever": 5,
   "common.study-or-play": 6
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 14,
  "background": {
   "familyName": "клана Лун",
   "birthplace": {
    "ru": "пристань у Третьей реки",
    "en": "a pier on the Third River"
   },
   "omen": {
    "ru": "Странствующий монах оставил у дверей чашу риса и ушёл.",
    "en": "A wandering monk left a bowl of rice at the door and walked away."
   },
   "familyHistory": {
    "ru": "Род лекарей лечит всех: праведных, тёмных и бандитов. Поэтому их не трогает никто.",
    "en": "A line of physicians treats everyone: righteous, demonic and bandits alike. That is why no one touches them."
   },
   "biography": [
    {
     "ru": "Юэ Цин клана Лун родилась: пристань у Третьей реки. Странствующий монах оставил у дверей чашу риса и ушёл.",
     "en": "Юэ Цин клана Лун was born: a pier on the Third River. A wandering monk left a bowl of rice at the door and walked away."
    },
    {
     "ru": "Род лекарей лечит всех: праведных, тёмных и бандитов. Поэтому их не трогает никто.",
     "en": "A line of physicians treats everyone: righteous, demonic and bandits alike. That is why no one touches them."
    },
    {
     "ru": "Отец — Ло Тянь клана Лун, торговка лепёшками. Мать — Шэнь Юй клана Лун, торговка лепёшками.",
     "en": "Father: Ло Тянь клана Лун, flatbread seller. Mother: Шэнь Юй клана Лун, flatbread seller."
    },
    {
     "ru": "Старая повитуха долго смотрит на ребёнка и говорит, что в нём спит что-то большее.",
     "en": "The old midwife studies the child for a long time and says something greater sleeps within."
    }
   ]
  },
  "hidden": {
   "potential": 7,
   "destiny": 4,
   "dormantTalents": [
    "sword-heart",
    "meridian-prodigy"
   ],
   "familySecret": null,
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Ло Тянь клана Лун",
    "gender": "male",
    "bornAt": -28,
    "temperamentId": "brave",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Торговка лепёшками",
     "en": "Flatbread seller"
    },
    "bio": {
     "ru": "Торговка лепёшками. Смех слышно издалека. Характер: отважный.",
     "en": "Flatbread seller. Their laughter carries far. Temperament: brave."
    },
    "affinity": 47,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 31,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Шэнь Юй клана Лун",
    "gender": "female",
    "bornAt": -21,
    "temperamentId": "curious",
    "traitId": "wise",
    "occupation": {
     "ru": "Торговка лепёшками",
     "en": "Flatbread seller"
    },
    "bio": {
     "ru": "Торговка лепёшками. Говорит мало, но к словам прислушиваются. Характер: любопытный.",
     "en": "Flatbread seller. Says little, but people listen. Temperament: curious."
    },
    "affinity": 66,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 19,
    "skillId": "craft",
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "grandparent",
    "name": "Вэй Ян клана Лун",
    "gender": "male",
    "bornAt": -52,
    "temperamentId": "curious",
    "traitId": "caring",
    "occupation": {
     "ru": "Торговка лепёшками",
     "en": "Flatbread seller"
    },
    "bio": {
     "ru": "Торговка лепёшками. Всегда замечает, когда другим плохо. Характер: любопытный.",
     "en": "Flatbread seller. Always notices when others are hurting. Temperament: curious."
    },
    "affinity": 62,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 15,
    "skillId": "persuasion",
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Бай Лин клана Лун",
    "gender": "female",
    "bornAt": 2,
    "temperamentId": "calm",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Мальчишка из Секты нищих",
     "en": "Boy from the Beggars' Sect"
    },
    "bio": {
     "ru": "Мальчишка из Секты нищих. Смех слышно издалека. Характер: спокойный.",
     "en": "Boy from the Beggars' Sect. Their laughter carries far. Temperament: calm."
    },
    "affinity": 43,
    "alive": true,
    "diedAt": null,
    "metAt": 4,
    "power": 11,
    "skillId": "craft",
    "interactedAt": null
   }
  ],
  "nextNpcId": 5,
  "meters": {
   "qi-deviation": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.study-or-play",
   "common.fever",
   "common.first-friend",
   "common.night-fear"
  ]
 },
 "murim-family": {
  "schemaVersion": 2,
  "seed": "v2-murim-adult-29",
  "rngState": 3273923209,
  "version": 161,
  "character": {
   "name": "Чэн Фэн дома Тан",
   "gender": "male",
   "universeId": "murim",
   "raceId": "human",
   "originId": "sect-disciple",
   "temperamentId": "kind",
   "stats": {
    "strength": 5,
    "intelligence": 14,
    "agility": 11,
    "vitality": 15,
    "wisdom": 45,
    "charisma": 27,
    "luck": 11,
    "willpower": 22
   },
   "resources": {
    "health": 204,
    "energy": 116,
    "mana": 208,
    "stamina": 108
   },
   "level": 5,
   "xp": 416,
   "reputation": 21,
   "karma": 35,
   "wealth": 719,
   "abilities": [
    "light-step",
    "sword-qi"
   ],
   "track": {
    "points": 210,
    "rank": 4
   },
   "socialClassId": "disciple",
   "talents": [
    "silver-tongue",
    "meridian-prodigy"
   ],
   "weaknesses": [
    "short-temper"
   ],
   "skills": {
    "martial-arts": 69,
    "inner-cultivation": 43,
    "persuasion": 44,
    "survival": 67
   },
   "professionId": "wanderer",
   "educationId": null,
   "specializationId": "swordsman",
   "factions": {
    "orthodox-alliance": 37
   }
  },
  "life": {
   "age": 97,
   "stage": "elder",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "martial-school",
   "profession",
   "job-wanderer",
   "in-love",
   "married",
   "has-child"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "common.first-friend": 1,
   "mu.village-school": 1,
   "common.rival-appears": 1,
   "mu.outer-court": 1,
   "common.talent-awakens": 1,
   "mu.manual": 1,
   "mu.bottleneck": 5,
   "mu.duel": 8,
   "mu.rival-challenge": 5,
   "common.overcome-weakness": 5,
   "common.calling": 1,
   "mu.bandits": 6,
   "common.fever": 3,
   "common.trade-offer": 2,
   "common.first-love": 1,
   "common.lost-purse": 2,
   "common.potential-sign": 1,
   "common.love-test": 1,
   "common.heir": 1,
   "mu.specialize": 1,
   "common.midlife": 1,
   "common.child-grows": 4,
   "common.reunion": 1,
   "common.old-wound": 5,
   "common.rival-reconcile": 1,
   "common.friend-needs-help": 2
  },
  "lastSeen": {
   "common.night-fear": 3,
   "common.first-friend": 5,
   "mu.village-school": 6,
   "common.rival-appears": 8,
   "mu.outer-court": 9,
   "common.talent-awakens": 10,
   "mu.manual": 12,
   "mu.bottleneck": 67,
   "mu.duel": 93,
   "mu.rival-challenge": 78,
   "common.overcome-weakness": 94,
   "common.calling": 19,
   "mu.bandits": 91,
   "common.fever": 58,
   "common.trade-offer": 66,
   "common.first-love": 28,
   "common.lost-purse": 46,
   "common.potential-sign": 30,
   "common.love-test": 31,
   "common.heir": 35,
   "mu.specialize": 39,
   "common.midlife": 44,
   "common.child-grows": 90,
   "common.reunion": 50,
   "common.old-wound": 92,
   "common.rival-reconcile": 57,
   "common.friend-needs-help": 76
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 169,
  "background": {
   "familyName": "дома Тан",
   "birthplace": {
    "ru": "поместье великого клана",
    "en": "a great clan's estate"
   },
   "omen": {
    "ru": "Странствующий монах оставил у дверей чашу риса и ушёл.",
    "en": "A wandering monk left a bowl of rice at the door and walked away."
   },
   "familyHistory": {
    "ru": "Корзину с младенцем нашли у ворот праведной секты на рассвете праздника Фонарей.",
    "en": "A basket with an infant was found at the righteous sect's gates on the morning of the Lantern Festival."
   },
   "biography": [
    {
     "ru": "Чэн Фэн дома Тан родился: поместье великого клана. Странствующий монах оставил у дверей чашу риса и ушёл.",
     "en": "Чэн Фэн дома Тан was born: a great clan's estate. A wandering monk left a bowl of rice at the door and walked away."
    },
    {
     "ru": "Корзину с младенцем нашли у ворот праведной секты на рассвете праздника Фонарей.",
     "en": "A basket with an infant was found at the righteous sect's gates on the morning of the Lantern Festival."
    },
    {
     "ru": "Родителей никто не знает: ребёнка нашли у чужого порога.",
     "en": "No one knows the parents: the child was found on a stranger's doorstep."
    },
    {
     "ru": "С первых дней заметно: слова сами складываются в нужные.",
     "en": "It shows from the first days: words arrange themselves just right."
    }
   ]
  },
  "hidden": {
   "potential": 4,
   "destiny": 3,
   "dormantTalents": [],
   "familySecret": null,
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "friend",
    "name": "Тан Ми реки Ло",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "kind",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Наследник клана Тан",
     "en": "Heir of the Tang clan"
    },
    "bio": {
     "ru": "Наследник клана Тан. Мечтает о большем и ждёт того же от близких. Характер: добрый.",
     "en": "Heir of the Tang clan. Dreams of more and expects the same of those close to them. Temperament: kind."
    },
    "affinity": -5,
    "alive": false,
    "diedAt": 71,
    "metAt": 8,
    "power": 30,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "spouse",
    "name": "Шэнь Юй долины Бай",
    "gender": "female",
    "bornAt": 2,
    "temperamentId": "kind",
    "traitId": "drinker",
    "occupation": {
     "ru": "Знакомый по работе",
     "en": "A colleague"
    },
    "bio": {
     "ru": "Знакомый по работе. Кружка за кружкой топит какую-то старую беду. Характер: добрый.",
     "en": "A colleague. Drowns some old sorrow mug after mug. Temperament: kind."
    },
    "affinity": 35,
    "alive": false,
    "diedAt": 65,
    "metAt": 28,
    "power": 44,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "child",
    "name": "Бай Лин дома Тан",
    "gender": "female",
    "bornAt": 35,
    "temperamentId": "brave",
    "traitId": "wise",
    "occupation": {
     "ru": "Дочь",
     "en": "Daughter"
    },
    "bio": {
     "ru": "Дочь. Говорит мало, но к словам прислушиваются. Характер: отважный.",
     "en": "Daughter. Says little, but people listen. Temperament: brave."
    },
    "affinity": 94,
    "alive": true,
    "diedAt": null,
    "metAt": 35,
    "power": 7,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Мэй Инь клана Лун",
    "gender": "female",
    "bornAt": -2,
    "temperamentId": "calm",
    "traitId": "proud",
    "occupation": {
     "ru": "Мальчишка из Секты нищих",
     "en": "Boy from the Beggars' Sect"
    },
    "bio": {
     "ru": "Мальчишка из Секты нищих. Не прощает обид и не просит помощи. Характер: спокойный.",
     "en": "Boy from the Beggars' Sect. Never forgives a slight and never asks for help. Temperament: calm."
    },
    "affinity": 79,
    "alive": false,
    "diedAt": 65,
    "metAt": 50,
    "power": 19,
    "skillId": "survival",
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "friend",
    "name": "Бай Лин дома Тан",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "curious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Мальчишка из Секты нищих",
     "en": "Boy from the Beggars' Sect"
    },
    "bio": {
     "ru": "Мальчишка из Секты нищих. Живёт наполовину в выдуманных мирах. Характер: любопытный.",
     "en": "Boy from the Beggars' Sect. Lives half in imagined worlds. Temperament: curious."
    },
    "affinity": 54,
    "alive": false,
    "diedAt": 77,
    "metAt": 76,
    "power": 38,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "rival",
    "name": "Цзян Хо клана Лун",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "kind",
    "traitId": "proud",
    "occupation": {
     "ru": "Наследник клана Тан",
     "en": "Heir of the Tang clan"
    },
    "bio": {
     "ru": "Наследник клана Тан. Не прощает обид и не просит помощи. Характер: добрый.",
     "en": "Heir of the Tang clan. Never forgives a slight and never asks for help. Temperament: kind."
    },
    "affinity": -22,
    "alive": false,
    "diedAt": 81,
    "metAt": 78,
    "power": 41,
    "skillId": null,
    "interactedAt": null
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
   "common.overcome-weakness",
   "mu.duel",
   "common.old-wound",
   "mu.bandits"
  ]
 },
 "xianxia-young": {
  "schemaVersion": 2,
  "seed": "v2-xianxia-young",
  "rngState": 611664629,
  "version": 13,
  "character": {
   "name": "Шэн Лэй Тихого озера",
   "gender": "male",
   "universeId": "xianxia",
   "raceId": "half-dragon",
   "originId": "beggar",
   "temperamentId": "curious",
   "stats": {
    "strength": 11,
    "intelligence": 11,
    "agility": 9,
    "vitality": 4,
    "wisdom": 8,
    "charisma": 7,
    "luck": 12,
    "willpower": 14
   },
   "resources": {
    "health": 56,
    "energy": 88,
    "mana": 44,
    "stamina": 70
   },
   "level": 1,
   "xp": 26,
   "reputation": 5,
   "karma": 0,
   "wealth": 0,
   "abilities": [],
   "track": {
    "points": 8,
    "rank": 0
   },
   "socialClassId": "mortal",
   "talents": [
    "pill-sense"
   ],
   "weaknesses": [],
   "skills": {
    "stealth": 6,
    "lore": 13,
    "alchemy": 1,
    "cultivation": 1
   },
   "professionId": null,
   "educationId": "xx-village",
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 7,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "spirit-root"
  ],
  "occurrences": {
   "common.fever": 1,
   "common.night-fear": 1,
   "xx.taoist": 1,
   "xx.root-test": 1,
   "common.study-or-play": 1
  },
  "lastSeen": {
   "common.fever": 3,
   "common.night-fear": 4,
   "xx.taoist": 5,
   "xx.root-test": 6,
   "common.study-or-play": 7
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 14,
  "background": {
   "familyName": "Тихого озера",
   "birthplace": {
    "ru": "поместье клана над духовным источником",
    "en": "a clan estate above a spirit spring"
   },
   "omen": {
    "ru": "Духовный источник в ту ночь закипел.",
    "en": "The spirit spring boiled that night."
   },
   "familyHistory": {
    "ru": "Ни имени, ни дома. Только старый нищий, который делился рисом и умер прошлой зимой.",
    "en": "No name, no home. Only an old beggar who shared his rice and died last winter."
   },
   "biography": [
    {
     "ru": "Шэн Лэй Тихого озера родился: поместье клана над духовным источником. Духовный источник в ту ночь закипел.",
     "en": "Шэн Лэй Тихого озера was born: a clan estate above a spirit spring. The spirit spring boiled that night."
    },
    {
     "ru": "Ни имени, ни дома. Только старый нищий, который делился рисом и умер прошлой зимой.",
     "en": "No name, no home. Only an old beggar who shared his rice and died last winter."
    },
    {
     "ru": "Родителей никто не знает: ребёнка нашли у чужого порога.",
     "en": "No one knows the parents: the child was found on a stranger's doorstep."
    },
    {
     "ru": "С первых дней заметно: слышит, когда пилюля готова.",
     "en": "It shows from the first days: hears when a pill is ready."
    }
   ]
  },
  "hidden": {
   "potential": 4,
   "destiny": 6,
   "dormantTalents": [
    "keen-eye"
   ],
   "familySecret": null,
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "teacher",
    "name": "Шуй Лань с горы Линфэн",
    "gender": "female",
    "bornAt": -34,
    "temperamentId": "ambitious",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Сельский даос",
     "en": "Village Taoist"
    },
    "bio": {
     "ru": "Сельский даос. Смех слышно издалека. Характер: честолюбивый.",
     "en": "Village Taoist. Their laughter carries far. Temperament: ambitious."
    },
    "affinity": 16,
    "alive": true,
    "diedAt": null,
    "metAt": 5,
    "power": 30,
    "skillId": "lore",
    "interactedAt": null
   }
  ],
  "nextNpcId": 2,
  "meters": {
   "dao-heart": 35,
   "karmic-debt": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.study-or-play",
   "xx.root-test",
   "xx.taoist",
   "common.night-fear"
  ]
 },
 "xianxia-family": {
  "schemaVersion": 2,
  "seed": "v2-xianxia-adult-0",
  "rngState": 534321978,
  "version": 161,
  "character": {
   "name": "Хань Ци долины Ветров",
   "gender": "male",
   "universeId": "xianxia",
   "raceId": "human",
   "originId": "farm-child",
   "temperamentId": "calm",
   "stats": {
    "strength": 12,
    "intelligence": 16,
    "agility": 11,
    "vitality": 30,
    "wisdom": 28,
    "charisma": 12,
    "luck": 18,
    "willpower": 25
   },
   "resources": {
    "health": 253,
    "energy": 120,
    "mana": 170,
    "stamina": 144
   },
   "level": 5,
   "xp": 122,
   "reputation": 37,
   "karma": 31,
   "wealth": 323,
   "abilities": [
    "alchemy",
    "flying-sword",
    "thunder-talisman",
    "spirit-sense"
   ],
   "track": {
    "points": 240,
    "rank": 3
   },
   "socialClassId": "mortal",
   "talents": [
    "pill-sense",
    "quick-learner"
   ],
   "weaknesses": [],
   "skills": {
    "survival": 5,
    "athletics": 3,
    "alchemy": 44,
    "lore": 43,
    "medicine": 5,
    "cultivation": 49,
    "talismans": 10
   },
   "professionId": null,
   "educationId": null,
   "specializationId": "formation-master",
   "factions": {
    "cloud-peak": 10
   }
  },
  "life": {
   "age": 95,
   "stage": "adult",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend",
   "in-love",
   "married",
   "spirit-root",
   "has-child"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "common.fever": 3,
   "xx.taoist": 1,
   "common.first-friend": 1,
   "common.study-or-play": 1,
   "xx.root-test": 1,
   "common.talent-awakens": 1,
   "common.sibling-quarrel": 1,
   "common.parent-lesson": 1,
   "common.mentor": 1,
   "common.friend-needs-help": 1,
   "common.lost-purse": 2,
   "common.parent-illness": 2,
   "common.first-love": 1,
   "xx.herb": 7,
   "common.love-test": 1,
   "common.rival-appears": 1,
   "xx.hidden-root": 1,
   "xx.parent-ages": 1,
   "xx.tribulation": 7,
   "xx.dao-insight": 7,
   "common.trade-offer": 2,
   "xx.blood-moon-offer": 1,
   "xx.alchemy": 1,
   "common.heir": 1,
   "common.potential-sign": 1,
   "common.destiny-save": 1,
   "common.rival-reconcile": 1,
   "common.midlife": 1,
   "common.child-grows": 5,
   "common.old-wound": 5,
   "common.reunion": 1,
   "xx.specialize": 1,
   "common.overcome-weakness": 1
  },
  "lastSeen": {
   "common.night-fear": 3,
   "common.fever": 69,
   "xx.taoist": 5,
   "common.first-friend": 6,
   "common.study-or-play": 7,
   "xx.root-test": 8,
   "common.talent-awakens": 10,
   "common.sibling-quarrel": 11,
   "common.parent-lesson": 13,
   "common.mentor": 14,
   "common.friend-needs-help": 16,
   "common.lost-purse": 30,
   "common.parent-illness": 35,
   "common.first-love": 21,
   "xx.herb": 87,
   "common.love-test": 24,
   "common.rival-appears": 25,
   "xx.hidden-root": 26,
   "xx.parent-ages": 27,
   "xx.tribulation": 88,
   "xx.dao-insight": 95,
   "common.trade-offer": 50,
   "xx.blood-moon-offer": 34,
   "xx.alchemy": 38,
   "common.heir": 40,
   "common.potential-sign": 41,
   "common.destiny-save": 43,
   "common.rival-reconcile": 45,
   "common.midlife": 46,
   "common.child-grows": 86,
   "common.old-wound": 91,
   "common.reunion": 63,
   "xx.specialize": 72,
   "common.overcome-weakness": 81
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 173,
  "background": {
   "familyName": "долины Ветров",
   "birthplace": {
    "ru": "сарай у городских ворот",
    "en": "a shed by the city gate"
   },
   "omen": {
    "ru": "Над крышей кружили белые журавли.",
    "en": "White cranes circled the roof."
   },
   "familyHistory": {
    "ru": "Семья выращивает рис у подножия священной горы. Деды говорят, что когда-то в роду был бессмертный.",
    "en": "The family grows rice at the foot of a sacred mountain. The elders say there was once an immortal in the line."
   },
   "biography": [
    {
     "ru": "Хань Ци долины Ветров родился: сарай у городских ворот. Над крышей кружили белые журавли.",
     "en": "Хань Ци долины Ветров was born: a shed by the city gate. White cranes circled the roof."
    },
    {
     "ru": "Семья выращивает рис у подножия священной горы. Деды говорят, что когда-то в роду был бессмертный.",
     "en": "The family grows rice at the foot of a sacred mountain. The elders say there was once an immortal in the line."
    },
    {
     "ru": "Отец — Фань Юй долины Ветров, рисовод. Мать — Нин Шуан долины Ветров, дровосек. Братья и сёстры: Цзинь, Мо.",
     "en": "Father: Фань Юй долины Ветров, rice farmer. Mother: Нин Шуан долины Ветров, woodcutter. Siblings: Цзинь, Мо."
    },
    {
     "ru": "С первых дней заметно: слышит, когда пилюля готова.",
     "en": "It shows from the first days: hears when a pill is ready."
    }
   ]
  },
  "hidden": {
   "potential": 6,
   "destiny": 8,
   "dormantTalents": [],
   "familySecret": null,
   "revealed": [
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Фань Юй долины Ветров",
    "gender": "male",
    "bornAt": -29,
    "temperamentId": "ambitious",
    "traitId": "wise",
    "occupation": {
     "ru": "Рисовод",
     "en": "Rice farmer"
    },
    "bio": {
     "ru": "Рисовод. Говорит мало, но к словам прислушиваются. Характер: честолюбивый.",
     "en": "Rice farmer. Says little, but people listen. Temperament: ambitious."
    },
    "affinity": 65,
    "alive": false,
    "diedAt": 34,
    "metAt": 0,
    "power": 36,
    "skillId": "survival",
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Нин Шуан долины Ветров",
    "gender": "female",
    "bornAt": -20,
    "temperamentId": "ambitious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Дровосек",
     "en": "Woodcutter"
    },
    "bio": {
     "ru": "Дровосек. Кружка за кружкой топит какую-то старую беду. Характер: честолюбивый.",
     "en": "Woodcutter. Drowns some old sorrow mug after mug. Temperament: ambitious."
    },
    "affinity": 99,
    "alive": false,
    "diedAt": 42,
    "metAt": 0,
    "power": 36,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Цзинь Мо долины Ветров",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. Живёт наполовину в выдуманных мирах. Характер: честолюбивый.",
     "en": "Brother. Lives half in imagined worlds. Temperament: ambitious."
    },
    "affinity": 54,
    "alive": false,
    "diedAt": 69,
    "metAt": 0,
    "power": 33,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Мо Синь долины Ветров",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "stern",
    "occupation": {
     "ru": "Сестра",
     "en": "Sister"
    },
    "bio": {
     "ru": "Сестра. Хвалит редко, требует много. Характер: честолюбивый.",
     "en": "Sister. Praises rarely and demands much. Temperament: ambitious."
    },
    "affinity": 23,
    "alive": false,
    "diedAt": 60,
    "metAt": 0,
    "power": 16,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "grandparent",
    "name": "Мин Хао долины Ветров",
    "gender": "male",
    "bornAt": -46,
    "temperamentId": "calm",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Рисовод",
     "en": "Rice farmer"
    },
    "bio": {
     "ru": "Рисовод. Живёт наполовину в выдуманных мирах. Характер: спокойный.",
     "en": "Rice farmer. Lives half in imagined worlds. Temperament: calm."
    },
    "affinity": 53,
    "alive": false,
    "diedAt": 19,
    "metAt": 0,
    "power": 10,
    "skillId": "medicine",
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Юнь Фэй долины Ветров",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "secretive",
    "occupation": {
     "ru": "Младшая сестра по секте",
     "en": "Junior sect sister"
    },
    "bio": {
     "ru": "Младшая сестра по секте. О прошлом молчит, даже когда спрашивают. Характер: честолюбивый.",
     "en": "Junior sect sister. Stays silent about the past even when asked. Temperament: ambitious."
    },
    "affinity": 31,
    "alive": false,
    "diedAt": 62,
    "metAt": 6,
    "power": 43,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n7",
    "role": "spouse",
    "name": "Нин Шуан Тихого озера",
    "gender": "female",
    "bornAt": -5,
    "temperamentId": "kind",
    "traitId": "stern",
    "occupation": {
     "ru": "Знакомый по работе",
     "en": "A colleague"
    },
    "bio": {
     "ru": "Знакомый по работе. Хвалит редко, требует много. Характер: добрый.",
     "en": "A colleague. Praises rarely and demands much. Temperament: kind."
    },
    "affinity": 54,
    "alive": false,
    "diedAt": 58,
    "metAt": 21,
    "power": 43,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n8",
    "role": "rival",
    "name": "Сяо Чэнь с горы Линфэн",
    "gender": "male",
    "bornAt": -2,
    "temperamentId": "ambitious",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Гордый наследник клана Лю",
     "en": "Proud heir of the Liu clan"
    },
    "bio": {
     "ru": "Гордый наследник клана Лю. Гнев вспыхивает быстро и быстро гаснет. Характер: честолюбивый.",
     "en": "Proud heir of the Liu clan. Anger flares fast and fades fast. Temperament: ambitious."
    },
    "affinity": -45,
    "alive": false,
    "diedAt": 64,
    "metAt": 25,
    "power": 27,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n9",
    "role": "child",
    "name": "Лин Юэ долины Ветров",
    "gender": "female",
    "bornAt": 40,
    "temperamentId": "calm",
    "traitId": "stern",
    "occupation": {
     "ru": "Дочь",
     "en": "Daughter"
    },
    "bio": {
     "ru": "Дочь. Хвалит редко, требует много. Характер: спокойный.",
     "en": "Daughter. Praises rarely and demands much. Temperament: calm."
    },
    "affinity": 30,
    "alive": true,
    "diedAt": null,
    "metAt": 40,
    "power": 4,
    "skillId": null,
    "interactedAt": null
   }
  ],
  "nextNpcId": 10,
  "meters": {
   "dao-heart": 100,
   "karmic-debt": 4
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "xx.dao-insight",
   "common.old-wound",
   "xx.tribulation",
   "xx.herb"
  ]
 },
 "hunter-young": {
  "schemaVersion": 2,
  "seed": "v2-hunter-young",
  "rngState": 2818478422,
  "version": 13,
  "character": {
   "name": "Лея Морен",
   "gender": "female",
   "universeId": "hunter",
   "raceId": "human",
   "originId": "ordinary",
   "temperamentId": "curious",
   "stats": {
    "strength": 8,
    "intelligence": 13,
    "agility": 10,
    "vitality": 5,
    "wisdom": 9,
    "charisma": 10,
    "luck": 11,
    "willpower": 11
   },
   "resources": {
    "health": 60,
    "energy": 82,
    "mana": 54,
    "stamina": 66
   },
   "level": 1,
   "xp": 27,
   "reputation": 0,
   "karma": 8,
   "wealth": 13,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   },
   "socialClassId": "citizen",
   "talents": [
    "golden-hands"
   ],
   "weaknesses": [
    "frail"
   ],
   "skills": {
    "athletics": 3,
    "lore": 6,
    "craft": 2
   },
   "professionId": null,
   "educationId": null,
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 7,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "childhood-friend"
  ],
  "occurrences": {
   "common.fever": 1,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.sibling-quarrel": 1,
   "common.study-or-play": 1
  },
  "lastSeen": {
   "common.fever": 2,
   "common.night-fear": 3,
   "common.first-friend": 4,
   "common.sibling-quarrel": 5,
   "common.study-or-play": 6
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 14,
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
     "ru": "Лея Морен родилась: государственный приют в Мапхо. Город спал спокойно: ни одной тревоги за ночь.",
     "en": "Лея Морен was born: a state orphanage in Mapo. The city slept peacefully: not a single alarm all night."
    },
    {
     "ru": "Квартира в спальном районе, кредит за неё и отец, который работает в две смены.",
     "en": "A flat in a commuter district, the loan on it, and a father working double shifts."
    },
    {
     "ru": "Отец — Макс Ирвин, таксист. Мать — Ева Линд, медсестра. Братья и сёстры: Ника, Арт.",
     "en": "Father: Макс Ирвин, taxi driver. Mother: Ева Линд, nurse. Siblings: Ника, Арт."
    },
    {
     "ru": "С первых дней заметно: любая вещь в руках оживает.",
     "en": "It shows from the first days: anything comes alive in their hands."
    }
   ]
  },
  "hidden": {
   "potential": 4,
   "destiny": 8,
   "dormantTalents": [
    "camera-face"
   ],
   "familySecret": null,
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Макс Ирвин",
    "gender": "male",
    "bornAt": -34,
    "temperamentId": "cunning",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Таксист",
     "en": "Taxi driver"
    },
    "bio": {
     "ru": "Таксист. Смех слышно издалека. Характер: хитрый.",
     "en": "Taxi driver. Their laughter carries far. Temperament: cunning."
    },
    "affinity": 44,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 11,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Ева Линд",
    "gender": "female",
    "bornAt": -18,
    "temperamentId": "curious",
    "traitId": "proud",
    "occupation": {
     "ru": "Медсестра",
     "en": "Nurse"
    },
    "bio": {
     "ru": "Медсестра. Не прощает обид и не просит помощи. Характер: любопытный.",
     "en": "Nurse. Never forgives a slight and never asks for help. Temperament: curious."
    },
    "affinity": 60,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 38,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Ника Хан",
    "gender": "female",
    "bornAt": -1,
    "temperamentId": "calm",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Сестра",
     "en": "Sister"
    },
    "bio": {
     "ru": "Сестра. Смех слышно издалека. Характер: спокойный.",
     "en": "Sister. Their laughter carries far. Temperament: calm."
    },
    "affinity": 40,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 24,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Арт Нойс",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "kind",
    "traitId": "drinker",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. Кружка за кружкой топит какую-то старую беду. Характер: добрый.",
     "en": "Brother. Drowns some old sorrow mug after mug. Temperament: kind."
    },
    "affinity": 17,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 11,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "grandparent",
    "name": "Мира Сол",
    "gender": "female",
    "bornAt": -48,
    "temperamentId": "curious",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Таксист",
     "en": "Taxi driver"
    },
    "bio": {
     "ru": "Таксист. Живёт наполовину в выдуманных мирах. Характер: любопытный.",
     "en": "Taxi driver. Lives half in imagined worlds. Temperament: curious."
    },
    "affinity": 52,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 13,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Рио Тан",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "kind",
    "traitId": "secretive",
    "occupation": {
     "ru": "Соседка-хакер",
     "en": "Hacker neighbour"
    },
    "bio": {
     "ru": "Соседка-хакер. О прошлом молчит, даже когда спрашивают. Характер: добрый.",
     "en": "Hacker neighbour. Stays silent about the past even when asked. Temperament: kind."
    },
    "affinity": 29,
    "alive": true,
    "diedAt": null,
    "metAt": 4,
    "power": 21,
    "skillId": null,
    "interactedAt": null
   }
  ],
  "nextNpcId": 7,
  "meters": {
   "gate-threat": 48,
   "fame": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.study-or-play",
   "common.sibling-quarrel",
   "common.first-friend",
   "common.night-fear"
  ]
 },
 "hunter-family": {
  "schemaVersion": 2,
  "seed": "v2-hunter-adult",
  "rngState": 513843509,
  "version": 141,
  "character": {
   "name": "Дана Рё",
   "gender": "female",
   "universeId": "hunter",
   "raceId": "human",
   "originId": "ordinary",
   "temperamentId": "calm",
   "stats": {
    "strength": 6,
    "intelligence": 7,
    "agility": 1,
    "vitality": 6,
    "wisdom": 26,
    "charisma": 14,
    "luck": 10,
    "willpower": 26
   },
   "resources": {
    "health": 0,
    "energy": 112,
    "mana": 96,
    "stamina": 68
   },
   "level": 4,
   "xp": 214,
   "reputation": -2,
   "karma": 2,
   "wealth": 1682,
   "abilities": [
    "gate-sense"
   ],
   "track": {
    "points": 55,
    "rank": 1
   },
   "socialClassId": "citizen",
   "talents": [
    "camera-face"
   ],
   "weaknesses": [
    "gate-trauma"
   ],
   "skills": {
    "athletics": 3,
    "lore": 8,
    "streaming": 42,
    "dungeon-combat": 33,
    "trade": 47
   },
   "professionId": "merchant",
   "educationId": null,
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 86,
   "stage": "elder",
   "alive": false,
   "deathAge": 86,
   "deathCause": {
    "ru": "Тихо угас от старости",
    "en": "Passed away peacefully of old age"
   }
  },
  "flags": [
   "childhood-friend",
   "awakened",
   "profession",
   "job-merchant",
   "in-love",
   "married",
   "has-child"
  ],
  "occurrences": {
   "common.fever": 3,
   "common.night-fear": 1,
   "common.first-friend": 1,
   "common.study-or-play": 1,
   "common.grandparent-tale": 1,
   "hu.gate-break": 3,
   "common.lost-purse": 2,
   "common.talent-awakens": 1,
   "hu.district-break": 8,
   "common.mentor": 1,
   "hu.awakening": 1,
   "hu.dungeon": 4,
   "common.rival-appears": 1,
   "common.parent-illness": 1,
   "common.calling": 1,
   "common.friend-needs-help": 2,
   "hu.rival-ranking": 3,
   "common.first-love": 1,
   "hu.reassessment": 3,
   "common.love-test": 1,
   "common.potential-sign": 1,
   "hu.stream": 3,
   "common.overcome-weakness": 1,
   "common.secret-surfaces": 1,
   "common.heir": 1,
   "common.child-grows": 3,
   "common.rival-reconcile": 1,
   "common.old-wound": 1,
   "common.legacy": 1,
   "common.reunion": 1
  },
  "lastSeen": {
   "common.fever": 67,
   "common.night-fear": 3,
   "common.first-friend": 5,
   "common.study-or-play": 7,
   "common.grandparent-tale": 9,
   "hu.gate-break": 49,
   "common.lost-purse": 35,
   "common.talent-awakens": 12,
   "hu.district-break": 84,
   "common.mentor": 14,
   "hu.awakening": 16,
   "hu.dungeon": 74,
   "common.rival-appears": 18,
   "common.parent-illness": 19,
   "common.calling": 23,
   "common.friend-needs-help": 31,
   "hu.rival-ranking": 60,
   "common.first-love": 27,
   "hu.reassessment": 66,
   "common.love-test": 30,
   "common.potential-sign": 32,
   "hu.stream": 68,
   "common.overcome-weakness": 37,
   "common.secret-surfaces": 44,
   "common.heir": 45,
   "common.child-grows": 76,
   "common.rival-reconcile": 65,
   "common.old-wound": 72,
   "common.legacy": 75,
   "common.reunion": 77
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 154,
  "background": {
   "familyName": "",
   "birthplace": {
    "ru": "квартира над тренировочным залом гильдии",
    "en": "a flat above a guild training hall"
   },
   "omen": {
    "ru": "В ночь рождения над роддомом открылись и сразу закрылись Врата.",
    "en": "On the night of the birth a Gate opened over the maternity ward and closed at once."
   },
   "familyHistory": {
    "ru": "Квартира в спальном районе, кредит за неё и отец, который работает в две смены.",
    "en": "A flat in a commuter district, the loan on it, and a father working double shifts."
   },
   "biography": [
    {
     "ru": "Дана Рё родилась: квартира над тренировочным залом гильдии. В ночь рождения над роддомом открылись и сразу закрылись Врата.",
     "en": "Дана Рё was born: a flat above a guild training hall. On the night of the birth a Gate opened over the maternity ward and closed at once."
    },
    {
     "ru": "Квартира в спальном районе, кредит за неё и отец, который работает в две смены.",
     "en": "A flat in a commuter district, the loan on it, and a father working double shifts."
    },
    {
     "ru": "Отец — Арт Нойс, офисный работник. Мать — Ева Линд, медсестра.",
     "en": "Father: Арт Нойс, office worker. Mother: Ева Линд, nurse."
    },
    {
     "ru": "Отец никогда не ходит в подземелья, но по ночам его вызывают люди в чёрном.",
     "en": "Father never enters dungeons, yet men in black summon him at night."
    }
   ]
  },
  "hidden": {
   "potential": 5,
   "destiny": 5,
   "dormantTalents": [],
   "familySecret": "hu-father-rank",
   "revealed": [
    "potential",
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Арт Нойс",
    "gender": "male",
    "bornAt": -36,
    "temperamentId": "curious",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Офисный работник",
     "en": "Office worker"
    },
    "bio": {
     "ru": "Офисный работник. Смех слышно издалека. Характер: любопытный.",
     "en": "Office worker. Their laughter carries far. Temperament: curious."
    },
    "affinity": 60,
    "alive": false,
    "diedAt": 19,
    "metAt": 0,
    "power": 10,
    "skillId": "survival",
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Ева Линд",
    "gender": "female",
    "bornAt": -24,
    "temperamentId": "curious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Медсестра",
     "en": "Nurse"
    },
    "bio": {
     "ru": "Медсестра. Кружка за кружкой топит какую-то старую беду. Характер: любопытный.",
     "en": "Nurse. Drowns some old sorrow mug after mug. Temperament: curious."
    },
    "affinity": 24,
    "alive": false,
    "diedAt": 52,
    "metAt": 0,
    "power": 26,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "grandparent",
    "name": "Тео Вард",
    "gender": "male",
    "bornAt": -48,
    "temperamentId": "curious",
    "traitId": "wise",
    "occupation": {
     "ru": "Медсестра",
     "en": "Nurse"
    },
    "bio": {
     "ru": "Медсестра. Говорит мало, но к словам прислушиваются. Характер: любопытный.",
     "en": "Nurse. Says little, but people listen. Temperament: curious."
    },
    "affinity": 35,
    "alive": false,
    "diedAt": 24,
    "metAt": 0,
    "power": 37,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Ева Линд",
    "gender": "female",
    "bornAt": -1,
    "temperamentId": "cunning",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Соседка-хакер",
     "en": "Hacker neighbour"
    },
    "bio": {
     "ru": "Соседка-хакер. Смех слышно издалека. Характер: хитрый.",
     "en": "Hacker neighbour. Their laughter carries far. Temperament: cunning."
    },
    "affinity": 82,
    "alive": false,
    "diedAt": 72,
    "metAt": 5,
    "power": 24,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "friend",
    "name": "Лея Морен",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "ambitious",
    "traitId": "proud",
    "occupation": {
     "ru": "Пробуждённый одноклассник",
     "en": "Awakened classmate"
    },
    "bio": {
     "ru": "Пробуждённый одноклассник. Не прощает обид и не просит помощи. Характер: честолюбивый.",
     "en": "Awakened classmate. Never forgives a slight and never asks for help. Temperament: ambitious."
    },
    "affinity": 9,
    "alive": false,
    "diedAt": 73,
    "metAt": 18,
    "power": 17,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "spouse",
    "name": "Ана Вэй",
    "gender": "female",
    "bornAt": 2,
    "temperamentId": "brave",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Человек с праздника",
     "en": "Someone from the festival"
    },
    "bio": {
     "ru": "Человек с праздника. Смех слышно издалека. Характер: отважный.",
     "en": "Someone from the festival. Their laughter carries far. Temperament: brave."
    },
    "affinity": 54,
    "alive": false,
    "diedAt": 81,
    "metAt": 27,
    "power": 30,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n7",
    "role": "child",
    "name": "Лея Морен",
    "gender": "female",
    "bornAt": 45,
    "temperamentId": "brave",
    "traitId": "drinker",
    "occupation": {
     "ru": "Дочь",
     "en": "Daughter"
    },
    "bio": {
     "ru": "Дочь. Кружка за кружкой топит какую-то старую беду. Характер: отважный.",
     "en": "Daughter. Drowns some old sorrow mug after mug. Temperament: brave."
    },
    "affinity": 70,
    "alive": true,
    "diedAt": null,
    "metAt": 45,
    "power": 3,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n8",
    "role": "friend",
    "name": "Мира Сол",
    "gender": "female",
    "bornAt": 1,
    "temperamentId": "ambitious",
    "traitId": "wise",
    "occupation": {
     "ru": "Соседка-хакер",
     "en": "Hacker neighbour"
    },
    "bio": {
     "ru": "Соседка-хакер. Говорит мало, но к словам прислушиваются. Характер: честолюбивый.",
     "en": "Hacker neighbour. Says little, but people listen. Temperament: ambitious."
    },
    "affinity": 33,
    "alive": false,
    "diedAt": 75,
    "metAt": 54,
    "power": 18,
    "skillId": "survival",
    "interactedAt": null
   }
  ],
  "nextNpcId": 9,
  "meters": {
   "gate-threat": 47,
   "fame": 1
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "hu.district-break",
   "common.reunion",
   "common.child-grows",
   "common.legacy"
  ]
 },
 "academy-young": {
  "schemaVersion": 2,
  "seed": "v2-academy-young",
  "rngState": 2352187754,
  "version": 13,
  "character": {
   "name": "Себастьян де Морнкур",
   "gender": "male",
   "universeId": "academy",
   "raceId": "human",
   "originId": "minor-noble",
   "temperamentId": "ambitious",
   "stats": {
    "strength": 9,
    "intelligence": 10,
    "agility": 6,
    "vitality": 7,
    "wisdom": 11,
    "charisma": 12,
    "luck": 5,
    "willpower": 14
   },
   "resources": {
    "health": 68,
    "energy": 88,
    "mana": 52,
    "stamina": 72
   },
   "level": 1,
   "xp": 24,
   "reputation": 5,
   "karma": 3,
   "wealth": 10,
   "abilities": [],
   "track": {
    "points": 0,
    "rank": 0
   },
   "socialClassId": "lesser-noble",
   "talents": [
    "courtly-grace"
   ],
   "weaknesses": [
    "clumsy"
   ],
   "skills": {
    "etiquette": 16,
    "melee": 3,
    "lore": 10
   },
   "professionId": null,
   "educationId": "ac-tutor",
   "specializationId": null,
   "factions": {}
  },
  "life": {
   "age": 8,
   "stage": "child",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "noble"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "common.fever": 1,
   "ac.tutor": 1,
   "common.sibling-quarrel": 1
  },
  "lastSeen": {
   "common.night-fear": 3,
   "common.fever": 4,
   "ac.tutor": 5,
   "common.sibling-quarrel": 7
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 14,
  "background": {
   "familyName": "де Морнкур",
   "birthplace": {
    "ru": "тайный загородный дом графа",
    "en": "a count's secret country house"
   },
   "omen": {
    "ru": "В ночь рождения во дворце давали бал, и музыка была слышна по всей реке.",
    "en": "On the night of the birth a ball was held at the palace, and the music carried along the river."
   },
   "familyHistory": {
    "ru": "Баронство отцу досталось от деда вместе с долгами. Младшему ребёнку не достанется ничего, кроме фамилии.",
    "en": "Father inherited the barony from grandfather along with the debts. The younger child will inherit nothing but the name."
   },
   "biography": [
    {
     "ru": "Себастьян де Морнкур родился: тайный загородный дом графа. В ночь рождения во дворце давали бал, и музыка была слышна по всей реке.",
     "en": "Себастьян де Морнкур was born: a count's secret country house. On the night of the birth a ball was held at the palace, and the music carried along the river."
    },
    {
     "ru": "Баронство отцу досталось от деда вместе с долгами. Младшему ребёнку не достанется ничего, кроме фамилии.",
     "en": "Father inherited the barony from grandfather along with the debts. The younger child will inherit nothing but the name."
    },
    {
     "ru": "Отец — Эдмунд де Морнкур, баронесса. Мать — Вивьен де Морнкур, баронесса. Братья и сёстры: Кристоф, Селестина.",
     "en": "Father: Эдмунд де Морнкур, baroness. Mother: Вивьен де Морнкур, baroness. Siblings: Кристоф, Селестина."
    },
    {
     "ru": "Мать получает письма с печатью Башни магов и сжигает их не читая.",
     "en": "Mother receives letters sealed by the Mage Tower and burns them unread."
    },
    {
     "ru": "С первых дней заметно: двор принимает как своего.",
     "en": "It shows from the first days: the court accepts them as one of its own."
    }
   ]
  },
  "hidden": {
   "potential": 6,
   "destiny": 6,
   "dormantTalents": [
    "arcane-blood"
   ],
   "familySecret": "ac-tower-debt",
   "revealed": []
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Эдмунд де Морнкур",
    "gender": "male",
    "bornAt": -33,
    "temperamentId": "curious",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Баронесса",
     "en": "Baroness"
    },
    "bio": {
     "ru": "Баронесса. Мечтает о большем и ждёт того же от близких. Характер: любопытный.",
     "en": "Baroness. Dreams of more and expects the same of those close to them. Temperament: curious."
    },
    "affinity": 33,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 34,
    "skillId": "survival",
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Вивьен де Морнкур",
    "gender": "female",
    "bornAt": -24,
    "temperamentId": "brave",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Баронесса",
     "en": "Baroness"
    },
    "bio": {
     "ru": "Баронесса. Мечтает о большем и ждёт того же от близких. Характер: отважный.",
     "en": "Baroness. Dreams of more and expects the same of those close to them. Temperament: brave."
    },
    "affinity": 50,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 27,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Кристоф де Морнкур",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "calm",
    "traitId": "wise",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. Говорит мало, но к словам прислушиваются. Характер: спокойный.",
     "en": "Brother. Says little, but people listen. Temperament: calm."
    },
    "affinity": 46,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 16,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Селестина де Морнкур",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "calm",
    "traitId": "secretive",
    "occupation": {
     "ru": "Сестра",
     "en": "Sister"
    },
    "bio": {
     "ru": "Сестра. О прошлом молчит, даже когда спрашивают. Характер: спокойный.",
     "en": "Sister. Stays silent about the past even when asked. Temperament: calm."
    },
    "affinity": 29,
    "alive": true,
    "diedAt": null,
    "metAt": 0,
    "power": 23,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "teacher",
    "name": "Изольда д’Эрмин",
    "gender": "female",
    "bornAt": -40,
    "temperamentId": "curious",
    "traitId": "wise",
    "occupation": {
     "ru": "Профессор академии Астрейн",
     "en": "Astrein professor"
    },
    "bio": {
     "ru": "Профессор академии Астрейн. Говорит мало, но к словам прислушиваются. Характер: любопытный.",
     "en": "Astrein professor. Says little, but people listen. Temperament: curious."
    },
    "affinity": 21,
    "alive": true,
    "diedAt": null,
    "metAt": 5,
    "power": 47,
    "skillId": "lore",
    "interactedAt": null
   }
  ],
  "nextNpcId": 6,
  "meters": {
   "court-favor": 23,
   "scandal": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "common.sibling-quarrel",
   "ac.tutor",
   "common.fever",
   "common.night-fear"
  ]
 },
 "academy-family": {
  "schemaVersion": 2,
  "seed": "v2-academy-adult-13",
  "rngState": 1167813445,
  "version": 161,
  "character": {
   "name": "Розалин Сильверхольм",
   "gender": "female",
   "universeId": "academy",
   "raceId": "half-elf",
   "originId": "duke-heir",
   "temperamentId": "cunning",
   "stats": {
    "strength": 19,
    "intelligence": 22,
    "agility": 24,
    "vitality": 14,
    "wisdom": 23,
    "charisma": 27,
    "luck": 13,
    "willpower": 14
   },
   "resources": {
    "health": 146,
    "energy": 88,
    "mana": 150,
    "stamina": 106
   },
   "level": 5,
   "xp": 79,
   "reputation": 69,
   "karma": -1,
   "wealth": 896,
   "abilities": [
    "arcane-shield"
   ],
   "track": {
    "points": 110,
    "rank": 2
   },
   "socialClassId": "high-noble",
   "talents": [
    "iron-body",
    "quick-learner"
   ],
   "weaknesses": [],
   "skills": {
    "persuasion": 8,
    "etiquette": 6,
    "athletics": 45,
    "arcana": 60,
    "duelling": 19,
    "lore": 47
   },
   "professionId": null,
   "educationId": "ac-tower",
   "specializationId": "battle-mage",
   "factions": {
    "imperial-court": 20,
    "magic-tower": 25,
    "rose-society": 20
   }
  },
  "life": {
   "age": 99,
   "stage": "elder",
   "alive": true,
   "deathAge": null,
   "deathCause": null
  },
  "flags": [
   "noble",
   "academy-student",
   "in-love",
   "married",
   "court-secret",
   "has-child"
  ],
  "occurrences": {
   "common.night-fear": 1,
   "ac.tutor": 1,
   "common.fever": 2,
   "common.parent-lesson": 1,
   "common.first-friend": 1,
   "common.talent-awakens": 2,
   "ac.entrance": 1,
   "common.rival-appears": 1,
   "common.mentor": 1,
   "common.first-love": 1,
   "ac.salon": 7,
   "ac.circle": 6,
   "common.love-test": 1,
   "ac.duel": 8,
   "ac.ball": 5,
   "common.potential-sign": 1,
   "common.lost-purse": 2,
   "ac.secret": 1,
   "common.parent-illness": 1,
   "common.midlife": 1,
   "common.destiny-save": 1,
   "common.trade-offer": 2,
   "common.heir": 1,
   "ac.tower": 1,
   "ac.specialize": 1,
   "common.friend-needs-help": 2,
   "common.old-wound": 3,
   "ac.rival-house": 1,
   "common.child-grows": 3,
   "common.reunion": 1,
   "common.rival-reconcile": 1
  },
  "lastSeen": {
   "common.night-fear": 3,
   "ac.tutor": 5,
   "common.fever": 48,
   "common.parent-lesson": 7,
   "common.first-friend": 9,
   "common.talent-awakens": 27,
   "ac.entrance": 14,
   "common.rival-appears": 15,
   "common.mentor": 16,
   "common.first-love": 18,
   "ac.salon": 86,
   "ac.circle": 95,
   "common.love-test": 21,
   "ac.duel": 99,
   "ac.ball": 92,
   "common.potential-sign": 25,
   "common.lost-purse": 57,
   "ac.secret": 30,
   "common.parent-illness": 32,
   "common.midlife": 40,
   "common.destiny-save": 41,
   "common.trade-offer": 67,
   "common.heir": 44,
   "ac.tower": 46,
   "ac.specialize": 52,
   "common.friend-needs-help": 64,
   "common.old-wound": 98,
   "ac.rival-house": 62,
   "common.child-grows": 93,
   "common.reunion": 83,
   "common.rival-reconcile": 94
  },
  "pending": {
   "eventId": "ac.duel",
   "age": 99
  },
  "scheduled": [],
  "nextSeq": 174,
  "background": {
   "familyName": "Сильверхольм",
   "birthplace": {
    "ru": "обветшалый замок баронства на границе",
    "en": "a shabby baronial castle on the border"
   },
   "omen": {
    "ru": "Звездочёты академии записали в хронику падающую звезду над городом.",
    "en": "The academy's astrologers recorded a falling star over the city."
   },
   "familyHistory": {
    "ru": "Дом герцогов Валлейн стоит рядом с троном уже четыреста лет. Наследника ждут союзы, дуэли и зависть.",
    "en": "The ducal house of Vallein has stood beside the throne for four hundred years. The heir can expect alliances, duels and envy."
   },
   "biography": [
    {
     "ru": "Розалин Сильверхольм родилась: обветшалый замок баронства на границе. Звездочёты академии записали в хронику падающую звезду над городом.",
     "en": "Розалин Сильверхольм was born: a shabby baronial castle on the border. The academy's astrologers recorded a falling star over the city."
    },
    {
     "ru": "Дом герцогов Валлейн стоит рядом с троном уже четыреста лет. Наследника ждут союзы, дуэли и зависть.",
     "en": "The ducal house of Vallein has stood beside the throne for four hundred years. The heir can expect alliances, duels and envy."
    },
    {
     "ru": "Отец — Люсьен Сильверхольм, графиня. Мать — Мариэль Сильверхольм, герцог. Братья и сёстры: Кристоф, Эдмунд, Люсьен.",
     "en": "Father: Люсьен Сильверхольм, countess. Mother: Мариэль Сильверхольм, duke. Siblings: Кристоф, Эдмунд, Люсьен."
    },
    {
     "ru": "С первых дней заметно: болеет редко, раны заживают быстро.",
     "en": "It shows from the first days: rarely ill; wounds heal fast."
    }
   ]
  },
  "hidden": {
   "potential": 6,
   "destiny": 9,
   "dormantTalents": [],
   "familySecret": null,
   "revealed": [
    "destiny"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "father",
    "name": "Люсьен Сильверхольм",
    "gender": "male",
    "bornAt": -38,
    "temperamentId": "ambitious",
    "traitId": "secretive",
    "occupation": {
     "ru": "Графиня",
     "en": "Countess"
    },
    "bio": {
     "ru": "Графиня. О прошлом молчит, даже когда спрашивают. Характер: честолюбивый.",
     "en": "Countess. Stays silent about the past even when asked. Temperament: ambitious."
    },
    "affinity": 37,
    "alive": false,
    "diedAt": 32,
    "metAt": 0,
    "power": 10,
    "skillId": "persuasion",
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mother",
    "name": "Мариэль Сильверхольм",
    "gender": "female",
    "bornAt": -28,
    "temperamentId": "cunning",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Герцог",
     "en": "Duke"
    },
    "bio": {
     "ru": "Герцог. Смех слышно издалека. Характер: хитрый.",
     "en": "Duke. Their laughter carries far. Temperament: cunning."
    },
    "affinity": 81,
    "alive": false,
    "diedAt": 53,
    "metAt": 0,
    "power": 40,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "sibling",
    "name": "Кристоф Сильверхольм",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "cunning",
    "traitId": "proud",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. Не прощает обид и не просит помощи. Характер: хитрый.",
     "en": "Brother. Never forgives a slight and never asks for help. Temperament: cunning."
    },
    "affinity": 35,
    "alive": false,
    "diedAt": 73,
    "metAt": 0,
    "power": 30,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "sibling",
    "name": "Эдмунд Сильверхольм",
    "gender": "male",
    "bornAt": -1,
    "temperamentId": "kind",
    "traitId": "cheerful",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. Смех слышно издалека. Характер: добрый.",
     "en": "Brother. Their laughter carries far. Temperament: kind."
    },
    "affinity": 45,
    "alive": false,
    "diedAt": 77,
    "metAt": 0,
    "power": 44,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "sibling",
    "name": "Люсьен Сильверхольм",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "calm",
    "traitId": "secretive",
    "occupation": {
     "ru": "Брат",
     "en": "Brother"
    },
    "bio": {
     "ru": "Брат. О прошлом молчит, даже когда спрашивают. Характер: спокойный.",
     "en": "Brother. Stays silent about the past even when asked. Temperament: calm."
    },
    "affinity": 20,
    "alive": false,
    "diedAt": 77,
    "metAt": 0,
    "power": 29,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n6",
    "role": "friend",
    "name": "Розалин Сильверхольм",
    "gender": "female",
    "bornAt": -2,
    "temperamentId": "cunning",
    "traitId": "wise",
    "occupation": {
     "ru": "Соседка по общежитию",
     "en": "Dormitory roommate"
    },
    "bio": {
     "ru": "Соседка по общежитию. Говорит мало, но к словам прислушиваются. Характер: хитрый.",
     "en": "Dormitory roommate. Says little, but people listen. Temperament: cunning."
    },
    "affinity": 68,
    "alive": false,
    "diedAt": 70,
    "metAt": 15,
    "power": 42,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n7",
    "role": "spouse",
    "name": "Октавия де Морнкур",
    "gender": "female",
    "bornAt": 2,
    "temperamentId": "cunning",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Таинственный корреспондент",
     "en": "Mysterious correspondent"
    },
    "bio": {
     "ru": "Таинственный корреспондент. Мечтает о большем и ждёт того же от близких. Характер: хитрый.",
     "en": "Mysterious correspondent. Dreams of more and expects the same of those close to them. Temperament: cunning."
    },
    "affinity": 43,
    "alive": false,
    "diedAt": 79,
    "metAt": 18,
    "power": 37,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n8",
    "role": "child",
    "name": "Эдмунд Сильверхольм",
    "gender": "male",
    "bornAt": 44,
    "temperamentId": "brave",
    "traitId": "dreamer",
    "occupation": {
     "ru": "Сын",
     "en": "Son"
    },
    "bio": {
     "ru": "Сын. Живёт наполовину в выдуманных мирах. Характер: отважный.",
     "en": "Son. Lives half in imagined worlds. Temperament: brave."
    },
    "affinity": 58,
    "alive": true,
    "diedAt": null,
    "metAt": 44,
    "power": 4,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n9",
    "role": "mentor",
    "name": "Селестина Лиреваль",
    "gender": "female",
    "bornAt": -15,
    "temperamentId": "ambitious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Архимаг Башни",
     "en": "Tower archmage"
    },
    "bio": {
     "ru": "Архимаг Башни. Кружка за кружкой топит какую-то старую беду. Характер: честолюбивый.",
     "en": "Tower archmage. Drowns some old sorrow mug after mug. Temperament: ambitious."
    },
    "affinity": -4,
    "alive": false,
    "diedAt": 56,
    "metAt": 46,
    "power": 56,
    "skillId": "arcana",
    "interactedAt": null
   },
   {
    "id": "n10",
    "role": "rival",
    "name": "Октавия фон Аштейн",
    "gender": "female",
    "bornAt": 2,
    "temperamentId": "brave",
    "traitId": "ambitious",
    "occupation": {
     "ru": "Гениальная стипендиатка",
     "en": "Brilliant scholarship student"
    },
    "bio": {
     "ru": "Гениальная стипендиатка. Мечтает о большем и ждёт того же от близких. Характер: отважный.",
     "en": "Brilliant scholarship student. Dreams of more and expects the same of those close to them. Temperament: brave."
    },
    "affinity": -14,
    "alive": false,
    "diedAt": 74,
    "metAt": 58,
    "power": 40,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n11",
    "role": "rival",
    "name": "Мариэль де Морнкур",
    "gender": "female",
    "bornAt": -1,
    "temperamentId": "curious",
    "traitId": "secretive",
    "occupation": {
     "ru": "Наследник соперничающего дома",
     "en": "Heir of a rival house"
    },
    "bio": {
     "ru": "Наследник соперничающего дома. О прошлом молчит, даже когда спрашивают. Характер: любопытный.",
     "en": "Heir of a rival house. Stays silent about the past even when asked. Temperament: curious."
    },
    "affinity": -26,
    "alive": false,
    "diedAt": 67,
    "metAt": 65,
    "power": 33,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n12",
    "role": "rival",
    "name": "Мариэль Сильверхольм",
    "gender": "female",
    "bornAt": -1,
    "temperamentId": "cunning",
    "traitId": "secretive",
    "occupation": {
     "ru": "Наследник соперничающего дома",
     "en": "Heir of a rival house"
    },
    "bio": {
     "ru": "Наследник соперничающего дома. О прошлом молчит, даже когда спрашивают. Характер: хитрый.",
     "en": "Heir of a rival house. Stays silent about the past even when asked. Temperament: cunning."
    },
    "affinity": -30,
    "alive": false,
    "diedAt": 80,
    "metAt": 78,
    "power": 44,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n13",
    "role": "friend",
    "name": "Рафаэль де Валлейн",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Младший сын маркиза",
     "en": "Marquis's younger son"
    },
    "bio": {
     "ru": "Младший сын маркиза. Кружка за кружкой топит какую-то старую беду. Характер: честолюбивый.",
     "en": "Marquis's younger son. Drowns some old sorrow mug after mug. Temperament: ambitious."
    },
    "affinity": 35,
    "alive": false,
    "diedAt": 84,
    "metAt": 83,
    "power": 28,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n14",
    "role": "rival",
    "name": "Адриан Лиреваль",
    "gender": "male",
    "bornAt": 2,
    "temperamentId": "cunning",
    "traitId": "secretive",
    "occupation": {
     "ru": "Наследник соперничающего дома",
     "en": "Heir of a rival house"
    },
    "bio": {
     "ru": "Наследник соперничающего дома. О прошлом молчит, даже когда спрашивают. Характер: хитрый.",
     "en": "Heir of a rival house. Stays silent about the past even when asked. Temperament: cunning."
    },
    "affinity": -37,
    "alive": false,
    "diedAt": 95,
    "metAt": 94,
    "power": 40,
    "skillId": null,
    "interactedAt": null
   }
  ],
  "nextNpcId": 15,
  "meters": {
   "court-favor": 100,
   "scandal": 0
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "ac.duel",
   "common.old-wound",
   "ac.circle",
   "common.rival-reconcile"
  ]
 },
 "dark-fantasy-dead": {
  "schemaVersion": 2,
  "seed": "v2-dead-8",
  "rngState": 2082879096,
  "version": 65,
  "character": {
   "name": "Катрис Грейвольд",
   "gender": "female",
   "universeId": "dark-fantasy",
   "raceId": "human",
   "originId": "chapel-orphan",
   "temperamentId": "brave",
   "stats": {
    "strength": 17,
    "intelligence": 11,
    "agility": 9,
    "vitality": 20,
    "wisdom": 12,
    "charisma": 13,
    "luck": 8,
    "willpower": 28
   },
   "resources": {
    "health": 0,
    "energy": 120,
    "mana": 76,
    "stamina": 116
   },
   "level": 3,
   "xp": 83,
   "reputation": 28,
   "karma": 16,
   "wealth": 28,
   "abilities": [
    "mist-sight"
   ],
   "track": {
    "points": 60,
    "rank": 1
   },
   "socialClassId": "outcast",
   "talents": [
    "grave-strength"
   ],
   "weaknesses": [
    "reckless",
    "haunted"
   ],
   "skills": {
    "medicine": 5,
    "lore": 3,
    "survival": 3,
    "oathcraft": 24,
    "melee": 10,
    "hollow-hunting": 10,
    "relic-lore": 10
   },
   "professionId": null,
   "educationId": "df-squire",
   "specializationId": null,
   "factions": {
    "order-of-ash": 35,
    "mist-cult": 30
   }
  },
  "life": {
   "age": 38,
   "stage": "adult",
   "alive": false,
   "deathAge": 38,
   "deathCause": {
    "ru": "Мгла забрала то, что ещё оставалось человеком",
    "en": "The Mist took what was still human"
   }
  },
  "flags": [
   "mentor",
   "in-love",
   "oath-sworn",
   "mist-oath",
   "married",
   "has-child"
  ],
  "occurrences": {
   "common.first-steps": 1,
   "common.fever": 2,
   "common.night-fear": 1,
   "df.chapel-school": 1,
   "common.first-friend": 1,
   "df.plague": 2,
   "common.rival-appears": 1,
   "common.mentor": 1,
   "df.hollow": 3,
   "df.squire": 1,
   "common.lost-purse": 1,
   "common.first-love": 1,
   "df.relic": 1,
   "df.oath": 1,
   "common.love-test": 1,
   "common.talent-awakens": 1,
   "common.secret-surfaces": 1,
   "df.trial": 2,
   "common.heir": 1,
   "df.whisper": 1,
   "common.trade-offer": 1
  },
  "lastSeen": {
   "common.first-steps": 1,
   "common.fever": 33,
   "common.night-fear": 5,
   "df.chapel-school": 6,
   "common.first-friend": 7,
   "df.plague": 23,
   "common.rival-appears": 11,
   "common.mentor": 13,
   "df.hollow": 36,
   "df.squire": 17,
   "common.lost-purse": 18,
   "common.first-love": 19,
   "df.relic": 20,
   "df.oath": 21,
   "common.love-test": 22,
   "common.talent-awakens": 24,
   "common.secret-surfaces": 27,
   "df.trial": 34,
   "common.heir": 31,
   "df.whisper": 32,
   "common.trade-offer": 35
  },
  "pending": null,
  "scheduled": [],
  "nextSeq": 70,
  "background": {
   "familyName": "Грейвольд",
   "birthplace": {
    "ru": "башня павшего дома на краю болот",
    "en": "a fallen house's tower at the edge of the marsh"
   },
   "omen": {
    "ru": "Вороны кружили над крышей до рассвета.",
    "en": "Ravens circled the roof until dawn."
   },
   "familyHistory": {
    "ru": "Младенца оставили на ступенях часовни в ночь Пепельной службы. Сёстры назвали его по святому того дня.",
    "en": "The infant was left on the chapel steps on the night of the Ash Mass. The sisters named the child after that day's saint."
   },
   "biography": [
    {
     "ru": "Катрис Грейвольд родилась: башня павшего дома на краю болот. Вороны кружили над крышей до рассвета.",
     "en": "Катрис Грейвольд was born: a fallen house's tower at the edge of the marsh. Ravens circled the roof until dawn."
    },
    {
     "ru": "Младенца оставили на ступенях часовни в ночь Пепельной службы. Сёстры назвали его по святому того дня.",
     "en": "The infant was left on the chapel steps on the night of the Ash Mass. The sisters named the child after that day's saint."
    },
    {
     "ru": "Родителей никто не знает: ребёнка нашли у чужого порога.",
     "en": "No one knows the parents: the child was found on a stranger's doorstep."
    },
    {
     "ru": "Под очагом семья хранит что-то, что нельзя продавать даже в голод.",
     "en": "Under the hearth the family keeps something that must not be sold even in famine."
    },
    {
     "ru": "Старая повитуха долго смотрит на ребёнка и говорит, что в нём спит что-то большее.",
     "en": "The old midwife studies the child for a long time and says something greater sleeps within."
    }
   ]
  },
  "hidden": {
   "potential": 7,
   "destiny": 2,
   "dormantTalents": [
    "silver-tongue"
   ],
   "familySecret": "df-buried-relic",
   "revealed": [
    "familySecret"
   ]
  },
  "npcs": [
   {
    "id": "n1",
    "role": "friend",
    "name": "Тисса Вранов",
    "gender": "female",
    "bornAt": -2,
    "temperamentId": "brave",
    "traitId": "drinker",
    "occupation": {
     "ru": "Подкидыш из приюта",
     "en": "Foundling from the shelter"
    },
    "bio": {
     "ru": "Подкидыш из приюта. Кружка за кружкой топит какую-то старую беду. Характер: отважный.",
     "en": "Foundling from the shelter. Drowns some old sorrow mug after mug. Temperament: brave."
    },
    "affinity": 20,
    "alive": true,
    "diedAt": null,
    "metAt": 11,
    "power": 33,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n2",
    "role": "mentor",
    "name": "Брандт Пепельный",
    "gender": "male",
    "bornAt": -22,
    "temperamentId": "ambitious",
    "traitId": "drinker",
    "occupation": {
     "ru": "Седой рыцарь Ордена",
     "en": "Grey knight of the Order"
    },
    "bio": {
     "ru": "Седой рыцарь Ордена. Кружка за кружкой топит какую-то старую беду. Характер: честолюбивый.",
     "en": "Grey knight of the Order. Drowns some old sorrow mug after mug. Temperament: ambitious."
    },
    "affinity": 10,
    "alive": true,
    "diedAt": null,
    "metAt": 17,
    "power": 73,
    "skillId": "oathcraft",
    "interactedAt": null
   },
   {
    "id": "n3",
    "role": "spouse",
    "name": "Ульрен Морнхейм",
    "gender": "male",
    "bornAt": 0,
    "temperamentId": "ambitious",
    "traitId": "hot-tempered",
    "occupation": {
     "ru": "Знакомый по работе",
     "en": "A colleague"
    },
    "bio": {
     "ru": "Знакомый по работе. Гнев вспыхивает быстро и быстро гаснет. Характер: честолюбивый.",
     "en": "A colleague. Anger flares fast and fades fast. Temperament: ambitious."
    },
    "affinity": 47,
    "alive": true,
    "diedAt": null,
    "metAt": 19,
    "power": 41,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n4",
    "role": "friend",
    "name": "Морра Морнхейм",
    "gender": "female",
    "bornAt": 0,
    "temperamentId": "curious",
    "traitId": "secretive",
    "occupation": {
     "ru": "Дочь фонарщика",
     "en": "Lamplighter's daughter"
    },
    "bio": {
     "ru": "Дочь фонарщика. О прошлом молчит, даже когда спрашивают. Характер: любопытный.",
     "en": "Lamplighter's daughter. Stays silent about the past even when asked. Temperament: curious."
    },
    "affinity": 37,
    "alive": true,
    "diedAt": null,
    "metAt": 26,
    "power": 24,
    "skillId": null,
    "interactedAt": null
   },
   {
    "id": "n5",
    "role": "child",
    "name": "Мейрон Грейвольд",
    "gender": "male",
    "bornAt": 31,
    "temperamentId": "kind",
    "traitId": "stern",
    "occupation": {
     "ru": "Сын",
     "en": "Son"
    },
    "bio": {
     "ru": "Сын. Хвалит редко, требует много. Характер: добрый.",
     "en": "Son. Praises rarely and demands much. Temperament: kind."
    },
    "affinity": 45,
    "alive": true,
    "diedAt": null,
    "metAt": 31,
    "power": 4,
    "skillId": null,
    "interactedAt": null
   }
  ],
  "nextNpcId": 6,
  "meters": {
   "corruption": 94,
   "ember": 15
  },
  "consequences": [],
  "quest": null,
  "questsDone": [],
  "recentEvents": [
   "df.hollow",
   "common.trade-offer",
   "df.trial",
   "common.fever"
  ]
 }
};
