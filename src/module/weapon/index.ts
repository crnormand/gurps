import { BaseWeapon } from "./base";
import { RangedWeapon } from "./ranged";
import { MeleeWeapon } from "./melee";

export type WeaponType = "melee_weapon" | "ranged_weapon";
export type Weapon = BaseWeapon | MeleeWeapon | RangedWeapon;

export { BaseWeapon } from "./base";
export { RangedWeapon } from "./ranged";
export { MeleeWeapon } from "./melee";
