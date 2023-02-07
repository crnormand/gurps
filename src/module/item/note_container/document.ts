import { ContainerGURPS } from "@item/container"
import { NoteContainerData } from "./data"

class NoteContainerGURPS extends ContainerGURPS {
	// Static override get schema(): typeof NoteContainerData {
	// 	return NoteContainerData;
	// }
}

interface NoteContainerGURPS {
	readonly system: NoteContainerData
}

export { NoteContainerGURPS }
