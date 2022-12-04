import { HitLocation, HitLocationTable } from "@actor/character/hit_location"
import { DamageType } from "./damage_type"

export const getHitLocation = function (table: HitLocationTable, location: string): HitLocation | undefined {
	return table.locations.find(it => it.id === location)
}

export const getHitLocationDR = function (location: HitLocation | undefined, damageType: DamageType): number {
	if (!location || !location.calc) return 0
	return location.calc.dr[`${damageType}`]?.value ?? location.calc.dr.all.value
}

export const isFlexibleArmor = function (location: HitLocation | undefined): boolean {
	if (!location || !location.calc) return false
	return location.calc.dr?.all.flags?.flexible ?? false
}
