import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { ActionType, MeleeAttackSchema, RangedAttackSchema } from '@module/action/index.js'
import { Melee, Ranged } from '@module/actor/actor-components.js'
import { numberValidate } from '@module/data/validators/number-validator.js'

import { Equipment, Feature, Skill, Spell } from './legacy/itemv1-interface.js'
import { ItemType } from './types.js'

type OldItemType = 'equipment' | 'feature' | 'skill' | 'spell'

type NewItemType = ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell

type OldItemData = Equipment | Feature | Skill | Spell

type CreateDataOf<Model extends DataModel.Any> = fields.SchemaField.CreateData<DataModel.SchemaOf<Model>>

type NewDataWrapper<Type extends NewItemType> = CreateDataOf<Item.SystemOfType<Type>>

/* ---------------------------------------- */

async function runMigration() {
  if (!game.user || !game.user.isGM) return

  const migrationVersion = game.settings!.get(GURPS.SYSTEM_NAME, 'migration-version')

  if (foundry.utils.isNewerVersion('1.0.0', migrationVersion)) {
    const warning = ui.notifications!.warn('GURPS.migration.item.progressMessage', {
      format: { version: '1.0.0' },
      progress: true,
    })

    console.log('GURPS | Migrating world items')
    const items = game.items!.filter(item =>
      item.isOfType(ItemType.LegacyEquipment, ItemType.LegacyTrait, ItemType.LegacySkill, ItemType.LegacySpell)
    )
    const packs = game.packs!.filter(pack => pack.documentName === 'Item') as CompendiumCollection<'Item'>[]

    const length = items.length + packs.reduce((acc, pack) => acc + pack.index.size, 0)

    if (length > 0) {
      const updateStep = 1 / length
      let updateProgress = 0

      for (const item of items) {
        await migrateItem(item)
        updateProgress += updateStep
        warning.update({ pct: updateProgress })
      }

      for (const pack of packs) {
        await migrateItemCompendium(pack)
        updateProgress += pack.index.size * updateStep
        warning.update({ pct: updateProgress })
      }
    }

    ui.notifications!.remove(warning)
    ui.notifications!.success('GURPS.migration.item.successMessage', {
      format: { version: '1.0.0' },
    })
  }
}

/* ---------------------------------------- */

async function migrateItemCompendium(pack: CompendiumCollection<'Item'>) {
  const items = await pack.getDocuments()

  const updateData = items.map(item => getMigratedItemData(item, null)).filter(element => element !== null)

  await Item.updateDocuments(updateData, { pack: pack.collection, recursive: false })
}

/* ---------------------------------------- */

/**
 * Migrate an Item from the old system to the new system.
 * This item should be used only for Items not contained within an Actor, as the Actor migration process
 * handles embedded Item migration on its own.
 */
async function migrateItem(
  oldItem: Item.Implementation,
  operation?: Item.Database.UpdateOperation
): Promise<Item.OfType<ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell> | void> {
  const updateData = getMigratedItemData(oldItem, null)

  if (!updateData) {
    console.error(`Failed to get migrated Item data for Item with id ${oldItem.id}`)

    return
  }

  const newItem = await oldItem.update(updateData, { ...operation, recursive: false })

  if (!newItem) {
    console.error(`Failed to migrate Item with id ${oldItem.id}`)

    return
  }

  if (!newItem.isOfType(ItemType.Equipment, ItemType.Trait, ItemType.Skill, ItemType.Spell)) {
    console.error(`Migrated Item has invalid type: ${newItem.type}`)

    return
  }

  return newItem
}

/* ---------------------------------------- */

function getMigratedItemData(
  oldItem: Item.Implementation | Item.CreateData,
  parentId: string | null
): CreateDataOf<Item.OfType<NewItemType>> | null {
  const type = getNewItemType(oldItem.type)

  if (type === null) {
    console.debug('Item is not of a type that can be migrated, skipping migration.')

    return null
  }

  const system = migrateItemSystem(oldItem.type, oldItem.system as any, parentId)

  const itemData = oldItem instanceof Item ? oldItem.toObject() : oldItem

  const updateData = {
    ...itemData,
    type,
    system,
  }

  return updateData
}

/* ---------------------------------------- */

