import { BaseActorGURPS } from "@actor"
import { ConditionID } from "@item/condition"

class TokenDocumentGURPS extends TokenDocument {
	hasStatusEffect(statusId: ConditionID): boolean {
		if (statusId === "dead") return this.overlayEffect === CONFIG.controlIcons.defeated
		const { actor } = this
		return (actor as BaseActorGURPS).hasCondition(statusId)
	}
}

interface TokenDocumentGURPS extends TokenDocument {
	overlayEffect: any
}

export { TokenDocumentGURPS }
