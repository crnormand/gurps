// Import { ModifierItem } from "@module/data"
// import { i18n, i18n_f, Measure } from "@util"

// const modifiersStatus: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.status.status") },
// 	{ name: i18n("gurps.modifier.status.shock_1"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.status.shock_2"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.status.shock_3"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.status.shock_4"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.status.stunned"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.status.afflictions") },
// 	{ name: i18n("gurps.modifier.status.cough_dx"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.status.cough_iq"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.status.drowsy"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.status.drunk"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.status.tipsy"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.status.tipsy_cr"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.status.nausea"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.status.nausea_def"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.status.moderate_pain"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.status.moderate_pain_hpt"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.status.severe_pain"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.status.severe_pain_hpt"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.status.terrible_pain"), modifier: -6 },
// 	{ name: i18n("gurps.modifier.status.terrible_pain_hpt"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.status.retching"), modifier: -5 },
// ]

// // TODO: get default length units, use that for string, current values are in yards
// const modifiersSpeed: ModifierItem[] = [
// 	...[
// 		[-1, 3],
// 		[-2, 5],
// 		[-3, 7],
// 		[-4, 10],
// 		[-5, 15],
// 		[-6, 20],
// 		[-7, 30],
// 		[-8, 50],
// 		[-9, 70],
// 		[-10, 100],
// 		[-11, 150],
// 		[-12, 200],
// 		[-13, 300],
// 		[-14, 500],
// 	].map((r, d) => {
// 		const adjDistance = Measure.lengthFormat(
// 			Measure.lengthFromNumber(d, Measure.LengthUnits.Yard),
// 			Measure.LengthUnits.Yard
// 		)
// 		return { modifier: r, name: i18n_f("gurps.modifier.speed.range", { distance: adjDistance }) }
// 	}),
// 	{
// 		modifier: -15,
// 		name: i18n_f("gurps.modifier.speed.range", {
// 			distance: `${Measure.lengthFormat(
// 				Measure.lengthFromNumber(500, Measure.LengthUnits.Yard),
// 				Measure.LengthUnits.Yard
// 			)}+`,
// 		}),
// 	},
// ]

// const modifiersSize: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.size.melee_ranged") },
// 	...[
// 		[-10, 1.5],
// 		[-9, 2],
// 		[-8, 3],
// 		[-7, 5],
// 		[-6, 8],
// 		[-5, 12],
// 		[-4, 18],
// 		[-3, 12 * 2],
// 		[-2, 12 * 3],
// 		[-1, 12 * 4.5],
// 		[0, 12 * 6],
// 		[1, 12 * 9],
// 		[2, 12 * 15],
// 		[3, 12 * 21],
// 		[4, 12 * 30],
// 		[5, 12 * 45],
// 		[6, 12 * 60],
// 		[7, 12 * 90],
// 		[8, 12 * 150],
// 		[9, 12 * 210],
// 		[10, 12 * 300],
// 	].map((m, l) => {
// 		let size = ""
// 		if (l < 12) {
// 			size = `${Measure.lengthFormat(l, Measure.LengthUnits.Inch)} (${Measure.lengthFormat(
// 				l,
// 				Measure.LengthUnits.Centimeter
// 			)})`
// 		} else if (l < 12 * 3) {
// 			size = `${Measure.lengthFormat(l, Measure.LengthUnits.Feet)} (${Measure.lengthFormat(
// 				l,
// 				Measure.LengthUnits.Centimeter
// 			)})`
// 		} else {
// 			size = `${Measure.lengthFormat(l, Measure.LengthUnits.Yard)}/${Measure.lengthFormat(
// 				l,
// 				Measure.LengthUnits.Feet
// 			)} (${Measure.lengthFormat(l, Measure.LengthUnits.Meter)})`
// 		}
// 		return {
// 			modifier: m,
// 			name: i18n_f("gurps.modifier.size.size", { size: size }),
// 		}
// 	}),
// ]

// const modifiersLocation: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.hit_location.eyes"), modifier: -9 },
// 	{ name: i18n("gurps.modifier.hit_location.skull"), modifier: -7 },
// 	{ name: i18n("gurps.modifier.hit_location.skull_behind"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.hit_location.face"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.hit_location.face_behind"), modifier: -7 },
// 	{ name: i18n("gurps.modifier.hit_location.nose"), modifier: -7 },
// 	{ name: i18n("gurps.modifier.hit_location.jaw"), modifier: -6 },
// 	{ name: i18n("gurps.modifier.hit_location.neck_vein"), modifier: -8 },
// 	{ name: i18n("gurps.modifier.hit_location.limb_vein"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.hit_location.arm_shield"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.hit_location.arm"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.hit_location.torso"), modifier: 0 },
// 	{ name: i18n("gurps.modifier.hit_location.vitals"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.hit_location.heart"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.hit_location.groin"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.hit_location.leg"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.hit_location.hand"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.hit_location.foot"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.hit_location.neck"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.hit_location.chinks_torso"), modifier: -8 },
// 	{ name: i18n("gurps.modifier.hit_location.chinks_other"), modifier: -10 },
// ]

