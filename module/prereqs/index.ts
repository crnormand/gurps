import { GurpsModule } from '../gurps-module.ts'

import { AttributePrereq } from './attribute-prereq.ts'
import { PrereqType } from './base-prereq.ts'
import { ContainedQuantityPrereq } from './contained-quantity-prereq.ts'
import { ContainedWeightPrereq } from './contained-weight-prereq.ts'
import { EquippedEquipmentPrereq } from './equipped-equipment-prereq.ts'
import { PrereqList } from './prereq-list.ts'
import { ScriptPrereq } from './script-prereq.ts'
import { SkillPrereq } from './skill-prereq.ts'
import { SpellPrereq } from './spell-prereq.ts'
import { TraitPrereq } from './trait-prereq.ts'

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
  PrereqType,
  ContainedQuantityPrereq,
  ContainedWeightPrereq,
  EquippedEquipmentPrereq,
  PrereqList,
  ScriptPrereq,
  SkillPrereq,
  SpellPrereq,
  TraitPrereq,
  PrereqClasses,
}

export type { AnyPrereq, AnyPrereqClass, Prereq, PrereqClass }
