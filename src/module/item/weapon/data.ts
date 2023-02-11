import { BaseItemSourceGURPS } from "@item/base"
import { ItemType } from "@module/data"
import { SkillDefault } from "@module/default"

export type BaseWeaponSource<
	TItemType extends ItemType = ItemType,
	TSystemData extends BaseWeaponSystemData = BaseWeaponSystemData
> = BaseItemSourceGURPS<TItemType, TSystemData>

export interface WeaponDamageObj {
	// Parent: BaseWeaponGURPS | any
	type: string
	st: StrengthDamage
	base: string
	armor_divisor: number
	fragmentation: string
	fragmentation_armor_divisor: number
	fragmentation_type: string
	modifier_per_die: number
}

export interface BaseWeaponSystemData {
	id: string
	type: WeaponType
	strength: string
	usage: string
	usage_notes: string
	defaults: SkillDefault[]
	damage: WeaponDamageObj
}

export type WeaponType = ItemType.MeleeWeapon | ItemType.RangedWeapon

export type StrengthDamage = "none" | "thr" | "thr_leveled" | "sw" | "sw_leveled"
