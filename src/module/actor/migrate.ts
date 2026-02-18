import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'
import { getMigratedItemData } from '@module/item/migrate.js'
import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'

import { Melee, Ranged, Note } from './actor-components.js'
import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import { MoveModeV2 } from './data/move-mode.js'
import { NoteV2 } from './data/note.js'
import { ActorV1Model } from './legacy/actorv1-interface.js'

async function runMigration() {
  const migrationVersion = game.settings!.get(GURPS.SYSTEM_NAME, 'migration-version')

  if (foundry.utils.isNewerVersion('1.0.0', migrationVersion)) {
    const warning = ui.notifications!.warn('GURPS.actor.migration.progressMessage', {
      format: { version: '1.0.0' },
      progress: true,
    })

    console.log('Migrating world actors')
    const actors = game.actors!.filter(actor => actor.isOfType('character', 'enemy'))

    if (actors.length > 0) {
      const updateStep = 1 / actors.length
      let updateProgress = 0

      for (const actor of actors) {
        await migrateActor(actor)
        updateProgress += updateStep
        warning.update({ pct: updateProgress })
      }
    }

    ui.notifications!.remove(warning)
    ui.notifications!.success('GURPS.actor.migration.successMessage', {
      format: { version: '1.0.0' },
      permanent: true,
    })
  }
}

/* ---------------------------------------- */

async function migrateActor(actor: Actor.Implementation): Promise<Actor.OfType<'characterV2'> | void> {
  if (!game.i18n) {
    console.error('GURPS | Cannot migrate actor because game.i18n is not initialized.')

    return
  }

  if (!actor.isOfType('character', 'enemy')) {
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
  const traits = system.ads ? flattenItemList(system.ads, null) : []
  const skills = system.skills ? flattenItemList(system.skills, null) : []
  const spells = system.spells ? flattenItemList(system.spells, null) : []
  const carriedEquipment =
    system.equipment && system.equipment.carried ? flattenItemList(system.equipment.carried, null) : []
  const otherEquipment = system.equipment && system.equipment.other ? flattenItemList(system.equipment.other, null) : []

  traits.forEach(trait => {
    const newTrait = getMigratedItemData(
      { _id: trait._id, type: 'feature', name: trait.name, system: { fea: trait } } as unknown as Item.Implementation,
      trait._parentId
    )

    items.push(newTrait as Item.CreateData)
  })

  skills.forEach(skill => {
    const newSkill = getMigratedItemData(
      { _id: skill._id, type: 'skill', name: skill.name, system: { ski: skill } } as unknown as Item.Implementation,
      skill._parentId
    )

    items.push(newSkill as Item.CreateData)
  })

  spells.forEach(spell => {
    const newSpell = getMigratedItemData(
      { _id: spell._id, type: 'spell', name: spell.name, system: { spl: spell } } as unknown as Item.Implementation,
      spell._parentId
    )

    items.push(newSpell as Item.CreateData)
  })

  carriedEquipment.forEach(equipment => {
    const newEquipment = getMigratedItemData(
      {
        _id: equipment._id,
        type: 'equipment',
        name: equipment.name,
        system: { eqt: equipment },
      } as unknown as Item.Implementation,
      equipment._parentId
    )

    items.push(newEquipment as Item.CreateData)
  })

  otherEquipment.forEach(equipment => {
    const newEquipment = getMigratedItemData(
      {
        _id: equipment._id,
        type: 'equipment',
        name: equipment.name,
        system: { eqt: equipment },
      } as unknown as Item.Implementation,
      equipment._parentId
    )

    items.push(newEquipment as Item.CreateData)
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

    const damage = typeof weapon.damage === 'string' ? [weapon.damage] : weapon.damage

    const data: DataModel.CreateData<DataModel.SchemaOf<MeleeAttackModel>> = {
      _id: id,
      name: weapon.name,
      type: 'meleeAttack',
      mel: {
        name: weapon.name,
        import: Number(weapon.import),
        damage,
        st: weapon.st,
        mode: weapon.mode,
        notes: weapon.notes,
        weight: parseInt(weapon.weight) || 0,
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

    const damage = typeof weapon.damage === 'string' ? [weapon.damage] : weapon.damage

    const data: DataModel.CreateData<DataModel.SchemaOf<RangedAttackModel>> = {
      _id: id,
      name: weapon.name,
      type: 'rangedAttack',
      rng: {
        name: weapon.name,
        import: Number(weapon.import),
        damage,
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
    name: actor.name,
    system: migrateActorSystem(actor.system),
    items,
  }

  const newActor = (await actor.update(createData, { recursive: false })) as unknown as Actor.OfType<'characterV2'>

  return newActor
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

    // NOTE: This value represents "Basic Dodge", this being Math.floor(Basic Speed) + 3 + Modifiers (e.g. Enchanced
    // Dodge). It is the base value used to get the Actual Dodge value under encumbrance.
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

    profile: {
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

    bodyplan: oldData.additionalresources?.bodyplan,
    hitlocationsV2: {},

    moveV2: {},

    allNotes: {},
  }

  // Check for missing fields or other bad info
  if (!newData.profile?.sizemod || isNaN(newData.profile.sizemod)) {
    // Should never happen but better than a non-null assertion.
    newData.profile ||= {}
    newData.profile.sizemod = 0
  }

  // Migrate hit locations
  if (oldData.hitlocations) {
    Object.values(oldData.hitlocations).forEach(hitlocation => {
      const id = foundry.utils.randomID()

      const location: DataModel.CreateData<DataModel.SchemaOf<HitLocationEntryV2>> = {
        ...hitlocation,
        _id: id,
        rollText: hitlocation.roll,
      }

      newData.hitlocationsV2 ||= {}
      newData.hitlocationsV2[id] = location
    })
  }

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

  if (oldData.notes) {
    Object.values(oldData.notes).forEach(note => addNote(note, null))
  }

  // Migrate move modes
  if (oldData.move) {
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
  }

  // Migrate resource trackers

  if (oldData.additionalresources?.tracker) {
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
  }

  return newData
}

/* ---------------------------------------- */

type RecursiveItem<T> = T & { contains?: Record<string, RecursiveItem<T>> }

function flattenItemList<T>(
  itemList: Record<string, RecursiveItem<T>>,
  parentId: string | null
): (T & { _id: string; _parentId: string | null })[] {
  if (!itemList) return []

  const resultList: (T & { _id: string; _parentId: string | null })[] = []

  for (const item of Object.values(itemList)) {
    const id = foundry.utils.randomID()

    resultList.push({ ...item, contains: {}, _id: id, _parentId: parentId })

    if (item.contains) {
      resultList.push(...flattenItemList(item.contains, id))
    }
  }

  return resultList
}

export { migrateActor, runMigration }
