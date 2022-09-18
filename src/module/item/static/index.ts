import { BaseItemGURPS } from "@item/base";
import { StaticItemData } from "./data";

export class StaticItemGURPS extends BaseItemGURPS {
	async internalUpdate(data: any, context = {}): Promise<unknown> {
		let ctx = { render: true };
		// Let ctx = { render: !this.ignoreRender };
		if (context) ctx = { ...context, ...ctx };
		return this.update(data, ctx);
	}
}

export interface StaticItemGURPS {
	readonly system: StaticItemData;
}
