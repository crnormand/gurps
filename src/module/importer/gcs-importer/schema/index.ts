import { GcsEquipment, GcsEquipmentCollection } from './equipment.js'
import { GcsSkill, GcsSkillCollection } from './skill.js'
import { GcsSpell, GcsSpellCollection } from './spell.js'
import { GcsTrait, GcsTraitCollection } from './trait.js'

type AnyGcsItem = GcsTrait | GcsSkill | GcsEquipment | GcsSpell

type AnyGcsItemCollection = GcsTraitCollection | GcsSkillCollection | GcsEquipmentCollection | GcsSpellCollection

export type { AnyGcsItem, AnyGcsItemCollection }
