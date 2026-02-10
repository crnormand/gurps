import { GurpsModule } from '@gurps-types/gurps-module.js'

import { AttributePrereq } from './attribute-prereq.js'
import { BasePrereq, PrereqType } from './base-prereq.js'
import { ContainedQuantityPrereq } from './contained-quantity-prereq.js'
import { ContainedWeightPrereq } from './contained-weight-prereq.js'
import { EquippedEquipmentPrereq } from './equipped-equipment-prereq.js'
import { PrereqList } from './prereq-list.js'
import { ScriptPrereq } from './script-prereq.js'
import { SkillPrereq } from './skill-prereq.js'
import { SpellPrereq } from './spell-prereq.js'
import { TraitPrereq } from './trait-prereq.js'

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

    GURPS.CONFIG.Prereq = {
      [PrereqType.List]: { documentClass: PrereqList },
      [PrereqType.Trait]: { documentClass: TraitPrereq },
      [PrereqType.Attribute]: { documentClass: AttributePrereq },
      [PrereqType.ContainedQuantity]: { documentClass: ContainedQuantityPrereq },
      [PrereqType.ContainedWeight]: { documentClass: ContainedWeightPrereq },
      [PrereqType.EquippedEquipment]: { documentClass: EquippedEquipmentPrereq },
      [PrereqType.Skill]: { documentClass: SkillPrereq },
      [PrereqType.Spell]: { documentClass: SpellPrereq },
      [PrereqType.Script]: { documentClass: ScriptPrereq },
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
