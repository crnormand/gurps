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
	Poisoned = "poisoned",
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
	Blinded = "blind", // Inconsistency here between "blinded" and "blind" to match foundry default name
	Choking = "choking",
}

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

export type ConditionSource = BaseItemSourceGURPS<ItemType.Condition, ConditionSystemData>

export interface ConditionData extends Omit<ConditionSource, "effects">, ConditionSystemData {
	readonly type: ConditionSource["type"]
	readonly _source: ConditionSource
}

export interface ConditionSystemData extends EffectSystemData {
	id: ConditionID | ManeuverID | null
}
