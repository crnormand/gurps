import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'

import { Equipment, Feature, Skill, Spell } from './legacy/itemv1-interface.js'

type OldItemType = 'equipment' | 'feature' | 'skill' | 'spell'

type NewItemType = 'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'

type OldItemData = Equipment | Feature | Skill | Spell

type CreateDataOf<Model extends DataModel.Any> = fields.SchemaField.CreateData<DataModel.SchemaOf<Model>>

type NewDataWrapper<Type extends NewItemType> = CreateDataOf<Item.SystemOfType<Type>>

function getNewItemType(oldType: OldItemType): NewItemType {
  switch (oldType) {
    case 'equipment':
      return 'equipmentV2'
    case 'feature':
      return 'featureV2'
    case 'skill':
      return 'skillV2'
    case 'spell':
      return 'spellV2'
  }
}

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
    open: true,
  }

  Object.values(oldData.melee).forEach(action => {
    const id = foundry.utils.randomID()

    newData.actions[id] = action as CreateDataOf<MeleeAttackModel>
  })

  Object.values(oldData.ranged).forEach(action => {
    const id = foundry.utils.randomID()

    newData.actions[id] = action as CreateDataOf<RangedAttackModel>
  })

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

export { migrateItemSystem, getNewItemType }
