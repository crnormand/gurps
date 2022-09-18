import { CharacterGURPS } from "@actor";
import { NumberCompare, NumberComparison } from "@module/data";
import { TooltipGURPS } from "@module/tooltip";
import { BasePrereq } from "@prereq";
import { i18n, numberCompare } from "@util";
import { PrereqConstructionContext } from "./base";

export class AttributePrereq extends BasePrereq {
	constructor(data: AttributePrereq, context: PrereqConstructionContext = {}) {
		super(data, context);
		Object.assign(this, mergeObject(AttributePrereq.defaults, data));
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "attribute_prereq",
			which: "st",
			combined_with: "",
			qualifier: { compare: NumberComparison.AtLeast, qualifier: 10 },
		});
	}

	satisfied(character: CharacterGURPS, _: any, tooltip: TooltipGURPS, prefix: string): boolean {
		let value = character.resolveAttributeCurrent(this.which);
		if (this.combined_with !== "") value += character.resolveAttributeCurrent(this.combined_with);
		let satisfied = numberCompare(value, this.qualifier);
		if (!this.has) satisfied = !satisfied;
		if (!satisfied) {
			tooltip.push(prefix);
			tooltip.push(i18n(`gurps.prerqs.has.${this.has}`));
			tooltip.push(" ");
			tooltip.push(character.resolveAttributeName(this.which));
			if (this.combined_with !== "") {
				tooltip.push(i18n("gurps.prereqs.attribute.plus"));
				tooltip.push(character.resolveAttributeName(this.combined_with));
			}
			tooltip.push(i18n("gurps.prereqs.attribute.which"));
			tooltip.push(i18n(`gurps.prereqs.criteria.${this.qualifier?.compare}`));
			tooltip.push((this.qualifier ? this.qualifier.qualifier : 0).toString());
		}
		return satisfied;
	}
}

export interface AttributePrereq extends BasePrereq {
	which: string;
	combined_with: string;
	qualifier: NumberCompare;
}
