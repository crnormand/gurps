import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { numberValidate } from '@module/data/validators/number-validator.js'
import { ConditionalModifier, ReactionModifier } from '@module/item/data/conditional-modifier.js'
import { migrateItemSource, migrateMeleeWeapon, migrateRangedWeapon } from '@module/item/migrations/v1_0_0.js'
import { ItemType } from '@module/item/types.js'
import { shouldMigrateCompendium } from '@module/migration/helpers.js'
import { MigrationReport } from '@module/migration/types.js'
import { HitLocationRole } from '@rules/hit-locations/types.js'
import { AnyMutableObject } from 'fvtt-types/utils'

import { Melee, Ranged, Note } from '../actor-components.js'
import { HitLocationEntryV2 } from '../data/hit-location-entry.js'
import { groundMoveForBasicMove, MoveModeV2 } from '../data/move-mode.js'
import { NoteV2 } from '../data/note.js'
import { ActorV1Model } from '../legacy/actorv1-interface.js'
import { ActorType } from '../types.js'

const MIGRATION_VERSION = '1.0.0-alpha'

const LEGACY_TYPE_ENEMY = 'enemy'

async function migrate(): Promise<MigrationReport | void> {
  if (!game.user || !game.user.isGM) return

  const warning = ui.notifications!.warn('GURPS.migration.actor.progressMessage', {
    format: { version: MIGRATION_VERSION },
    progress: true,
  })

  const actors = game.actors.contents.filter(
    // @ts-expect-error: no longer recognized as a valid Actor Type, but should be for the sake of this migration
    actor => actor.type === LEGACY_TYPE_ENEMY || actor.type === ActorType.Character
  ) as Actor[]
  const packs = game.packs!.filter(
    pack => pack.documentName === 'Actor' && shouldMigrateCompendium(pack)
  ) as CompendiumCollection<'Actor'>[]

  const length = actors.length + packs.reduce((acc, pack) => acc + pack.index.size, 0)

  if (length > 0) {
    const updateStep = 1 / length
    let updateProgress = 0

    // NOTE: We don't need to run migrateActorSource against the documents, because it is already called
    // in GurpsActor.migrateData. We're running updateDocuments here to make the change permanent by saving the
    // documents to the DB.
    await foundry.documents.Actor.updateDocuments(
      actors.map(actor => actor.toObject()),
      {
        recursive: false,
      }
    )
    updateProgress += actors.length * updateStep
    warning.update({ pct: updateProgress })

    for (const pack of packs) {
      const docs = await pack.getDocuments()

      const docsToMigrate: Actor.Stored[] = docs.filter(
        // @ts-expect-error: no longer recognized as a valid Actor Type, but should be for the sake of this migration
        doc => doc.type === LEGACY_TYPE_ENEMY || doc.type === ActorType.Character
      )

      // NOTE: For some reason, the Actor type fails to update despite the fact that the type field is changed in the
      // data during the pack.migrate call, which in turn calls migrateActorSource on all documents. So we're changing
      // it here.
      await foundry.documents.Actor.updateDocuments(
        docsToMigrate.map(doc => doc.toObject()),
        {
          pack: pack.collection,
          recursive: false,
        }
      )

      updateProgress += pack.index.size * updateStep
    }
  }

  ui.notifications!.remove(warning)
  ui.notifications!.success('GURPS.migration.actor.successMessage', {
    format: { version: MIGRATION_VERSION },
  })

  return {
    module: 'Actor',
    version: MIGRATION_VERSION,
    success: true,
    message: `Migrated ${length} actors to version ${MIGRATION_VERSION}.`,
  }
}

/* ---------------------------------------- */

