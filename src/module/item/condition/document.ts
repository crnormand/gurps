import { DurationType, EffectGURPS } from "@item/effect"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { i18n } from "@util"
import { ConditionID, ConditionSource, ConditionSystemData } from "./data"
import { ConditionList } from "./list"

class ConditionGURPS extends EffectGURPS {
	static getData(id: ConditionID): Partial<ConditionSource> {
		return {
			name: i18n(`gurps.status.${id}`),
			type: ItemType.Condition,
			img: `systems/${SYSTEM_NAME}/assets/status/${id}.png`,
			system: mergeObject(ConditionGURPS.defaults, ConditionList[id]) as ConditionSystemData,
		}
	}

	static get defaults(): ConditionSystemData {
		return {
			id: null,
			can_level: false,
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

	get cid(): ConditionID | null {
		return this.system.id
	}
}

interface ConditionGURPS extends EffectGURPS {
	_source: ConditionSource
	readonly system: ConditionSystemData
}

export { ConditionGURPS }
