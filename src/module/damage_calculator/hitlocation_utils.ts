import { HitLocation, HitLocationTable } from "@actor/character/hit_location"
import { gid } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { convertRollStringToArrayOfInt } from "@util/static"
import { DamageType } from "./damage_type"

export type HitLocationRollResult = {
	location: HitLocation | undefined
	roll: Roll
}

export const HitLocationUtil = {
	getHitLocation: function (table: HitLocationTable, location: string): HitLocation | undefined {
		return table.locations.find(it => it.id === location)
	},

	getHitLocationDR: function (location: HitLocation | undefined, damageType: DamageType): number {
		if (!location) return 0
		return location.DR.get(damageType) ?? location.DR.get(gid.All) ?? 0
	},

	isFlexibleArmor: function (location: HitLocation | undefined): boolean {
		if (!location) return false
		if (location.DR.has(gid.Flexible)) return location.DR.get(gid.Flexible)! > 0
		return false
	},

	rollRandomLocation: async function (hitLocationTable: HitLocationTable): Promise<HitLocationRollResult> {
		let result = undefined

		// TODO For Dice So Nice to appear, put this roll into the chat log.
		const roll = Roll.create(new DiceGURPS(hitLocationTable.roll).toString(true))
		await roll.evaluate({ async: true })
		const rollTotal = roll.total!

		for (const location of hitLocationTable.locations) {
			const x: number[] = convertRollStringToArrayOfInt(location.roll_range)
			if (x.includes(rollTotal)) {
				console.log(`Roll = ${rollTotal}, location id = ${location.id}`)
				result = location
			}
		}

		return {
			location: result,
			roll: roll,
		}
	},
}
