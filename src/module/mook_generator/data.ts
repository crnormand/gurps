import { WeaponDamageObj } from "@item"
import { Difficulty } from "@module/data"

export interface MookProfile {
	name: string
	description: string
	title: string
	height: string
	weight: string
	SM: number
	portrait: string
}

interface _MookItem {
	name: string
	notes: string
	reference: string
	reference_highlight: string
}

export interface MookTrait extends _MookItem {
	points: number
	cr: number
}

type NewType = Difficulty

export interface MookSkill extends _MookItem {
	specialization: string
	tech_level: string
	difficulty: `${string}/${NewType}`
	points: number
	level: number
}

export interface MookSpell extends _MookItem {
	specialization: string
	tech_level: string
	difficulty: `${string}/${Difficulty}`
	points: number
	level: number
	college: Array<string>
}

export interface MookWeapon extends _MookItem {
	strength: string
	damage: WeaponDamageObj
	level: number
}

export interface MookMelee extends MookWeapon {
	reach: string
	parry: string
	block: string
}

export interface MookRanged extends MookWeapon {
	accuracy: string
	range: string
	rate_of_fire: string
	shots: string
	bulk: string
	recoil: string
	reference: string
	reference_highlight: string
}

export interface MookEquipment extends _MookItem {
	quantity: number
	tech_level: string
	legality_class: string
	value: number
	weight: string
	uses: number
	max_uses: number
}

export type MookNote = _MookItem
