export interface WeaponConstructionContext {
	ready?: boolean
	recursive?: boolean
}

export enum WeaponType {
	MeleeWeapon = "melee_weapon",
	RangedWeapon = "ranged_weapon",
}
