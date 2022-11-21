import { DrValue, HitLocation, HitLocationTable } from "../actor/character/data"
import { DamageType } from "./damage_type"
import { DiceGURPS } from "@module/dice"

type HitLocationCalc = {
	roll_range: string
	dr: Record<string, DrValue>
}

class HitLocationCalcAdapter {
	data: HitLocationCalc | undefined

	constructor(data: HitLocationCalc | undefined) {
		this.data = data
	}

	get roll_range(): string {
		return this.data?.roll_range ?? ""
	}

	dr(type: DamageType): number {
		if (!this.data) return 0
		let drValue: DrValue = this._getDrValue(this.data, type)
		return drValue.value
	}

	private _getDrValue(data: HitLocationCalc, type: DamageType): DrValue {
		return data.dr[`${type}`] ?? data.dr.all
	}

	isFlexible(type: DamageType): boolean {
		if (!this.data) return false
		let drValue: DrValue = this._getDrValue(this.data, type)
		return drValue?.flags?.flexible ?? false
	}
}

class HitLocationAdapter {
	data: HitLocation

	constructor(data: HitLocation) {
		this.data = data
	}

	get id(): string {
		return this.data.id
	}

	get choice_name(): string {
		return this.data.choice_name
	}

	get table_name(): string {
		return this.data.table_name
	}

	get slots(): number {
		return this.data.slots
	}

	get hit_penalty(): number {
		return this.data.hit_penalty
	}

	get dr_bonus(): number {
		return this.data.dr_bonus
	}

	get description(): string {
		return this.data.description
	}

	get sub_table(): HitLocationTableAdapter | undefined {
		return this.data.sub_table ? new HitLocationTableAdapter(this.data.sub_table) : undefined
	}

	get roll_range(): string | undefined {
		return this.data.roll_range
	}

	get dr(): Record<string, DrValue> | undefined {
		return this.data.dr
	}

	get calc(): HitLocationCalcAdapter | undefined {
		return new HitLocationCalcAdapter(this.data.calc)
	}
}

class HitLocationTableAdapter {
	data: HitLocationTable

	constructor(data: HitLocationTable) {
		this.data = data
	}

	get name(): string {
		return this.data.name
	}

	get roll(): DiceGURPS {
		return this.data.roll
	}

	get locations(): HitLocationAdapter[] {
		return this.data.locations.map(it => new HitLocationAdapter(it))
	}

	getLocation(id: string): HitLocationAdapter | undefined {
		return this.locations.find(it => it.id === id)
	}
}

export { HitLocationTableAdapter, HitLocationAdapter, HitLocationCalcAdapter, HitLocationCalc }
