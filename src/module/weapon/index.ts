import { BaseWeapon } from "./base"
import { RangedWeapon } from "./ranged"
import { MeleeWeapon } from "./melee"

export type Weapon = BaseWeapon | MeleeWeapon | RangedWeapon

export { BaseWeapon, WeaponType } from "./base"
export { RangedWeapon } from "./ranged"
export { MeleeWeapon } from "./melee"
