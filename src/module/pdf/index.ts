import { Context } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";

export interface EntryPageConstructorContextGURPS extends Context<JournalEntry> {
	gurps?: {
		ready?: boolean;
	};
}

// @ts-ignore
export class JournalEntryPageGURPS extends JournalEntryPage {
	constructor(data: any, context: EntryPageConstructorContextGURPS = {}) {
		if (context.gurps?.ready) {
			super(data, context);
			this.system.code ??= "";
			this.system.offset ??= 0;
		} else {
			mergeObject(context, { gurps: { ready: true } });
			if (data.type === "pdf") return new JournalEntryPageGURPS(data, context);
			// @ts-ignore
			else return new JournalEntryPage(data, context);
		}
	}
}

// @ts-ignore
export interface JournalEntryPageGURPS extends JournalEntryPage {
	system: {
		offset: number;
		code: string;
	};
}

export { openPDF } from "./pdf";
