import { ActorType, gid } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { TooltipGURPS } from "@module/tooltip"
import { i18n, i18n_f } from "@util"

/**
 * Breaking these out into their own file so as to not be dependent on any other types.
 */

export interface HitLocationTable {
	name: string
	roll: DiceGURPS
	locations: HitLocation[]
	owningLocation?: HitLocation
}

export interface HitLocationTableData {
	name: string
	roll: DiceGURPS
	locations: HitLocationData[]
}

export class HitLocation {
	actor: Actor

	owningTable: HitLocationTable

	id: string

	choice_name: string

	table_name: string

	slots: number

	hit_penalty: number

	dr_bonus: number

	description: string

	sub_table?: HitLocationTable

	roll_range: string

	calc: any

	// TODO: change "any" to something accepting both CharacterGURPS and other (for testing?)
	constructor(actor: any, owningTable: HitLocationTable, data?: HitLocationData) {
		this.id = "id"
		if (typeof game !== "undefined") {
			this.choice_name = i18n("gurps.placeholder.hit_location.choice_name")
			this.table_name = i18n("gurps.placeholder.hit_location.table_name")
		} else {
			this.choice_name = "untitled choice"
			this.table_name = "untitled location"
		}
		this.slots = 0
		this.hit_penalty = 0
		this.dr_bonus = 0
		this.description = ""
		this.actor = actor
		this.owningTable = owningTable
		this.roll_range = "-"
		this.calc = { roll_range: "-", dr: {} }

		if (data) {
			Object.assign(this, data)
			if (this.sub_table)
				for (let i = 0; i < this.sub_table?.locations.length; i++) {
					this.sub_table!.locations[i] = new HitLocation(actor, this.sub_table!, this.sub_table!.locations[i])
				}
		}
	}

	get DR(): Map<string, number> {
		return this._DR()
	}

	_DR(tooltip?: TooltipGURPS, drMap: Map<string, number> = new Map()): Map<string, number> {
		if (this.dr_bonus !== 0) {
			drMap.set(gid.All, this.dr_bonus)
			tooltip?.push(
				i18n_f("gurps.tooltip.dr_bonus", { item: this.choice_name, bonus: this.dr_bonus, type: gid.All })
			)
		}
		if (this.actor.type === ActorType.Character)
			drMap = (this.actor as any).addDRBonusesFor(this.id, tooltip, drMap)
		if (this.owningTable?.owningLocation) {
			drMap = this.owningTable.owningLocation._DR(tooltip, drMap)
		}
		if (tooltip && drMap?.entries.length !== 0) {
			drMap?.forEach(e => {
				tooltip.push(`TODO: ${e}`)
			})
		}
		this.calc.dr = Object.fromEntries(drMap)
		return drMap
	}

	get displayDR(): string {
		const dr = this.DR
		if (!dr.has(gid.All)) dr.set(gid.All, 0)
		let buffer = ""
		buffer += dr.get(gid.All)
		dr.forEach((v, id) => {
			if (id === gid.All) return
			buffer += `/${v}`
		})
		return buffer
	}

	updateRollRange(start: number): number {
		// This.calc ??= { roll_range: "", dr: {} }
		this.slots ??= 0
		if (this.slots === 0) this.roll_range = "-"
		else if (this.slots === 1) this.roll_range = start.toString()
		else {
			this.roll_range = `${start}-${start + this.slots - 1}`
		}
		if (this.sub_table) {
			let nested_start = new DiceGURPS(this.sub_table.roll).minimum(false)
			for (const l of this.sub_table.locations) {
				nested_start = l.updateRollRange(nested_start)
			}
		}
		this.calc.roll_range = this.roll_range
		return start + this.slots
	}
}

export interface HitLocationData {
	id: string
	choice_name: string
	table_name: string
	slots: number
	hit_penalty: number
	dr_bonus: number
	description: string
	sub_table?: HitLocationTableData
	calc?: {
		roll_range: string
		dr: Record<string, number>
	}
}
