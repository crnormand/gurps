import { fields, DataModel } from '@gurps-types/foundry/index.js'
import {
  ActionType,
  MeleeAttackModel,
  MeleeAttackSchema,
  RangedAttackModel,
  RangedAttackSchema,
} from '@module/action/index.js'
import { Melee, Ranged } from '@module/actor/actor-components.js'
import { numberValidate } from '@module/data/validators/number-validator.js'
import { shouldMigrateCompendium } from '@module/migration/helpers.js'
import { MigrationReport } from '@module/migration/types.js'
import { AnyMutableObject } from 'fvtt-types/utils'

import { Equipment, Feature, Skill, Spell } from '../legacy/itemv1-interface.js'
import { ItemType } from '../types.js'

type NewItemType = ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell

type OldItemData = Equipment | Feature | Skill | Spell

type CreateDataOf<Model extends DataModel.Any> = fields.SchemaField.CreateData<DataModel.SchemaOf<Model>>

type NewDataWrapper<Type extends NewItemType> = CreateDataOf<Item.SystemOfType<Type>>

const MIGRATION_VERSION = '1.0.0-alpha'

async function migrate(): Promise<MigrationReport | void> {
  if (!game.user || !game.user.isGM) return

  const warning = ui.notifications!.warn('GURPS.migration.item.progressMessage', {
    format: { version: MIGRATION_VERSION },
    progress: true,
  })

  const items = game.items.contents
  const packs = game.packs!.filter(
    pack => pack.documentName === 'Item' && shouldMigrateCompendium(pack)
  ) as CompendiumCollection<'Item'>[]

  const length = items.length + packs.reduce((acc, pack) => acc + pack.index.size, 0)

  if (length > 0) {
    const updateStep = 1 / length
    let updateProgress = 0

    // NOTE: We don't need to run migrateItemSource against the documents, because it is already called
    // in GurpsItem.migrateData. We're running updateDocuments here to make the change permanent by saving the
    // documents to the DB.
    await foundry.documents.Item.updateDocuments(
      items.map(item => item.toObject()),
      {
        recursive: false,
      }
    )

    updateProgress += items.length * updateStep
    warning.update({ pct: updateProgress })

    for (const pack of packs) {
      await pack.migrate({ notify: false })
      updateProgress += pack.index.size * updateStep
      warning.update({ pct: updateProgress })
    }
  }

  ui.notifications!.remove(warning)
  ui.notifications!.success('GURPS.migration.item.successMessage', {
    format: { version: MIGRATION_VERSION },
  })

  return {
    module: 'Item',
    version: MIGRATION_VERSION,
    success: true,
    message: `Migrated ${length} items to version ${MIGRATION_VERSION}.`,
  }
}

/* ---------------------------------------- */

export function migrateItemSource(source: AnyMutableObject, parentId: string | null = null): AnyMutableObject {
  if (!source.type || typeof source.type !== 'string') {
    console.warn(
      `MIGRATE: Item ${source.name} is missing a valid type. Skipping migration for this item. ID: ${source._id}`
    )

    return source
  }

  if (![ItemType.Equipment, ItemType.Trait, ItemType.Skill, ItemType.Spell].includes(source.type as ItemType)) {
    console.warn(
      `MIGRATE: Item ${source.name} has unrecognized type ${source.type}. Skipping migration for this item. ID: ${source._id}`
    )

    return source
  }

  if (source.system) source.system = migrateItemSystem(source.type as ItemType, source.system as any, parentId)

  return source
}

/* ---------------------------------------- */

function migrateItemSystem(type: string, oldData: OldItemData, parentId: string | null) {
  switch (type) {
    case ItemType.Equipment:
      return migrateEquipmentSystem(oldData as Equipment, parentId)
    case ItemType.Trait:
      return migrateTraitSystem(oldData as Feature, parentId)
    case ItemType.Skill:
      return migrateSkillSystem(oldData as Skill, parentId)
    case ItemType.Spell:
      return migrateSpellSystem(oldData as Spell, parentId)
    default:
      throw new Error(`Invalid Item type submitted for migration: ${type}`)
  }
}

/* ---------------------------------------- */

function migrateBaseItemSystem(oldData: OldItemData, parentId: string | null): NewDataWrapper<NewItemType> {
  const newData: NewDataWrapper<NewItemType> = {
    actions: {},
    _reactions: {},
    _conditionalmods: {},
    containedBy: parentId,
    points: 0, // Placeholder value
    importedLevel: 0, // Placeholder value
  }

  if (oldData.melee) {
    const melee = Object.values(oldData.melee) as Melee[]

    melee.forEach(action => {
      const _id = foundry.utils.randomID()
      const newMelee = migrateMeleeWeapon(action, _id)

      newData.actions[_id] = newMelee
    })
  }

  if (oldData.ranged) {
    const ranged = Object.values(oldData.ranged) as Ranged[]

    ranged.forEach(action => {
      const _id = foundry.utils.randomID()
      const newRanged = migrateRangedWeapon(action, _id)

      newData.actions[_id] = newRanged
    })
  }

  return newData
}

