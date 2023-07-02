import { SYSTEM_NAME } from "@module/data"
import { DocumentDataType, DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"

class UserGURPS extends User {
	override prepareData(): void {
		super.prepareData()
		if (canvas?.ready && canvas.tokens?.controlled && canvas.tokens?.controlled.length > 0) {
			game.EffectPanel.refresh()
		}
	}

	override _onUpdate(
		data: DeepPartial<DocumentDataType<foundry.documents.BaseUser>>,
		options: DocumentModificationOptions,
		userId: string
	): void {
		super._onUpdate(data, options, userId)
		if (game.user?.id !== userId) return

		const keys = Object.keys(flattenObject(data))
		if (keys.includes(`flags.${SYSTEM_NAME}.settings.showEffectPanel`)) {
			game.EffectPanel.refresh()
		}
	}
}

export { UserGURPS }
