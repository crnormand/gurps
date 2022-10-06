import { floatingMul, Static } from "@util"
import { convertRollStringToArrayOfInt } from "@util/static"
import { StaticCharacterGURPS } from "."

export class _BaseComponent {
	notes: string

	note = ""

	pageref: string

	externallink?: string

	contains: { [key: string]: _BaseComponent }

	uuid: string

	parentuuid: string

	constructor() {
		this.notes = ""
		this.pageref = ""
		this.contains = {}
		this.uuid = ""
		this.parentuuid = ""
	}

	setPageRef(r: string) {
		this.pageref = r
		if (r && r.match(/https?:\/\//i)) {
			this.pageref = "*Link"
			this.externallink = r
		}
	}

	setNotes(n: string) {
		if (n) {
			let v = Static.extractP(n)
			let k = "Page Ref: "
			let i = v.indexOf(k)
			if (i >= 0) {
				this.notes = v.substring(0, i).trim()
				// Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
				this.setPageRef(v.substring(i + k.length).trim())
			} else {
				this.notes = v.trim()
				this.pageref = ""
			}
		}
	}
}

export class NamedComponent extends _BaseComponent {
	name: string

	constructor(name?: string) {
		super()
		this.name = ""
		this.setName(name)
	}

	setName(name?: string) {
		if (name) {
			let k = "Page Ref: "
			let i = name.indexOf(k)
			if (i >= 0) {
				this.name = name.substring(0, i).trim()
				this.setPageRef(name.substring(i + k.length).trim())
			} else {
				this.name = name.trim()
				this.pageref = ""
			}
		}
	}
}

export class NamedCostComponent extends NamedComponent {
	points: number

	constructor(name?: string) {
		super(name)
		this.points = 0
	}
}

export class LeveledComponent extends NamedCostComponent {
	import: number

	level: number

	constructor(name: string, level: number) {
		super(name)

		this.import = level

		this.level = 0
		Object.assign(LeveledComponent.prototype, _AnimationMixin)
	}

	get animationData() {
		return this
	}
}

export class StaticSkill extends LeveledComponent {
	type: string

	relativelevel = ""

	constructor(name = "Skill", level = 0) {
		super(name, level)
		this.type = ""
		this.relativelevel = ""
	}
}

export class StaticSpell extends LeveledComponent {
	class: string

	college: string

	cost: string

	maintain: string

	duration: string

	resist: string

	casttime: string

	difficulty: string

	relativelevel: string // "IQ+1"

	constructor(name = "Spell", level = 0) {
		super(name, level)
		this.class = ""
		this.college = ""
		this.cost = ""
		this.maintain = ""
		this.duration = ""
		this.resist = ""
		this.casttime = ""
		this.difficulty = ""
		this.relativelevel = "" // "IQ+1"
	}
}

export class StaticAdvantage extends NamedCostComponent {
	userdesc: string

	note: string

	spoken?: string

	written?: string

	constructor(name?: string) {
		super(name)
		this.userdesc = ""
		this.note = ""
	}
}

export class StaticAttack extends NamedComponent {
	import: number

	damage: string

	st: string

	mode: string

	level: string

	constructor(name: string, level: number, damage: string) {
		super(name)
		this.import = level
		this.damage = damage
		this.st = ""
		this.mode = ""
		this.level = ""

		Object.assign(StaticAttack.prototype, _AnimationMixin)
	}

	get animationData() {
		return this
	}
}

export class StaticMelee extends StaticAttack {
	weight: string

	techlevel: string

	cost: string

	reach: string

	parry: string

	block: string

	constructor(name = "Weapon", level = 0, damage = "") {
		super(name, level, damage)

		this.weight = ""
		this.techlevel = ""
		this.cost = ""
		this.reach = ""
		this.parry = ""
		this.block = ""
	}
}

export class StaticRanged extends StaticAttack {
	bulk: string

	legalityclass: string

	ammo: number

	acc: string

	range: string

	rof: string

	shots: string

	rcl: string

	halfd: string

	max: string

	constructor(name = "Weapon", level = 0, damage = "") {
		super(name, level, damage)
		this.bulk = ""
		this.legalityclass = ""
		this.ammo = 0
		this.acc = ""
		this.range = ""
		this.rof = ""
		this.shots = ""
		this.rcl = ""
		this.halfd = ""
		this.max = ""
	}

	checkRange(): void {
		if (this.halfd) this.range = this.halfd
		if (this.max) this.range = this.max
		if (this.halfd && this.max) this.range = `${this.halfd}/${this.max}`
	}
}

export class StaticEquipment extends NamedComponent {
	save: boolean

	equipped: boolean

	carried: boolean

	count: number

	cost: number

	weight: number

	location: string

	techlevel: string

	legalityclass: string

	categories: string

	costsum: number

	weightsum: number

	uses: string

	maxuses: string

	ignoreImportQty = false

	uuid: string

	parentuuid: string

	itemid: string

	collapsed: { [key: string]: any }

	contains: { [key: string]: any }