/* ---------------------------------------- */

export function migrateMeleeWeapon(oldMelee: Melee, _id: string): fields.SchemaField.CreateData<MeleeAttackSchema> {
  const damage = typeof oldMelee.damage === 'string' ? [oldMelee.damage] : oldMelee.damage

  if (!numberValidate(oldMelee.baseParryPenalty, { integerOnly: true }))
    console.warn(
      `MIGRATE: Melee attack ${oldMelee.mode} has invalid baseParryPenalty: ${oldMelee.baseParryPenalty}. Defaulting to 0. ID: ${_id}`
    )

  if (!numberValidate(oldMelee.extraAttacks, { integerOnly: true, nonnegative: true }))
    console.warn(
      `MIGRATE: Melee attack ${oldMelee.mode} has invalid extraAttacks: ${oldMelee.extraAttacks}. Defaulting to 0. ID: ${_id}`
    )

  if (!numberValidate(oldMelee.import, { integerOnly: true, nonnegative: true }))
    console.warn(
      `MIGRATE: Melee attack ${oldMelee.mode} has invalid import value: ${oldMelee.import}. Defaulting to 0. ID: ${_id}`
    )

  const importedLevel = Number(oldMelee.import) || 0

  let parry = oldMelee.parry
  let block = oldMelee.block

  if (parry !== '') {
    const parryMatch = oldMelee.parry.match(/^\d+/)

    if (parryMatch) {
      let parryMod = 0

      const oldParryText = parryMatch[0]
      const parrySuffix = oldMelee.parry.replace(oldParryText, '')
      const oldParry = parseInt(oldParryText)

      if (!isNaN(oldParry)) {
        const expectedParry = Math.floor(importedLevel / 2) + 3

        parryMod = oldParry - expectedParry
      }

      parryMod += Number(oldMelee.parrybonus) || 0

      parry = `${parryMod}${parrySuffix}`
    }
  }

  if (block !== '') {
    const blockMatch = oldMelee.block.match(/^\d+/)

    if (blockMatch) {
      let blockMod = 0

      const oldBlockText = blockMatch[0]
      const blockSuffix = oldMelee.block.replace(oldBlockText, '')
      const oldBlock = parseInt(oldBlockText)

      if (!isNaN(oldBlock)) {
        const expectedBlock = Math.floor(importedLevel / 2) + 3

        blockMod = oldBlock - expectedBlock
      }

      block = `${blockMod}${blockSuffix}`
    }
  }

  const newMelee: fields.SchemaField.CreateData<MeleeAttackSchema> = {
    _id,
    img: MeleeAttackModel.getDefaultArtwork({}).img,
    type: ActionType.MeleeAttack,
    baseParryPenalty: Number(oldMelee.baseParryPenalty) || 0,
    block,
    consumeAction: oldMelee.consumeAction,
    damage,
    extraAttacks: Number(oldMelee.extraAttacks) || 0,
    importedLevel,
    itemModifiers: '',
    mode: oldMelee.mode,
    modifierTags: oldMelee.modifierTags,
    notes: oldMelee.notes,
    otf: oldMelee.otf,
    parry,
    reach: oldMelee.reach,
    st: oldMelee.st,
    name: oldMelee.name,
  }

  return newMelee
}

/* ---------------------------------------- */

export function migrateRangedWeapon(oldRanged: Ranged, _id: string): fields.SchemaField.CreateData<RangedAttackSchema> {
  const damage = typeof oldRanged.damage === 'string' ? [oldRanged.damage] : oldRanged.damage

  if (!numberValidate(oldRanged.ammo, { integerOnly: true, nonnegative: true }))
    console.warn(
      `MIGRATE: Ranged attack ${oldRanged.mode} has invalid ammo value: ${oldRanged.ammo}. Defaulting to 0. ID: ${_id}`
    )

  if (!numberValidate(oldRanged.extraAttacks, { integerOnly: true, nonnegative: true }))
    console.warn(
      `MIGRATE: Ranged attack ${oldRanged.mode} has invalid extraAttacks: ${oldRanged.extraAttacks}. Defaulting to 0. ID: ${_id}`
    )

  if (!numberValidate(oldRanged.import, { integerOnly: true, nonnegative: true }))
    console.warn(
      `MIGRATE: Ranged attack ${oldRanged.mode} has invalid import value: ${oldRanged.import}. Defaulting to 0. ID: ${_id}`
    )

  const newRanged: fields.SchemaField.CreateData<RangedAttackSchema> = {
    _id,
    img: RangedAttackModel.getDefaultArtwork({}).img,
    type: ActionType.RangedAttack,
    acc: oldRanged.acc,
    ammo: Number(oldRanged.ammo) || 0,
    bulk: oldRanged.bulk,
    consumeAction: oldRanged.consumeAction,
    damage,
    extraAttacks: Number(oldRanged.extraAttacks) || 0,
    importedLevel: Number(oldRanged.import) || 0,
    itemModifiers: '',
    mode: oldRanged.mode,
    modifierTags: oldRanged.modifierTags,
    notes: oldRanged.notes,
    otf: oldRanged.otf,
    range: oldRanged.range,
    rateOfFire: oldRanged.rof,
    recoil: oldRanged.rcl,
    shots: oldRanged.shots,
    st: oldRanged.st,
    name: oldRanged.name,
  }

  return newRanged
}

