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
		const showdown_options = {
			// @ts-ignore until v10 types
			...CONST.SHOWDOWN_OPTIONS,
			// ...{
			// 	simpleLineBreaks: true
			// }
		}
		// @ts-ignore until v10 types
		Object.entries(showdown_options).forEach(([k, v]) => showdown.setOption(k, v))
		// @ts-ignore until v10 types
		const converter = new showdown.Converter()
		const text = this.system.text
		return converter.makeHtml(text)?.replace(/\s\+/g, "\r")
	}
}

export interface NoteGURPS {
	readonly system: NoteData
}
