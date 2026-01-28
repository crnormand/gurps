import { GurpsModule } from 'module/gurps-module.js'

import * as dataModels from './data/index.ts'
import { GurpsItemV2 } from './gurps-item.ts'
import { GurpsItemSheet } from './item-sheet.js'

function init() {
  console.log('GURPS | Initializing GURPS Actor module.')
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
  })
}

export const Item: GurpsModule = {
  init,
}
