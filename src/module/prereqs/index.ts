import { GurpsModule } from '@gurps-types/gurps-module.js'

import { AttributePrereq } from './attribute-prereq.js'
import { BasePrereq } from './base-prereq.js'
import { ContainedQuantityPrereq } from './contained-quantity-prereq.js'
import { ContainedWeightPrereq } from './contained-weight-prereq.js'
import { EquippedEquipmentPrereq } from './equipped-equipment-prereq.js'
import { PrereqList } from './prereq-list.js'
import { ScriptPrereq } from './script-prereq.js'
import { SkillPrereq } from './skill-prereq.js'
import { SpellPrereq } from './spell-prereq.js'
import { TraitPrereq } from './trait-prereq.js'
import { PrereqType } from './types.js'

/* ---------------------------------------- */

interface PrereqsModule extends GurpsModule {
  models: typeof PrereqClasses
}

/* ---------------------------------------- */

export const PrereqClasses = {
  [PrereqType.List]: PrereqList,
  [PrereqType.Trait]: TraitPrereq,
  [PrereqType.Attribute]: AttributePrereq,
  [PrereqType.ContainedQuantity]: ContainedQuantityPrereq,
  [PrereqType.ContainedWeight]: ContainedWeightPrereq,
  [PrereqType.EquippedEquipment]: EquippedEquipmentPrereq,
  [PrereqType.Skill]: SkillPrereq,
  [PrereqType.Spell]: SpellPrereq,
  [PrereqType.Script]: ScriptPrereq,
}

namespace Prereq {
  export type Type = PrereqType

  /* ---------------------------------------- */

  export type Any = InstanceType<ConstructorOfType<PrereqType>>
  export type OfType<Type extends PrereqType> = InstanceType<(typeof PrereqClasses)[Type]>
  export type AnyConstructor = (typeof PrereqClasses)[PrereqType]
  export type ConstructorOfType<Type extends PrereqType> = (typeof PrereqClasses)[Type]
}

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Prereqs module.')
  Hooks.on('init', () => {
    GURPS.CONFIG.PseudoDocument.Types.Prereq = BasePrereq

    GURPS.CONFIG.PseudoDocument.SubTypes.Prereq = {
      [PrereqType.List]: { documentClass: PrereqList, label: 'TYPES.Prereq.prereqList' },
      [PrereqType.Trait]: { documentClass: TraitPrereq, label: 'TYPES.Prereq.traitPrereq' },
      [PrereqType.Attribute]: { documentClass: AttributePrereq, label: 'TYPES.Prereq.attributePrereq' },
      [PrereqType.ContainedQuantity]: {
        documentClass: ContainedQuantityPrereq,
        label: 'TYPES.Prereq.containedQuantityPrereq',
      },
      [PrereqType.ContainedWeight]: {
        documentClass: ContainedWeightPrereq,
        label: 'TYPES.Prereq.containedWeightPrereq',
      },
      [PrereqType.EquippedEquipment]: {
        documentClass: EquippedEquipmentPrereq,
        label: 'TYPES.Prereq.equippedEquipmentPrereq',
      },
      [PrereqType.Skill]: { documentClass: SkillPrereq, label: 'TYPES.Prereq.skillPrereq' },
      [PrereqType.Spell]: { documentClass: SpellPrereq, label: 'TYPES.Prereq.spellPrereq' },
      [PrereqType.Script]: { documentClass: ScriptPrereq, label: 'TYPES.Prereq.scriptPrereq' },
    }
  })
}

/* ---------------------------------------- */

export const Prereqs: PrereqsModule = {
  init,
  models: PrereqClasses,
}

export {
  BasePrereq,
  ContainedQuantityPrereq,
  ContainedWeightPrereq,
  EquippedEquipmentPrereq,
  PrereqList,
  PrereqType,
  ScriptPrereq,
  SkillPrereq,
  SpellPrereq,
  TraitPrereq,
}

export type { Prereq }
