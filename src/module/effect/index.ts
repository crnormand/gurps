import { BaseFeature, Feature } from "@feature"
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs"
import { ActiveEffectDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData"
import { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes"
import { SYSTEM_NAME } from "@module/data"
import { ActiveEffectFlags, ActiveEffectID, effectFeatures } from "./data"

class ActiveEffectGURPS extends ActiveEffect {
	get features(): Feature[] {
		const f = this.getFlag(SYSTEM_NAME, ActiveEffectFlags.Features) as Feature[]
		return f?.map((e: Partial<Feature>) => new BaseFeature({ ...e, parent: this.uuid, item: this })) ?? []
	}

	protected _onCreate(
		data: PropertiesToSource<ActiveEffectDataProperties>,
		options: DocumentModificationOptions,
		userId: string
	): void {
		super._onCreate(data, options, userId)
		const id = this.getFlag("core", "statusId") as ActiveEffectID
		this.setFlag(SYSTEM_NAME, ActiveEffectFlags.Features, effectFeatures[id])
	}
}

interface ActiveEffectGURPS extends ActiveEffect {
	features: Feature[]
}

export { ActiveEffectGURPS }
