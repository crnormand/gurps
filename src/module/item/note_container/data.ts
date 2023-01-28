import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data"
import { ItemType } from "@item/data"

export type NoteContainerSource = BaseContainerSource<ItemType.NoteContainer, NoteContainerSystemData>

// Export class NoteContainerData extends BaseContainerData<NoteContainerGURPS> {}

export interface NoteContainerData extends Omit<NoteContainerSource, "effects" | "items">, NoteContainerSystemData {
	readonly type: NoteContainerSource["type"]
	data: NoteContainerSystemData

	readonly _source: NoteContainerSource
}

export interface NoteContainerSystemData extends BaseContainerSystemData {
	text: string
}
