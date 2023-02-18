import { CharacterGURPS } from "@actor"
import { PrereqType, StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { i18n_f, stringCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

class EquippedEquipmentPrereq extends BasePrereq {
	constructor(data: EquippedEquipmentPrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(EquippedEquipmentPrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.Equipment,
			name: { compare: StringComparison.Is, qualifier: "" },
		})
	}

	satisfied(actor: CharacterGURPS, exclude: any, tooltip: TooltipGURPS): [boolean, boolean] {
		let satisfied = false
		for (let eqp of actor.carried_equipment) {
			satisfied = exclude !== eqp && eqp.equipped && eqp.quantity > 0 && stringCompare(eqp.name, this.name)
		}
		if (!satisfied) {
			tooltip.push(i18n_f("gurps.prereqs.equipment.criteria", { name: this.name }))
			return [satisfied, true]
		}
		return [satisfied, false]
	}
}

interface EquippedEquipmentPrereq extends BasePrereq {
	name: StringCompare
}

export { EquippedEquipmentPrereq }
