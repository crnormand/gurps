import { CharacterGURPS } from "@actor";
import { SkillContainerGURPS, SkillGURPS, TechniqueGURPS } from "@item";
import { NumberCompare, NumberComparison, StringCompare, StringComparison } from "@module/data";
import { TooltipGURPS } from "@module/tooltip";
import { BasePrereq } from "@prereq";
import { i18n, numberCompare, stringCompare } from "@util";
import { PrereqConstructionContext } from "./base";

export class SkillPrereq extends BasePrereq {
	constructor(data: SkillPrereq, context: PrereqConstructionContext = {}) {
		super(data, context);
		Object.assign(this, mergeObject(SkillPrereq.defaults, data));
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "skill_prereq",
			name: { compare: StringComparison.Is, qualifier: "" },
			specialization: { compare: StringComparison.None, qualifier: "" },
			level: { compare: NumberComparison.AtLeast, qualifier: 0 },
		});
	}

	satisfied(character: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): boolean {
		let satisfied = false;
		let tech_level = "";
		if (exclude instanceof SkillGURPS) tech_level = exclude.techLevel;
		for (let sk of character.skills) {
			if (sk instanceof SkillContainerGURPS) continue;
			sk = sk as SkillGURPS | TechniqueGURPS;
			if (
				exclude === sk ||
				!stringCompare(sk.name, this.name) ||
				!stringCompare(sk.specialization, this.specialization)
			)
				return false;
			satisfied = numberCompare(sk.level.level, this.level);
			if (satisfied && tech_level) satisfied = !sk.techLevel || tech_level === sk.techLevel;
		}
		if (!this.has) satisfied = !satisfied;
		if (!satisfied) {
			tooltip.push(prefix);
			tooltip.push(i18n(`gurps.prereqs.has.${this.has}`));
			tooltip.push(i18n("gurps.prereqs.skill.name"));
			tooltip.push(i18n(`gurps.prereqs.criteria.${this.name?.compare}`));
			tooltip.push(this.name.qualifier!);
			if (this.specialization.compare !== "none") {
				tooltip.push(i18n("gurps.prereqs.skill.specialization"));
				tooltip.push(i18n(`gurps.prereqs.criteria.${this.specialization.compare}`));
				tooltip.push(this.specialization.qualifier!);
				tooltip.push(",");
			}
			if (!tech_level) {
				tooltip.push(i18n("gurps.prereqs.skill.level"));
				tooltip.push(i18n(`gurps.prereqs.criteria.${this.level.compare}`));
				tooltip.push(this.level.qualifier.toString());
			} else {
				if (this.specialization.compare !== "none") {
					tooltip.push(",");
				}
				tooltip.push(i18n("gurps.prereqs.skill.level"));
				tooltip.push(i18n(`gurps.prereqs.criteria.${this.level.compare}`));
				tooltip.push(this.level.qualifier.toString());
				tooltip.push(i18n("gurps.prereqs.skill.tech_level"));
			}
		}
		return satisfied;
	}
}

export interface SkillPrereq extends BasePrereq {
	name: StringCompare;
	specialization: StringCompare;
	level: NumberCompare;
}
