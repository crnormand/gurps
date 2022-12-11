import { BaseItemGURPS } from "@item/base"
import { NoteData } from "./data"

export class NoteGURPS extends BaseItemGURPS {
	// Static get schema(): typeof NoteData {
	// 	return NoteData;
	// }
	//

	get formattedName(): string {
		return this.formattedText
	}

	get formattedText(): string {
		// @ts-ignore until v10 types
		Object.entries(CONST.SHOWDOWN_OPTIONS).forEach(([k, v]) => showdown.setOption(k, v));
		// @ts-ignore until v10 types
		const converter = new showdown.Converter()
		return converter.makeHtml(this.system.text)
	}
}

export interface NoteGURPS {
	readonly system: NoteData
}
