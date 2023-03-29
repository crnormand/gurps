import { ActorGURPS } from "@module/config"
import { ActorType, ItemType, NumberComparison, PrereqType, WeightCompare } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, numberCompare, Weight } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export interface ContainedWeightPrereq extends BasePrereq {
	qualifier: WeightCompare
}

export class ContainedWeightPrereq extends BasePrereq {
	constructor(data: ContainedWeightPrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(ContainedWeightPrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.ContainedWeight,
			qualifier: { compare: NumberComparison.AtMost, qualifier: "5 lb" },
		})
	}

	satisfied(actor: ActorGURPS, exclude: any, tooltip: TooltipGURPS): [boolean, boolean] {
		if (actor.type === ActorType.LegacyCharacter) return [true, false]
		let satisfied = false
		const eqp = exclude
		if (eqp) {
			satisfied = eqp.type !== ItemType.EquipmentContainer
			if (!satisfied) {
				const units = (actor as any).settings.default_weight_units
				const weight = eqp.extendedWeight(false, units) - eqp.adjustedWeight(false, units)
				const qualifier = {
					compare: this.qualifier.compare,
					qualifier: Weight.fromString(this.qualifier.qualifier),
				}
				satisfied = numberCompare(weight, qualifier)
			}
		}
		if (!this.has) satisfied = !satisfied
		if (!satisfied) {
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.has[this.has ? "true" : "false"])
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.weight)
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.criteria[this.qualifier?.compare])
			tooltip.push((this.qualifier ? this.qualifier.qualifier : 0).toString())
		}
		return [satisfied, false]
	}
}
