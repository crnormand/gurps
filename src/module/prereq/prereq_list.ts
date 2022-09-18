import { CharacterGURPS } from "@actor";
import { NumberCompare, NumberComparison } from "@module/data";
import { TooltipGURPS } from "@module/tooltip";
import { BasePrereq, Prereq, PrereqType } from "@prereq";
import { extractTechLevel, i18n, numberCompare, toArray } from "@util";
import { PrereqConstructionContext } from "./base";

export interface PrereqList extends Omit<BasePrereq, "has"> {
	prereqs: Prereq[];
	all: boolean;
	when_tl: NumberCompare;
}

export interface PrereqListObj {
	type: PrereqType;
	prereqs: Prereq[];
	all: boolean;
	when_tl?: NumberCompare;
}

export class PrereqList extends BasePrereq {
	constructor(data?: PrereqListObj, context: PrereqConstructionContext = {}) {
		super(data, context);
		Object.assign(this, mergeObject(PrereqList.defaults, data));
		if ((data as PrereqList).prereqs) {
			const list = toArray((data as PrereqList).prereqs);
			this.prereqs = [];
			for (const e of list) {
				const PrereqConstructor = (CONFIG as any).GURPS.Prereq.classes[e.type as PrereqType];
				if (PrereqConstructor) this.prereqs.push(new PrereqConstructor(e as any, context));
			}
		}
	}

	static get defaults(): Record<string, any> {
		return {
			type: "prereq_list",
			prereqs: [],
			all: true,
			when_tl: { compare: NumberComparison.None },
		};
	}

	override satisfied(character: CharacterGURPS, exclude: any, buffer: TooltipGURPS, prefix: string): boolean {
		if (this.when_tl?.compare !== "none") {
			let tl = extractTechLevel(character.profile.tech_level);
			if (tl < 0) tl = 0;
			if (!numberCompare(tl, this.when_tl)) return true;
		}
		let count = 0;
		const local = new TooltipGURPS();
		if (this.prereqs.length)
			for (const p of this.prereqs) {
				if (p.satisfied(character, exclude, local, prefix)) count++;
			}
		const satisfied = count === this.prereqs.length || (!this.all && count > 0);
		if (!satisfied) {
			if (this.all) buffer.push(i18n("gurps.prereqs.requires_all"));
			else buffer.push(i18n("gurps.prereqs.requires_all"));
			buffer.push(local);
		}
		return satisfied;
	}
}