// const modifiersCover: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.cover.cover") },
// 	{ name: i18n("gurps.modifier.cover.head_only"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.cover.head_and_shoulders"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.cover.half_exposed"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.cover.light_cover"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.same_sized_figure"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.cover.prone_no_cover"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.cover.prone_head_up"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.cover.prone_head_down"), modifier: -7 },
// 	{ name: i18n("gurps.modifier.cover.crouching_no_cover"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.occupied_hex"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.cover.posture") },
// 	{ name: i18n("gurps.modifier.cover.melee_crawling"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.cover.ranged_sitting"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.defense_crawling"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.cover.melee_crouching"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.ranged_crouching"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.hit_ranged_crouching"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.melee_kneeling"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.cover.defense_kneeling"), modifier: -2 },
// ]

// const modifiersDifficulty: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.task_difficulty.automatic"), modifier: 10 },
// 	{ name: i18n("gurps.modifier.task_difficulty.trivial"), modifier: 8 },
// 	{ name: i18n("gurps.modifier.task_difficulty.very_easy"), modifier: 6 },
// 	{ name: i18n("gurps.modifier.task_difficulty.easy"), modifier: 4 },
// 	{ name: i18n("gurps.modifier.task_difficulty.very_favorable"), modifier: 2 },
// 	{ name: i18n("gurps.modifier.task_difficulty.favorable"), modifier: 1 },
// 	{ name: i18n("gurps.modifier.task_difficulty.unfavorable"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.task_difficulty.very_unfavorable"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.task_difficulty.hard"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.task_difficulty.very_hard"), modifier: -6 },
// 	{ name: i18n("gurps.modifier.task_difficulty.dangerous"), modifier: -8 },
// 	{ name: i18n("gurps.modifier.task_difficulty.impossible"), modifier: -10 },
// ]

// const modifiersQuality: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.equipment_quality.best_possible"), modifier: -10 },
// 	{ name: i18n("gurps.modifier.equipment_quality.best_possible"), modifier: 4 },
// 	{ name: i18n("gurps.modifier.equipment_quality.fine"), modifier: 2 },
// 	{ name: i18n("gurps.modifier.equipment_quality.good"), modifier: 1 },
// 	{ name: i18n("gurps.modifier.equipment_quality.improvised"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.equipment_quality.improvised_tech"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.equipment_quality.missing"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.equipment_quality.none"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.equipment_quality.none_tech"), modifier: -10 },
// ]

// const modifiersLighting: ModifierItem[] = [
// 	{ name: i18n("gurps.modifier.light.torch"), modifier: -1 },
// 	{ name: i18n("gurps.modifier.light.flashlight"), modifier: -2 },
// 	{ name: i18n("gurps.modifier.light.candlelight"), modifier: -3 },
// 	{ name: i18n("gurps.modifier.light.full_moon"), modifier: -4 },
// 	{ name: i18n("gurps.modifier.light.half_moon"), modifier: -5 },
// 	{ name: i18n("gurps.modifier.light.quarter_moon"), modifier: -6 },
// 	{ name: i18n("gurps.modifier.light.starlight"), modifier: -7 },
// 	{ name: i18n("gurps.modifier.light.starlight_clouds"), modifier: -8 },
// 	{ name: i18n("gurps.modifier.light.moonless"), modifier: -9 },
// 	{ name: i18n("gurps.modifier.light.total_darkness"), modifier: -10 },
// ]

// const modifiersRof: ModifierItem[] = [
// 	...[
// 		[1, "5-8"],
// 		[2, "9-12"],
// 		[3, "13-15"],
// 		[4, "17-24"],
// 		[5, "25-49"],
// 		[6, "50-99"],
// 	].map((m, d) => {
// 		return { name: i18n_f("gurps.modifier.rof.rof", { rof: d }), modifier: m }
// 	}),
// ]

// export const common_modifiers: { title: string; items: ModifierItem[] }[] = [
// 	{
// 		title: i18n("gurps.modifier.status.title"),
// 		items: modifiersStatus,
// 	},
// 	{
// 		title: i18n("gurps.modifier.speed.title"),
// 		items: modifiersSpeed,
// 	},
// 	{
// 		title: i18n("gurps.modifier.size.title"),
// 		items: modifiersSize,
// 	},
// 	{
// 		title: i18n("gurps.modifier.hit_location.title"),
// 		items: modifiersLocation,
// 	},
// 	{
// 		title: i18n("gurps.modifier.cover.title"),
// 		items: modifiersCover,
// 	},
// 	{
// 		title: i18n("gurps.modifier.task_difficulty.title"),
// 		items: modifiersDifficulty,
// 	},
// 	{
// 		title: i18n("gurps.modifier.equipment_quality.title"),
// 		items: modifiersQuality,
// 	},
// 	{
// 		title: i18n("gurps.modifier.light.title"),
// 		items: modifiersLighting,
// 	},
// 	{
// 		title: i18n("gurps.modifier.rof.title"),
// 		items: modifiersRof,
// 	},
// ]
