import { ItemType } from "@item/data"
import { NumberCompare, NumberComparison, PrereqType } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { i18n, numberCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export interface ContainedQuantityPrereq extends BasePrereq {
	quantity: NumberCompare
}

export class ContainedQuantityPrereq extends BasePrereq {
	constructor(data: ContainedQuantityPrereq, context: PrereqConstructionContext = {}) {
		super(data, context)
		Object.assign(this, mergeObject(ContainedQuantityPrereq.defaults, data))
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.ContainedQuantity,
			quantity: { compare: NumberComparison.AtMost, qualifier: 1 },
		})
	}

	satisfied(_actor: Actor, exclude: any, tooltip: TooltipGURPS, prefix: string): [boolean, boolean] {
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
		if (!this.has) satisfied = !satisfied

		if (!satisfied) {
			tooltip.push(prefix)
			tooltip.push(i18n(`gurps.prereqs.has.${this.has}`))
			tooltip.push(i18n("gurps.prereqs.quantity"))
			tooltip.push(i18n(`gurps.prereqs.criteria.${this.quantity?.compare}`))
			tooltip.push(this.quantity.qualifier.toString())
		}
		return [satisfied, false]
	}
}
