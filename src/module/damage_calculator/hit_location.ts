/**
 * Extend Settings.HitLocationTable to change the type of locations to an array of HitLocationWithCalc.
 */
type HitLocationCalc = { roll_range: string; dr: Record<string, any>; flexible: boolean }
type HitLocation = {
	calc: HitLocationCalc
	choice_name: string
	description: string
	dr_bonus: number
	hit_penalty: number
	id: string
	slots: number
	table_name: string
}

interface HitLocationTableWithCalc {
	name: string
	roll: string
	locations: HitLocation[]
}

export { HitLocation, HitLocationTableWithCalc }
