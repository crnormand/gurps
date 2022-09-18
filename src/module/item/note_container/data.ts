import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";

export type NoteContainerSource = BaseContainerSource<"note_container", NoteContainerSystemData>;

// Export class NoteContainerData extends BaseContainerData<NoteContainerGURPS> {}

export interface NoteContainerData extends Omit<NoteContainerSource, "effects" | "items">, NoteContainerSystemData {
	readonly type: NoteContainerSource["type"];
	data: NoteContainerSystemData;

	readonly _source: NoteContainerSource;
}

export interface NoteContainerSystemData extends BaseContainerSystemData {
	text: string;
}
