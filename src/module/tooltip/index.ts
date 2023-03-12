export class TooltipGURPS {
	list: Array<string | TooltipGURPS> = []

	unshift(...args: Array<string | TooltipGURPS>): number {
		for (const a of args) {
			this.list.unshift(a)
		}
		return this.list.length
	}

	push(...args: Array<string | TooltipGURPS>): number {
		for (const a of args) {
			this.list.push(a)
		}
		return this.list.length
	}

	toString(nl = "<br>", tab = 1): string {
		let final = ""
		for (const i of this.list) {
			if (i instanceof TooltipGURPS) final += i.toString(nl, tab + 1) + nl
			else final += i
		}
		return "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(tab) + final
	}

	get length(): number {
		return this.list.length
	}
}
