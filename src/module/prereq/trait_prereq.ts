import { ActorGURPS } from "@module/config"
import { NumberCompare, NumberComparison, PrereqType, StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, numberCompare, stringCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export class TraitPrereq extends BasePrereq {
	constructor(data: TraitPrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(TraitPrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.Trait,
			name: { compare: StringComparison.Is, qualifier: "" },
			notes: { compare: StringComparison.None, qualifier: "" },
			level: { compare: NumberComparison.None, qualifier: 0 },
		})
	}

	satisfied(actor: ActorGURPS, exclude: any, tooltip: TooltipGURPS): [boolean, boolean] {
		let satisfied = false
		if (!actor.traits) return [true, false]
		actor.traits.forEach((t: any) => {
			if (exclude === t || !stringCompare(t.name, this.name)) return // [false, false]
			let notes = t.notes
			const mod_notes = t.modifierNotes
			if (mod_notes) notes += `\n${mod_notes}`
			if (!stringCompare(notes, this.notes)) return // [false, false]
			satisfied = numberCompare(Math.max(0, t.levels), this.level)
		})
		if (!this.has) satisfied = !satisfied
		if (!satisfied) {
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.has[this.has ? "true" : "false"])
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.trait.name)
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.criteria[this.name?.compare])
			if (this.name?.compare !== "none") tooltip.push(`"${this.name!.qualifier!}"`)
			if (this.notes?.compare !== "none") {
				tooltip.push(LocalizeGURPS.translations.gurps.prereqs.trait.notes)
				tooltip.push(LocalizeGURPS.translations.gurps.prereqs.criteria[this.notes?.compare])
				tooltip.push(`"${this.notes.qualifier!}"`)
			}

			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.trait.level)
			tooltip.push(LocalizeGURPS.translations.gurps.prereqs.criteria[this.level?.compare])
			if (this.level?.compare !== "none") tooltip.push(((this.level ? this.level.qualifier : 0) ?? 0).toString())
		}
		return [satisfied, false]
	}
}

export interface TraitPrereq extends BasePrereq {
	name: StringCompare
	level: NumberCompare
	notes: StringCompare
}
