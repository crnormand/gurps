import { ActorFlagsGURPS, ActorSystemData, ActorType, BaseActorSourceGURPS } from "@actor/base/data"

export const MoveModeTypes = {
	Ground: "gurps.character.move_modes.ground",
	Air: "gurps.character.move_modes.air",
	Water: "gurps.character.move_modes.water",
	Space: "gurps.character.move_modes.space",
}

export enum Posture {
	Standing = "standing",
	Prone = "prone",
	Kneeling = "kneeling",
	Crouching = "crouching",
	Sitting = "sitting",
	Crawling = "crawling",
}

export interface MoveMode {
	mode: typeof MoveModeTypes | string
	basic: number
	enhanced?: number
	default: boolean
}

export interface StaticCharacterSource extends BaseActorSourceGURPS<ActorType.CharacterGCA, StaticCharacterSystemData> {
	flags: DeepPartial<StaticCharacterFlags>
}
export interface StaticCharacterDataGURPS
	extends Omit<StaticCharacterSource, "effects" | "flags" | "items" | "token">,
	StaticCharacterSystemData {
	readonly type: StaticCharacterSource["type"]
	data: StaticCharacterSystemData
	flags: StaticCharacterFlags

	readonly _source: StaticCharacterSource
}

type StaticCharacterFlags = ActorFlagsGURPS & {
	gurps: {
		// Empty
	}
}

export interface StaticCharacterSystemData extends ActorSystemData {
	editing: boolean
	additionalresources: any
	attributes: {
		[key in StaticAttributeName]: StaticAttribute
	}
	pools: {
		[key: string]: {
			value: number
			min: number
			max: number
			points: number
		}
	}
	dodge: {
		value: number
		enc_level: number
	}
	basicmove: {
		value: string
		points: number
	}
	basicspeed: {
		value: string
		points: number
	}
	parry: number
	currentmove: number
	thrust: string
	swing: string
	frightcheck: number
	hearing: number
	tastesmell: number
	vision: number
	touch: number
	// TODO: change
	conditions: any
	traits: any
	encumbrance: any
	move: any
	reactions: any
	conditionalmods: any
	ads: any
	skills: any
	spells: any
	equipment: {
		carried: any
		other: any
	}
	eqtsummary: number
	melee: any
	ranged: any
	currentdodge: any
	languages: any
}

export enum StaticAttributeName {
	ST = "ST",
	DX = "DX",
	IQ = "IQ",
	HT = "HT",
	WILL = "WILL",
	PER = "PER",
	QN = "QN",
}

export enum StaticSecondaryAttributeName {
	frightCheck = "frightcheck",
	vision = "vision",
	hearing = "hearing",
	tasteSmell = "tastesmell",
	touch = "touch",
}

export interface StaticAttribute {
	import: number
	value: number
	points: number
	dtype: "Number"
}