function getNewItemType(oldType: OldItemType | string): NewItemType | null {
  switch (oldType) {
    case 'equipment':
      return ItemType.Equipment
    case 'feature':
      return ItemType.Trait
    case 'skill':
      return ItemType.Skill
    case 'spell':
      return ItemType.Spell
    default:
      console.debug(`Not a valid Item type for migration: ${oldType}`)

      return null
  }
}

/* ---------------------------------------- */

function migrateItemSystem(type: string, oldData: OldItemData, parentId: string | null) {
  switch (type) {
    case 'equipment':
      return migrateEquipmentSystem(oldData as Equipment, parentId)
    case 'feature':
      return migrateTraitSystem(oldData as Feature, parentId)
    case 'skill':
      return migrateSkillSystem(oldData as Skill, parentId)
    case 'spell':
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
    import: 0, // Placeholder value
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

function migrateMeleeWeapon(oldMelee: Melee, _id: string): fields.SchemaField.CreateData<MeleeAttackSchema> {
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
    type: ActionType.MeleeAttack,
    baseParryPenalty: Number(oldMelee.baseParryPenalty) || 0,
    block,
    consumeAction: oldMelee.consumeAction,
    damage,
    extraAttacks: Number(oldMelee.extraAttacks) || 0,
    import: importedLevel,
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

function migrateRangedWeapon(oldRanged: Ranged, _id: string): fields.SchemaField.CreateData<RangedAttackSchema> {
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
    type: ActionType.RangedAttack,
    acc: oldRanged.acc,
    ammo: Number(oldRanged.ammo) || 0,
    bulk: oldRanged.bulk,
    consumeAction: oldRanged.consumeAction,
    damage,
    extraAttacks: Number(oldRanged.extraAttacks) || 0,
    import: Number(oldRanged.import) || 0,
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
  const newData: NewDataWrapper<ItemType.Trait> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.fea,
    isContainer: Boolean(oldData.fea.contains && Object.keys(oldData.fea.contains).length > 0),
    importid: oldData.fea.uuid || '',
  }

  return newData
}

/* ---------------------------------------- */

function migrateSkillSystem(oldData: Skill, parentId: string | null): NewDataWrapper<ItemType.Skill> {
  if (!numberValidate(oldData.ski.import, { integerOnly: true, nonnegative: true }))
    console.warn(`MIGRATE: Skill ${oldData.ski.name} has invalid import value: ${oldData.ski.import}. Defaulting to 0.`)

  if (!oldData.ski.relativelevel)
    console.warn(`MIGRATE: Skill ${oldData.ski.name} is missing relative level. Defaulting to ''. ID: ${parentId}`)

  const newData: NewDataWrapper<ItemType.Skill> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.ski,
    isContainer: Boolean(oldData.ski.contains && Object.keys(oldData.ski.contains).length > 0),
    import: Number(oldData.ski.import) || 0,
    relativelevel: (oldData.ski.relativelevel ?? '').toString(),
    importid: oldData.ski.uuid || '',
  }

  return newData
}

/* ---------------------------------------- */

function migrateSpellSystem(oldData: Spell, parentId: string | null): NewDataWrapper<ItemType.Spell> {
  if (!numberValidate(oldData.spl.import, { integerOnly: true, nonnegative: true }))
    console.warn(`MIGRATE: Spell ${oldData.spl.name} has invalid import value: ${oldData.spl.import}. Defaulting to 0.`)

  if (!oldData.spl.relativelevel)
    console.warn(`MIGRATE: Spell ${oldData.spl.name} is missing relative level. Defaulting to ''. ID: ${parentId}`)

  const newData: NewDataWrapper<ItemType.Spell> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.spl,
    isContainer: Boolean(oldData.spl.contains && Object.keys(oldData.spl.contains).length > 0),
    import: Number(oldData.spl.import) || 0,
    relativelevel: (oldData.spl.relativelevel ?? '').toString(),
    importid: oldData.spl.uuid || '',
  }

  return newData
}

/* ---------------------------------------- */

export {
  getNewItemType,
  migrateItem,
  getMigratedItemData,
  migrateItemCompendium,
  runMigration,
  migrateEquipmentSystem,
  migrateTraitSystem,
  migrateSkillSystem,
  migrateSpellSystem,
  migrateMeleeWeapon,
  migrateRangedWeapon,
}
