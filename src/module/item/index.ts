import { GurpsModule } from '@gurps-types/gurps-module.js'

import * as dataModels from './data/index.js'
import { GurpsItemV2 } from './gurps-item.js'
import { GurpsItemSheet } from './item-sheet.js'
import { TestItemSheet } from './test-item-sheet.js'

function init() {
  console.log('GURPS | Initializing GURPS Item module.')
  Hooks.on('init', () => {
    CONFIG.Item.documentClass = GurpsItemV2

    CONFIG.Item.dataModels = {
      featureV2: dataModels.TraitModel,
      skillV2: dataModels.SkillModel,
      spellV2: dataModels.SpellModel,
      equipmentV2: dataModels.EquipmentModel,
      gcsTrait: dataModels.GcsTraitModel,
      gcsTraitModifier: dataModels.GcsTraitModifierModel,
      gcsSkill: dataModels.GcsSkillModel,
      gcsSpell: dataModels.GcsSpellModel,
      gcsEquipment: dataModels.GcsEquipmentModel,
      gcsEquipmentModifier: dataModels.GcsEquipmentModifierModel,
      gcsNote: dataModels.GcsNoteModel,
    }

    foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)
    foundry.documents.collections.Items.registerSheet('gurps', GurpsItemSheet, { makeDefault: true })

    // NOTE: This sheet is hidden from Users but can be set by invoking
    // (item).setFlag("core","sheetClass","gurps.TestItemSheet")
    // @ts-expect-error: broken typing
    foundry.documents.collections.Items.registerSheet('gurps', TestItemSheet, {
      makeDefault: true,
      types: ['gcsEquipment'],
      canConfigure: false,
    })
  })
}

export const Item: GurpsModule = {
  init,
}
