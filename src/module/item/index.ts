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
      feature: dataModels.TraitModel,
      skill: dataModels.SkillModel,
      spell: dataModels.SpellModel,
      equipment: dataModels.EquipmentModel,
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

    // @ts-expect-error: Invalid type
    GURPS.CONFIG ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument.Types ||= {}
    GURPS.CONFIG.PseudoDocument.Types.ReactionModifier = ReactionModifier
    GURPS.CONFIG.PseudoDocument.Types.ConditionalModifier = ConditionalModifier

    foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)
    foundry.documents.collections.Items.registerSheet('gurps', sheets.GurpsItemSheet, {
      types: [ItemType.Trait, ItemType.Skill, ItemType.Spell, ItemType.Equipment],
      makeDefault: true,
    })
  })
}

export const Item: GurpsModule = {
  init,
  migrations,
}
