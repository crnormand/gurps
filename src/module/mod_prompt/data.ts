import { ModifierItem, SETTINGS, SYSTEM_NAME } from "@module/data"
import { i18n, i18n_f, Measure } from "@util"

// Const i18n = (game as Game).i18n ? (game as Game).i18n?.localize : (name: string) => { return name }
// const i18n_f = (game as Game).i18n ? (game as Game).i18n?.format : (name: string) => { return name }

/**
 *
 * @param GURPS
 */
export function loadModifiers(GURPS: any) {
	const meleeMods: ModifierItem[] = [
		{ tags: ["Melee Combat"], name: i18n("gurps.modifier.melee.determined"), modifier: 4, reference: "B365" },
		{ tags: ["Melee Combat"], name: i18n("gurps.modifier.melee.telegraphic"), modifier: 4, reference: "MA113" },
		{ tags: ["Melee Combat"], name: i18n("gurps.modifier.melee.deceptive"), modifier: -2, reference: "B369" },
		{ tags: ["Melee Combat"], name: i18n("gurps.modifier.melee.move"), modifier: -2, max: 9, reference: "B365" },
		{ tags: ["Melee Combat"], name: i18n("gurps.modifier.melee.strong"), modifier: 2, reference: "B365" },
		{
			tags: ["Melee Combat"],
			name: i18n("gurps.modifier.melee.mighty_blow"),
			modifier: 2,
			cost: { id: "fp", value: 1 },
			reference: "MA131",
		},
		{
			tags: ["Melee Combat"],
			name: i18n("gurps.modifier.melee.heroic_charge"),
			modifier: 0,
			cost: { id: "fp", value: 1 },
			reference: "MA131",
		},
	]
	GURPS.meleeMods = meleeMods
	const rangedMods: ModifierItem[] = [
		{ tags: ["Ranged Combat"], name: i18n("gurps.modifier.ranged.aim"), modifier: 1 },
		{ tags: ["Ranged Combat"], name: i18n("gurps.modifier.ranged.determined"), modifier: 1, reference: "B365" },
	]
	GURPS.rangedMods = rangedMods
	const defenseMods: ModifierItem[] = [
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.all_out_defense"), modifier: 2, reference: "B365" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.shield"), modifier: 1, reference: "B374" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.acrobatics_success"), modifier: 2, reference: "B374" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.dodge_and_drop"), modifier: 3, reference: "B377" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.dodge_retreat"), modifier: 3, reference: "B375" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.block_parry_retreat"), modifier: 1, reference: "B377" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.acrobatics_fail"), modifier: -2, reference: "B375" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.dodge_side"), modifier: -2, reference: "B390" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.dodge_rear"), modifier: -4, reference: "B391" },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.deceptive"), modifier: -1 },
		{ tags: ["Defense"], name: i18n("gurps.modifier.defense.will"), modifier: -1 },
		{
			tags: ["Defense"],
			name: i18n("gurps.modifier.defense.feverish_defense"),
			modifier: +2,
			cost: { id: "fp", value: 1 },
		},
	]
	GURPS.defenseMods = defenseMods

	const modifiersStatus: ModifierItem[] = [
		{ tags: ["Status"], name: i18n("gurps.modifier.status.status"), title: true },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.shock_1"), modifier: -1 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.shock_2"), modifier: -2 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.shock_3"), modifier: -3 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.shock_4"), modifier: -4 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.stunned"), modifier: -4 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.afflictions"), title: true },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.cough_dx"), modifier: -3 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.cough_iq"), modifier: -1 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.drowsy"), modifier: -2 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.drunk"), modifier: -4 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.tipsy"), modifier: -1 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.tipsy_cr"), modifier: -2 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.nausea"), modifier: -2 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.nausea_def"), modifier: -1 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.moderate_pain"), modifier: -2 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.moderate_pain_hpt"), modifier: -1 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.severe_pain"), modifier: -4 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.severe_pain_hpt"), modifier: -2 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.terrible_pain"), modifier: -6 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.terrible_pain_hpt"), modifier: -3 },
		{ tags: ["Status"], name: i18n("gurps.modifier.status.retching"), modifier: -5 },
	]

	// TODO: get default length units, use that for string, current values are in yards
	const modifiersSpeedStandard: ModifierItem[] = [
		...[
			[-1, 3],
			[-2, 5],
			[-3, 7],
			[-4, 10],
			[-5, 15],
			[-6, 20],
			[-7, 30],
			[-8, 50],
			[-9, 70],
			[-10, 100],
			[-11, 150],
			[-12, 200],
			[-13, 300],
			[-14, 500],
		].map(([r, d]) => {
			const adjDistance = Measure.lengthFormat(
				Measure.lengthFromNumber(d, Measure.LengthUnits.Yard),
				Measure.LengthUnits.Yard
			)
			return {
				tags: ["Range"],
				modifier: r,
				name: i18n_f("gurps.modifier.speed.range", { distance: adjDistance }),
			}
		}),
		{
			tags: ["Range"],
			modifier: -15,
			name: i18n_f("gurps.modifier.speed.range", {
				distance: `${Measure.lengthFormat(
					Measure.lengthFromNumber(500, Measure.LengthUnits.Yard),
					Measure.LengthUnits.Yard
				)}+`,
			}),
		},
	]
	const modifiersSpeedSimple: ModifierItem[] = [
		{ tags: ["Range"], name: i18n("gurps.modifier.speed.close"), modifier: 0 },
		{ tags: ["Range"], name: i18n("gurps.modifier.speed.short"), modifier: -3 },
		{ tags: ["Range"], name: i18n("gurps.modifier.speed.medium"), modifier: -7 },
		{ tags: ["Range"], name: i18n("gurps.modifier.speed.long"), modifier: -11 },
		{ tags: ["Range"], name: i18n("gurps.modifier.speed.extreme"), modifier: -15 },
	]

	const modifiersSpeedTens: ModifierItem[] = [...Array(50).keys()].map(e => {
		const adjDistance = Measure.lengthFormat(
			Measure.lengthFromNumber((e + 1) * 10, Measure.LengthUnits.Yard),
			Measure.LengthUnits.Yard
		)
		return {
			tags: ["Range"],
			modifier: -(e + 1),
			name: i18n_f("gurps.modifier.speed.range", { distance: adjDistance }),
		}
	})

	const modifiersSize: ModifierItem[] = [
		{ name: i18n("gurps.modifier.size.melee_ranged"), title: true },
		...[
			[-10, 1.5],
			[-9, 2],
			[-8, 3],
			[-7, 5],
			[-6, 8],
			[-5, 12],
			[-4, 18],
			[-3, 12 * 2],
			[-2, 12 * 3],
			[-1, 12 * 4.5],
			[0, 12 * 6],
			[1, 12 * 9],
			[2, 12 * 15],
			[3, 12 * 21],
			[4, 12 * 30],
			[5, 12 * 45],
			[6, 12 * 60],
			[7, 12 * 90],
			[8, 12 * 150],
			[9, 12 * 210],
			[10, 12 * 300],
		].map(([m, l]) => {
			let size = ""
			if (l < 12) {
				size = `${Measure.lengthFormat(l, Measure.LengthUnits.Inch)} (${Measure.lengthFormat(
					l,
					Measure.LengthUnits.Centimeter
				)})`
			} else if (l < 12 * 3) {
				size = `${Measure.lengthFormat(l, Measure.LengthUnits.Feet)} (${Measure.lengthFormat(
					l,
					Measure.LengthUnits.Centimeter
				)})`
			} else {
				size = `${Measure.lengthFormat(l, Measure.LengthUnits.Yard)}/${Measure.lengthFormat(
					l,
					Measure.LengthUnits.Feet
				)} (${Measure.lengthFormat(l, Measure.LengthUnits.Meter)})`
			}
			return {
				tags: ["Size"],
				modifier: m,
				name: i18n_f("gurps.modifier.size.size", { size: size }),
			}
		}),
	]

	const modifiersLocation: ModifierItem[] = [
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.eyes"), modifier: -9 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.skull"), modifier: -7 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.skull_behind"), modifier: -5 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.face"), modifier: -5 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.face_behind"), modifier: -7 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.nose"), modifier: -7 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.jaw"), modifier: -6 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.neck_vein"), modifier: -8 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.limb_vein"), modifier: -5 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.arm_shield"), modifier: -4 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.arm"), modifier: -2 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.torso"), modifier: 0 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.vitals"), modifier: -3 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.heart"), modifier: -5 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.groin"), modifier: -3 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.leg"), modifier: -2 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.hand"), modifier: -4 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.foot"), modifier: -4 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.neck"), modifier: -5 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.chinks_torso"), modifier: -8 },
		{ tags: ["Hit Location"], name: i18n("gurps.modifier.hit_location.chinks_other"), modifier: -10 },
	]

	const modifiersCover: ModifierItem[] = [
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.cover"), title: true },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.head_only"), modifier: -5 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.head_and_shoulders"), modifier: -4 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.half_exposed"), modifier: -3 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.light_cover"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.same_sized_figure"), modifier: -4 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.prone_no_cover"), modifier: -4 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.prone_head_up"), modifier: -5 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.prone_head_down"), modifier: -7 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.crouching_no_cover"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.occupied_hex"), modifier: -4 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.posture"), title: true },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.melee_crawling"), modifier: -4 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.ranged_sitting"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.defense_crawling"), modifier: -3 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.melee_crouching"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.ranged_crouching"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.hit_ranged_crouching"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.melee_kneeling"), modifier: -2 },
		{ tags: ["Cover"], name: i18n("gurps.modifier.cover.defense_kneeling"), modifier: -2 },
	]

	const modifiersDifficulty: ModifierItem[] = [
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.automatic"), modifier: 10 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.trivial"), modifier: 8 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.very_easy"), modifier: 6 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.easy"), modifier: 4 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.very_favorable"), modifier: 2 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.favorable"), modifier: 1 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.unfavorable"), modifier: -1 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.very_unfavorable"), modifier: -2 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.hard"), modifier: -4 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.very_hard"), modifier: -6 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.dangerous"), modifier: -8 },
		{ tags: ["Difficulty"], name: i18n("gurps.modifier.task_difficulty.impossible"), modifier: -10 },
	]

	const modifiersQuality: ModifierItem[] = [
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.best_possible"), modifier: -10 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.best_possible"), modifier: 4 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.fine"), modifier: 2 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.good"), modifier: 1 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.improvised"), modifier: -2 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.improvised_tech"), modifier: -5 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.missing"), modifier: -1 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.none"), modifier: -5 },
		{ tags: ["Quality"], name: i18n("gurps.modifier.equipment_quality.none_tech"), modifier: -10 },
	]

	const modifiersLighting: ModifierItem[] = [
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.torch"), modifier: -1 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.flashlight"), modifier: -2 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.candlelight"), modifier: -3 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.full_moon"), modifier: -4 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.half_moon"), modifier: -5 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.quarter_moon"), modifier: -6 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.starlight"), modifier: -7 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.starlight_clouds"), modifier: -8 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.moonless"), modifier: -9 },
		{ tags: ["Lighting"], name: i18n("gurps.modifier.light.total_darkness"), modifier: -10 },
	]

	const modifiersRof: ModifierItem[] = [
		...[
			[1, "5-8"],
			[2, "9-12"],
			[3, "13-15"],
			[4, "17-24"],
			[5, "25-49"],
			[6, "50-99"],
		].map(([m, l]) => {
			return { name: i18n_f("gurps.modifier.rof.rof", { rof: l }), modifier: Number(m) }
		}),
	]

	let modifiersSpeed: ModifierItem[] = []
	const modifierSetting = (game as Game).settings.get(SYSTEM_NAME, SETTINGS.SSRT)
	if (modifierSetting === "standard") modifiersSpeed = modifiersSpeedStandard
	else if (modifierSetting === "simplified") modifiersSpeed = modifiersSpeedSimple
	else if (modifierSetting === "tens") modifiersSpeed = modifiersSpeedTens

	const commonMods: { title: string; items: ModifierItem[]; open?: boolean }[] = [
		{
			title: i18n("gurps.modifier.status.title"),
			items: modifiersStatus,
		},
		{
			title: i18n("gurps.modifier.speed.title"),
			items: modifiersSpeed,
		},
		{
			title: i18n("gurps.modifier.size.title"),
			items: modifiersSize,
		},
		{
			title: i18n("gurps.modifier.hit_location.title"),
			items: modifiersLocation,
		},
		{
			title: i18n("gurps.modifier.cover.title"),
			items: modifiersCover,
		},
		{
			title: i18n("gurps.modifier.task_difficulty.title"),
			items: modifiersDifficulty,
		},
		{
			title: i18n("gurps.modifier.equipment_quality.title"),
			items: modifiersQuality,
		},
		{
			title: i18n("gurps.modifier.light.title"),
			items: modifiersLighting,
		},
		{
			title: i18n("gurps.modifier.rof.title"),
			items: modifiersRof,
		},
	]
	GURPS.commonMods = commonMods
	GURPS.allMods = [
		...meleeMods,
		...rangedMods,
		...defenseMods,
		...modifiersStatus,
		...modifiersSpeed,
		...modifiersSize,
		...modifiersLocation,
		...modifiersCover,
		...modifiersDifficulty,
		...modifiersQuality,
		...modifiersLighting,
		...modifiersRof,
	].filter(e => !(e as any).title)
}
