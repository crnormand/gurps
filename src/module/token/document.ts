import { BaseActorGURPS, CharacterGURPS } from "@actor"
import { ConditionID } from "@item/condition"

class TokenDocumentGURPS extends TokenDocument {
	hasStatusEffect(statusId: ConditionID): boolean {
		if (statusId === "dead") return this.overlayEffect === CONFIG.controlIcons.defeated
		const { actor } = this
		const hasCondition = (actor as BaseActorGURPS)?.hasCondition(statusId) || false
		const hasEffect = (actor as BaseActorGURPS).gEffects.some(e => e.name === statusId)
		return hasCondition || hasEffect
	}

	getBarAttribute(barName: string, { alternative }: any = {}): any {
		const attr = alternative || (this as any)[barName]?.attribute
		if (!attr || !this.actor) return null
		let data = foundry.utils.getProperty((this.actor as any).system, attr)
		if (data === null || data === undefined) return null
		const model = game.model.Actor[this.actor.type]

		// Single values
		if (Number.isNumeric(data)) {
			return {
				type: "value",
				attribute: attr,
				value: Number(data),
				editable: foundry.utils.hasProperty(model, attr),
			}
		}

		// Attribute objects
		else if ("value" in data && "max" in data) {
			if (this.actor instanceof CharacterGURPS)
				return {
					type: "bar",
					attribute: attr,
					value: parseInt(data.value || 0),
					max: parseInt(data.max || 0),
					editable: true,
				}
			return {
				type: "bar",
				attribute: attr,
				value: parseInt(data.value || 0),
				max: parseInt(data.max || 0),
				editable: foundry.utils.hasProperty(model, `${attr}.value`),
			}
		}

		// Otherwise null
		return null
	}
}

interface TokenDocumentGURPS extends TokenDocument {
	overlayEffect: any
}

export { TokenDocumentGURPS }