function migrateActorSource(source: AnyMutableObject): AnyMutableObject {
  if (!game.i18n) {
    console.error('GURPS | Cannot migrate actor because game.i18n is not initialized.')

    return source
  }

  if (![ActorType.Character, LEGACY_TYPE_ENEMY].includes(source.type as any)) {
    console.warn(
      'Attempted to migrate actor that is not of type character. Actor name:',
      source.name,
      'Actor type:',
      source.type
    )

    return source
  }

  if ('system' in source) {
    const alreadyMigrated = typeof source.system === 'object' && source.system !== null && 'profile' in source.system

    if (!alreadyMigrated) {
      const items: AnyMutableObject[] = []

      const system = (source.system ?? {}) as ActorV1Model
      const traits = system.ads ? flattenItemList(system.ads, null) : []
      const skills = system.skills ? flattenItemList(system.skills, null) : []
      const spells = system.spells ? flattenItemList(system.spells, null) : []
      const carriedEquipment =
        system.equipment && system.equipment.carried ? flattenItemList(system.equipment.carried, null) : []
      const otherEquipment =
        system.equipment && system.equipment.other ? flattenItemList(system.equipment.other, null) : []

      traits.forEach(trait => {
        const newTrait = migrateItemSource(
          {
            _id: trait._id,
            type: ItemType.Trait,
            name: trait.name,
            system: { fea: trait },
          },
          trait._parentId
        )

        items.push(newTrait)
      })

      skills.forEach(skill => {
        const newSkill = migrateItemSource(
          {
            _id: skill._id,
            type: ItemType.Skill,
            name: skill.name,
            system: { ski: skill },
          },
          skill._parentId
        )

        items.push(newSkill)
      })

      spells.forEach(spell => {
        const newSpell = migrateItemSource(
          {
            _id: spell._id,
            type: ItemType.Spell,
            name: spell.name,
            system: { spl: spell },
          },
          spell._parentId
        )

        items.push(newSpell)
      })

      carriedEquipment.forEach(equipment => {
        const newEquipment = migrateItemSource(
          {
            _id: equipment._id,
            type: ItemType.Equipment,
            name: equipment.name,
            system: { eqt: equipment },
          },
          equipment._parentId
        )

        items.push(newEquipment)
      })

      otherEquipment.forEach(equipment => {
        const newEquipment = migrateItemSource(
          {
            _id: equipment._id,
            type: ItemType.Equipment,
            name: equipment.name,
            system: { eqt: equipment },
          },
          equipment._parentId
        )

        items.push(newEquipment)
      })

      // ActorV1 has no concept of Reaction and Conditional Modifier ownership by items,
      // so reactions and conditional modifiers are moved to a single placeholder item.
      const holderItem: Item.CreateData<ItemType.Trait> = {
        _id: foundry.utils.randomID(),
        type: ItemType.Trait,
        name: game.i18n?.localize('GURPS.migration.holderItem.name'),
      }

      const holderItemFlags = { isMigratedItem: true }

      const holderItemSystem: fields.SchemaField.CreateData<DataModel.SchemaOf<Item.SystemOfType<ItemType.Trait>>> = {
        containedBy: null,
        points: 0,
        _reactions: {},
        _conditionalmods: {},
        actions: {},
      }

      if (system.reactions)
        Object.values(system.reactions).forEach(mod => {
          const _id = foundry.utils.randomID()

          const data: DataModel.CreateData<DataModel.SchemaOf<ReactionModifier>> = {
            _id,
            modifier: Number(mod.modifier) || 0,
            situation: mod.situation,
            modifierTags: mod.modifierTags,
            flags: holderItemFlags,
          }

          holderItemSystem!._reactions![_id] = data
        })

      if (system.conditionalmods)
        Object.values(system.conditionalmods).forEach(mod => {
          const _id = foundry.utils.randomID()

          const data: DataModel.CreateData<DataModel.SchemaOf<ConditionalModifier>> = {
            _id,
            modifier: Number(mod.modifier) || 0,
            situation: mod.situation,
            modifierTags: mod.modifierTags,
            flags: holderItemFlags,
          }

          holderItemSystem!._conditionalmods![_id] = data
        })

      if (system.melee)
        Object.values(system.melee).forEach((weapon: Melee) => {
          const _id = foundry.utils.randomID()

          const newMelee = migrateMeleeWeapon(weapon, _id)

          newMelee.flags = holderItemFlags

          holderItemSystem.actions ||= {}
          holderItemSystem.actions[_id] = newMelee
        })

      if (system.ranged)
        Object.values(system.ranged).forEach((weapon: Ranged) => {
          const _id = foundry.utils.randomID()

          const newRanged = migrateRangedWeapon(weapon, _id)

          newRanged.flags = holderItemFlags

          holderItemSystem.actions ||= {}
          holderItemSystem.actions[_id] = newRanged
        })

      holderItem.system = holderItemSystem

      items.push(holderItem as unknown as AnyMutableObject)

      const migratedSystem = migrateActorSystem(source.system as ActorV1Model, `${source.name}`, {
        holderItemId: holderItem._id as string,
      })

      source.system = migratedSystem
      source.items = items
    }
  }

  return source
}

