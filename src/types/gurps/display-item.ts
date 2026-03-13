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
  cr: number | null
  /** The Control Roll OTF contents for this trait, if any */
  crOTF: string
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
}

/* ---------------------------------------- */

export type { BaseDisplayItem, DisplaySkill, DisplayTrait, ISortableItem, DisplaySpell }
