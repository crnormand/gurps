import { Feature } from "@feature"
import { AttributeBonusLimitation } from "@feature/attribute_bonus"
// Import { AttributeBonusLimitation } from "@feature/attribute_bonus";
import { FeatureType } from "@feature/base"
import { StatusEffect } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token"
import { gid } from "@module/data"

// Export interface ActiveEffectSystemData {
// 	features?: Feature[]
// }

export enum ActiveEffectFlags {
	Features = "features",
}

export enum ActiveEffectID {
	Drowsy = "drowsy",
}

// Export type StatusEffectGURPS = StatusEffect

export const effectsList: StatusEffect[] = [
	{
		id: ActiveEffectID.Drowsy,
		icon: "icons/svg/mystery-man.svg",
		label: "Drowsy",
	},
]

export const effectFeatures: Record<ActiveEffectID, Partial<Feature>[]> = {
	[ActiveEffectID.Drowsy]: [
		{
			type: FeatureType.AttributeBonus,
			attribute: gid.Strength,
			limitation: AttributeBonusLimitation.None,
			amount: 4,
			effective: true,
		},
	],
}
