import { DiceGURPS } from "@module/dice"

/**
 * Breaking these out into their own file so as to not be dependent on any other types.
 */
export interface HitLocationTable {
	name: string
	roll: DiceGURPS
	locations: HitLocation[]
}

export interface DrValue {
	value: number
	flags?: Record<string, boolean>
}

export interface HitLocation {
	id: string
	choice_name: string
	table_name: string
	slots: number
	hit_penalty: number
	dr_bonus: number
	description: string
	sub_table?: HitLocationTable
	roll_range?: string
	dr?: Record<string, DrValue>
	calc?: {
		roll_range: string
		dr: Record<string, { value: number; flags?: Record<string, boolean> }>
	}
}
