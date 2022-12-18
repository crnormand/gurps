import { CharacterGURPS } from "@actor"
import { sanitize } from "@util"
import { AttributeDef, AttributeType, reserved_ids } from "./attribute_def"
import { PoolThreshold } from "./pool_threshold"

export interface AttributeObj {
	bonus?: number
	cost_reduction?: number
	order: number
	attr_id: string
	adj: number
	damage?: number
	attribute_def?: AttributeDef
	apply_ops?: boolean
	calc?: {
		value: number
		current?: number
		points: number
	}
}

export class Attribute {
	actor: CharacterGURPS

	bonus = 0 // ?

	cost_reduction = 0 // ?

	order: number

	attr_id: string

	adj = 0

	damage?: number

	apply_ops?: boolean

	constructor(actor: CharacterGURPS, attr_id: string, order: number, data?: any) {
		if (data) Object.assign(this, data)
		this.actor = actor
		this.attr_id = attr_id
		this.order = order
	}

	get id(): string {
		return this.attr_id
	}

	set id(v: string) {
		this.attr_id = sanitize(v, false, reserved_ids)
	}

	get attribute_def(): AttributeDef {
		return new AttributeDef(this.actor.settings.attributes.find(e => e.id === this.attr_id))
	}

	get max(): number {
		const def = this.attribute_def
		if (!def) return 0
		let max = def.baseValue(this.actor) + this.adj + this.bonus
		if (![AttributeType.Decimal, AttributeType.DecimalRef].includes(def.type)) {
			max = Math.floor(max)
		}
		return max
	}

	set max(v: number) {
		if (this.max === v) return
		const def = this.attribute_def
		if (def) this.adj = v - (def.baseValue(this.actor) + this.bonus)
	}

	get current(): number {
		const max = this.max
		const def = this.attribute_def
		if (!def || def.type !== AttributeType.Pool) {
			return max
		}
		return max - (this.damage ?? 0)
	}

	set current(v: number) {
		this.max = v
	}

	get currentThreshold(): Partial<PoolThreshold> | null {
		const def = this.attribute_def
		if (!def) return null
		if (
			[AttributeType.PrimarySeparator, AttributeType.SecondarySeparator, AttributeType.PoolSeparator].includes(
				def.type
			)
		)
			return null
		const cur = this.current
		if (def.thresholds) {
			for (const t of def.thresholds) {
				if (cur <= t.threshold!(this.actor)) return t
			}
		}
		return null
	}

	get points(): number {
		const def = this.attribute_def
		if (!def) return 0
		let sm = 0
		if (this.actor) sm = this.actor.adjustedSizeModifier
		return def.computeCost(this.actor, this.adj, this.cost_reduction, sm)
	}

	toObj(): AttributeObj {
		const obj: AttributeObj = {
			bonus: this.bonus,
			cost_reduction: this.cost_reduction,
			order: this.order,
			attr_id: this.attr_id,
			adj: this.adj,
		}
		if (this.damage) obj.damage = this.damage
		return obj
	}
}
