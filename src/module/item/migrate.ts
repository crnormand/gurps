import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'

import { Equipment, Feature, Skill, Spell } from './legacy/itemv1-interface.js'

type OldItemType = 'equipment' | 'feature' | 'skill' | 'spell'

type NewItemType = 'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'

type OldItemData = Equipment | Feature | Skill | Spell

type CreateDataOf<Model extends DataModel.Any> = fields.SchemaField.CreateData<DataModel.SchemaOf<Model>>

type NewDataWrapper<Type extends NewItemType> = CreateDataOf<Item.SystemOfType<Type>>

/* ---------------------------------------- */

async function runMigration() {
  const migrationVersion = game.settings!.get(GURPS.SYSTEM_NAME, 'migration-version')

  if (foundry.utils.isNewerVersion('1.0.0', migrationVersion)) {
    const warning = ui.notifications!.warn('GURPS.item.migration.progressMessage', {
      format: { version: '1.0.0' },
      progress: true,
    })

    console.log('Migrating world items')
    const items = game.items!.filter(actor => actor.isOfType('equipment', 'feature', 'skill', 'spell'))
    const packs = game.packs!.filter(pack => pack.documentName === 'Item') as CompendiumCollection<'Item'>[]

    const length = items.length + packs.reduce((acc, pack) => acc + pack.index.size, 0)
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

    ui.notifications!.remove(warning)
    ui.notifications!.success('GURPS.item.migration.successMessage', {
      format: { version: '1.0.0' },
      permanent: true,
    })
  }
}

/* ---------------------------------------- */

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
    containedBy: parentId,
  }

  if (oldData.melee) {
    Object.values(oldData.melee).forEach(action => {
      const id = foundry.utils.randomID()

      newData.actions[id] = action as CreateDataOf<MeleeAttackModel>
    })
  }

  if (oldData.ranged) {
    Object.values(oldData.ranged).forEach(action => {
      const id = foundry.utils.randomID()

      newData.actions[id] = action as CreateDataOf<RangedAttackModel>
    })
  }

  return newData
}

/* ---------------------------------------- */

function migrateEquipmentSystem(oldData: Equipment, parentId: string | null): NewDataWrapper<'equipmentV2'> {
  const newData: NewDataWrapper<'equipmentV2'> = migrateBaseItemSystem(oldData, parentId)

  newData.eqt = {
    ...oldData.eqt,
    weightsum: String(oldData.eqt.weightsum),
    uses: Number(oldData.eqt.uses),
    maxuses: Number(oldData.eqt.maxuses),
  }

  return newData
}

/* ---------------------------------------- */

function migrateTraitSystem(oldData: Feature, parentId: string | null): NewDataWrapper<'featureV2'> {
  const newData: NewDataWrapper<'featureV2'> = migrateBaseItemSystem(oldData, parentId)

  newData.fea = {
    ...oldData.fea,
  }

  return newData
}

/* ---------------------------------------- */

function migrateSkillSystem(oldData: Skill, parentId: string | null): NewDataWrapper<'skillV2'> {
  const newData: NewDataWrapper<'skillV2'> = migrateBaseItemSystem(oldData, parentId)

  newData.ski = {
    ...oldData.ski,
    import: Number(oldData.ski.import),
    relativelevel: String(oldData.ski.relativelevel),
  }

  return newData
}

/* ---------------------------------------- */

function migrateSpellSystem(oldData: Spell, parentId: string | null): NewDataWrapper<'spellV2'> {
  const newData: NewDataWrapper<'spellV2'> = migrateBaseItemSystem(oldData, parentId)

  newData.spl = {
    ...oldData.spl,
    import: Number(oldData.spl.import),
    relativelevel: String(oldData.spl.relativelevel),
  }

  return newData
}

/* ---------------------------------------- */

export { getNewItemType, migrateItem, getMigratedItemData, migrateItemCompendium, runMigration }
