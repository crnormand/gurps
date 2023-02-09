import { ConditionSystemData, ManeuverID } from "./data"

export function getManeuverList() {
	const ConditionList: Record<ManeuverID, Partial<ConditionSystemData>> = {
		[ManeuverID.DoNothing]: { id: ManeuverID.DoNothing },
		[ManeuverID.Attack]: { id: ManeuverID.Attack },
		[ManeuverID.AOA]: { id: ManeuverID.AOA },
		[ManeuverID.AOD]: { id: ManeuverID.AOD },
		[ManeuverID.Move]: { id: ManeuverID.Move },
		[ManeuverID.MoveAndAttack]: { id: ManeuverID.MoveAndAttack },
		[ManeuverID.AOADouble]: { id: ManeuverID.AOADouble },
		[ManeuverID.AODDouble]: { id: ManeuverID.AODDouble },
		[ManeuverID.ChangePosture]: { id: ManeuverID.ChangePosture },
		[ManeuverID.Feint]: { id: ManeuverID.Feint },
		[ManeuverID.AOAFeint]: { id: ManeuverID.AOAFeint },
		[ManeuverID.AODDodge]: { id: ManeuverID.AODDodge },
		[ManeuverID.Ready]: { id: ManeuverID.Ready },
		[ManeuverID.Evaluate]: { id: ManeuverID.Evaluate },
		[ManeuverID.AOADetermined]: { id: ManeuverID.AOADetermined },
		[ManeuverID.AODParry]: { id: ManeuverID.AODParry },
		[ManeuverID.Concentrate]: { id: ManeuverID.Concentrate },
		[ManeuverID.Aiming]: { id: ManeuverID.Aiming },
		[ManeuverID.AOAStrong]: { id: ManeuverID.AOAStrong },
		[ManeuverID.AODBlock]: { id: ManeuverID.AODBlock },
		[ManeuverID.Wait]: { id: ManeuverID.Wait },
		[ManeuverID.BLANK_1]: { id: ManeuverID.BLANK_1 },
		[ManeuverID.AOASF]: { id: ManeuverID.AOASF },
		[ManeuverID.BLANK_2]: { id: ManeuverID.BLANK_2 },
	}

	return ConditionList
}
