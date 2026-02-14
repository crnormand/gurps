import { GurpsModule } from '@gurps-types/gurps-module.js'

import * as dataModels from './data/index.js'
import { GurpsItemV2 } from './gurps-item.js'
import { GurpsItemSheet } from './item-sheet.js'
import { migrateItemSystem } from './migrate.js'

interface ItemModule extends GurpsModule {
  migrateItemSystem: typeof migrateItemSystem
}

function init() {
  console.log('GURPS | Initializing GURPS Item module.')
  Hooks.on('init', () => {
    CONFIG.Item.documentClass = GurpsItemV2

    CONFIG.Item.dataModels = {
      featureV2: dataModels.TraitModel,
      skillV2: dataModels.SkillModel,
      spellV2: dataModels.SpellModel,
      equipmentV2: dataModels.EquipmentModel,
    }

    foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)
    foundry.documents.collections.Items.registerSheet('gurps', GurpsItemSheet, { makeDefault: true })
  })
}

export const Item: ItemModule = {
  init,
  migrateItemSystem,
}
