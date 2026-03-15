import type { WeightUnit } from '@module/data/common/weight.js'

interface ISortableItem {
  sortKeys: Record<string, string>
}

/* ---------------------------------------- */

interface BaseDisplayItem {
  /** The ID of this item */
  id: string
  /** The list of child items contained within this item, if any */
  children: BaseDisplayItem[]
  /** Does this item have any children? */
  hasChildren: boolean
  /** Is this item (if it is a container) currently un-collapsed? */
  childrenOpen: boolean
  /** The simple name of this item, without level or any other modifiers which may change the name */
  name: string
  /** The name of this item, with any modifiers which may change the name */
  fullName: string
  /** The plaintext notes for this item, without any markup */
  notes: string
  /** Does this item have any notes? */
  hasNotes: boolean
  /** If this item contains notes, are the notes currently un-collapsed? */
  notesOpen: boolean
  /** What is the indentation level of this item, for display purposes? */
  indent: number
}

/* ---------------------------------------- */

interface DisplayTrait extends BaseDisplayItem {
  /** The level of this trait, if any */
  level: number | null
  /** The number of points this trait is worth */
  points: number
  /** The Control Roll value for this trait, if any */
  cr: string | null
  /** Is this trait enabled? */
  enabled: boolean
  /** The OTF's associated with this trait */
  otf: {
    cr: string
  }
}

/* ---------------------------------------- */

interface DisplaySkill extends BaseDisplayItem {
  /** The level of this skill */
  level: number
  /** The relative level of this skill compared to its base attribute, if any */
  relativeLevel: string
  /** The number of points this skill is worth */
  points: number
  /** The tech level of this skill, if any */
  techLevel: string | null
  /** The specialization of this skill, if any */
  specialization: string | null
  /** The OTF's associated with this skill */
  otf: {
    level: string
    relativeLevel: string
  }
}

/* ---------------------------------------- */

interface DisplaySpell extends BaseDisplayItem {
  /** The level of this spell */
  level: number
  /** The relative level of this spell compared to its base attribute, if any */
  relativeLevel: string
  /** The number of points this spell is worth */
  points: number
  /** The class of this spell */
  spellClass: string
  /** The colleges this spell belongs to, if any */
  colleges: string[]
  /** The casting cost of this spell */
  castingCost: string
  /** The maintenance cost of this spell */
  maintenanceCost: string
  /** The duration of this spell */
  duration: string
  /** The resistance roll for this spell, if any */
  resist: string
  /** The casting time for this spell */
  castingTime: string
  /** The tech level of this skill, if any */
  techLevel: string | null
  /** The OTF's associated with this spell */
  otf: {
    level: string
    relativeLevel: string
  }
}

/* ---------------------------------------- */

interface DisplayEquipment extends BaseDisplayItem {
  /** Is this item equipped? */
  equipped: boolean
  /** Is this item carried? */
  carried: boolean
  /** The quantity of this equipment */
  quantity: number
  /** The tech level of this equipment, if any */
  techLevel: string | null
  /** The legality class of this equipment, if any */
  legalityClass: string | null
  /** The monetary value of this item */
  value: number
  /** The extended value of this item, including child items */
  extendedValue: number
  /** The weight of this item, separated into a value and unit */
  weight: {
    value: number
    unit: WeightUnit
  }
  /** The extended weight of this item, including child items */
  extendedWeight: {
    value: number
    unit: WeightUnit
  }
}

/* ---------------------------------------- */

interface BaseDisplayAttack {
  /** The ID of this action */
  id: string
  /** The simple name of this attack, without level or any other modifiers which may change the name */
  name: string
  /** The name of this attack, with any modifiers which may change the name */
  fullName: string
  /** The plaintext notes for this item, without any markup */
  notes: string
  /** Does this item have any notes? */
  hasNotes: boolean
  /** If this item contains notes, are the notes currently un-collapsed? */
  notesOpen: boolean
  /** The level of this attack */
  level: number
  /** The damage roll of this attack */
  damage: string
  /** The minimum ST required to effectively use this attack, if any */
  st: string
  /** The usage name of this attack, e.g. "Swing", "Bash", "Slug" */
  usage: string
}

/* ---------------------------------------- */

interface DisplayMeleeAttack extends BaseDisplayAttack {
  /** The reach of this attack, e.g. "C", "C,1", "1,2", etc. */
  reach: string
  /** The parry value of this attack, e.g. "3", "3F",  etc. */
  parry: string
  /** The block value of this attack, e.g. "3",  etc. */
  block: string
  /** The OTF's associated with this attack */
  otf: {
    level: string
    damage: string
    parry: string | null
    block: string | null
  }
}

/* ---------------------------------------- */

interface DisplayRangedAttack extends BaseDisplayAttack {
  /** The accuracy of this attack */
  acc: string
  /** The bulk modifier for this attack */
  bulk: string
  /** The range of this attack, including half-damage range, maximum range, and minimum range */
  range: string
  /** The half-damage range of this attack */
  halfDamageRange: string
  /** The maximum range of this attack */
  maxRange: string
  /** The minimum range of this attack */
  minRange: string
  /** The number of shots this attack can make before reloading */
  shots: string
  /** The recoil of this attack */
  recoil: string
  /** The rate of fire for this attack*/
  rof: string
  /** The OTF's associated with this attack */
  otf: {
    level: string
    damage: string
  }
}

/* ---------------------------------------- */

export type {
  BaseDisplayAttack,
  BaseDisplayItem,
  DisplayEquipment,
  DisplayMeleeAttack,
  DisplayRangedAttack,
  DisplaySkill,
  DisplaySpell,
  DisplayTrait,
  ISortableItem,
}
