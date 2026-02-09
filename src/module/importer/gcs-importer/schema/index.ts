import { GcsEquipment } from './equipment.js'
import { GcsSkill } from './skill.js'
import { GcsSpell } from './spell.js'
import { GcsTrait } from './trait.js'

type AnyGcsItem = GcsTrait | GcsSkill | GcsEquipment | GcsSpell

export { type AnyGcsItem }