/* ---------------------------------------- */

function migrateEquipmentSystem(oldData: Equipment, parentId: string | null): NewDataWrapper<ItemType.Equipment> {
  // NOTE: If the component is not present, the item has alrady been migrated
  if (!oldData.eqt) return oldData as unknown as NewDataWrapper<ItemType.Equipment>

  if (!numberValidate(oldData.eqt.uses, { integerOnly: true, nonnegative: true }))
    console.warn(`MIGRATE: Equipment ${oldData.eqt.name} has invalid uses: ${oldData.eqt.uses}. Defaulting to 0.`)

  if (!numberValidate(oldData.eqt.maxuses, { integerOnly: true, nonnegative: true }))
    console.warn(`MIGRATE: Equipment ${oldData.eqt.name} has invalid maxuses: ${oldData.eqt.maxuses}. Defaulting to 0.`)

  const newData: NewDataWrapper<ItemType.Equipment> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.eqt,
    isContainer: Boolean(oldData.eqt.contains && Object.keys(oldData.eqt.contains).length > 0),
    weightsum: oldData.eqt.weightsum.toString(),
    uses: Number(oldData.eqt.uses) || 0,
    maxuses: Number(oldData.eqt.maxuses) || 0,
    importid: oldData.eqt.uuid || '',
    _carried: oldData.eqt.carried,
  }

  return newData
}

/* ---------------------------------------- */

function migrateTraitSystem(oldData: Feature, parentId: string | null): NewDataWrapper<ItemType.Trait> {
  // NOTE: If the component is not present, the item has alrady been migrated
  if (!oldData.fea) return oldData as unknown as NewDataWrapper<ItemType.Trait>

  let notes = oldData.fea.notes
  const cr = oldData.fea.cr ?? null

  if (cr !== null) {
    const crText = '[' + game.i18n?.localize('GURPS.CR' + cr.toString()) + ': ' + oldData.fea.name + ']'

    notes = notes.replace(crText, '').trim() // Remove the CR note from the old notes
  }

  const newData: NewDataWrapper<ItemType.Trait> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.fea,
    notes,
    isContainer: Boolean(oldData.fea.contains && Object.keys(oldData.fea.contains).length > 0),
    importid: oldData.fea.uuid || '',
  }

  return newData
}

/* ---------------------------------------- */

function migrateSkillSystem(oldData: Skill, parentId: string | null): NewDataWrapper<ItemType.Skill> {
  // NOTE: If the component is not present, the item has alrady been migrated
  if (!oldData.ski) return oldData as unknown as NewDataWrapper<ItemType.Skill>

  if (!numberValidate(oldData.ski.import, { integerOnly: true, nonnegative: true }))
    console.warn(`MIGRATE: Skill ${oldData.ski.name} has invalid import value: ${oldData.ski.import}. Defaulting to 0.`)

  if (!oldData.ski.relativelevel)
    console.warn(`MIGRATE: Skill ${oldData.ski.name} is missing relative level. Defaulting to ''. ID: ${parentId}`)

  const newData: NewDataWrapper<ItemType.Skill> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.ski,
    isContainer: Boolean(oldData.ski.contains && Object.keys(oldData.ski.contains).length > 0),
    importedLevel: Number(oldData.ski.import) || 0,
    relativelevel: (oldData.ski.relativelevel ?? '').toString(),
    importid: oldData.ski.uuid || '',
  }

  return newData
}

/* ---------------------------------------- */

function migrateSpellSystem(oldData: Spell, parentId: string | null): NewDataWrapper<ItemType.Spell> {
  // NOTE: If the component is not present, the item has alrady been migrated
  if (!oldData.spl) return oldData as unknown as NewDataWrapper<ItemType.Spell>

  if (!numberValidate(oldData.spl.import, { integerOnly: true, nonnegative: true }))
    console.warn(`MIGRATE: Spell ${oldData.spl.name} has invalid import value: ${oldData.spl.import}. Defaulting to 0.`)

  if (!oldData.spl.relativelevel)
    console.warn(`MIGRATE: Spell ${oldData.spl.name} is missing relative level. Defaulting to ''. ID: ${parentId}`)

  const newData: NewDataWrapper<ItemType.Spell> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.spl,
    isContainer: Boolean(oldData.spl.contains && Object.keys(oldData.spl.contains).length > 0),
    importedLevel: Number(oldData.spl.import) || 0,
    relativelevel: (oldData.spl.relativelevel ?? '').toString(),
    importid: oldData.spl.uuid || '',
  }

  return newData
}

/* ---------------------------------------- */

export const v1_0_0 = {
  version: MIGRATION_VERSION,
  migrate,
  migrateItemSource,
}
