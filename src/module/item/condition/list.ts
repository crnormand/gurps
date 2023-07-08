import { FeatureType } from "@feature"
import { AttributeBonusLimitation } from "@feature/attribute_bonus"
import { DurationType } from "@item/effect"
// import { ThresholdOp } from "@module/attribute"
import { gid, SYSTEM_NAME } from "@module/data"
import { LocalizeGURPS } from "@util"
import { StatusEffect } from "types/foundry/client/data/documents/token"
import { ConditionID, ConditionSystemData, ManeuverID } from "./data"

export function getConditionList(): Record<ConditionID, Partial<ConditionSystemData>> {
	const ConditionList: Record<ConditionID, Partial<ConditionSystemData>> = {
		[ConditionID.PostureCrouch]: {
			id: ConditionID.PostureCrouch,
			modifiers: [
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.crouching_no_cover, modifier: -2 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.melee_crouching, modifier: -2 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.ranged_crouching, modifier: -2 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.hit_ranged_crouching, modifier: -2 },
			],
		},
		[ConditionID.PostureKneel]: {
			id: ConditionID.PostureKneel,
			modifiers: [
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.melee_kneeling, modifier: -2 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.defense_kneeling, modifier: -2 },
			],
		},
		[ConditionID.PostureSit]: {
			id: ConditionID.PostureSit,
			modifiers: [{ name: LocalizeGURPS.translations.gurps.modifier.cover.ranged_sitting, modifier: -2 }],
		},
		[ConditionID.PostureCrawl]: {
			id: ConditionID.PostureCrawl,
			modifiers: [
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.melee_crawling, modifier: -4 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.defense_crawling, modifier: -3 },
			],
		},
		[ConditionID.PostureProne]: {
			id: ConditionID.PostureProne,
			modifiers: [
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.prone_no_cover, modifier: -4 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.prone_head_up, modifier: -5 },
				{ name: LocalizeGURPS.translations.gurps.modifier.cover.prone_head_down, modifier: -7 },
			],
		},
		[ConditionID.Reeling]: {
			id: ConditionID.Reeling,
			reference: "B419",
			features: [
				// {
				// 	type: FeatureType.ThresholdBonus,
				// 	ops: [ThresholdOp.HalveMove, ThresholdOp.HalveDodge],
				// },
			],
		},
		[ConditionID.Fatigued]: {
			id: ConditionID.Fatigued,
			reference: "B426",
			features: [
				// {
				// 	type: FeatureType.ThresholdBonus,
				// 	ops: [ThresholdOp.HalveMove, ThresholdOp.HalveDodge, ThresholdOp.HalveST],
				// },
			],
		},
		[ConditionID.Crippled]: { id: ConditionID.Crippled, reference: "B420" },
		[ConditionID.Bleeding]: { id: ConditionID.Bleeding, reference: "B420" },
		[ConditionID.Dead]: {
			id: ConditionID.Dead,
			reference: "B423",
		},
		[ConditionID.Shock]: {
			id: ConditionID.Shock,
			reference: "B419",
			can_level: true,
			levels: {
				current: 0,
				max: 8,
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
			reference: "B428",
			can_level: true,
			levels: {
				current: 0,
				max: 12,
			},
		},
		[ConditionID.Unconscious]: { id: ConditionID.Unconscious },
		[ConditionID.Sleeping]: { id: ConditionID.Sleeping },
		[ConditionID.Coma]: { id: ConditionID.Coma, reference: "B429" },
		[ConditionID.Stun]: { id: ConditionID.Stun, reference: "B420" },
		[ConditionID.MentalStun]: { id: ConditionID.MentalStun, reference: "B420" },
		[ConditionID.Poisoned]: { id: ConditionID.Poisoned },
		[ConditionID.Burning]: { id: ConditionID.Burning, reference: "B434" },
		[ConditionID.Cold]: { id: ConditionID.Cold, reference: "B430" },
		[ConditionID.Disarmed]: { id: ConditionID.Disarmed },
		[ConditionID.Falling]: { id: ConditionID.Falling, reference: "B431" },
		[ConditionID.Grappled]: {
			id: ConditionID.Grappled,
			reference: "B371",
			features: [
				{
					type: FeatureType.AttributeBonus,
					amount: -4,
					attribute: "dx",
					limitation: AttributeBonusLimitation.None,
					per_level: false,
				},
			],
		},
		[ConditionID.Restrained]: { id: ConditionID.Restrained },
		[ConditionID.Pinned]: { id: ConditionID.Pinned },
		[ConditionID.Sprinting]: { id: ConditionID.Sprinting, reference: "B354" },
		[ConditionID.Flying]: { id: ConditionID.Flying },
		[ConditionID.Stealth]: { id: ConditionID.Stealth, reference: "B222" },
		[ConditionID.Waiting]: { id: ConditionID.Waiting },
		[ConditionID.Invisible]: { id: ConditionID.Invisible },
		[ConditionID.Coughing]: { id: ConditionID.Coughing, reference: "B428" },
		[ConditionID.Retching]: { id: ConditionID.Retching, reference: "B429" },
		[ConditionID.Nausea]: {
			id: ConditionID.Nausea,
			reference: "B428",
			modifiers: [
				{ name: LocalizeGURPS.translations.gurps.modifier.attribute.all, modifier: -2 },
				{ name: LocalizeGURPS.translations.gurps.modifier.skill.all, modifier: -2 },
				{ name: LocalizeGURPS.translations.gurps.modifier.active_defense.all, modifier: -1 },
			],
		},
		[ConditionID.Agony]: { id: ConditionID.Agony, reference: "B428" },
		[ConditionID.Seizure]: { id: ConditionID.Seizure, reference: "B429" },
		[ConditionID.Blinded]: { id: ConditionID.Blinded },
		[ConditionID.Deafened]: { id: ConditionID.Deafened },
		[ConditionID.Silenced]: { id: ConditionID.Silenced },
		[ConditionID.Choking]: { id: ConditionID.Choking, reference: "B428" },
		[ConditionID.HeartAttack]: { id: ConditionID.HeartAttack, reference: "B429" },
		[ConditionID.Euphoria]: { id: ConditionID.Euphoria, reference: "B428" },
		[ConditionID.Hallucinating]: { id: ConditionID.Hallucinating, reference: "B429" },
		[ConditionID.Drunk]: {
			id: ConditionID.Drunk,
			reference: "B428",
			can_level: true,
			levels: {
				current: 0,
				max: 2,
			},
		},
		[ConditionID.Drowsy]: { id: ConditionID.Drowsy, reference: "B428" },
		[ConditionID.Daze]: { id: ConditionID.Daze, reference: "B428" },
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
