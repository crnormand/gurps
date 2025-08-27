/**
 * Central export for the CharacterSchema type.
 *
 * This re-exports the `CharacterSchema` type defined in `character.ts` so other
 * modules can import it without pulling in runtime code, e.g.:
 *   import type { CharacterSchema } from 'module/actor/data/character-schema.js'
 */

interface TraitV1 {
  addToQuickRoll: boolean
  contains: {}
  cr: number | null
  fromItem: string | null
  itemInfo: {
    id: string
    img: string
    name: string
  }
  itemModifiers: string
  itemId: string
  level: number | null
  modifierTags: string
  name: string
  notes: string
  originalName: string
  pageref: string
  parentuuid: string | null
  points: number
  save: boolean
  uuid: string
}

function fromTraitV2(traitV2: Item.OfType<'featureV2'>): TraitV1 {
  const model = traitV2.system
  return {
    addToQuickRoll: model.addToQuickRoll,
    contains: {},
    cr: model.fea.cr,
    fromItem: null,
    itemInfo: {
      id: traitV2.id ?? '',
      img: traitV2.img ?? '',
      name: traitV2.name,
    },
    itemModifiers: model.itemModifiers,
    itemId: traitV2.id ?? '',
    level: model.fea.level,
    modifierTags: '',
    name: traitV2.name,
    notes: model.fea.notes,
    originalName: traitV2.name,
    pageref: model.fea.pageref,
    parentuuid: null,
    points: model.fea.points,
    save: false,
    uuid: traitV2.uuid ?? '',
  }
}

export type { CharacterSchema } from './character.js'
export type { TraitV1 }
export { fromTraitV2 }