/* ---------------------------------------- */

function migrateActorSystem(
  oldData: ActorV1Model,
  actorName?: string,
  injectedData?: fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<ActorType.Character>>>
): fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<ActorType.Character>>> {
  if (typeof oldData.conditions.move === 'string')
    console.warn(`MIGRATE: Actor ${actorName} oldData.conditions.move: ${oldData.conditions.move}`)

  if (!numberValidate(oldData.basicmove.value, { nonnegative: true, integerOnly: true }))
    console.warn(
      `MIGRATE: Actor ${actorName} has invalid Basic Move value: ${oldData.basicmove.value}. Defaulting to 0.`
    )

  if (!numberValidate(oldData.basicspeed.value, { nonnegative: true }))
    console.warn(
      `MIGRATE: Actor ${actorName} has invalid Basic Speed value: ${oldData.basicspeed.value}. Defaulting to 0.`
    )

  if (!numberValidate(oldData.conditionalinjury.RT.value))
    console.warn(
      `MIGRATE: Actor ${actorName} has invalid Robustness Threshold value: ${oldData.conditionalinjury.RT.value}. Defaulting to 0.`
    )

  if (!numberValidate(oldData.traits.sizemod, { integerOnly: true }))
    console.warn(`MIGRATE: Actor ${actorName} has invalid SM value: ${oldData.traits.sizemod}. Defaulting to 0.`)

  const holderItemId = injectedData?.holderItemId || ''

  let currentEncumbrance = 0
  const encumbrance = Object.values(oldData.encumbrance)

  encumbrance.forEach((data, index) => {
    if (data.current) currentEncumbrance = index
  })

  const newData: fields.SchemaField.CreateData<DataModel.SchemaOf<Actor.SystemOfType<ActorType.Character>>> = {
    ...injectedData,
    holderItemId,
    attributes: Object.fromEntries(
      Object.entries(oldData.attributes).map(([key, val]) => [key, { ...val, importedValue: val.import }])
    ),
    HP: { ...oldData.HP, damage: oldData.HP.max - oldData.HP.value },
    FP: { ...oldData.FP, damage: oldData.FP.max - oldData.FP.value },
    QP: { ...oldData.QP, damage: oldData.QP.max - oldData.QP.value },

    // NOTE: This value represents "Basic Dodge", this being Math.floor(Basic Speed) + 3 + Modifiers (e.g. Enchanced
    // Dodge). It is the base value used to get the Actual Dodge value under encumbrance.
    dodge: { value: Object.values(oldData.encumbrance)[0]?.dodge ?? 0 },
    basicmove: {
      value: Number(oldData.basicmove.value) || 0,
      points: oldData.basicmove.points,
    },
    basicspeed: {
      value: Number(oldData.basicspeed.value) || 0,
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
      qnotes: oldData.additionalresources?.qnotes ?? '',
      tracker: {},
      importname: oldData.additionalresources?.importname ?? oldData.additionalresources?.importName,
      importpath: oldData.additionalresources?.importpath ?? '',
      currentEncumbrance,
    },

    conditionalinjury: {
      RT: {
        value: Number(oldData.conditionalinjury.RT.value) || 0,
        points: oldData.conditionalinjury.RT.points,
      },
      injury: {
        severity: (sev => (Number.isNaN(sev) ? -7 : sev))(parseInt(oldData.conditionalinjury.injury.severity)),
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
      sizemod: Number(oldData.traits.sizemod) || 0,
      techlevel: oldData.traits.techlevel,
      createdon: oldData.traits.createdon,
      modifiedon: oldData.traits.modifiedon,
      player: oldData.traits.player,
      organization: '',
    },

    totalpoints: oldData.totalpoints,

    conditions: {
      actions: {
        maxActions: oldData.conditions.actions?.maxActions,
        maxBlocks: oldData.conditions.actions?.maxBlocks,
      },
      posture: oldData.conditions.posture,
      maneuver: oldData.conditions.maneuver ?? null,
      // TODO: Check why this is number | string -- perhaps it can contain number of yards of movement (number) or "STEP" (string)?
      move: String(oldData.conditions.move),
      self: {
        modifiers: [],
      },
      target: {
        modifiers: [],
      },
      usermods: [],

      reeling: oldData.conditions.reeling ?? false,
      exhausted: oldData.conditions.exhausted ?? false,

      damageAccumulators: [],
    },

    bodyplan: oldData.additionalresources?.bodyplan,
    hitlocationsV2: {},

    moveV2: {},

    allNotes: {},
  }

  // Check for missing fields or other bad info
  const sizeMod = newData.profile?.sizemod

  if (!numberValidate(sizeMod, { integerOnly: true })) {
    // Should never happen but better than a non-null assertion.
    console.warn(
      `MIGRATE: Actor ${actorName} is missing sizemod or has invalid sizemod. Defaulting to 0. Sizemod value: ${sizeMod}`
    )
    newData.profile ||= {}
    newData.profile.sizemod = 0
  }

  // Migrate hit locations
  if (oldData.hitlocations) {
    Object.values(oldData.hitlocations).forEach(hitlocation => {
      const id = foundry.utils.randomID()

      // NOTE: hitlocaiton.penalty is a string, but it is being treated as a number by the type system
      const penalty = parseInt(String(hitlocation.penalty)) ?? 0

      let role: string | null = hitlocation?.role ?? null

      if (!Object.values(HitLocationRole).includes(role as any)) role = null

      const location: DataModel.CreateData<DataModel.SchemaOf<HitLocationEntryV2>> = {
        ...hitlocation,
        _id: id,
        importedDR: hitlocation.import,
        _dr: hitlocation.import,
        rollText: hitlocation.roll,
        _damageType: !hitlocation._damageType ? null : hitlocation._damageType,
        penalty,
        split: hitlocation.split ?? {},
        drMod: hitlocation.drMod ?? 0,
        role: role as HitLocationRole | null,
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
      importid: data.uuid,
      _id: id,
      reference: data.pageref ?? '',
      reference_highlight: '',
    }

    newData.allNotes![id] = note

    for (const child of Object.values(data.contains) as Note[]) {
      addNote(child, id)
    }
  }

  if (oldData.notes) {
    Object.values(oldData.notes).forEach(note => addNote(note, null))
  }

  let currentMoveModeId: string | null = null
  let firstMoveModeId: string | null = null

  // Migrate move modes
  if (oldData.move) {
    Object.values(oldData.move).forEach(data => {
      const id = foundry.utils.randomID()

      if (!numberValidate(data.basic, { nonnegative: true, integerOnly: true }))
        console.warn(
          `MIGRATE: Move Mode ${data.mode} has invalid Basic Move value: ${data.basic}. Defaulting to 0. ID: ${id}`
        )

      if (data.enhanced != null && !numberValidate(data.enhanced, { nonnegative: true, integerOnly: true }))
        console.warn(
          `MIGRATE: Move Mode ${data.mode} has invalid Enhanced Move value: ${data.enhanced}. Defaulting to 0. ID: ${id}`
        )

      const move: DataModel.CreateData<DataModel.SchemaOf<MoveModeV2>> = {
        _id: id,
        mode: data.mode,
        basic: Number.isFinite(Number(data.basic)) ? Number(data.basic) : 0,
        enhanced: data.enhanced != null ? Number(data.enhanced) || 0 : null,
      }

      if (!firstMoveModeId) firstMoveModeId = id
      if (data.default) currentMoveModeId = id

      newData.moveV2 ||= {}
      newData.moveV2[id] = move
    })

    newData._currentMoveModeId = currentMoveModeId ?? firstMoveModeId ?? ''
  } else {
    const groundMove = groundMoveForBasicMove(newData.basicmove?.value ?? 0)

    newData.moveV2 ||= {}
    newData.moveV2[groundMove._id as string] = groundMove
    newData._currentMoveModeId = groundMove._id as string
  }

  // Migrate resource trackers

  if (oldData.additionalresources?.tracker) {
    Object.values(oldData.additionalresources.tracker).forEach(data => {
      const id = foundry.utils.randomID()

      const trackerData = GURPS.modules.ResourceTracker.migrateTrackerInstanceToV2(data)

      newData.additionalresources ||= {}
      newData.additionalresources.tracker ||= {}
      newData.additionalresources.tracker[id] = trackerData
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

/* ---------------------------------------- */

export const v1_0_0 = {
  version: MIGRATION_VERSION,
  migrate,
  migrateActorSource,
}
