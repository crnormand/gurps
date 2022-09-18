import { ContainerGURPS } from "@item/container";
import { calculateModifierPoints, TraitGURPS } from "@item/trait";
import { TraitModifierGURPS } from "@item/trait_modifier";
import { TraitModifierContainerGURPS } from "@item/trait_modifier_container";
import { CR, CRAdjustment } from "@module/data";
import { i18n, i18n_f, SelfControl } from "@util";
import { TraitContainerData, TraitContainerType } from "./data";

export class TraitContainerGURPS extends ContainerGURPS {
	unsatisfied_reason = "";

	// Static override get schema(): typeof TraitContainerData {
	// 	return TraitContainerData;
	// }

	// Getters
	get enabled(): boolean {
		if (this.system.disabled) return false;
		let enabled = !this.system.disabled;
		if (this.parent instanceof TraitContainerGURPS) enabled = enabled && this.parent.enabled;
		return enabled;
	}

	set enabled(enabled: boolean) {
		this.system.disabled = !enabled;
	}

	get containerType(): TraitContainerType {
		return this.system.container_type;
	}

	get levels(): number {
		return 0;
	}

	get cr(): number {
		return this.system.cr;
	}

	get crAdj(): CRAdjustment {
		return this.system.cr_adj;
	}

	get formattedCR(): string {
		let cr = "";
		if (this.cr !== CR.None) cr += i18n(`gurps.select.cr_level.${this.cr}`);
		if (this.crAdj !== "none")
			cr += `, ${i18n_f(`gurps.select.cr_adj.${this.crAdj}`, {
				penalty: SelfControl.adjustment(this.cr, this.crAdj),
			})}`;
		return cr;
	}

	get roundCostDown(): boolean {
		return false;
	}

	get modifierNotes(): string {
		let n = "";
		if (this.cr !== CR.None) {
			n += i18n(`gurps.select.cr_level.${this.cr}`);
			if (this.crAdj !== "none") {
				n += `, ${i18n_f(`gurps.item.cr_adj_display.${this.crAdj}`, {
					penalty: "TODO",
				})}`;
			}
		}
		for (const m of this.deepModifiers) {
			if (n.length) n += ";";
			n += m.fullDescription;
		}
		return n;
	}

	// Embedded Items
	get children(): Collection<TraitGURPS | TraitContainerGURPS> {
		return super.children as Collection<TraitGURPS | TraitContainerGURPS>;
	}

	get modifiers(): Collection<TraitModifierGURPS | TraitModifierContainerGURPS> {
		return new Collection(
			this.items
				.filter(item => item instanceof TraitModifierGURPS)
				.map(item => {
					return [item.id!, item];
				})
		) as Collection<TraitModifierGURPS>;
	}

	get deepModifiers(): Collection<TraitModifierGURPS> {
		const deepModifiers: Array<TraitModifierGURPS> = [];
		for (const mod of this.modifiers) {
			if (mod instanceof TraitModifierGURPS) deepModifiers.push(mod);
			else
				for (const e of mod.deepItems) {
					if (e instanceof TraitModifierGURPS) deepModifiers.push(e);
				}
		}
		return new Collection(
			deepModifiers.map(item => {
				return [item.id!, item];
			})
		);
	}

	get adjustedPoints(): number {
		if (!this.enabled) return 0;
		let points = 0;
		if (this.containerType === "alternative_abilities") {
			let values: number[] = [];
			for (const child of this.children) {
				values.push(child.adjustedPoints);
				if (values[values.length - 1] > points) points = values[values.length - 1];
			}
			let max = points;
			let found = false;
			for (let v of values) {
				if (!found && max === v) found = true;
				else if (this.roundCostDown) points += Math.floor(calculateModifierPoints(v, 20));
				else points += Math.ceil(calculateModifierPoints(v, 20));
			}
		} else {
			for (const child of this.children) {
				points += child.adjustedPoints;
			}
		}
		return points;
	}

	calculatePoints(): [number, number, number, number] {
		let [ad, disad, race, quirk] = [0, 0, 0, 0];
		switch (this.containerType) {
			case "group":
				for (const child of this.children) {
					const [a, d, r, q] = child.calculatePoints();
					ad += a;
					disad += d;
					race += r;
					quirk += q;
				}
				return [ad, disad, race, quirk];
			case "race": {
				return [0, 0, this.adjustedPoints, 0];
			}
		}
		let pts = this.adjustedPoints;
		if (pts === -1) quirk += pts;
		else if (pts > 0) ad += pts;
		else if (pts < 0) disad += pts;
		return [ad, disad, race, quirk];
	}
}

export interface TraitContainerGURPS {
	readonly system: TraitContainerData;
}
