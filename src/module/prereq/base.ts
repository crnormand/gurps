import { CharacterGURPS } from "@actor"
import { Prereq } from "@module/config"
import { NumberComparison, PrereqType, StringComparison } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"

export interface PrereqConstructionContext {
	ready?: boolean
}

export class BasePrereq {
	constructor(data: Prereq | any, context: PrereqConstructionContext = {}) {
		if (context.ready) {
			Object.assign(this, data)
		} else {
			mergeObject(context, {
				ready: true,
			})
			const PrereqConstructor = CONFIG.GURPS.Prereq.classes[data?.type as PrereqType]
			if (PrereqConstructor) return new PrereqConstructor(data as any, context)
			throw new Error("No PrereqConstructor provided")
		}
	}

	static get defaults(): Record<string, any> {
		return {
			has: true,
		}
	}

	static get default() {
		return new BasePrereq(
			{
				type: PrereqType.Trait,
				name: { compare: StringComparison.Is, qualifier: "" },
				notes: { compare: StringComparison.None, qualifier: "" },
				levels: { compare: NumberComparison.AtLeast, qualifier: 0 },
				has: true,
			},
			{ ready: true }
		)
	}

	static get list() {
		return new BasePrereq({
			type: PrereqType.List,
			all: true,
			when_tl: { compare: NumberComparison.None, qualifier: 0 },
			prereqs: [],
		})
	}
}

export interface BasePrereq {
	satisfied(character: CharacterGURPS, exclude: any, tooltip: TooltipGURPS, prefix: string): [boolean, boolean]
	type: PrereqType
	has: boolean
}