	constructor(nm = "Equipment", ue = false) {
		super(nm)
		this.save = ue
		this.equipped = false
		this.carried = false
		this.count = 0
		this.cost = 0
		this.weight = 0
		this.location = ""
		this.techlevel = ""
		this.legalityclass = ""
		this.categories = ""
		this.costsum = 0
		this.weightsum = 0
		this.uses = ""
		this.maxuses = ""
		this.ignoreImportQty = false
		this.uuid = ""
		this.parentuuid = ""
		this.itemid = ""
		this.collapsed = {}
		this.contains = {}
	}

	static calc(eqt: StaticEquipment) {
		StaticEquipment.calcUpdate(null, eqt, "")
	}

	static async calcUpdate(actor: StaticCharacterGURPS | null, eqt: StaticEquipment, objkey: string) {
		if (!eqt) return
		const num = (s: number | string) => {
			return Number(s) || 0
		}
		const cln = (s: number) => {
			return !s ? 0 : num(String(s).replace(/,/g, ""))
		}

		eqt.count = cln(eqt.count)
		eqt.cost = floatingMul(cln(eqt.cost))
		eqt.weight = floatingMul(cln(eqt.weight))
		let cs = eqt.count * eqt.cost
		let ws = eqt.count * eqt.weight
		if (eqt.contains) {
			for (let k in eqt.contains) {
				let e = eqt.contains[k]
				await StaticEquipment.calcUpdate(actor, e, `${objkey}.contains.${k}`)
				cs += e.costsum
				ws += e.weightsum
			}
		}
		if (eqt.collapsed) {
			for (let k in eqt.collapsed) {
				// @ts-ignore
				let e = eqt.collapsed[k]
				await StaticEquipment.calcUpdate(actor, e, `${objkey}.collapsed.${k}`)
				cs += e.costsum
				ws += e.weightsum
			}
		}
		if (actor)
			await actor.update({
				[`${objkey}.costsum`]: floatingMul(cs),
				[`${objkey}.weightsum`]: floatingMul(ws),
			})
		// The local values 'should' be updated... but I need to force them anyway
		eqt.costsum = floatingMul(cs)
		eqt.weightsum = floatingMul(ws)
	}
}

export class StaticNote extends _BaseComponent {
	notes: string

	save: boolean

	constructor(notes?: string, ue = false) {
		super()

		this.notes = notes || ""
		this.save = ue
	}
}

export class Encumbrance {
	key: string

	level: number

	dodge: number

	weight: string

	move: number

	current: boolean

	constructor() {
		this.key = ""
		this.level = 0
		this.dodge = 9
		this.weight = ""
		this.move = 0
		this.current = false
	}
}

export class StaticReaction {
	modifier: string

	situation: string

	constructor(m?: string, s?: string) {
		// TODO: change to number
		this.modifier = m || ""
		this.situation = s || ""
	}
}

export class StaticModifier extends StaticReaction {}

export class StaticLanguage {
	name: string

	spoken: string

	written: string

	points: number

	constructor(n: string, s?: string, w?: string, p?: number) {
		this.name = n
		this.spoken = s || ""
		this.written = w || ""
		this.points = p || 0
	}
}

/**
 * A representation of a Hit Location and DR on that location. If
 * this.damageType is set, this.dr will return a damage type-specific
 * DR value.
 *
 * Otherwise you can call this.getDR(type) to retrieve just the DR for
 * a specific type without first setting this.damageType.
 */
export class StaticHitLocationEntry {
	where: string

	_dr: number

	_damageType: string | null

	rollText: string

	roll: number[]

	split: { [key: string]: number }

	static getLargeAreaDR(entries: StaticHitLocationEntry[]) {
		let lowestDR = Number.POSITIVE_INFINITY
		let torsoDR = 0

		for (let value of entries.filter(it => it.roll.length > 0)) {
			if (value.dr < lowestDR) lowestDR = value.dr
			if (value.where === "Torso") torsoDR = value.dr
		}
		// Return the average of torso and lowest dr
		return Math.ceil((lowestDR + torsoDR) / 2)
	}

	static findLocation(entries: StaticHitLocationEntry[], where: string) {
		return entries.find(it => it.where === where)
	}

	constructor(where: string, dr: number, rollText: string, split: { [key: string]: number }) {
		this.where = where
		this._dr = dr
		this._damageType = null
		this.rollText = rollText
		this.roll = convertRollStringToArrayOfInt(rollText)
		this.split = split
	}

	getDR(damageType: string | null): number {
		if (!damageType || !this.split) return this._dr
		return this?.split[damageType] ? this.split[damageType] : this._dr
	}

	get dr(): number {
		return this.getDR(this._damageType)
	}

	set damageType(damageType: string | null) {
		this._damageType = damageType
	}
}

const _AnimationMixin = {
	_checkotf: "",
	_duringotf: "",
	_passotf: "",
	_failotf: "",

	get checkotf() {
		return this._checkotf
	},
	set checkotf(value: string) {
		this._checkotf = value
	},

	get duringotf() {
		return this._duringotf
	},
	set duringotf(value: string) {
		this._duringotf = value
	},

	get passotf() {
		return this._passotf
	},
	set passotf(value: string) {
		this._passotf = value
	},

	get failotf() {
		return this._failotf
	},
	set failotf(value: string) {
		this._failotf = value
	},
}
