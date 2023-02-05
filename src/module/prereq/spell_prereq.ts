import { CharacterGURPS } from "@actor"
import { ItemType } from "@item/data"
import { NumberCompare, NumberComparison, PrereqType, StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { numberCompare, stringCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export enum SpellPrereqSubType {
	Name = "name",
	Any = "any",
	College = "college",
	CollegeCount = "college_count",
	Tag = "tag",
}

export interface SpellPrereq extends BasePrereq {
	quantity: NumberCompare
	sub_type: SpellPrereqSubType
	qualifier: StringCompare
}

export class SpellPrereq extends BasePrereq {
	constructor(data: SpellPrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(SpellPrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.Spell,
			quantity: { compare: NumberComparison.AtLeast, qualifier: 1 },
			sub_type: SpellPrereqSubType.Name,
			qualifier: { compare: StringComparison.Is, qualifier: "" },
		})
	}

	satisfied(actor: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): [boolean, boolean] {
		let tech_level = ""
		if ([ItemType.Spell, ItemType.RitualMagicSpell].includes(exclude.type)) tech_level = exclude.techLevel
		let count = 0
		const colleges: Map<string, boolean> = new Map()
		for (let sp of actor.spells) {
			if (sp.type === ItemType.SpellContainer) continue
			if (exclude === sp || sp.points === 0) continue
			if (tech_level && (sp as any).techLevel && tech_level !== (sp as any).techLevel) continue
			switch (this.sub_type) {
				case "name":
					if (stringCompare(sp.name, this.qualifier)) count++
					continue
				case "tag":
					if (stringCompare(sp.tags, this.qualifier)) count++
					break
				case "college":
					if (stringCompare((sp as any).college, this.qualifier)) count++
					break
				case "college_count":
					for (const c of (sp as any).college) colleges.set(c, true)
					break
				case "any":
					count++
					break
			}
		}
		if (this.sub_type === "college_count") count = colleges.entries.length
		let satisfied = numberCompare(count, this.quantity)
		if (!this.has) satisfied = !satisfied
		if (!satisfied) {
			tooltip.push(prefix)
			tooltip.push(`gurps.prereqs.has.${this.has}`)
			if (this.sub_type === "college_count") {
				tooltip.push("gurps.prereqs.spell.college_count")
				tooltip.push(`gurps.prereqs.criteria.${this.quantity.compare}`)
				tooltip.push(this.quantity.compare.toString())
			} else {
				tooltip.push(" ")
				tooltip.push(`gurps.prereqs.criteria.${this.quantity?.compare}`)
				if (this.quantity?.qualifier === 1) tooltip.push("gurps.prereqs.spell.one")
				else tooltip.push("gurps.prereqs.spell.many")
				tooltip.push(" ")
				if (this.sub_type === "any") tooltip.push("gurps.prereqs.spell.any")
				else {
					if (this.sub_type === "name") tooltip.push("gurps.prereqs.spell.name")
					else if (this.sub_type === "tag") tooltip.push("gurps.prereqs.spell.tag")
					else if (this.sub_type === "college") tooltip.push("gurps.prereqs.spell.college")
					tooltip.push(`gurps.prereqs.criteria.${this.qualifier?.compare}`)
					tooltip.push(this.qualifier?.qualifier ?? "")
				}
			}
		}
		return [satisfied, false]
	}
}
