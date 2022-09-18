import { CharacterGURPS } from "@actor";
import { RitualMagicSpellGURPS, SpellContainerGURPS, SpellGURPS } from "@item";
import { NumberCompare, NumberComparison, StringCompare, StringComparison } from "@module/data";
import { TooltipGURPS } from "@module/tooltip";
import { BasePrereq } from "@prereq";
import { numberCompare, stringCompare } from "@util";
import { PrereqConstructionContext } from "./base";

export enum SpellPrereqSubType {
	Name = "name",
	Any = "any",
	College = "college",
	CollegeCount = "college_count",
	Tag = "tag",
}

export interface SpellPrereq extends BasePrereq {
	quantity: NumberCompare;
	sub_type: SpellPrereqSubType;
	qualifier: StringCompare;
}

export class SpellPrereq extends BasePrereq {
	constructor(data: SpellPrereq, context: PrereqConstructionContext = {}) {
		super(data, context);
		Object.assign(this, mergeObject(SpellPrereq.defaults, data));
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "spell_prereq",
			quantity: { compare: NumberComparison.AtLeast, qualifier: 1 },
			sub_type: SpellPrereqSubType.Name,
			qualifier: { compare: StringComparison.Is, qualifier: "" },
		});
	}

	satisfied(character: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): boolean {
		let tech_level = "";
		if (exclude instanceof SpellGURPS || exclude instanceof RitualMagicSpellGURPS) tech_level = exclude.techLevel;
		let count = 0;
		const colleges: Map<string, boolean> = new Map();
		for (let sp of character.spells) {
			if (sp instanceof SpellContainerGURPS) continue;
			sp = sp as SpellGURPS | RitualMagicSpellGURPS;
			if (exclude === sp || sp.points === 0) continue;
			if (tech_level && sp.techLevel && tech_level !== sp.techLevel) continue;
			switch (this.sub_type) {
				case "name":
					if (stringCompare(sp.name, this.qualifier)) count++;
					continue;
				case "tag":
					if (stringCompare(sp.tags, this.qualifier)) count++;
					break;
				case "college":
					if (stringCompare(sp.college, this.qualifier)) count++;
					break;
				case "college_count":
					for (const c of sp.college) colleges.set(c, true);
					break;
				case "any":
					count++;
					break;
			}
		}
		if (this.sub_type === "college_count") count = colleges.entries.length;
		let satisfied = numberCompare(count, this.quantity);
		if (!this.has) satisfied = !satisfied;
		if (!satisfied) {
			tooltip.push(prefix);
			tooltip.push(`gurps.prereqs.has.${this.has}`);
			if (this.sub_type === "college_count") {
				tooltip.push("gurps.prereqs.spell.college_count");
				tooltip.push(`gurps.prereqs.criteria.${this.quantity.compare}`);
				tooltip.push(this.quantity.compare.toString());
			} else {
				tooltip.push(" ");
				tooltip.push(`gurps.prereqs.criteria.${this.quantity?.compare}`);
				if (this.quantity?.qualifier === 1) tooltip.push("gurps.prereqs.spell.one");
				else tooltip.push("gurps.prereqs.spell.many");
				tooltip.push(" ");
				if (this.sub_type === "any") tooltip.push("gurps.prereqs.spell.any");
				else {
					if (this.sub_type === "name") tooltip.push("gurps.prereqs.spell.name");
					else if (this.sub_type === "tag") tooltip.push("gurps.prereqs.spell.tag");
					else if (this.sub_type === "college") tooltip.push("gurps.prereqs.spell.college");
					tooltip.push(`gurps.prereqs.criteria.${this.qualifier?.compare}`);
					tooltip.push(this.qualifier?.qualifier ?? "");
				}
			}
		}
		return satisfied;
	}
}
