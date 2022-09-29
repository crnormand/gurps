import { Feature } from "@feature"
import { ItemGURPS, TraitGURPS } from "@item"
import { TooltipGURPS } from "@module/tooltip"
import { LeveledAmount } from "@util/leveled_amount"

export type FeatureType =
	| "attribute_bonus"
	| "conditional_modifier"
	| "dr_bonus"
	| "reaction_bonus"
	| "skill_bonus"
	| "skill_point_bonus"
	| "spell_bonus"
	| "spell_point_bonus"
	| "weapon_bonus"
	| "cost_reduction"
	| "contained_weight_reduction"

export interface FeatureConstructionContext {
	ready?: boolean
}

export class BaseFeature {
	constructor(data: Feature | any, context: FeatureConstructionContext = {}) {
		this.type = data.type // Needed?
		if (context?.ready) {
			Object.assign(this, data)
		} else {
			mergeObject(context, { ready: true })
			const FeatureConstructor = (CONFIG as any).GURPS.Feature.classes[data.type as FeatureType]
			return FeatureConstructor ? new FeatureConstructor(data, context) : new BaseFeature(data, context)
		}
	}

	static get defaults(): Record<string, any> {
		return {
			amount: 1,
			per_level: false,
			levels: 0,
		}
	}

	get adjustedAmount(): number {
		return this.amount * (this.per_level ? this.levels || 0 : 1)
	}

	// Get levels(): number {
	// 	const parent: ItemGURPS = fromUuid(this.parent) as unknown as ItemGURPS
	// 	if (parent instanceof TraitGURPS) return parent.levels
	// 	return 1
	// }

	get levels(): number {
		if (this.item) {
			if (this.item instanceof TraitGURPS) return this.item.levels
			return 1
		}
		return this._levels
	}

	set levels(levels: number) {
		this._levels = levels
	}

	setParent(parent: ItemGURPS): void {
		this.parent = parent.uuid
	}

	get featureMapKey(): string {
		return "null"
	}

	addToTooltip(buffer?: TooltipGURPS): void {
		if (buffer) {
			buffer.push("\n")
			buffer.push(this.parent)
			buffer.push(
				` [${
					new LeveledAmount({
						level: this.levels,
						amount: this.amount,
						per_level: this.per_level,
					}).formatWithLevel
				}]`
			)
		}
	}
}

export interface BaseFeature {
	parent: string
	type: FeatureType
	item?: ItemGURPS
	amount: number
	per_level: boolean
	_levels: number
}
