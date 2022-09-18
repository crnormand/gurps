import { CharacterGURPS } from "@actor";
import { EquipmentContainerGURPS, EquipmentGURPS } from "@item";
import { NumberCompare, NumberComparison } from "@module/data";
import { TooltipGURPS } from "@module/tooltip";
import { BasePrereq } from "@prereq";
import { i18n, numberCompare } from "@util";
import { PrereqConstructionContext } from "./base";

export interface ContainedQuantityPrereq extends BasePrereq {
	quantity: NumberCompare;
}

export class ContainedQuantityPrereq extends BasePrereq {
	constructor(data: ContainedQuantityPrereq, context: PrereqConstructionContext = {}) {
		super(data, context);
		Object.assign(this, mergeObject(ContainedQuantityPrereq.defaults, data));
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "contained_quantity_prereq",
			quantity: { compare: NumberComparison.AtMost, qualifier: 1 },
		});
	}

	satisfied(_: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): boolean {
		let satisfied = false;
		const eqp = exclude instanceof EquipmentGURPS || exclude instanceof EquipmentContainerGURPS ? exclude : null;
		if (eqp) {
			satisfied = !(eqp instanceof EquipmentContainerGURPS);
			if (!satisfied) {
				let quantity = 0;
				for (const ch of (eqp as EquipmentContainerGURPS).children) {
					quantity += ch.quantity;
				}
				satisfied = numberCompare(quantity, this.quantity);
			}
		}
		if (!this.has) satisfied = !satisfied;

		if (!satisfied) {
			tooltip.push(prefix);
			tooltip.push(i18n(`gurps.prereqs.has.${this.has}`));
			tooltip.push(i18n("gurps.prereqs.quantity"));
			tooltip.push(i18n(`gurps.prereqs.criteria.${this.quantity?.compare}`));
			tooltip.push(this.quantity.qualifier.toString());
		}
		return satisfied;
	}
}
