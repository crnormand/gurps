import { ActorGURPS } from "@module/config"
import { ActorType, gid, NumberCompare, NumberComparison, PrereqType } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, numberCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export class AttributePrereq extends BasePrereq {
	constructor(data: AttributePrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(AttributePrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.Attribute,
			which: gid.Strength,
			combined_with: "",
			qualifier: { compare: NumberComparison.AtLeast, qualifier: 10 },
		})
	}

	satisfied(actor: ActorGURPS, _: any, tooltip: TooltipGURPS): [boolean, boolean] {
		if (actor.type !== ActorType.Character) return [true, false]
		let value = (actor as any).resolveAttributeCurrent(this.which)
		if (this.combined_with !== "") value += (actor as any).resolveAttributeCurrent(this.combined_with)
		let satisfied = numberCompare(value, this.qualifier)
		if (!this.has) satisfied = !satisfied
		if (!satisfied) {
			// Tooltip.push(prefix)
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.has[this.has ? "true" : "false"])
			tooltip.push((actor as any).resolveAttributeName(this.which))
			if (this.combined_with !== "") {
				tooltip.push(LocalizeGURPS.translations.gurps.prereqs.attribute.plus)
				tooltip.push((actor as any).resolveAttributeName(this.combined_with))
			}
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.attribute.which)
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.criteria[this.qualifier?.compare])
			tooltip.push((this.qualifier ? this.qualifier.qualifier : 0).toString())
		}
		return [satisfied, false]
	}
}

export interface AttributePrereq extends BasePrereq {
	which: string
	combined_with: string
	qualifier: NumberCompare
}
