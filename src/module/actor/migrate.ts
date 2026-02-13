import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'
import { Equipment, Feature, Skill, Spell } from '@module/item/legacy/itemv1-interface.js'
import { getNewItemType, migrateItemSystem } from '@module/item/migrate.js'
import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'

import { Melee, Ranged, Note } from './actor-components.js'
import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import { MoveModeV2 } from './data/move-mode.js'
import { NoteV2 } from './data/note.js'
import { ActorV1Model } from './legacy/actorv1-interface.js'

async function migrateActor(actor: Actor.Implementation): Promise<Actor.OfType<'characterV2'> | void> {
  if (!game.i18n) {
    console.error('GURPS | Cannot migrate actor because game.i18n is not initialized.')

    return
  }

  if (!actor.isOfType('character')) {
    console.error(
      'Attempted to migrate actor that is not of type character. Actor name:',
      actor.name,
      'Actor type:',
      actor.type
    )

    return
  }

  const items: Item.CreateData[] = []

  const system = actor.system as ActorV1Model

  actor.items.forEach(item => {
    if (!item.isOfType('equipment', 'feature', 'skill', 'spell')) return

    const parentId = getItemParentId(actor, item)
    const type = getNewItemType(item.type)

    const system = migrateItemSystem(item.type, item.system as any, parentId)

    items.push({
      _id: item._id,
      type,
      name: item.name,
      system,
    })
  })

  // ActorV1 has no concept of Reaction and Conditional Modifier ownership by items,
  // so reactions and conditional modifiers are moved to a single placeholder item.
  const migrationItem: Item.CreateData<'featureV2'> = {
    type: 'featureV2',
    name: game.i18n?.localize('GURPS.migration.migrationItem.name'),
    system: {
      containedBy: null,
      fea: {
        name: game.i18n?.localize('GURPS.migration.migrationItem.name'),
        notes: game.i18n?.localize('GURPS.migration.migrationItem.notes'),
        points: 0,
      },
      reactions: Object.values(system.reactions).map(reaction => {
        return {
          modifier: Number(reaction.modifier),
          situation: reaction.situation,
          modifierTags: reaction.modifierTags,
        }
      }),
      conditionalmods: Object.values(system.conditionalmods).map(mod => {
        return {
          modifier: Number(mod.modifier),
          situation: mod.situation,
          modifierTags: mod.modifierTags,
        }
      }),
      actions: {},
    },
  }

  Object.values(system.melee).forEach((weapon: Melee) => {
    const id = foundry.utils.randomID()

    const data: DataModel.CreateData<DataModel.SchemaOf<MeleeAttackModel>> = {
      _id: id,
      name: weapon.name,
      type: 'meleeAttack',
      mel: {
        name: weapon.name,
        import: Number(weapon.import),
        damage: weapon.damage,
        st: weapon.st,
        mode: weapon.mode,
        notes: weapon.notes,
        weight: weapon.weight,
        techlevel: weapon.techlevel,
        cost: weapon.cost,
        reach: weapon.reach,
        parry: weapon.parry,
        parrybonus: 0,
        baseParryPenalty: weapon.baseParryPenalty,
        block: weapon.block,
        blockbonus: 0,
        otf: '',
        itemModifiers: '',
        modifierTags: weapon.modifierTags,
        extraAttacks: weapon.extraAttacks,
        consumeAction: weapon.consumeAction,
      },
    }

    migrationItem.system!.actions![id] = data
  })

  Object.values(system.ranged).forEach((weapon: Ranged) => {
    const id = foundry.utils.randomID()

    const data: DataModel.CreateData<DataModel.SchemaOf<RangedAttackModel>> = {
      _id: id,
      name: weapon.name,
      type: 'rangedAttack',
      rng: {
        name: weapon.name,
        import: Number(weapon.import),
        damage: weapon.damage,
        st: weapon.st,
        mode: weapon.mode,
        notes: weapon.notes,
        bulk: weapon.bulk,
        legalityclass: weapon.legalityclass,
        ammo: weapon.ammo,
        acc: weapon.acc,
        range: weapon.range,
        shots: weapon.shots,
        rcl: weapon.rcl,
        halfd: weapon.halfd,
        max: weapon.max,
        otf: '',
        itemModifiers: '',
        modifierTags: weapon.modifierTags,
        extraAttacks: weapon.extraAttacks,
        consumeAction: weapon.consumeAction,
        rate_of_fire: weapon.rof,
      },
    }

    migrationItem.system!.actions![id] = data
  })

  items.push(migrationItem)

  const createData: Actor.CreateData<'characterV2'> = {
    type: 'characterV2',
    img: actor.img,
    name: 'Migrated: ' + actor.name,
    system: migrateActorSystem(actor.system),
    items,
  }

  // const newActor = (await actor.update(createData, { recursive: false })) as unknown as Actor.OfType<'characterV2'>
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
    // NOTE: dodge for characterV1 is a derived (though persistent) property, and the reported value
    // may be adversly affected by things like encumbrance. Here, we grab the first entry in encumbrance
    // to get our best estimate (should be accurate 99% of the time) for the base dodge value.
    dodge: { value: Object.values(oldData.encumbrance)[0]?.dodge ?? 0 },
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
      tracker: {},
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

    totalpoints: oldData.totalpoints,

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

    hitlocationsV2: {},

    moveV2: {},

    // TODO: Change note into an Item or something, really shouldn't have this vestigial
    // non-Foundry items Array present
    allNotes: {},
  }

  // Check for missing fields or other bad info
  if (!newData.traits?.sizemod || isNaN(newData.traits.sizemod)) {
    // Should never happen but better than a non-null assertion.
    newData.traits ||= {}
    newData.traits.sizemod = 0
  }

  // Migrate hit locations
  Object.values(oldData.hitlocations).forEach(hitlocation => {
    const id = foundry.utils.randomID()

    const location: DataModel.CreateData<DataModel.SchemaOf<HitLocationEntryV2>> = { ...hitlocation, _id: id }

    newData.hitlocationsV2 ||= {}
    newData.hitlocationsV2[id] = location
  })

  // Migrate notes
  const addNote = (data: Note, parentId: string | null) => {
    const id = foundry.utils.randomID()

    const note: DataModel.CreateData<DataModel.SchemaOf<NoteV2>> = {
      ...data,
      text: data.notes,
      containedBy: parentId,
      markdown: data.notes,
      _id: id,
    }

    newData.allNotes![id] = note

    for (const child of Object.values(data.contains) as Note[]) {
      addNote(child, id)
    }
  }

  Object.values(oldData.notes).forEach(note => addNote(note, null))

  // Migrate move modes
  Object.values(oldData.move).forEach(data => {
    const id = foundry.utils.randomID()

    const move: DataModel.CreateData<DataModel.SchemaOf<MoveModeV2>> = {
      _id: id,
      mode: data.mode,
      basic: Number(data.basic),
      enhanced: data.enhanced ? Number(data.enhanced) : null,
      default: data.default,
    }

    newData.moveV2 ||= {}
    newData.moveV2[id] = move
  })

  // Migrate resource trackers

  Object.values(oldData.additionalresources.tracker).forEach(data => {
    const id = foundry.utils.randomID()

    const tracker: DataModel.CreateData<DataModel.SchemaOf<TrackerInstance>> = {
      ...data,
      _id: id,
    }

    newData.additionalresources ||= {}
    newData.additionalresources.tracker ||= {}
    newData.additionalresources.tracker[id] = tracker
  })

  return newData
}

export { migrateActor }
