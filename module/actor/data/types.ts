/**
 * Central export for the CharacterSchema type.
 *
 * This re-exports the `CharacterSchema` type defined in `character.ts` so other
 * modules can import it without pulling in runtime code, e.g.:
 *   import type { CharacterSchema } from 'module/actor/data/character-schema.js'
 */

import { TraitModel } from 'module/item/data/trait.js'
import DataModel = foundry.abstract.DataModel
import { GurpsActorV2 } from '../gurps-actor.js'

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
  itemid: string
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
  fea: {}
  actions: []
  reactions: []
  conditionalModifiers: []
}

function fromTraitV2(traitV2: Item.OfType<'featureV2'>): TraitV1 {
  const model = traitV2.system
  const result = {
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
    itemid: traitV2.id ?? '',
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
    fea: {
      cr: model.fea.cr,
      level: model.fea.level,
      userdesc: model.fea.userdesc,
      points: model.fea.points,
      notes: model.fea.notes,
      pageref: model.fea.pageref,
    },
    actions: [],
    reactions: model.reactions,
    conditionalModifiers: model.conditionalmods,
  }

  if (model.fea.cr)
    result.notes = `[${game.i18n?.localize('GURPS.CR' + model.fea.cr)}: ${result.name}]<br>` + result.notes

  if (result.level) result.name = `${result.name} ${result.level}`

  // @ts-expect-error
  return result
}

async function fromTraitV1<SubType extends Actor.SubType>(value: TraitV1, actor: GurpsActorV2<SubType>) {
  const name = value.originalName
  const system: DataModel.CreateData<DataModel.SchemaOf<TraitModel>> = {
    isContainer: value.contains && Object.keys(value.contains).length > 0,
    itemModifiers: value.itemModifiers ?? [],
    // actions: getActions...
    reactions: value.reactions,
    conditionalmods: value.conditionalModifiers,
    fea: value.fea ?? {},
  }

  const item: Item.CreateData = {
    _id: foundry.utils.randomID(),
    type: 'featureV2',
    name,
    system: {
      ...system,
    },
  }

  // Create the item and store it on the character.
  const newItem = await Item.create(item, { parent: actor })
  console.log(`Created new featureV2 Item for legacy ad:`, { item, newItem })
}

export type { CharacterSchema } from './character.js'
export type { TraitV1 }
export { fromTraitV2, fromTraitV1 }
