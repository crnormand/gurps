import { CharacterGURPS } from "@actor"
import { StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { i18n_f, stringCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export class EquippedEquipmentPrereq extends BasePrereq {
	constructor(data: EquippedEquipmentPrereq, context: PrereqConstructionContext = {}) {
		super(data, context)
		Object.assign(this, mergeObject(EquippedEquipmentPrereq.defaults, data))
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "equipped_equipment_prereq",
			name: { compare: StringComparison.Is, qualifier: "" },
		})
	}

	satisfied(actor: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): [boolean, boolean] {
		let satisfied = false
		for (let eqp of actor.carried_equipment) {
			satisfied = exclude !== eqp && eqp.equipped && eqp.quantity > 0 && stringCompare(eqp.name, this.name)
		}
		if (!satisfied) {
			tooltip.push(i18n_f("gurps.prereqs.equipment.criteria", { prefix: prefix, name: this.name }))
		}
		if (!satisfied) return [satisfied, true]
		return [satisfied, false]
	}
}

export interface EquippedEquipmentPrereq extends BasePrereq {
	name: StringCompare
}
