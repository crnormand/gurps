import { GurpsModule } from '@gurps-types/gurps-module.js'

import * as dataModels from './data/index.js'
import { GurpsItemV2 } from './gurps-item.js'
import { GurpsItemSheet } from './item-sheet.js'
import { migrateItem, runMigration, migrateItemCompendium } from './migrate.js'
import { TestItemSheet } from './test-item-sheet.js'
import { ItemType } from './types.js'

interface ItemModule extends GurpsModule {
  migrateItemCompendium: typeof migrateItemCompendium
  migrateItem: typeof migrateItem
  migrate: typeof runMigration
}

function init() {
  console.log('GURPS | Initializing GURPS Item module.')
  Hooks.on('init', () => {
    CONFIG.Item.documentClass = GurpsItemV2

    CONFIG.Item.dataModels = {
      [ItemType.Trait]: dataModels.TraitModel,
      [ItemType.Skill]: dataModels.SkillModel,
      [ItemType.Spell]: dataModels.SpellModel,
      [ItemType.Equipment]: dataModels.EquipmentModel,
      [ItemType.GcsTrait]: dataModels.GcsTraitModel,
      [ItemType.GcsTraitModifier]: dataModels.GcsTraitModifierModel,
      [ItemType.GcsSkill]: dataModels.GcsSkillModel,
      [ItemType.GcsSpell]: dataModels.GcsSpellModel,
      [ItemType.GcsEquipment]: dataModels.GcsEquipmentModel,
      [ItemType.GcsEquipmentModifier]: dataModels.GcsEquipmentModifierModel,
      [ItemType.GcsNote]: dataModels.GcsNoteModel,
    }

    foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)
    foundry.documents.collections.Items.registerSheet('gurps', GurpsItemSheet, { makeDefault: true })

    // NOTE: This sheet is hidden from Users but can be set by invoking
    // (item).setFlag("core","sheetClass","gurps.TestItemSheet")
    // @ts-expect-error: broken typing
    foundry.documents.collections.Items.registerSheet('gurps', TestItemSheet, {
      makeDefault: true,
      types: [ItemType.GcsEquipment],
      canConfigure: false,
    })
  })
}

export const Item: ItemModule = {
  init,
  migrateItem,
  migrateItemCompendium,
  migrate: runMigration,
}
