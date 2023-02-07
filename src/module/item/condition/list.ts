import { FeatureType } from "@feature"
import { AttributeBonusLimitation } from "@feature/attribute_bonus"
import { DurationType } from "@item/effect"
import { gid, SYSTEM_NAME } from "@module/data"
import { StatusEffect } from "types/foundry/client/data/documents/token"
import { ConditionID, ConditionSystemData } from "./data"

export const ConditionList: Record<ConditionID, Partial<ConditionSystemData>> = {
	[ConditionID.PostureCrouch]: { id: ConditionID.PostureCrouch },
	[ConditionID.PostureKneel]: { id: ConditionID.PostureKneel },
	[ConditionID.PostureSit]: { id: ConditionID.PostureSit },
	[ConditionID.PostureProne]: { id: ConditionID.PostureProne },
	[ConditionID.Reeling]: {
		id: ConditionID.Reeling,
		features: [
			{
				type: FeatureType.ThresholdBonus,
				ops: ["halve_move", "halve_dodge"],
			},
		],
	},
	[ConditionID.Fatigued]: {
		id: ConditionID.Fatigued,
		features: [
			{
				type: FeatureType.ThresholdBonus,
				ops: ["halve_move", "halve_dodge", "halve_st"],
			},
		],
	},
	[ConditionID.Bleeding]: { id: ConditionID.Bleeding },
	[ConditionID.Posioned]: { id: ConditionID.Posioned },
	[ConditionID.Shock]: {
		id: ConditionID.Shock,
		can_level: true,
		levels: {
			current: 0,
			max: 4,
		},
		duration: {
			type: DurationType.Rounds,
			rounds: 1,
		},
		features: [
			{
				type: FeatureType.AttributeBonus,
				attribute: gid.Dexterity,
				limitation: AttributeBonusLimitation.None,
				effective: true,
				per_level: true,
				amount: -1,
			},
			{
				type: FeatureType.AttributeBonus,
				attribute: gid.Intelligence,
				limitation: AttributeBonusLimitation.None,
				effective: true,
				per_level: true,
				amount: -1,
			},
		],
	},
	[ConditionID.Pain]: {
		id: ConditionID.Pain,
		can_level: false,
		levels: {
			current: 0,
			max: 12,
		},
	},
	[ConditionID.Agony]: { id: ConditionID.Agony },
	[ConditionID.Crippled]: { id: ConditionID.Crippled },
	[ConditionID.Sprinting]: { id: ConditionID.Sprinting },
	[ConditionID.Flying]: { id: ConditionID.Flying },
	[ConditionID.Falling]: { id: ConditionID.Falling },
	[ConditionID.Disarmed]: { id: ConditionID.Disarmed },
	[ConditionID.Stun]: { id: ConditionID.Stun },
	[ConditionID.MentalStun]: { id: ConditionID.MentalStun },
	[ConditionID.Daze]: { id: ConditionID.Daze },
	[ConditionID.Seizure]: { id: ConditionID.Seizure },
	[ConditionID.Grappled]: { id: ConditionID.Grappled },
	[ConditionID.Restrained]: { id: ConditionID.Restrained },
	[ConditionID.Pinned]: { id: ConditionID.Pinned },
	[ConditionID.Paralysis]: { id: ConditionID.Paralysis },
	[ConditionID.Unconscious]: { id: ConditionID.Unconscious },
	[ConditionID.Sleeping]: { id: ConditionID.Sleeping },
	[ConditionID.Coma]: { id: ConditionID.Coma },
	[ConditionID.Dead]: { id: ConditionID.Dead },
	[ConditionID.Stealth]: { id: ConditionID.Stealth },
	[ConditionID.Invisible]: { id: ConditionID.Invisible },
	[ConditionID.Incorporeal]: { id: ConditionID.Incorporeal },
	[ConditionID.Waiting]: { id: ConditionID.Waiting },
	[ConditionID.Euphoria]: { id: ConditionID.Euphoria },
	[ConditionID.Hallucinating]: { id: ConditionID.Hallucinating },
	[ConditionID.Drunk]: {
		id: ConditionID.Drunk,
		can_level: true,
		levels: {
			current: 0,
			max: 2,
		},
	},
	[ConditionID.Drowsy]: { id: ConditionID.Drowsy },
	[ConditionID.Silenced]: { id: ConditionID.Silenced },
	[ConditionID.Deafened]: { id: ConditionID.Deafened },
	[ConditionID.Blinded]: { id: ConditionID.Blinded },
	[ConditionID.Choking]: { id: ConditionID.Choking },
}

export const StatusEffectsGURPS: StatusEffect[] = [...Object.values(ConditionID)].map(e => {
	const effect: StatusEffect = {
		id: e,
		icon: `systems/${SYSTEM_NAME}/assets/status/${e}.png`,
		label: `gurps.status.${e}`,
	}
	if (e.includes("shock")) effect.duration = { turns: 1 }
	return effect
})
