import { BaseItemSourceGURPS } from "@item/base/data"
import { EffectSystemData } from "@item/effect"
import { ItemType } from "@module/data"

export enum ConditionID {
	// Posture
	PostureCrouch = "posture_crouch",
	PostureKneel = "posture_kneel",
	PostureSit = "posture_sit",
	PostureProne = "posture_prone",
	// Serious Damage
	Reeling = "reeling",
	Fatigued = "fatigued",
	Bleeding = "bleeding",
	Posioned = "poisoned",
	// Shock / Pain / Crippling
	Shock = "shock",
	Pain = "pain",
	Agony = "agony",
	Crippled = "crippled",
	// Movement ?
	Sprinting = "sprinting",
	Flying = "flying",
	Falling = "falling",
	Disarmed = "disarmed",
	// Confusion ?
	Stun = "stun",
	MentalStun = "mental_stun",
	Daze = "daze",
	Seizure = "seizure",
	// Movement Restriction
	Grappled = "grappled",
	Restrained = "restrained",
	Pinned = "pinned",
	Paralysis = "paralysis",
	// Unconsciousness
	Unconscious = "unconscious",
	Sleeping = "sleeping",
	Coma = "coma",
	Dead = "dead",
	// Stealth
	Stealth = "stealth",
	Invisible = "invisible",
	Incorporeal = "incorporeal",
	Waiting = "waiting",
	// Drunk-adjacent
	Euphoria = "euphoria",
	Hallucinating = "hallucinating",
	Drunk = "drunk",
	Drowsy = "drowsy",
	// Disabled Function
	Silenced = "silenced",
	Deafened = "deafened",
	Blinded = "blinded",
	Choking = "choking",
}

export type ConditionSource = BaseItemSourceGURPS<ItemType.Condition, ConditionSystemData>

export interface ConditionData extends Omit<ConditionSource, "effects">, ConditionSystemData {
	readonly type: ConditionSource["type"]
	readonly _source: ConditionSource
}

export interface ConditionSystemData extends EffectSystemData {
	id: ConditionID | null
}
