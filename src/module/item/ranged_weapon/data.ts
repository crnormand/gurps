import { BaseWeaponSource, BaseWeaponSystemData } from "@item/weapon"
import { ItemType } from "@module/data"

export type RangedWeaponSource = BaseWeaponSource<ItemType.RangedWeapon, RangedWeaponSystemData>

export interface RangedWeaponData extends Omit<RangedWeaponSource, "effects">, RangedWeaponSystemData {
	readonly type: RangedWeaponSource["type"]
	readonly _source: RangedWeaponSource
}

export interface RangedWeaponSystemData extends BaseWeaponSystemData {
	accuracy: string
	range: string
	rate_of_fire: string
	shots: string
	bulk: string
	recoil: string
}
