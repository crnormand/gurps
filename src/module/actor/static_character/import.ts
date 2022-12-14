import { HitLocationTable } from "@actor/character/hit_location"
import { CharacterImportedData } from "@actor/character/import"
import { TraitSystemData } from "@item/trait/data"
import { TraitContainerSystemData } from "@item/trait_container/data"
import { SYSTEM_NAME, SETTINGS } from "@module/data"
import { floatingMul, i18n, i18n_f, Static } from "@util"
import { StaticCharacterGURPS } from "."
import {
	StaticAdvantage,
	StaticEquipment,
	StaticMelee,
	StaticModifier,
	StaticNote,
	StaticRanged,
	StaticReaction,
	StaticSkill,
	StaticSpell,
} from "./components"
import { StaticCharacterSystemData, StaticEncumbrance } from "./data"
import { StaticHitLocation, StaticHitLocationDictionary, StaticHitLocationRolls } from "./hit_location"

export class StaticCharacterImporter {
	document: StaticCharacterGURPS

	constructor(document: StaticCharacterGURPS) {
		this.document = document
	}

	static import(document: StaticCharacterGURPS, file: { text: string; name: string; path: string }) {
		// If (file.name.includes(".xml")) return StaticGCAImporter.import(document, file)
		const importer = new StaticCharacterImporter(document)
		importer._import(document, file)
	}

	async _import(document: StaticCharacterGURPS, file: { text: string; name: string; path: string }) {
		const json = file.text
		let r: CharacterImportedData & { advantages?: any[]; settings: { hit_locations?: HitLocationTable } }
		const errorMessages: string[] = []
		try {
			r = JSON.parse(json)
		} catch (err) {
			console.error(err)
			errorMessages.push(i18n("gurps.error.import.no_json_detected"))
			return this.throwImportError(errorMessages)
		}

		let commit: Partial<StaticCharacterSystemData> = {}
		const imp = document.system.additionalresources
		imp.importname = file.name ?? imp.importname
		imp.importpath = file.path ?? imp.importpath
		commit = { ...commit, ...{ "system.lastImport": new Date().toString().split(" ").splice(1, 4).join(" ") } }
		try {
			let nm = r.profile.name
			if (!(game as Game).settings.get(SYSTEM_NAME, SETTINGS.IGNORE_IMPORT_NAME)) {
				commit = { ...commit, ...{ name: nm, "token.name": nm } }
			}
			commit = { ...commit, ...{ "system.additionalresources": imp } }
			commit = { ...commit, ...(await this.importAttributes(r.attributes, r.equipment, r.calc)) }
			commit = { ...commit, ...(await this.importMisc(r.profile, r.created_date, r.modified_date)) }
			commit = {
				...commit,
				...this.importSize(commit, r.profile, r.traits || r.advantages, r.skills, r.equipment),
			}

			// Items
			commit = { ...commit, ...this.importTraits(r.traits || r.advantages) }
			commit = { ...commit, ...this.importSkills(r.skills) }
			commit = { ...commit, ...this.importSpells(r.spells) }
			commit = { ...commit, ...this.importEquipment(r.equipment, r.other_equipment) }
			commit = { ...commit, ...this.importNotes(r.notes) }

			commit = { ...commit, ...(await this.importBodyType(r.settings.body_type || r.settings.hit_locations)) }
			commit = {
				...commit,
				...this.importPointTotals(r.total_points, r.attributes, r.traits || r.advantages, r.skills, r.spells),
			}
			commit = { ...commit, ...this.importReactions(r.traits || r.advantages, r.skills, r.equipment) }
			commit = { ...commit, ...this.importCombat(r.traits || r.advantages, r.skills, r.spells, r.equipment) }
		} catch (err: any) {
			console.error(err.stack)
			errorMessages.push(
				i18n_f("gurps.error.import.generic", {
					name: r.profile.name,
					message: (err as Error).message,
				})
			)
			return this.throwImportError(errorMessages)
		}

		console.log("Starting commit")
		const deletes = Object.fromEntries(Object.entries(commit).filter(([key, _value]) => key.includes(".-=")))
		const adds = Object.fromEntries(Object.entries(commit).filter(([key, _value]) => !key.includes(".-=")))
		try {
			await this.document.update(deletes, { diff: false, render: false })
			await this.document.update(adds, { diff: false })
			await this.document.postImport()
		} catch (err) {
			console.error(err)
			errorMessages.push(
				i18n_f("gurps.error.import.generic", {
					name: r.profile.name,
					message: (err as Error).message,
				})
			)
			return this.throwImportError(errorMessages)
		}
		return true
	}

