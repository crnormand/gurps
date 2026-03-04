import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { ActionType, MeleeAttackSchema, RangedAttackSchema } from '@module/action/index.js'
import { Melee, Ranged } from '@module/actor/actor-components.js'

import { Equipment, Feature, Skill, Spell } from './legacy/itemv1-interface.js'

type OldItemType = 'equipment' | 'feature' | 'skill' | 'spell'

type NewItemType = 'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'

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
    const items = game.items!.filter(item => item.isOfType('equipment', 'feature', 'skill', 'spell'))
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
      permanent: true,
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
): Promise<Item.OfType<'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'> | void> {
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

  if (!newItem.isOfType('equipmentV2', 'featureV2', 'skillV2', 'spellV2')) {
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
      return 'equipmentV2'
    case 'feature':
      return 'featureV2'
    case 'skill':
      return 'skillV2'
    case 'spell':
      return 'spellV2'
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

  const newMelee: fields.SchemaField.CreateData<MeleeAttackSchema> = {
    _id,
    type: ActionType.MeleeAttack,
    baseParryPenalty: Number(oldMelee.baseParryPenalty),
    block: oldMelee.block,
    consumeAction: oldMelee.consumeAction,
    damage,
    extraAttacks: Number(oldMelee.extraAttacks),
    import: Number(oldMelee.import),
    itemModifiers: '',
    mode: oldMelee.mode,
    modifierTags: oldMelee.modifierTags,
    notes: oldMelee.notes,
    otf: oldMelee.otf,
    parry: oldMelee.parry,
    reach: oldMelee.reach,
    st: oldMelee.st,
  }

  return newMelee
}

/* ---------------------------------------- */

function migrateRangedWeapon(oldRanged: Ranged, _id: string): fields.SchemaField.CreateData<RangedAttackSchema> {
  const damage = typeof oldRanged.damage === 'string' ? [oldRanged.damage] : oldRanged.damage

  const newRanged: fields.SchemaField.CreateData<RangedAttackSchema> = {
    _id,
    type: ActionType.RangedAttack,
    acc: oldRanged.acc,
    ammo: Number(oldRanged.ammo),
    bulk: oldRanged.bulk,
    consumeAction: oldRanged.consumeAction,
    damage,
    extraAttacks: Number(oldRanged.extraAttacks),
    import: Number(oldRanged.import),
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
  }

  return newRanged
}

/* ---------------------------------------- */

function migrateEquipmentSystem(oldData: Equipment, parentId: string | null): NewDataWrapper<'equipmentV2'> {
  const newData: NewDataWrapper<'equipmentV2'> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.eqt,
    isContainer: Boolean(oldData.eqt.contains && Object.keys(oldData.eqt.contains).length > 0),
    weightsum: oldData.eqt.weightsum.toString(),
    uses: Number(oldData.eqt.uses),
    maxuses: Number(oldData.eqt.maxuses),
  }

  return newData
}

/* ---------------------------------------- */

function migrateTraitSystem(oldData: Feature, parentId: string | null): NewDataWrapper<'featureV2'> {
  const newData: NewDataWrapper<'featureV2'> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.fea,
    isContainer: Boolean(oldData.fea.contains && Object.keys(oldData.fea.contains).length > 0),
  }

  return newData
}

/* ---------------------------------------- */

function migrateSkillSystem(oldData: Skill, parentId: string | null): NewDataWrapper<'skillV2'> {
  const newData: NewDataWrapper<'skillV2'> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.ski,
    isContainer: Boolean(oldData.ski.contains && Object.keys(oldData.ski.contains).length > 0),
    import: Number(oldData.ski.import),
    relativelevel: oldData.ski.relativelevel.toString(),
  }

  return newData
}

/* ---------------------------------------- */

function migrateSpellSystem(oldData: Spell, parentId: string | null): NewDataWrapper<'spellV2'> {
  const newData: NewDataWrapper<'spellV2'> = {
    ...migrateBaseItemSystem(oldData, parentId),
    ...oldData.spl,
    isContainer: Boolean(oldData.spl.contains && Object.keys(oldData.spl.contains).length > 0),
    import: Number(oldData.spl.import),
    relativelevel: oldData.spl.relativelevel.toString(),
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
