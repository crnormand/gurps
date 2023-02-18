import { EquipmentModifierGURPS } from "@item/equipment_modifier"
import { ItemGCS } from "@item/gcs"
import { EquipmentModifierContainerData } from "./data"

class EquipmentModifierContainerGURPS extends ItemGCS {
	// Static override get schema(): typeof EquipmentModifierContainerData {
	// 	return EquipmentModifierContainerData;
	// }

	// Embedded Items
	get children(): Collection<EquipmentModifierGURPS | EquipmentModifierContainerGURPS> {
		return super.children as Collection<EquipmentModifierGURPS | EquipmentModifierContainerGURPS>
	}
}

interface EquipmentModifierContainerGURPS {
	readonly system: EquipmentModifierContainerData
}

export { EquipmentModifierContainerGURPS }
