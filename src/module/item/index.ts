import { DocumentSheet } from '@gurps-types/foundry/index.js'
import { GurpsModule } from '@gurps-types/gurps-module.js'

import { ConditionalModifier, ReactionModifier } from './data/conditional-modifier.js'
import * as dataModels from './data/index.js'
import { GurpsItemV2 } from './gurps-item.js'
import { migrations } from './migrations/index.js'
import * as sheets from './sheets/index.js'
import { ItemType } from './types.js'

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

    GURPS.CONFIG.PseudoDocument.Types.ReactionModifier = ReactionModifier
    GURPS.CONFIG.PseudoDocument.Types.ConditionalModifier = ConditionalModifier

    foundry.documents.collections.Items.registerSheet('gurps', sheets.GurpsItemSheet, {
      makeDefault: true,
      canConfigure: false,
    })
    foundry.documents.collections.Items.registerSheet(
      'gurps',
      sheets.GurpsItemModernSheet as unknown as DocumentSheet.AnyConstructor,
      {
        makeDefault: true,
        types: [ItemType.Trait, ItemType.Skill, ItemType.Spell, ItemType.Equipment],
        label: 'GURPS.sheet.modernItemSheet.label',
      }
    )
  })
}

export const Item: GurpsModule = {
  init,
  migrations,
}
