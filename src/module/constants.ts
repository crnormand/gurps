export const staticHpConditions: {
	[key: string]: { breakpoint: ([string]: any) => number; label: string; style: string }
} = {
	NORMAL: {
		breakpoint: _ => Number.MAX_SAFE_INTEGER,
		label: "gurps.static.status.normal",
		style: "normal",
	},
	REELING: {
		breakpoint: HP => Math.ceil(HP.max / 3) - 1,
		label: "gurps.static.status.reeling",
		style: "reeling",
	},
	COLLAPSE: {
		breakpoint: _ => 0,
		label: "gurps.static.status.collapse",
		style: "collapse",
	},
	CHECK1: {
		breakpoint: HP => -1 * HP.max,
		label: "gurps.static.status.check1",
		style: "check",
	},
	CHECK2: {
		breakpoint: HP => -2 * HP.max,
		label: "gurps.static.status.check2",
		style: "check",
	},
	CHECK3: {
		breakpoint: HP => -3 * HP.max,
		label: "gurps.static.status.check3",
		style: "check",
	},
	CHECK4: {
		breakpoint: HP => -4 * HP.max,
		label: "gurps.static.status.check4",
		style: "check",
	},
	DEAD: {
		breakpoint: HP => -5 * HP.max,
		label: "gurps.static.status.dead",
		style: "dead",
	},
	DESTROYED: {
		breakpoint: HP => -10 * HP.max,
		label: "gurps.static.status.destroyed",
		style: "destroyed",
	},
}

export const staticFpConditions: {
	[key: string]: { breakpoint: ([string]: any) => number; label: string; style: string }
} = {
	NORMAL: {
		breakpoint: _ => Number.MAX_SAFE_INTEGER,
		label: "gurps.static.status.normal",
		style: "normal",
	},
	REELING: {
		breakpoint: FP => Math.ceil(FP.max / 3) - 1,
		label: "gurps.static.status.tired",
		style: "tired",
	},
	COLLAPSE: {
		breakpoint: _ => 0,
		label: "gurps.static.status.collapse",

		style: "collapse",
	},
	UNCONSCIOUS: {
		breakpoint: FP => -1 * FP.max,
		label: "gurps.static.status.unconscious",
		style: "unconscious",
	},
}
