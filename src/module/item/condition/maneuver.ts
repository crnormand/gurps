import { ConditionSystemData, ManeuverID } from "./data"

export function getManeuverList() {
	const ConditionList: Record<ManeuverID, Partial<ConditionSystemData>> = {
		[ManeuverID.DoNothing]: {
			id: ManeuverID.DoNothing,
		},
		[ManeuverID.Move]: {
			id: ManeuverID.Move,
		},
	}

	return ConditionList
}
