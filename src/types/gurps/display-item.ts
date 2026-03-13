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

export type { ISortableItem, BaseDisplayItem, DisplayTrait }