	async importAttributes(
		atts: CharacterImportedData["attributes"],
		eqp: CharacterImportedData["equipment"],
		calc: CharacterImportedData["calc"]
	) {
		if (!atts) return
		let data: any = this.document.system
		let att: any = data.attributes
		if (!att.QN) {
			// Upgrade older actors to include Q
			att.QN = {}
			data.QP = {}
		}

		att.ST.import = atts.find(e => e.attr_id === "st")?.calc?.value || 0
		att.ST.points = atts.find(e => e.attr_id === "st")?.calc?.points || 0
		att.DX.import = atts.find(e => e.attr_id === "dx")?.calc?.value || 0
		att.DX.points = atts.find(e => e.attr_id === "dx")?.calc?.points || 0
		att.IQ.import = atts.find(e => e.attr_id === "iq")?.calc?.value || 0
		att.IQ.points = atts.find(e => e.attr_id === "iq")?.calc?.points || 0
		att.HT.import = atts.find(e => e.attr_id === "ht")?.calc?.value || 0
		att.HT.points = atts.find(e => e.attr_id === "ht")?.calc?.points || 0
		att.WILL.import = atts.find(e => e.attr_id === "will")?.calc?.value || 0
		att.WILL.points = atts.find(e => e.attr_id === "will")?.calc?.points || 0
		att.PER.import = atts.find(e => e.attr_id === "per")?.calc?.value || 0
		att.PER.points = atts.find(e => e.attr_id === "per")?.calc?.points || 0
		att.QN.import = atts.find(e => e.attr_id === "qn")?.calc?.value || 0
		att.QN.points = atts.find(e => e.attr_id === "qn")?.calc?.points || 0

		data.HP.max = atts.find(e => e.attr_id === "hp")?.calc?.value || 0
		data.HP.points = atts.find(e => e.attr_id === "hp")?.calc?.points || 0
		data.FP.max = atts.find(e => e.attr_id === "fp")?.calc?.value || 0
		data.FP.points = atts.find(e => e.attr_id === "fp")?.calc?.points || 0
		data.QP.max = atts.find(e => e.attr_id === "qp")?.calc?.value || 0
		data.QP.points = atts.find(e => e.attr_id === "qp")?.calc?.points || 0
		let hp = atts.find(e => e.attr_id === "hp")?.calc?.current || 0
		let fp = atts.find(e => e.attr_id === "fp")?.calc?.current || 0
		let qp = atts.find(e => e.attr_id === "qp")?.calc?.current || 0

		let saveCurrent = false

		if (data.lastImport && (data.HP.value !== hp || data.FP.value !== fp)) {
			let option = (game as Game).settings.get(SYSTEM_NAME, SETTINGS.STATIC_IMPORT_HP_FP)
			if (option === 0) {
				saveCurrent = true
			}
			if (option === 2) {
				saveCurrent = await new Promise((resolve, _reject) => {
					let d = new Dialog({
						title: "Current HP & FP",
						content: `Do you want to <br><br><b>Save</b> the current HP (${data.HP.value}) & FP (${data.FP.value}) values or <br><br><b>Overwrite</b> it with the import data, HP (${hp}) & FP (${fp})?<br><br>&nbsp;`,
						buttons: {
							save: {
								icon: '<i class="far fa-square"></i>',
								label: "Save",
								callback: () => resolve(true),
							},
							overwrite: {
								icon: '<i class="fas fa-edit"></i>',
								label: "Overwrite",
								callback: () => resolve(false),
							},
						},
						default: "save",
						close: () => resolve(false), // Just assume overwrite.   Error handling would be too much work right now.
					})
					d.render(true)
				})
			}
		}
		if (!saveCurrent) {
			data.HP.value = hp
			data.FP.value = fp
		}
		data.QP.value = qp

		let bl_value = parseFloat(calc?.basic_lift.toString().match(/[\d.]+/g)?.[0] || "")
		let bl_unit = (calc?.basic_lift).toString().replace(`${bl_value} `, "")

		let lm: Partial<StaticCharacterSystemData["liftingmoving"]> = {}
		lm.basiclift = `${Number(bl_value).toString()} ${bl_unit}`
		lm.carryonback = `${(bl_value * 15).toString()} ${bl_unit}`
		lm.onehandedlift = `${(bl_value * 2).toString()} ${bl_unit}`
		lm.runningshove = `${(bl_value * 24).toString()} ${bl_unit}`
		lm.shiftslightly = `${(bl_value * 50).toString()} ${bl_unit}`
		lm.shove = `${(bl_value * 12).toString()} ${bl_unit}`
		lm.twohandedlift = `${(bl_value * 8).toString()} ${bl_unit}`

		let bm = atts.find(e => e.attr_id === "basic_move")?.calc?.value || 0
		data.basicmove.value = bm.toString()
		data.basicmove.points = atts.find(e => e.attr_id === "basic_move")?.calc?.points || 0
		let bs = atts.find(e => e.attr_id === "basic_speed")?.calc?.value || 0
		data.basicspeed.value = bs.toString()
		data.basicspeed.points = atts.find(e => e.attr_id === "basic_speed")?.calc?.points || 0

		data.thrust = calc?.thrust
		data.swing = calc?.swing
		data.currentmove = data.basicmove.value
		data.frightcheck = atts.find(e => e.attr_id === "fright_check")?.calc?.value || 0

		data.hearing = atts.find(e => e.attr_id === "hearing")?.calc?.value || 0
		data.tastesmell = atts.find(e => e.attr_id === "taste_smell")?.calc?.value || 0
		data.touch = atts.find(e => e.attr_id === "touch")?.calc?.value || 0
		data.vision = atts.find(e => e.attr_id === "vision")?.calc?.value || 0

		let cm = 0
		let cd = 0
		let es = {}
		let ew = [1, 2, 3, 6, 10]
		let index = 0
		let total_carried = this.calcTotalCarried(eqp)
		for (let i = 0; i <= 4; i++) {
			let e = new StaticEncumbrance()
			e.level = i
			e.current = false
			e.key = `enc${i}`
			let weight_value = bl_value * ew[i]
			// E.current = total_carried <= weight_value && (i === 4 || total_carried < bl_value*ew[i+1]);
			e.current =
				(total_carried < weight_value || i === 4 || bl_value === 0) &&
				(i === 0 || total_carried > bl_value * ew[i - 1])
			e.weight = `${weight_value.toString()} ${bl_unit}`
			e.move = calc?.move[i]
			e.dodge = calc?.dodge[i]
			if (e.current) {
				cm = e.move
				cd = e.dodge
			}
			Static.put(es, e, index++)
		}

		return {
			"system.attributes": att,
			"system.HP": data.HP,
			"system.FP": data.FP,
			"system.basiclift": data.basiclift,
			"system.basicmove": data.basicmove,
			"system.basicspeed": data.basicspeed,
			"system.thrust": data.thrust,
			"system.swing": data.swing,
			"system.frightcheck": data.frightcheck,
			"system.hearing": data.hearing,
			"system.tastesmell": data.tastesmell,
			"system.touch": data.touch,
			"system.vision": data.vision,
			"system.liftingmoving": lm,
			"system.currentmove": cm,
			"system.currentdodge": cd,
			"system.-=encumbrance": null,
			"system.encumbrance": es,
			"system.QP": data.QP,
		}
	}

