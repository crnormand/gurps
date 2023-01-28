import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data"
import { ItemType } from "@item/data"

export type NoteSource = BaseItemSourceGURPS<ItemType.Note, NoteSystemData>

// Export class NoteData extends BaseItemDataGURPS<NoteGURPS> {}

export interface NoteData extends Omit<NoteSource, "effects">, NoteSystemData {
	readonly type: NoteSource["type"]
	data: NoteSystemData

	readonly _source: NoteSource
}

export interface NoteSystemData extends ItemSystemData {
	text: string
}
