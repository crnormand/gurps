import { FeatureType } from "@feature"
import { AttributeBonusLimitation } from "@feature/attribute_bonus"
import { DurationType } from "@item/effect"
import { gid, SYSTEM_NAME } from "@module/data"
import { i18n } from "@util"
import { StatusEffect } from "types/foundry/client/data/documents/token"
import { ConditionID, ConditionSystemData, ManeuverID } from "./data"

export function getConditionList(): Record<ConditionID, Partial<ConditionSystemData>> {
	const ConditionList: Record<ConditionID, Partial<ConditionSystemData>> = {
		[ConditionID.PostureCrouch]: {
			id: ConditionID.PostureCrouch,
			modifiers: [
				{ name: i18n("gurps.modifier.cover.crouching_no_cover"), modifier: -2 },
				{ name: i18n("gurps.modifier.cover.melee_crouching"), modifier: -2 },
				{ name: i18n("gurps.modifier.cover.ranged_crouching"), modifier: -2 },
				{ name: i18n("gurps.modifier.cover.hit_ranged_crouching"), modifier: -2 },
			],
		},
		[ConditionID.PostureKneel]: {
			id: ConditionID.PostureKneel,
			modifiers: [
				{ name: i18n("gurps.modifier.cover.melee_kneeling"), modifier: -2 },
				{ name: i18n("gurps.modifier.cover.defense_kneeling"), modifier: -2 },
			],
		},
		[ConditionID.PostureSit]: {
			id: ConditionID.PostureSit,
			modifiers: [{ name: i18n("gurps.modifier.cover.ranged_sitting"), modifier: -2 }],
		},
		[ConditionID.PostureCrawl]: {
			id: ConditionID.PostureCrawl,
			modifiers: [
				{ name: i18n("gurps.modifier.cover.melee_crawling"), modifier: -4 },
				{ name: i18n("gurps.modifier.cover.defense_crawling"), modifier: -3 },
			],
		},
		[ConditionID.PostureProne]: {
			id: ConditionID.PostureProne,
			modifiers: [
				{ name: i18n("gurps.modifier.cover.prone_no_cover"), modifier: -4 },
				{ name: i18n("gurps.modifier.cover.prone_head_up"), modifier: -5 },
				{ name: i18n("gurps.modifier.cover.prone_head_down"), modifier: -7 },
			],
		},
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
		[ConditionID.Crippled]: { id: ConditionID.Crippled },
		[ConditionID.Bleeding]: { id: ConditionID.Bleeding },
		[ConditionID.Dead]: { id: ConditionID.Dead },
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
			can_level: true,
			levels: {
				current: 0,
				max: 12,
			},
		},
		[ConditionID.Unconscious]: { id: ConditionID.Unconscious },
		[ConditionID.Sleeping]: { id: ConditionID.Sleeping },
		[ConditionID.Coma]: { id: ConditionID.Coma },
		[ConditionID.Stun]: { id: ConditionID.Stun },
		[ConditionID.MentalStun]: { id: ConditionID.MentalStun },
		[ConditionID.Poisoned]: { id: ConditionID.Poisoned },
		[ConditionID.Burning]: { id: ConditionID.Burning },
		[ConditionID.Cold]: { id: ConditionID.Cold },
		[ConditionID.Disarmed]: { id: ConditionID.Disarmed },
		[ConditionID.Falling]: { id: ConditionID.Falling },
		[ConditionID.Grappled]: { id: ConditionID.Grappled },
		[ConditionID.Restrained]: { id: ConditionID.Restrained },
		[ConditionID.Pinned]: { id: ConditionID.Pinned },
		[ConditionID.Sprinting]: { id: ConditionID.Sprinting },
		[ConditionID.Flying]: { id: ConditionID.Flying },
		[ConditionID.Stealth]: { id: ConditionID.Stealth },
		[ConditionID.Waiting]: { id: ConditionID.Waiting },
		[ConditionID.Invisible]: { id: ConditionID.Invisible },
		[ConditionID.Coughing]: { id: ConditionID.Coughing },
		[ConditionID.Retching]: { id: ConditionID.Retching },
		[ConditionID.Nausea]: { id: ConditionID.Nausea },
		[ConditionID.Agony]: { id: ConditionID.Agony },
		[ConditionID.Seizure]: { id: ConditionID.Seizure },
		[ConditionID.Blinded]: { id: ConditionID.Blinded },
		[ConditionID.Deafened]: { id: ConditionID.Deafened },
		[ConditionID.Silenced]: { id: ConditionID.Silenced },
		[ConditionID.Choking]: { id: ConditionID.Choking },
		[ConditionID.HeartAttack]: { id: ConditionID.HeartAttack },
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
		[ConditionID.Daze]: { id: ConditionID.Daze },
	}

	return ConditionList
}

export const StatusEffectsGURPS: StatusEffect[] = [
	...[...Object.values(ConditionID)].map(e => {
		const effect: StatusEffect = {
			id: e,
			icon: `systems/${SYSTEM_NAME}/assets/status/${e}.webp`,
			label: `gurps.status.${e}`,
		}
		return effect
	}),
	...[...Object.values(ManeuverID)].map(e => {
		const effect: StatusEffect = {
			id: e,
			icon: `systems/${SYSTEM_NAME}/assets/maneuver/${e}.webp`,
			label: `gurps.maneuver.${e}`,
		}
		return effect
	}),
]
