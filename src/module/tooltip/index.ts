export class TooltipGURPS {
	list: Array<string | TooltipGURPS> = [];

	push(...args: Array<string | TooltipGURPS>): number {
		for (const a of args) {
			this.list.push(a);
		}
		return this.list.length;
	}

	toString(nl = "\n"): string {
		const tab = "\t";
		let final = "";
		for (const i of this.list) {
			if (i instanceof TooltipGURPS) final += i.toString(nl + tab);
			else final += nl + i;
		}
		return final;
	}

	get length(): number {
		return this.list.length;
	}
}
