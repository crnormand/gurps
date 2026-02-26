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
import { PrereqType } from './types.ts'

/* ---------------------------------------- */

interface PrereqsModule extends GurpsModule {
  models: typeof PrereqClasses
}

/* ---------------------------------------- */

const PrereqClasses = {
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

/* ---------------------------------------- */

type AnyPrereq = InstanceType<PrereqClass<PrereqType>>
type Prereq<Type extends PrereqType> = InstanceType<(typeof PrereqClasses)[Type]>
type AnyPrereqClass = (typeof PrereqClasses)[PrereqType]
type PrereqClass<Type extends PrereqType> = (typeof PrereqClasses)[Type]

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Prereqs module.')
  Hooks.on('init', () => {
    // @ts-expect-error: Invalid type
    GURPS.CONFIG ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument ||= {}

    GURPS.CONFIG.PseudoDocument.Prereq = {
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
  PrereqClasses,
  PrereqList,
  PrereqType,
  ScriptPrereq,
  SkillPrereq,
  SpellPrereq,
  TraitPrereq,
}

export type { AnyPrereq, AnyPrereqClass, Prereq, PrereqClass }
