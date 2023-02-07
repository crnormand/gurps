import { ItemGCS } from "@item/gcs"
import { NoteData } from "./data"

class NoteGURPS extends ItemGCS {
	get formattedName(): string {
		return this.formattedText
	}

	get formattedText(): string {
		const showdown_options = {
			// @ts-ignore until v10 types
			...CONST.SHOWDOWN_OPTIONS,
		}
		// @ts-ignore until v10 types
		Object.entries(showdown_options).forEach(([k, v]) => showdown.setOption(k, v))
		// @ts-ignore until v10 types
		const converter = new showdown.Converter()
		const text = this.system.text
		return converter.makeHtml(text)?.replace(/\s\+/g, "\r")
	}
}

interface NoteGURPS extends ItemGCS {
	readonly system: NoteData
}

export { NoteGURPS }
