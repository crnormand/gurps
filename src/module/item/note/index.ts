import { BaseItemGURPS } from "@item/base";
import { NoteData } from "./data";

export class NoteGURPS extends BaseItemGURPS {
	// Static get schema(): typeof NoteData {
	// 	return NoteData;
	// }
}

export interface NoteGURPS {
	readonly system: NoteData;
}
