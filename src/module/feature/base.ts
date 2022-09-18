import { Feature } from "@feature";
import { TooltipGURPS } from "@module/tooltip";
import { LeveledAmount } from "@util/leveled_amount";

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
	| "contained_weight_reduction";

export interface FeatureConstructionContext {
	ready?: boolean;
}

export class BaseFeature {
	constructor(data: Feature | any, context: FeatureConstructionContext = {}) {
		this.type = data.type; // Needed?
		if (context?.ready) {
			Object.assign(this, data);
		} else {
			mergeObject(context, { ready: true });
			const FeatureConstructor = (CONFIG as any).GURPS.Feature.classes[data.type as FeatureType];
			return FeatureConstructor ? new FeatureConstructor(data, context) : new BaseFeature(data, context);
		}
	}

	static get defaults(): Record<string, any> {
		return {
			amount: 1,
			per_level: false,
			levels: 0,
		};
	}

	get adjustedAmount(): number {
		return this.amount * (this.per_level ? this.levels || 0 : 1);
	}

	get featureMapKey(): string {
		return "null";
	}

	addToTooltip(buffer?: TooltipGURPS): void {
		if (buffer) {
			buffer.push("\n");
			buffer.push(this.parent);
			buffer.push(
				` [${
					new LeveledAmount({
						level: this.levels,
						amount: this.amount,
						per_level: this.per_level,
					}).formatWithLevel
				}]`
			);
		}
	}
}

export interface BaseFeature {
	parent: string;
	type: FeatureType;
	item?: string;
	amount: number;
	per_level: boolean;
	levels: number;
}
