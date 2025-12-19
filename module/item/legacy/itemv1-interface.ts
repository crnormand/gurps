interface Equipment {
  eqt: {
    name: string
    notes: string
    pageref: string
    count: number
    weight: number
    cost: number
    location: string
    carried: boolean
    equipped: boolean
    techlevel: string
    categories: string
    legalityclass: string
    costsum: number
    weightsum: number
    uses: string
    maxuses: string
    parentuuid: string
    uuid: string
    contains: {}
    originalName: string
    originalCount: string
    ignoreImportQty: boolean
  }
  melee: {}
  ranged: {}
  ads: {}
  skills: {}
  spells: {}
  bonuses: string
  itemModifiers: string
  equipped: boolean
  carried: boolean
  globalid: string
  importid: string
  importFrom: string
  fromItem: string
  addToQuickRoll: boolean
  modifierTags: string
}

interface Feature {
  fea: {
    notes: ''
    pageref: ''
    contains: {}
    uuid: ''
    parentuuid: ''
    points: 0
    userdesc: ''
    note: ''
    name: ''
    originalName: ''
  }
  melee: {}
  ranged: {}
  ads: {}
  skills: {}
  spells: {}
  bonuses: string
  itemModifiers: string
  globalid: string
  importid: string
  importFrom: string
  fromItem: string
  checkotf: string
  duringotf: string
  passotf: string
  failotf: string
  addToQuickRoll: boolean
  modifierTags: string
}

interface Skill {
  ski: {
    name: string
    notes: string
    pageref: string
    contains: {}
    uuid: string
    parentuuid: string
    points: number
    import: string
    level: number
    type: string
    relativelevel: number
    otf: string
    checkotf: string
    duringotf: string
    passotf: string
    failotf: string
    originalName: string
    consumeAction: boolean
  }
  melee: {}
  ranged: {}
  ads: {}
  skills: {}
  spells: {}
  bonuses: string
  itemModifiers: string
  globalid: string
  importid: string
  importFrom: string
  fromItem: string
  addToQuickRoll: boolean
  modifierTags: string
}

interface Spell {
  spl: {
    name: string
    notes: string
    pageref: string
    contains: {}
    uuid: string
    parentuuid: string
    points: number
    import: string
    level: number
    class: string
    college: string
    cost: string
    maintain: string
    duration: string
    resist: string
    casttime: string
    difficulty: string
    relativelevel: number
    otf: string
    checkotf: string
    duringotf: string
    passotf: string
    failotf: string
    originalName: string
    consumeAction: boolean
  }
  melee: {}
  ranged: {}
  ads: {}
  skills: {}
  spells: {}
  bonuses: string
  itemModifiers: string
  globalid: string
  importid: string
  importFrom: string
  fromItem: string
  addToQuickRoll: boolean
  modifierTags: string
}

interface MeleeAtk {
  mel: {
    name: string
    notes: string
    pageref: string
    contains: {}
    uuid: string
    parentuuid: string
    import: string
    damage: string
    st: string
    mode: string
    level: number
    weight: string
    techlevel: number
    cost: string
    reach: string
    parry: string
    baseParryPenalty: number
    block: string
    otf: string
    checkotf: string
    duringotf: string
    passotf: string
    failotf: string
    originalName: string
    modifierTags: string
    extraAttacks: number
    consumeAction: boolean
  }
}

interface RangedAtk {
  rng: {
    name: string
    notes: string
    pageref: string
    contains: {}
    uuid: string
    parentuuid: string
    import: string
    damage: string
    st: string
    mode: string
    level: number
    bulk: string
    legalityclass: string
    ammo: string
    acc: string
    range: string
    rof: string
    shots: string
    rcl: string
    halfd: string
    max: string
    otf: string
    checkotf: string
    duringotf: string
    passotf: string
    failotf: string
    originalName: string
    modifierTags: string
    extraAttacks: number
    consumeAction: boolean
  }
}

interface ItemV1Interface {
  hasAttacks: boolean
  actorComponentKey: string
  itemSysKey: string
  getItemAttacksV1(options: { attackType: 'melee' | 'ranged' | 'both'; checkOnly?: boolean }): any[]
  getItemInfo(): Record<string, any>
}

type ItemTypeMap = {
  equipment: Equipment
  feature: Feature
  skill: Skill
  spell: Spell
}

type ItemV1Model<SubType extends Item.SubType> = SubType extends keyof ItemTypeMap ? ItemTypeMap[SubType] : never

export {
  type ItemV1Interface,
  type ItemV1Model,
  type Equipment,
  type Feature,
  type Skill,
  type Spell,
  type MeleeAtk,
  type RangedAtk,
}
