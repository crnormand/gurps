import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { Equipment, Feature, Skill, Spell } from '@module/item/legacy/itemv1-interface.js'
import { getNewItemType, migrateItemSystem } from '@module/item/migrate.js'

import { ActorV1Model } from './legacy/actorv1-interface.js'

async function migrateActor(actor: Actor.OfType<'character'>): Promise<Actor.OfType<'characterV2'>> {
  const items: Item.CreateData[] = []

  actor.items.forEach(item => {
    if (!item.isOfType('equipment', 'feature', 'skill', 'spell')) return

    const parentId = getItemParentId(actor, item)
    const type = getNewItemType(item.type)

    console.log(item.name, item.type, parentId)

    const system = migrateItemSystem(item.type, item.system as any, parentId)

    items.push({
      _id: item._id,
      type,
      name: item.name,
      system,
    })
  })

  const createData: Actor.CreateData<'characterV2'> = {
    type: 'characterV2',
    name: actor.name,
    system: migrateActorSystem(actor.system),
    items,
  }

  const newActor = Actor.create(createData) as unknown as Actor.OfType<'characterV2'>

  return newActor
}

/* ---------------------------------------- */

function getItemParentId(
  actor: Actor.OfType<'character'>,
  item: Item.OfType<'equipment' | 'feature' | 'skill' | 'spell'>
): string | null {
  let oldParentId: string | null = null

  if (item.isOfType('equipment')) oldParentId = (item.system as Equipment).eqt.parentuuid
  else if (item.isOfType('feature')) oldParentId = (item.system as Feature).fea.parentuuid
  else if (item.isOfType('skill')) oldParentId = (item.system as Skill).ski.parentuuid
  else if (item.isOfType('spell')) oldParentId = (item.system as Spell).spl.parentuuid

  console.log('Old parent ID for item', item.name, ':', oldParentId)

  if (oldParentId === null) return null

  const newParent = actor.items.find(parent => (parent.system as any).importid === oldParentId)

  return newParent?._id || null
}

/* ---------------------------------------- */

function migrateActorSystem(
  oldData: ActorV1Model
): fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>> {
  const newData: fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>> = {
    attributes: oldData.attributes,
    HP: oldData.HP,
    FP: oldData.FP,
    QP: oldData.QP,
    dodge: oldData.dodge,
    basicmove: {
      value: Number(oldData.basicmove.value),
      points: oldData.basicmove.points,
    },
    basicspeed: {
      value: Number(oldData.basicspeed.value),
      points: oldData.basicspeed.points,
    },
    frightcheck: oldData.frightcheck,
    hearing: oldData.hearing,
    tastesmell: oldData.tastesmell,
    vision: oldData.vision,
    touch: oldData.touch,

    thrust: oldData.thrust,
    swing: oldData.swing,

    additionalresources: {
      qnotes: oldData.additionalresources?.qnotes,
      bodyplan: oldData.additionalresources?.bodyplan,
      // NOTE: Ideally tracker would be a TypedObjectField
      // instead of an ArrayField so we can updated trackers without
      // replacing the whole array.
      // TODO: Discuss and consider.
      tracker: Object.values(oldData.additionalresources?.tracker),
      importname: oldData.additionalresources?.importname,
      importpath: oldData.additionalresources?.importpath,
    },

    conditionalinjury: {
      RT: {
        value: Number(oldData.conditionalinjury.RT.value),
        points: oldData.conditionalinjury.RT.points,
      },
      injury: {
        severity: oldData.conditionalinjury.injury.severity,
        daystoheal: oldData.conditionalinjury.injury.daystoheal,
      },
    },

    traits: {
      title: oldData.traits.title,
      race: oldData.traits.race,
      height: oldData.traits.height,
      weight: oldData.traits.weight,
      age: oldData.traits.age,
      birthday: oldData.traits.birthday,
      religion: oldData.traits.religion,
      gender: oldData.traits.gender,
      eyes: oldData.traits.eyes,
      hair: oldData.traits.hair,
      hand: oldData.traits.hand,
      skin: oldData.traits.skin,
      sizemod: Number(oldData.traits.sizemod),
      techlevel: oldData.traits.techlevel,
      createdon: oldData.traits.createdon,
      modifiedon: oldData.traits.modifiedon,
      player: oldData.traits.player,
    },

    conditions: {
      actions: {
        maxActions: oldData.conditions.actions?.maxActions,
        maxBlocks: oldData.conditions.actions?.maxBlocks,
      },
      posture: oldData.conditions.posture,
      maneuver: oldData.conditions.maneuver,
      // TODO: Check why this is number | string
      move: String(oldData.conditions.move),
      self: {
        modifiers: [],
      },
      target: {
        modifiers: [],
      },
      usermods: [],

      reeling: oldData.conditions.reeling,
      exhausted: oldData.conditions.exhausted,

      damageAccumulators: [],
    },

    // TODO: Change note into an Item or something, really shouldn't have this vestigial
    // non-Foundry items Array present
    allNotes: [],
  }

  // Check for missing fields or other bad info
  if (!newData.traits?.sizemod || isNaN(newData.traits.sizemod)) {
    // Should never happen but better than a non-null assertion.
    newData.traits ||= {}
    newData.traits.sizemod = 0
  }

  // NOTE: Again, this should be a TypedObjectField instead of an ArrayField.
  // Potentially a candidate for PseudoDocument collection.
  // TODO: Discuss with the team.
  newData.hitlocationsV2 = []

  newData.moveV2 = []

  return newData
}

export { migrateActor }
