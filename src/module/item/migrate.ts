import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'

import { Equipment, Feature, Skill, Spell } from './legacy/itemv1-interface.ts'

type OldItemType = 'equipment' | 'feature' | 'skill' | 'spell'

type NewItemType = 'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'

type OldItemData = Equipment | Feature | Skill | Spell

type CreateDataOf<Model extends DataModel.Any> = fields.SchemaField.CreateData<DataModel.SchemaOf<Model>>

type NewDataWrapper<Type extends NewItemType> = CreateDataOf<Item.SystemOfType<Type>>

function migrateItemSystem(type: OldItemType, oldData: OldItemData) {
  switch (type) {
    case 'equipment':
      return migrateEquipmentSystem(oldData as Equipment)
    case 'feature':
      return migrateTraitSystem(oldData as Feature)
    case 'skill':
      return migrateSkillSystem(oldData as Skill)
    case 'spell':
      return migrateSpellSystem(oldData as Spell)
    default:
      throw new Error(`Invalid Item type submitted for migration: ${type}`)
  }
}

/* ---------------------------------------- */

function migrateBaseItemSystem(oldData: OldItemData): NewDataWrapper<NewItemType> {
  const newData: NewDataWrapper<NewItemType> = {
    actions: {},
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

function migrateEquipmentSystem(oldData: Equipment): NewDataWrapper<'equipmentV2'> {
  const newData: NewDataWrapper<'equipmentV2'> = migrateBaseItemSystem(oldData)

  newData.eqt = {
    ...oldData.eqt,
    weightsum: String(oldData.eqt.weightsum),
    uses: Number(oldData.eqt.uses),
    maxuses: Number(oldData.eqt.maxuses),
  }

  return newData
}

/* ---------------------------------------- */

function migrateTraitSystem(oldData: Feature): NewDataWrapper<'featureV2'> {
  const newData: NewDataWrapper<'featureV2'> = migrateBaseItemSystem(oldData)

  newData.fea = {
    ...oldData.fea,
  }

  return newData
}

/* ---------------------------------------- */

function migrateSkillSystem(oldData: Skill): NewDataWrapper<'skillV2'> {
  const newData: NewDataWrapper<'skillV2'> = migrateBaseItemSystem(oldData)

  newData.ski = {
    ...oldData.ski,
    import: Number(oldData.ski.import),
    relativelevel: String(oldData.ski.relativelevel),
  }

  return newData
}

/* ---------------------------------------- */

function migrateSpellSystem(oldData: Spell): NewDataWrapper<'spellV2'> {
  const newData: NewDataWrapper<'spellV2'> = migrateBaseItemSystem(oldData)

  newData.spl = {
    ...oldData.spl,
    import: Number(oldData.spl.import),
    relativelevel: String(oldData.spl.relativelevel),
  }

  return newData
}

/* ---------------------------------------- */

export { migrateItemSystem }
