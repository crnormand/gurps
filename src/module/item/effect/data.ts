import { BaseItemSourceGURPS } from "@item/base/data"
import { FeatureConstructor } from "@module/config"
import { ItemType, RollModifier } from "@module/data"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"

export type EffectSource = BaseItemSourceGURPS<ItemType.Effect, EffectSystemData>

// Export interface EffectFlags extends ItemFlagsGURPS {
// 	aura: boolean
// }

export enum DurationType {
	Seconds = "seconds",
	Turns = "turns",
	Rounds = "rounds",
	None = "none",
}

export interface EffectData extends Omit<EffectSource, "effects">, EffectSystemData {
	readonly type: EffectSource["type"]
	readonly _source: EffectSource
}

export interface EffectSystemData {
	id: string | null
	features?: FeatureConstructor[]
	modifiers?: RollModifier[]
	can_level: boolean
	levels?: {
		max: number
		current: number
	}
	overlay?: boolean
	duration: {
		type: DurationType
		startRound?: number
		startTime?: number
		startTurn?: number
		rounds?: number
		seconds?: number
		turns?: number
		combat?: string | null
	}
}

export interface EffectModificationOptions extends DocumentModificationOptions {
	previousLevel: number
	previousID?: any
}
