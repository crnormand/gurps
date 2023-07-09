import { DurationType, EffectGURPS, EffectModificationOptions } from "@item/effect"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { ItemDataBaseProperties, ItemDataConstructorData } from "types/foundry/common/data/data.mjs/itemData"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { PropertiesToSource } from "types/types/helperTypes"
import { ConditionID, ConditionSource, ConditionSystemData, ManeuverID } from "./data"
import { getConditionList } from "./list"
import { getManeuverList } from "./maneuver"

class ConditionGURPS extends EffectGURPS {
	static getData(id: ConditionID | ManeuverID): Partial<ConditionSource> {
		const [data, folder] = Object.values(ConditionID).includes(id as any)
			? [getConditionList()[id as ConditionID], "status"]
			: [getManeuverList()[id as ManeuverID], "maneuver"]
		return {
			name: game.i18n.localize(`gurps.${folder}.${id}`),
			type: ItemType.Condition,
			img: `systems/${SYSTEM_NAME}/assets/${folder}/${id}.webp`,
			system: mergeObject(ConditionGURPS.defaults, data) as ConditionSystemData,
		}
	}

	static get defaults(): ConditionSystemData {
		return {
			id: null,
			can_level: false,
			reference: "",
			duration: {
				type: DurationType.None,
				rounds: 0,
				turns: 0,
				seconds: 0,
				startRound: 0,
				startTurn: 0,
				startTime: 0,
				combat: null,
			},
		}
	}

	protected _preUpdate(
		changed: DeepPartial<ItemDataConstructorData>,
		options: EffectModificationOptions,
		user: BaseUser
	): Promise<void> {
		options.previousID = this.cid
		if ((changed as any).system?.id !== this.cid) this._displayScrollingStatus(false)
		return super._preUpdate(changed, options, user)
	}

	protected _onUpdate(
		changed: DeepPartial<PropertiesToSource<ItemDataBaseProperties>>,
		options: EffectModificationOptions,
		userId: string
	): void {
		super._onUpdate(changed, options, userId)
		const [priorID, newID] = [options.previousID, this.cid]
		const idChanged = !!priorID && !!newID && priorID !== newID
		if (idChanged) {
			this._displayScrollingStatus(true)
		}
	}

	get cid(): ConditionID | ManeuverID | null {
		return this.system.id
	}
}

interface ConditionGURPS extends EffectGURPS {
	_source: ConditionSource
	readonly system: ConditionSystemData
}

export { ConditionGURPS }
