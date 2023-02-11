import { DurationType, EffectGURPS } from "@item/effect"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { i18n } from "@util"
import { ConditionID, ConditionSource, ConditionSystemData, ManeuverID } from "./data"
import { getConditionList } from "./list"
import { getManeuverList } from "./maneuver"

class ConditionGURPS extends EffectGURPS {
	static getData(id: ConditionID | ManeuverID): Partial<ConditionSource> {
		const [data, folder] = Object.values(ConditionID).includes(id as any)
			? [getConditionList()[id as ConditionID], "status"]
			: [getManeuverList()[id as ManeuverID], "maneuver"]
		return {
			name: i18n(`gurps.${folder}.${id}`),
			type: ItemType.Condition,
			img: `systems/${SYSTEM_NAME}/assets/${folder}/${id}.webp`,
			system: mergeObject(ConditionGURPS.defaults, data) as ConditionSystemData,
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

	get cid(): ConditionID | ManeuverID | null {
		return this.system.id
	}
}

interface ConditionGURPS extends EffectGURPS {
	_source: ConditionSource
	readonly system: ConditionSystemData
}

export { ConditionGURPS }
