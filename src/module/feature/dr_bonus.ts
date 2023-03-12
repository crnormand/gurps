import { ItemType } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS } from "@util"
import { LeveledAmount } from "@util/leveled_amount"
import { BaseFeature } from "./base"
import { FeatureType } from "./data"

export class DRBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.DRBonus,
			location: "torso",
			specialization: "all",
		})
	}

	addToTooltip(buffer: TooltipGURPS | null): void {
		if (buffer) {
			let item: Item | null | undefined = this.item
			if (item?.actor)
				while (
					[
						ItemType.TraitModifier,
						ItemType.TraitModifierContainer,
						ItemType.EquipmentModifier,
						ItemType.EquipmentModifierContainer,
					].includes(item?.type as any)
				) {
					if (item?.parent instanceof Item) item = item?.parent
				}
			if (this.per_level)
				buffer.push(
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.tooltip.dr_bonus_leveled, {
						item: item?.name || "",
						bonus: new LeveledAmount({
							level: this.levels,
							amount: this.amount,
							per_level: this.per_level,
						}).adjustedAmount.signedString(),
						per_level: this.amount.signedString(),
						type: this.specialization || "",
					})
				)
			else
				buffer.push(
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.tooltip.dr_bonus, {
						item: item?.name || "",
						bonus: this.amount.signedString(),
						type: this.specialization || "",
					})
				)
			buffer.push("<br>")
		}
	}
}

export interface DRBonus extends BaseFeature {
	location: string
	specialization?: string
}
