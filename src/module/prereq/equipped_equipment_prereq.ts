import { ActorGURPS } from "@module/config"
import { ActorType, PrereqType, StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, stringCompare } from "@util"
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

	satisfied(actor: ActorGURPS, exclude: any, tooltip: TooltipGURPS): [boolean, boolean] {
		if (actor.type === ActorType.LegacyCharacter) return [true, false]
		let satisfied = false
		for (let eqp of (actor as any).carried_equipment) {
			satisfied = exclude !== eqp && eqp.equipped && eqp.quantity > 0 && stringCompare(eqp.name, this.name)
		}
		if (!satisfied) {
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.equipment)
			tooltip.push(LocalizeGURPS.format(LocalizeGURPS.translations.gurps.prereqs.criteria[this.name.compare]))
			if (this.name.compare !== StringComparison.None) tooltip.push(this.name.qualifier!)
			return [satisfied, true]
		}
		return [satisfied, false]
	}
}

interface EquippedEquipmentPrereq extends BasePrereq {
	name: StringCompare
}

export { EquippedEquipmentPrereq }
