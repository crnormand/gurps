import { BaseItemSourceGURPS } from "@item/base/data"
import { EffectSystemData } from "@item/effect"
import { ItemType } from "@module/data"

export enum ConditionID {
	// Posture
	PostureCrouch = "posture_crouch",
	PostureKneel = "posture_kneel",
	PostureSit = "posture_sit",
	PostureCrawl = "posture_crawl",
	PostureProne = "posture_prone",
	// Serious Damage
	Reeling = "reeling",
	Fatigued = "fatigued",
	Crippled = "crippled",
	Bleeding = "bleeding",
	Dead = "dead",
	// Shock / Unconsciousness
	Shock = "shock",
	Pain = "pain",
	Unconscious = "unconscious",
	Sleeping = "sleeping",
	Coma = "coma",
	// Confusion ?
	Stun = "stun",
	MentalStun = "mental_stun",
	Poisoned = "poisoned",
	Burning = "burning",
	Cold = "cold",
	// Movement Bad
	Disarmed = "disarmed",
	Falling = "falling",
	Grappled = "grappled",
	Restrained = "restrained",
	Pinned = "pinned",
	// Stealth / Movement Good
	Sprinting = "sprinting",
	Flying = "flying",
	Stealth = "stealth",
	Waiting = "waiting",
	Invisible = "invisible",
	// Afflictions
	Coughing = "coughing",
	Retching = "retching",
	Nausea = "nausea",
	Agony = "agony",
	Seizure = "seizure",
	// Disabled Function
	Blinded = "blind", // Inconsistency here between "blinded" and "blind" to match foundry default name
	Deafened = "deafened",
	Silenced = "silenced",
	Choking = "choking",
	HeartAttack = "heart_attack",
	// Drunk-adjacent
	Euphoria = "euphoria",
	Hallucinating = "hallucinating",
	Drunk = "drunk",
	Drowsy = "drowsy",
	Daze = "daze",
}

export const Postures = [
	ConditionID.PostureCrouch,
	ConditionID.PostureSit,
	ConditionID.PostureKneel,
	ConditionID.PostureProne,
	ConditionID.PostureCrawl,
]

export enum ManeuverID {
	// Row 1
	DoNothing = "do_nothing",
	Attack = "attack",
	AOA = "aoa",
	AOD = "aod",
	// Row 2
	Move = "move",
	MoveAndAttack = "move_attack",
	AOADouble = "aoa_double",
	AODDouble = "aod_double",
	// Row 3
	ChangePosture = "change_posture",
	Feint = "feint",
	AOAFeint = "aoa_feint",
	AODDodge = "aod_dodge",
	// Row 4
	Ready = "ready",
	Evaluate = "evaluate",
	AOADetermined = "aoa_determined",
	AODParry = "aod_parry",
	// Row 5
	Concentrate = "concentrate",
	Aiming = "aiming",
	AOAStrong = "aoa_strong",
	AODBlock = "aod_block",
	// Row 6
	Wait = "wait",
	BLANK_1 = "blank_1",
	AOASF = "aoa_suppressing_fire",
	BLANK_2 = "blank_2",
}

export type EffectID = ConditionID | ManeuverID

export type ConditionSource = BaseItemSourceGURPS<ItemType.Condition, ConditionSystemData>

export interface ConditionData extends Omit<ConditionSource, "effects">, ConditionSystemData {
	readonly type: ConditionSource["type"]
	readonly _source: ConditionSource
}

export interface ConditionSystemData extends EffectSystemData {
	id: ConditionID | ManeuverID | null
}
