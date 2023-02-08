import { ContainerGURPS } from "@item/container"
import { NoteContainerData } from "./data"

class NoteContainerGURPS extends ContainerGURPS {}

interface NoteContainerGURPS {
	readonly system: NoteContainerData
}

export { NoteContainerGURPS }
