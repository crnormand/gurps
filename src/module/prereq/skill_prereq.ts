import { CharacterGURPS } from "@actor"
import { ItemType, NumberCompare, NumberComparison, PrereqType, StringCompare, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { i18n, numberCompare, stringCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export class SkillPrereq extends BasePrereq {
	constructor(data: SkillPrereq | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(SkillPrereq.defaults, data)
		super(data, context)
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: PrereqType.Skill,
			name: { compare: StringComparison.Is, qualifier: "" },
			specialization: { compare: StringComparison.None, qualifier: "" },
			level: { compare: NumberComparison.AtLeast, qualifier: 0 },
		})
	}

	satisfied(actor: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): [boolean, boolean] {
		let satisfied = false
		let tech_level = ""
		if (exclude.type === ItemType.Skill) tech_level = exclude.techLevel
		for (let sk of actor.skills) {
			if (sk.type === ItemType.SkillContainer) continue
			if (
				exclude === sk ||
				!stringCompare(sk.name, this.name) ||
				!stringCompare((sk as any).specialization, this.specialization)
			)
				return [false, false]
			satisfied = numberCompare((sk as any).level.level, this.level)
			if (satisfied && tech_level) satisfied = !(sk as any).techLevel || tech_level === (sk as any).techLevel
		}
		if (!this.has) satisfied = !satisfied
		if (!satisfied) {
			tooltip.push(prefix)
			tooltip.push(i18n(`gurps.prereqs.has.${this.has}`))
			tooltip.push(i18n("gurps.prereqs.skill.name"))
			tooltip.push(i18n(`gurps.prereqs.criteria.${this.name?.compare}`))
			tooltip.push(this.name.qualifier!)
			if (this.specialization.compare !== "none") {
				tooltip.push(i18n("gurps.prereqs.skill.specialization"))
				tooltip.push(i18n(`gurps.prereqs.criteria.${this.specialization.compare}`))
				tooltip.push(this.specialization.qualifier!)
				tooltip.push(",")
			}
			if (!tech_level) {
				tooltip.push(i18n("gurps.prereqs.skill.level"))
				tooltip.push(i18n(`gurps.prereqs.criteria.${this.level.compare}`))
				tooltip.push(this.level.qualifier.toString())
			} else {
				if (this.specialization.compare !== "none") {
					tooltip.push(",")
				}
				tooltip.push(i18n("gurps.prereqs.skill.level"))
				tooltip.push(i18n(`gurps.prereqs.criteria.${this.level.compare}`))
				tooltip.push(this.level.qualifier.toString())
				tooltip.push(i18n("gurps.prereqs.skill.tech_level"))
			}
		}
		return [satisfied, false]
	}
}

export interface SkillPrereq extends BasePrereq {
	name: StringCompare
	specialization: StringCompare
	level: NumberCompare
}
