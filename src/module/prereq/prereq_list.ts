import { CharacterGURPS } from "@actor"
import { Prereq } from "@module/config"
import { NumberCompare, NumberComparison, PrereqType } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { extractTechLevel, i18n, numberCompare } from "@util"
import { BasePrereq, PrereqConstructionContext } from "./base"

export interface PrereqList extends Omit<BasePrereq, "has"> {
	prereqs: Prereq[]
	all: boolean
	when_tl: NumberCompare
}

export interface PrereqListObj {
	type: PrereqType
	prereqs: Prereq[]
	all: boolean
	when_tl?: NumberCompare
}

export class PrereqList extends BasePrereq {
	constructor(data?: PrereqList | any, context: PrereqConstructionContext = {}) {
		data = mergeObject(PrereqList.defaults, data)
		super(data, context)
		// Object.assign(this, mergeObject(PrereqList.defaults, data))
		if ((data as PrereqList).prereqs) {
			const list = (data as PrereqList).prereqs
			this.prereqs = []
			for (const e of list) {
				const PrereqConstructor = CONFIG.GURPS.Prereq.classes[e.type as PrereqType]
				if (PrereqConstructor) this.prereqs.push(new PrereqConstructor(e as any, context))
			}
		}
	}

	static get defaults(): Record<string, any> {
		return {
			type: "prereq_list",
			prereqs: [],
			all: true,
			when_tl: { compare: NumberComparison.None },
		}
	}

	// Override satisfied(character: CharacterGURPS, exclude: any, buffer: TooltipGURPS, prefix: string): boolean {
	satisfied(actor: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): [boolean, boolean] {
		if (this.when_tl?.compare !== "none") {
			let tl = extractTechLevel(actor.profile?.tech_level)
			if (tl < 0) tl = 0
			if (!numberCompare(tl, this.when_tl)) return [true, false]
		}
		let count = 0
		let eqpPenalty = false
		const local = new TooltipGURPS()
		if (this.prereqs.length)
			for (const p of this.prereqs) {
				// @ts-ignore
				const ps = p.satisfied(actor, exclude, local, prefix)
				if (ps[0]) count++
				eqpPenalty = eqpPenalty || ps[1]
			}
		const satisfied = count === this.prereqs.length || (!this.all && count > 0)
		if (!satisfied) {
			if (this.all) tooltip.push(i18n("gurps.prereqs.requires_all"))
			else tooltip.push(i18n("gurps.prereqs.requires_all"))
			tooltip.push(local)
		}
		return [satisfied, eqpPenalty]
	}
}
