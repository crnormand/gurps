import { CharacterGURPS } from "@actor"
import { StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { BasePrereq } from "@prereq"
import { i18n_f, stringCompare } from "@util"
import { PrereqConstructionContext } from "./base"

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

	satisfied(character: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): boolean {
		let satisfied = false
		for (let eqp of character.carried_equipment) {
			satisfied = exclude !== eqp && eqp.equipped && eqp.quantity > 0 && stringCompare(eqp.name, this.name)
		}
		if (!satisfied) {
			tooltip.push(i18n_f("gurps.prereqs.equipment.criteria", { prefix: prefix, name: this.name }))
		}
		return satisfied
	}
}

export interface EquippedEquipmentPrereq extends BasePrereq {
	name: StringCompare
}
