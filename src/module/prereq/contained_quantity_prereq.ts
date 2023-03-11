import { ItemType, NumberCompare, NumberComparison, PrereqType } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, numberCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export interface ContainedQuantityPrereq extends BasePrereq {
	quantity: NumberCompare
}

export class ContainedQuantityPrereq extends BasePrereq {
	constructor(data: ContainedQuantityPrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(ContainedQuantityPrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.ContainedQuantity,
			quantity: { compare: NumberComparison.AtMost, qualifier: 1 },
		})
	}

	satisfied(_actor: Actor, exclude: any, tooltip: TooltipGURPS): [boolean, boolean] {
		let satisfied = false
		if (exclude) {
			satisfied = exclude.type !== ItemType.EquipmentContainer
			if (!satisfied) {
				let quantity = 0
				for (const ch of exclude.children) {
					quantity += ch.quantity
				}
				satisfied = numberCompare(quantity, this.quantity)
			}
		}
		console.log(satisfied)
		if (!this.has) satisfied = !satisfied
		if (!satisfied) {
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.has[this.has ? "true" : "false"])
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.quantity)
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.criteria[this.quantity?.compare])
			tooltip.push(this.quantity.qualifier.toString())
		}
		console.log(tooltip)
		return [satisfied, false]
	}
}