	calcTotalCarried(eqp: StaticCharacterSystemData["equipment"]["carried"]) {
		let t = 0
		if (!eqp) return t
		for (let i of eqp) {
			let w = 0
			w += parseFloat(i.weight || "0") * (i.type === "equipment_container" ? 1 : i.quantity || 0)
			if (i.children?.length) w += this.calcTotalCarried(i.children)
			t += w
		}
		return t
	}

	async importMisc(p: CharacterImportedData["profile"], cd: string, md: string) {
		if (!p) return
		let ts: StaticCharacterSystemData["traits"] = {}
		ts.race = ""
		ts.height = p.height || ""
		ts.weight = p.weight || ""
		ts.age = p.age || ""
		ts.title = p.title || ""
		ts.player = p.player_name || ""
		ts.createdon =
			new Date(cd).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }).replace(" at", ",") || ""
		ts.modifiedon =
			new Date(md).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }).replace(" at", ",") || ""
		// Ts.modifiedon = md || ''
		ts.religion = p.religion || ""
		ts.birthday = p.birthday || ""
		ts.hand = p.handedness || ""
		ts.techlevel = p.tech_level || ""
		ts.gender = p.gender || ""
		ts.eyes = p.eyes || ""
		ts.hair = p.hair || ""
		ts.skin = p.skin || ""

		const r: any = {
			"system.-=traits": null,
			"system.traits": ts,
		}

		if (p.portrait) {
			if ((game as Game).user?.hasPermission("FILES_UPLOAD")) {
				r.img = `data:imdage/png;base64,${p.portrait}.png`
			} else {
				console.error(i18n("gurps.error.import.portait_permissions"))
				ui.notifications?.error(i18n("gurps.error.import.portait_permissions"))
			}
		}
		return r
	}

	importSize(
		commit: any,
		profile: CharacterImportedData["profile"],
		ads: CharacterImportedData["traits"],
		skills: CharacterImportedData["skills"],
		equipment: CharacterImportedData["equipment"]
	) {
		let ts = commit["system.traits"]
		let final = profile.SM || 0
		let temp = [...(ads || []), ...(skills || []), ...(equipment || [])]
		let all: any[] = []
		for (let i of temp) {
			all = all.concat(this.recursiveGet(i))
		}
		for (let i of all) {
			if (i.features?.length)
				for (let f of i.features) {
					if (f.type === "attribute_bonus" && f.attribute === "sm")
						final += f.amount * (i.levels ? parseFloat(i.levels) : 1)
				}
		}
		ts.sizemod = final.signedString()
		return {
			"system.-=traits": null,
			"system.traits": ts,
		}
	}

	importTraits(ads: any[]) {
		let temp: any[] = []
		if (ads)
			for (let i of ads) {
				temp = temp.concat(this.importTrait(i, ""))
			}
		return {
			"system.-=ads": null,
			"system.ads": this.foldList(temp),
		}
	}

	importTrait(i: TraitSystemData | TraitContainerSystemData | any, p: string) {
		let a = new StaticAdvantage()
		a.name = i.name + (i.levels ? ` ${i.levels.toString()}` : "") || "Trait"
		a.points = i.calc?.points
		a.note = i.notes
		a.userdesc = i.userdesc
		a.notes = ""

		if (i.cr) {
			a.notes = `[${i18n(`gurps.select.cr_level.${i.cr}`)}: ${a.name}]`
		}
		if (i.modifiers?.length) {
			for (let j of i.modifiers)
				if (!j.disabled) a.notes += `${a.notes ? "; " : ""}${j.name}${j.notes ? ` (${j.notes})` : ""}`
		}
		if (a.note) a.notes += (a.notes ? "\n" : "") + a.note
		if (a.userdesc) a.notes += (a.notes ? "\n" : "") + a.userdesc
		a.pageref = i.reference
		a.uuid = i.id
		a.parentuuid = p

		let old = this.document._findElementIn("ads", a.uuid)
		this.document._migrateOtfsAndNotes(old, a, i.vtt_notes)

		let ch: any[] = []
		if (i.children?.length) {
			for (let j of i.children) ch = ch.concat(this.importTrait(j, i.id))
		}
		return [a].concat(ch)
	}

	importSkills(sks: any[]) {
		if (!sks) return
		let temp: any[] = []
		for (let i of sks) {
			temp = temp.concat(this.importSk(i, ""))
		}
		return {
			"system.-=skills": null,
			"system.skills": this.foldList(temp),
		}
	}

	importSk(i: any, p: string): any {
		let name =
			i.name + (i.tech_level ? `/TL${i.tech_level}` : "") + (i.specialization ? ` (${i.specialization})` : "") ||
			"Skill"
		if (i.type === "technique" && i.default) {
			let addition = ""
			addition = ` (${i.default.name}`
			if (i.default.specialization) {
				addition += ` (${i.default.specialization})`
			}
			name += `${addition})`
		}
		let s = new StaticSkill(name, 0)
		s.pageref = i.reference || ""
		s.uuid = i.id
		s.parentuuid = p
		if (["skill", "technique"].includes(i.type)) {
			s.type = i.type.toUpperCase()
			s.import = i.calc ? i.calc.level : ""
			if (s.level === 0) s.level = 0
			s.points = i.points
			s.relativelevel = i.calc?.rsl
			s.notes = i.notes || ""
		} else {
			// Usually containers
			s.level = 0
		}
		let old = this.document._findElementIn("skills", s.uuid)
		this.document._migrateOtfsAndNotes(old, s, i.vtt_notes)

		let ch: any[] = []
		if (i.children?.length) {
			for (let j of i.children) ch = ch.concat(this.importSk(j, i.id))
		}
		return [s].concat(ch)
	}

	importSpells(sps: any[]) {
		if (!sps) return
		let temp: any[] = []
		for (let i of sps) {
			temp = temp.concat(this.importSp(i, ""))
		}
		return {
			"system.-=spells": null,
			"system.spells": this.foldList(temp),
		}
	}

	importSp(i: any, p: string): any {
		let s = new StaticSpell()
		s.name = i.name || "Spell"
		s.uuid = i.id
		s.parentuuid = p
		s.pageref = i.reference || ""
		if (["spell", "ritual_magic_spell"].includes(i.type)) {
			s.class = i.spell_class || ""
			s.college = i.college || ""
			s.cost = i.casting_cost || ""
			s.maintain = i.maintenance_cost || ""
			s.difficulty = i.difficulty.toUpperCase()
			s.relativelevel = i.calc?.rsl
			s.notes = i.notes || ""
			s.duration = i.duration || ""
			s.points = i.points || ""
			s.casttime = i.casting_time || ""
			s.import = i.calc?.level || 0
		}

		let old = this.document._findElementIn("spells", s.uuid)
		this.document._migrateOtfsAndNotes(old, s, i.vtt_notes)

		let ch: any[] = []
		if (i.children?.length) {
			for (let j of i.children) ch = ch.concat(this.importSp(j, i.id))
		}
		return [s].concat(ch)
	}

	importEquipment(eq: any[], oeq: any[]) {
		if (!eq && !oeq) return
		let temp: any[] = []
		if (eq)
			for (let i of eq) {
				temp = [...temp, ...this.importEq(i, "", true)]
			}
		if (oeq)
			for (let i of oeq) {
				temp = [...temp, ...this.importEq(i, "", false)]
			}

		Static.recurseList(this.document.system.equipment?.carried, t => {
			t.carried = true
			if (t.save) temp.push(t)
		})
		Static.recurseList(this.document.system.equipment?.other, t => {
			t.carried = false
			if (t.save) temp.push(t)
		})

		temp.forEach(e => {
			e.contains = {}
			e.collapsed = {}
		})

		temp.forEach(e => {
			if (e.parentuuid) {
				let parent = null
				parent = temp.find(f => f.uuid === e.parentuuid)
				if (parent) Static.put(parent.contains, e)
				else e.parentuuid = ""
			}
		})

		let equipment = {
			carried: {},
			other: {},
		}
		let cindex = 0
		let oindex = 0

		temp.forEach(eqt => {
			StaticEquipment.calc(eqt)
			if (!eqt.parentuuid) {
				if (eqt.carried) Static.put(equipment.carried, eqt, cindex++)
				else Static.put(equipment.other, eqt, oindex++)
			}
		})

		return {
			"system.-=equipment": null,
			"system.equipment": equipment,
		}
	}

	importEq(i: any, p: string, carried: boolean): any {
		let e = new StaticEquipment()
		e.name = i.description || "Equipment"
		e.count = i.type === "equipment_container" ? "1" : i.quantity || "0"
		e.cost = floatingMul(parseFloat(i.calc.extended_value) ?? 0) / (i.quantity || 1)
		e.carried = carried
		e.equipped = i.equipped
		e.techlevel = i.tech_level || ""
		e.legalityclass = i.legality_class || "4"
		e.categories = i.categories?.join(", ") || ""
		e.uses = i.uses || 0
		e.maxuses = i.max_uses || 0
		e.uuid = i.id
		e.parentuuid = p
		e.notes = ""
		e.note = i.notes || ""
		if (i.modifiers?.length) {
			for (let j of i.modifiers)
				if (!j.disabled) e.notes += `${e.notes ? "; " : ""}${j.name}${j.notes ? ` (${j.notes})` : ""}`
		}
		if (e.note) e.notes += (e.notes ? "\n" : "") + e.note
		e.weight = floatingMul(parseFloat(i.calc.extended_weight) ?? 0) / (i.quantity || 1)
		e.pageref = i.reference || ""
		let old = this.document._findElementIn("system.equipment.carried", e.uuid)
		if (!old) old = this.document._findElementIn("system.equipment.other", e.uuid)
		this.document._migrateOtfsAndNotes(old, e, i.vtt_notes)
		if (old) {
			e.carried = old.carried
			e.equipped = old.equipped
			e.parentuuid = old.parentuuid
			if (old.ignoreImportQty) {
				e.count = old.count
				e.uses = old.uses
				e.maxuses = old.maxuses
				e.ignoreImportQty = true
			}
		}
		let ch: any[] = []
		if (i.children?.length) {
			for (let j of i.children) ch = ch.concat(this.importEq(j, i.id, carried))
			for (let j of ch) {
				e.cost -= j.cost * j.count
				e.weight -= j.weight * j.count
			}
		}
		return [e].concat(ch)
	}

	importNotes(notes: any[]) {
		if (!notes) return
		let temp: any[] = []
		for (let i of notes) {
			temp = [...temp, ...this.importNote(i, "")]
		}
		Static.recurseList(this.document.system.notes, t => {
			if (t.save) temp.push(t)
		})
		return {
			"system.-=notes": null,
			"system.notes": this.foldList(temp),
		}
	}

	importNote(i: any, p: string): any {
		let n = new StaticNote()
		n.notes = i.text || ""
		n.uuid = i.id
		n.parentuuid = p
		n.pageref = i.reference || ""
		let old = this.document._findElementIn("notes", n.uuid)
		this.document._migrateOtfsAndNotes(old, n)
		let ch: any[] = []
		if (i.children?.length) {
			for (let j of i.children) ch = ch.concat(this.importNote(j, i.id))
		}
		return [n].concat(ch)
	}

	async importBodyType(hls: any) {
		if (!hls) return
		let data = this.document.system
		if (data.additionalresources.ignoreinputbodyplan) return

		let locations: StaticHitLocation[] = []
		for (let i of hls.locations) {
			let l = new StaticHitLocation(i.table_name)
			l.import = i.calc?.dr.all?.toString() || "0"
			for (let [key, value] of Object.entries(i.calc?.dr))
				if (key !== "all") {
					let damtype = key
					if (!l.split) l.split = {}
					l.split[damtype] = Number(l.import) + (value as any)
				}
			l.penalty = i.hit_penalty?.toString() || "0"
			while (locations.filter(it => it.where === l.where).length > 0) {
				l.where = `${l.where}*`
			}
			locations.push(l)
		}
		let vitals = locations.filter(value => value.where === StaticHitLocation.VITALS)
		if (vitals.length === 0) {
			let hl = new StaticHitLocation(StaticHitLocation.VITALS)
			hl.penalty = StaticHitLocationRolls[StaticHitLocation.VITALS].penalty
			hl.roll = StaticHitLocationRolls[StaticHitLocation.VITALS].roll
			hl.import = "0"
			locations.push(hl)
		}
		// Hit Locations MUST come from an existing bodyplan hit location table, or else ADD (and
		// potentially other features) will not work. Sometime in the future, we will look at
		// user-entered hit locations.
		let bodyplan = hls.name || hls.id // Was a body plan actually in the import?
		if (bodyplan === "snakemen") bodyplan = "snakeman"
		let table = StaticHitLocationDictionary[bodyplan] // If so, try to use it.

		let locs: StaticHitLocation[] = []
		locations.forEach(e => {
			if (table && table[e.where]) {
				// If e.where already exists in table, don't map
				locs.push(e)
			} else {
				// Map to new name(s) ... sometimes we map 'Legs' to ['Right Leg', 'Left Leg'], for example.
				e.locations(false).forEach(l => locs.push(l)) // Map to new names
			}
		})
		locations = locs

		if (!table) {
			locs = []
			locations.forEach(e => {
				e.locations(true).forEach(l => locs.push(l)) // Map to new names, but include original to help match against tables
			})
			bodyplan = this._getBodyPlan(locs)
			table = StaticHitLocationDictionary[bodyplan]
		}
		// Update location's roll and penalty based on the bodyplan

		if (table) {
			Object.values(locations).forEach(it => {
				let [lbl, entry] = StaticHitLocation.findTableEntry(table, it.where)
				if (entry) {
					it.where = lbl // It might be renamed (ex: Skull -> Brain)
					if (!it.penalty) it.penalty = entry.penalty
					if (!it.roll || it.roll.length === 0 || it.roll === StaticHitLocation.DEFAULT) it.roll = entry.roll
				}
			})
		}

		// Write the hit locations out in bodyplan hit location table order. If there are
		// other entries, append them at the end.
		let temp: StaticHitLocation[] = []
		Object.keys(table).forEach(key => {
			let results = Object.values(locations).filter(loc => loc.where === key)
			if (results.length > 0) {
				if (results.length > 1) {
					// If multiple locs have same where, concat the DRs.   Leg 7 & Leg 8 both map to "Leg 7-8"
					let d = ""

					let last: string | null = null
					results.forEach(r => {
						if (r.import !== last) {
							d += `|${r.import}`
							last = r.import
						}
					})

					if (d) d = d.substring(1)
					results[0].import = d
				}
				temp.push(results[0])
				locations = locations.filter(it => it.where !== key)
			} else {
				// Didn't find loc that should be in the table. Make a default entry
				temp.push(new StaticHitLocation(key, "0", table[key].penalty, table[key].roll))
			}
		})
		locations.forEach(it => temp.push(it))

		let prot = {}
		let index = 0
		temp.forEach(it => Static.put(prot, it, index++))

		let saveprot = true
		if (
			(data.lastImport && data.additionalresources.bodyplan && bodyplan !== data.additionalresources.bodyplan) ||
			!Object.keys(data.hitlocations).length
		) {
			const option = (game as Game).settings.get(SYSTEM_NAME, SETTINGS.STATIC_IMPORT_BODY_PLAN)
			if (option === "no") {
				saveprot = false
			}
			if (option === "ask") {
				saveprot = await new Promise((resolve, _reject) => {
					let d = new Dialog({
						title: "Hit Location Body Plan",
						content:
							`Do you want to <br><br><b>Save</b> the current Body Plan (${i18n(
								`gurps.static.body_plan.${data.additionalresources.bodyplan}`
							)}) or ` +
							`<br><br><b>Overwrite</b> it with the Body Plan from the import: (${i18n(
								`gurps.static.body_plan.${data.additionalresources.bodyplan}`
							)})?<br><br>&nbsp;`,
						buttons: {
							save: {
								icon: '<i class="far fa-square"></i>',
								label: "Save",
								callback: () => resolve(false),
							},
							overwrite: {
								icon: '<i class="fas fa-edit"></i>',
								label: "Overwrite",
								callback: () => resolve(true),
							},
						},
						default: "save",
						close: () => resolve(false), // Just assume overwrite.   Error handling would be too much work right now.
					})
					d.render(true)
				})
			}
		}
		if (saveprot)
			return {
				"system.-=hitlocations": null,
				"system.hitlocations": prot,
				"system.additionalresources.bodyplan": bodyplan,
			}
		else return {}
	}

	importPointTotals(total: number, atts: any[], ads: any[], skills: any[], spells: any[]) {
		if (!ads) ads = []
		if (!skills) skills = []
		if (!spells) spells = []
		let p_atts = 0
		let p_ads = 0
		let p_disads = 0
		let p_quirks = 0
		let p_skills = 0
		let p_spells = 0
		let p_unspent = total
		let p_total = total
		let p_race = 0
		for (let i of atts) p_atts += i.calc?.points || 0
		for (let i of ads)
			[p_ads, p_disads, p_quirks, p_race] = this.adPointCount(i, p_ads, p_disads, p_quirks, p_race, true)
		for (let i of skills) p_skills = this.skPointCount(i, p_skills)
		for (let i of spells) p_spells = this.skPointCount(i, p_spells)
		p_unspent -= p_atts + p_ads + p_disads + p_quirks + p_skills + p_spells + p_race
		return {
			"system.totalpoints.attributes": p_atts,
			"system.totalpoints.ads": p_ads,
			"system.totalpoints.disads": p_disads,
			"system.totalpoints.quirks": p_quirks,
			"system.totalpoints.skills": p_skills,
			"system.totalpoints.spells": p_spells,
			"system.totalpoints.unspent": p_unspent,
			"system.totalpoints.total": p_total,
			"system.totalpoints.race": p_race,
		}
	}

	adPointCount(i: any, ads: number, disads: number, quirks: number, race: number, toplevel = false) {
		if (i.type === "advantage_container" && i.container_type === "race") race += i.calc?.points || 0
		else if (i.type === "advantage_container" && i.container_type === "alternative_abilities")
			ads += i.calc?.points || 0
		else if (i.type === "advantage_container" && i.children?.length) {
			let [a, d] = [0, 0]
			for (let j of i.children) [a, d, quirks, race] = this.adPointCount(j, a, d, quirks, race)
			if (toplevel) {
				if (a > 0) ads += a
				else disads += a
			} else ads += a + d
		} else if (i.calc?.points === -1) quirks += i.calc?.points || 0
		else if (i.calc?.points > 0) ads += i.calc?.points || 0
		else disads += i.calc?.points || 0
		return [ads, disads, quirks, race]
	}

	skPointCount(i: any, skills: number) {
		if (i.type === ("skill_container" || "spell_container") && i.children?.length)
			for (let j of i.children) skills = this.skPointCount(j, skills)
		else skills += i.points
		return skills
	}

	importReactions(ads: any[], skills: any[], equipment: any[]) {
		let rs = {}
		let cs = {}
		let index_r = 0
		let index_c = 0
		let temp = [...(ads || []), ...(skills || []), ...(equipment || [])]
		let all: any[] = []
		for (let i of temp) {
			all = all.concat(this.recursiveGet(i))
		}
		let temp_r = []
		let temp_c = []
		for (let i of all) {
			if (i.features?.length)
				for (let f of i.features) {
					if (f.type === "reaction_bonus") {
						temp_r.push({
							modifier: f.amount * (f.per_level && i.levels ? parseInt(i.levels) : 1),
							situation: f.situation,
						})
					} else if (f.type === "conditional_modifier") {
						temp_c.push({
							modifier: f.amount * (f.per_level && i.levels ? parseInt(i.levels) : 1),
							situation: f.situation,
						})
					}
				}
		}
		let temp_r2 = []
		let temp_c2 = []
		for (let i of temp_r) {
			let existing_condition = temp_r2.find(e => e.situation === i.situation)
			if (existing_condition) existing_condition.modifier += i.modifier
			else temp_r2.push(i)
		}
		for (let i of temp_c) {
			let existing_condition = temp_c2.find(e => e.situation === i.situation)
			if (existing_condition) existing_condition.modifier += i.modifier
			else temp_c2.push(i)
		}
		for (let i of temp_r2) {
			let r = new StaticReaction()
			r.modifier = i.modifier.toString()
			r.situation = i.situation
			Static.put(rs, r, index_r++)
		}
		for (let i of temp_c2) {
			let c = new StaticModifier()
			c.modifier = i.modifier.toString()
			c.situation = i.situation
			Static.put(cs, c, index_c++)
		}
		return {
			"system.-=reactions": null,
			"system.reactions": rs,
			"system.-=conditionalmods": null,
			"system.conditionalmods": cs,
		}
	}

	importCombat(ads: any[], skills: any[], spells: any[], equipment: any[]) {
		let melee = {}
		let ranged = {}
		let m_index = 0
		let r_index = 0
		let temp = [...(ads || []), ...(skills || []), ...(spells || []), ...(equipment || [])]
		let all: any[] = []
		for (let i of temp) {
			all = all.concat(this.recursiveGet(i))
		}
		for (let i of all) {
			if (i.weapons?.length)
				for (let w of i.weapons) {
					if (w.type === "melee_weapon") {
						let m = new StaticMelee()
						m.name = i.name || i.description || ""
						m.st = w.strength || ""
						m.weight = i.weight || ""
						m.techlevel = i.tech_level || ""
						m.cost = i.value || ""
						m.notes = i.notes || ""
						if (m.notes && w.usage_notes) m.notes += `\n${w.usage_notes}`
						m.pageref = i.reference || ""
						m.mode = w.usage || ""
						m.import = w.calc?.level.toString() || "0"
						m.damage = w.calc?.damage || ""
						m.reach = w.reach || ""
						m.parry = w.calc?.parry || ""
						m.block = w.calc?.block || ""
						let old = this.document._findElementIn("melee", "", m.name, m.mode)
						this.document._migrateOtfsAndNotes(old, m, i.vtt_notes)

						Static.put(melee, m, m_index++)
					} else if (w.type === "ranged_weapon") {
						let r = new StaticRanged()
						r.name = i.name || i.description || ""
						r.st = w.strength || ""
						r.bulk = w.bulk || ""
						r.legalityclass = i.legality_class || "4"
						r.ammo = 0
						r.notes = i.notes || ""
						if (r.notes && w.usage_notes) r.notes += `\n${w.usage_notes}`
						r.pageref = i.reference || ""
						r.mode = w.usage || ""
						r.import = w.calc?.level || "0"
						r.damage = w.calc?.damage || ""
						r.acc = w.accuracy || ""
						r.rof = w.rate_of_fire || ""
						r.shots = w.shots || ""
						r.rcl = w.recoil || ""
						r.range = w.calc?.range || ""
						let old = this.document._findElementIn("ranged", "", r.name, r.mode)
						this.document._migrateOtfsAndNotes(old, r, i.vtt_notes)

						Static.put(ranged, r, r_index++)
					}
				}
		}
		return {
			"system.-=melee": null,
			"system.melee": melee,
			"system.-=ranged": null,
			"system.ranged": ranged,
		}
	}

	recursiveGet(i: any) {
		if (!i) return []
		let ch: any[] = []
		if (i.children?.length) for (let j of i.children) ch = ch.concat(this.recursiveGet(j))
		if (i.modifiers?.length) for (let j of i.modifiers) ch = ch.concat(this.recursiveGet(j))
		if (i.disabled || (i.equipped !== null && i.equipped === false)) return []
		return [i].concat(ch)
	}

	foldList(flat: any[], target = {}) {
		flat.forEach(obj => {
			if (obj.parentuuid) {
				const parent = flat.find(o => o.uuid === obj.parentuuid)
				if (parent) {
					if (!parent.contains) parent.contains = {} // Lazy init for older characters
					Static.put(parent.contains, obj)
				} else obj.parentuuid = "" // Can't find a parent, so put it in the top list.  should never happen with GCS
			}
		})
		let index = 0
		flat.forEach(obj => {
			if (!obj.parentuuid) Static.put(target, obj, index++)
		})
		return target
	}

	async throwImportError(msg: string[]) {
		ui.notifications?.error(msg.join("<br>"))

		await ChatMessage.create({
			content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/chat/character-import-error.hbs`, {
				lines: msg,
			}),
			user: (game as Game).user!.id,
			type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
			whisper: [(game as Game).user!.id],
		})
		return false
	}

	removeAccents(str: string) {
		return str
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "") // Remove accents
			.replace(/([^\w]+|\s+)/g, "-") // Replace space and other characters by hyphen
			.replace(/--+/g, "-") // Replaces multiple hyphens by one hyphen
			.replace(/(^-+|-+$)/g, "")
	}

	_getBodyPlan(locations: StaticHitLocation[]) {
		// Each key is a "body plan" name like "humanoid" or "quadruped"
		let tableNames = Object.keys(StaticHitLocationDictionary)

		// Create a map of tableName:count
		let tableScores: Record<string, number> = {}
		tableNames.forEach(it => (tableScores[it] = 0))

		// Increment the count for a tableScore if it contains the same hit location as "prot"
		locations.forEach(function (hitLocation) {
			tableNames.forEach(function (tableName) {
				if (StaticHitLocationDictionary[tableName].hasOwnProperty(hitLocation.where)) {
					tableScores[tableName] = tableScores[tableName] + 1
				}
			})
		})

		// Select the tableScore with the highest score.
		let match = -1
		let name = StaticHitLocation.HUMANOID
		Object.keys(tableScores).forEach(function (score) {
			if (tableScores[score] > match) {
				match = tableScores[score]
				name = score
			}
		})

		// In the case of a tie, select the one whose score is closest to the number of entries
		// in the table.
		let results = Object.keys(tableScores).filter(it => tableScores[it] === match)
		if (results.length > 1) {
			let diff = Number.MAX_SAFE_INTEGER
			results.forEach(key => {
				// Find the smallest difference
				let table = StaticHitLocationDictionary[key]
				if (Object.keys(table).length - match < diff) {
					diff = Object.keys(table).length - match
					name = key
				}
			})
		}

		return name
	}
}
