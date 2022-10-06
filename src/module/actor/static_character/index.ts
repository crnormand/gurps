import { BaseActorGURPS } from "@actor/base"
// Import { ActorFlags } from "@actor/base/data"
import { StaticItemGURPS } from "@item/static"
import { StaticItemSystemData } from "@item/static/data"
// Import { RollModifier } from "@module/data"
import { SYSTEM_NAME } from "@module/settings"
import { i18n, Static } from "@util"
import { StaticAdvantage, StaticEquipment } from "./components"
import {
	MoveMode,
	MoveModeTypes,
	Posture,
	StaticAttributeName,
	StaticCharacterSource,
	StaticCharacterSystemData,
	StaticResourceTracker,
} from "./data"
import { StaticCharacterImporter } from "./import"

Hooks.on("createActor", async function (actor: StaticCharacterGURPS) {
	if (actor.type === "character")
		await actor.update({
			// @ts-ignore until v10 types
			"_stats.systemVersion": (game as Game).system.version,
		})
})

class StaticCharacterGURPS extends BaseActorGURPS {
	getOwners() {
		return (game as Game).users?.contents.filter(
			u => this.getUserLevel(u) ?? 0 >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER
		)
	}

	// Getters
	get editing() {
		return this.system.editing
	}

	get attributes(): Map<string, any> {
		const atts = new Map()
		for (const [key, value] of Object.entries(this.system.attributes)) {
			atts.set(key.toLowerCase(), {
				attr_id: key.toLowerCase(),
				current: value.value,
				points: value.points,
				attribute_def: {
					combinedName: i18n(`gurps.static.${key.toLowerCase()}`),
				},
			})
		}
		return atts
	}

	get trackers(): { [key: string]: StaticResourceTracker } {
		return this.system.additionalresources.tracker
		// Return toArray(this.system.additionalresources.tracker)
	}

	override get sizeMod(): number {
		return this.system.traits?.sizemod ?? 0
	}

	override prepareBaseData(): void {
		// NOTE: why not set flags after sizemod calculation?
		super.prepareBaseData()
		this.system.conditions.posture = Posture.Standing
		this.system.conditions.exhausted = false
		this.system.conditions.reeling = false
	}

	prepareDerivedData(): void {
		super.prepareDerivedData()

		// Handle new move data -- if system.move exists, use the default value in that object to set the move
		// value in the first entry of the encumbrance object
		if (this.system.encumbrance) {
			let move: MoveMode = this.system.move
			if (!move) {
				let currentMove = this.system.encumbrance["00000"].move ?? this.system.basicmove.value
				let value: MoveMode = {
					mode: MoveModeTypes.Ground,
					basic: currentMove,
					default: true,
				}
				setProperty(this, "system.move.00000", value)
				move = this.system.move
			}

			let current = Object.values(move).find(it => it.default)
			if (current) {
				this.system.encumbrance["00000"].move = current.basic
			}
		}

		this.calculateDerivedValues()
	}

	// Execute after every import
	async postImport() {
		// This.calculateDerivedValues()

		// Convoluted code to add Items (and features) into the equipment list
		let orig: StaticItemGURPS[] = (this.items.contents as StaticItemGURPS[]).sort(
			(a, b) => b.name?.localeCompare(a.name ?? "") ?? 0
		)
		let good: StaticItemGURPS[] = []
		while (orig.length > 0) {
			// We are trying to place 'parent' items before we place 'children' items
			const left: StaticItemGURPS[] = []
			let atLeastOne = false
			for (const i of orig) {
				if (!i.system.eqt.parentuuid || good.find(e => e.system.eqt.uuid === i.system.eqt.parentuuid)) {
					atLeastOne = true
					good.push(i)
				} else left.push(i)
			}
			if (atLeastOne) orig = left
			else {
				good = [...good, ...left]
				orig = []
			}
		}
		// For (const item of good) await this.addItemData(item)

		// @ts-ignore game.system.version until types v10
		await this.update({ "_stats.systemVersion": game.system.version }, { diff: false, render: false })
		await this.setResourceTrackers()
		await this.syncLanguages()
	}

	async setResourceTrackers() {
		// TODO: implement this
		// let templates = ResourceTrackerManager.getAllTemplates().filter(it => !!it.slot)
	}

	async syncLanguages() {
		if (this.system.languages) {
			let updated = false
			let newads = { ...this.system.ads }
			let langn = /Language:?/i
			let langt = new RegExp(i18n("gurps.language.language"))
			Static.recurseList(this.system.languages, (e, _k, _d) => {
				let a = Static.findAdDisad(this, `*${e.name}`)
				if (a) {
					if (!a.name.match(langn) && !a.name.match(langt)) {
						// GCA4 / GCS style
						a.name = `${i18n("gurps.language.language")}: ${a.name}`
						updated = true
					}
				} else {
					// GCA5 style (Language without Adv)
					let n = `${i18n("gurps.language.language")}: ${e.name}`
					// If equal, then just report single level
					if (e.spoken === e.written) n += ` (${e.spoken})`
					// Otherwise, report ttpy eand level (like GCA4)
					else {
						if (e.spoken) n += ` (${i18n("gurps.language.spoken")})(${e.spoken})`
						if (e.written) n += ` (${i18n("gurps.language.written")})(${e.written})`
					}
					let a = new StaticAdvantage()
					a.name = n
					a.points = e.points
					Static.put(newads, a)
					updated = true
				}
			})
			if (updated) await this.update({ "system.ads": newads })
		}
	}

	// This will ensure that every characater at least starts
	// with these new data values.  actor-sheet.js may change them.
	calculateDerivedValues() {
		// Let saved = !!this.ignoreRender
		// this.ignoreRender = true
		this._initializeStartingValues()
		// This._applyItemBonuses()

		// Must be done after bonuses, but before weights
		// this._calculateEncumbranceIssues()

		// Must be after bonuses and encumbrance effects on ST
		// this._recalcItemFeatures()
		// this._calculateRangedRanges()

		// Must be done at end
		// this._calculateWeights()

		// @ts-ignore until types v10
		let maneuver = this.effects.contents.find(it => it.flags?.core?.statusId === "maneuver")
		// @ts-ignore until types v10
		this.system.conditions.maneuver = maneuver ? maneuver.flags.gurps.name : "undefined"
		// This.ignoreRender = saved
		// if (!saved) setTimeout(() => this.render(), 333)
	}

	/*
	 * Initialize the attribute starting values/levels.
	 * The code is expecting 'value' or 'level' for many things,
	 * and instead of changing all of the GUIs and OTF logic
	 * we are just going to switch the rug out from underneath.
	 * "Import" data will be in the 'import' key and then we will calculate value/level when the actor is loaded.
	 */
	_initializeStartingValues() {
		const data = this.system
		data.currentdodge = 0
		data.equipment ??= {}
		data.equipment.carried ??= {}
		data.equipment.other ??= {}

		// Need to protect against data errors
		for (const attr in data.attributes) {
			if (
				typeof data.attributes[attr as StaticAttributeName] === "object" &&
				data.attributes[attr as StaticAttributeName] !== null
			)
				if (isNaN(data.attributes[attr as StaticAttributeName].import))
					data.attributes[attr as StaticAttributeName].value = 0
		}
		Static.recurseList(data.skills, (e, _k, _d) => {
			if (e.import) e.level = Number(Number(e.import))
		})
	}

	// Initialize the attribute starting values/levels.
	// The code is expecting 'value' or 'level' for many things, and instead of changing all of the GUIs and OTF logic
	// we are just going to switch the rug out from underneath.
	// "Import" data will be in the 'import' key and then we will calculate value/level when the actor is loaded.
	// _initializeStartingValues(): void {
	// 	const data = this.system;
	// 	data.currentdodge = 0; // Start at 0, bonuses will add, then they will be finalized
	// 	if (data.equipment) {
	// 		data.equipment.carried ??= {};
	// 		data.equipment.other ??= {};
	// 	}
	// 	if (!data.migrationVersion) return;
	// 	let v: SemanticVersion = SemanticVersion.fromString(data.migrationVersion);

	// 	// Attributes need to have 'value' set because Foundry expects objs with value and max
	// 	// to be attributes (so we can't use currentvalue)
	// 	// Need to protect against data errors
	// 	for (const attr in data.attributes) {
	// 		if (typeof data.attributes[attr] === "object" && data.attributes[attr] !== null)
	// 			if (isNaN(data.attributes[attr].import)) data.attributes[attr].value = 0;
	// 			else data.attributes[attr].value = parseInt(data.attributes[attr].import);
	// 	}

	// 	// After all of the attributes are copied over, apply tired to ST
	// 	// if (!!data.conditions.exhausted)
	// 	//   data.attributes.ST.value = Math.ceil(parseInt(data.attributes.ST.value.toString()) / 2)
	// 	recurselist(data.skills, (e, k, d) => {
	// 		if (e.import) e.level = parseInt(e.import);
	// 	});
	// 	recurselist(data.spells, (e, k, d) => {
	// 		if (e.import) e.level = parseInt(e.import);
	// 	});

	// 	recurselist(data.melee, (e, k, d) => {
	// 		if (e.import) {
	// 			e.level = parseInt(e.import);
	// 			if (!isNaN(parseInt(e.parry))) {
	// 				// Allows for '14f' and 'no'
	// 				let base = 3 + Math.floor(e.level / 2);
	// 				let bonus = parseInt(e.parry) - base;
	// 				if (bonus !== 0) {
	// 					e.parrybonus = (bonus > 0 ? "+" : "") + bonus;
	// 				}
	// 			}
	// 			if (!isNaN(parseInt(e.block))) {
	// 				let base = 3 + Math.floor(e.level / 2);
	// 				let bonus = parseInt(e.block) - base;
	// 				if (bonus !== 0) {
	// 					e.blockbonus = (bonus > 0 ? "+" : "") + bonus;
	// 				}
	// 			}
	// 		} else {
	// 			e.parrybonus = e.parry;
	// 			e.blockbonus = e.block;
	// 		}
	// 	});

	// 	recurselist(data.ranged, (e, k, d) => {
	// 		e.level = parseInt(e.import);
	// 	});

	// 	// Only prep hitlocation DRs from v0.9.7 or higher
	// 	if (!v.isLowerThan(settings.VERSION_097))
	// 		recurselist(data.hitlocations, (e, k, d) => {
	// 			e.dr = e.import;
	// 		});
	// }

	// _applyItemBonuses(): void {
	// 	let pi = (n?: string) => (n ? parseInt(n) : 0);
	// 	let gids: string[] = [];
	// 	const data = this.system;
	// 	for (const item of this.items) {
	// 		let itemData = (item as StaticItemGURPS).system;
	// 		if (itemData.equipped && itemData.carried && itemData.bonuses && gids.includes(itemData.globalid)) {
	// 			gids.push(itemData.globalid);
	// 			let bonuses = itemData.bonuses.split("\n");
	// 			for (let bonus of bonuses) {
	// 				let m = bonus.match(/\[(.*)\]/);
	// 				if (m) bonus = m[1]; // Remove extranious [ ]
	// 				let link = parselink(bonus);
	// 				if (link.action) {
	// 					// Start OTF
	// 					recurselist(data.melee, (e: StaticMelee, _k: any, _d: any) => {
	// 						e.level = pi(e.level);
	// 						if (link.action.type === "attribute" && link.action.attrkey === "DX") {
	// 							// All melee attacks skills affected by DX
	// 							e.level += pi(link.action.mod);
	// 							if (!isNaN(parseInt(e.parry))) {
	// 								// Handles "11f"
	// 								let m = `${ e.parry }`.match(/(\d+)(.*)/);
	// 								e.parry = 3 + Math.floor(e.level / 2);
	// 								if (e.parrybonus) e.parry += pi(e.parrybonus);
	// 								if (m) e.parry += m[2];
	// 							}
	// 							if (!isNaN(parseInt(e.block))) {
	// 								// Handles "no"
	// 								e.block = 3 + Math.floor(e.level / 2);
	// 								if (e.blockbonus) e.block += pi(e.blockbonus);
	// 							}
	// 						}
	// 						if (link.action.type === "attack" && link.action.isMelee) {
	// 							if (e.name.match(makeRegexPatternFrom(link.action.name, false))) {
	// 								e.level += pi(link.action.mod);
	// 								if (!isNaN(parseInt(e.parry))) {
	// 									// Handles "11f"
	// 									let m = `${ e.parry }`.match(/(\d+)(.*)/);
	// 									e.parry = 3 + Math.floor(e.level / 2);
	// 									if (e.parrybonus) e.parry += pi(e.parrybonus);
	// 									if (m) e.parry += m[2];
	// 								}
	// 								if (!isNaN(parseInt(e.block))) {
	// 									// Handles "no"
	// 									e.block = 3 + Math.floor(e.level / 2);
	// 									if (e.blockbonus) e.block += pi(e.blockbonus);
	// 								}
	// 							}
	// 						}
	// 					}); // End melee
	// 					recurselist(data.ranged, (e: StaticRanged, _k: any, _d: any) => {
	// 						e.level = pi(e.level);
	// 						if (link.action.type === "attribute" && link.action.attrkey === "DX")
	// 							e.level += pi(link.action.mod);
	// 						if (link.action.type === "attack" && link.action.isRanged) {
	// 							if (e.name.match(makeRegexPatternFrom(link.action.name, false)))
	// 								e.level += pi(link.action.mod);
	// 						}
	// 					}); // End ranged
	// 					recurselist(data.skills);
	// 				}
	// 			}
	// 		}
	// 	}
	// }

	async addItemData(itemData: StaticItemGURPS, targetKey: string | null = null) {
		let [eqtKey, addFeatures] = await this._addNewItemEquipment(itemData, targetKey)
		if (addFeatures) await this._addItemAdditions(itemData, eqtKey)
	}

	async _addNewItemEquipment(itemData: StaticItemGURPS, targetKey: string | null): Promise<[string, boolean]> {
		let existing = this._findEqtKeyForId("uuid", itemData._id)
		if (existing) {
			let eqt = getProperty(this, existing)
			return [existing, eqt.carried && eqt.equipped]
		}
		let _data = itemData.system
		if (_data.eqt.parentuuid) {
			let found
			Static.recurseList(this.system.equipment.carried, (e, k: string, _d) => {
				if (e.uuid === _data.eqt.parentuuid) found = `system.equipment.carried.${k}`
			})
			if (!found)
				Static.recurseList(this.system.equipment.other, (e, k, _d) => {
					if (e.uuid === _data.eqt.parentuuid) found = `system.equipment.other.${k}`
				})
			if (found) targetKey = `${found}.contains.${Static.zeroFill(0)}`
		}
		if (targetKey === null) {
			if (_data.carried) {
				targetKey = "system.equipment.carried"
				let index = 0
				let list = getProperty(this, targetKey)
				while (list.hasOwnProperty(Static.zeroFill(index))) index++
				targetKey += `.${Static.zeroFill(index)}`
			} else targetKey = "system.equipment.other"
		}
		if (targetKey.match(/^system\.equipment\.\w+$/)) targetKey += `.${Static.zeroFill(0)}`
		let eqt = _data.eqt
		if (!eqt) {
			ui.notifications?.warn(`Item: ${itemData._id} (Global:${_data.globalid}) missing equipment`)
			return ["", false]
		}
		eqt.itemid = itemData._id
		eqt.gloablid = _data.uuid
		eqt.equipped = !!_data.equipped ?? true
		eqt.img = itemData.img
		eqt.carried = !!_data.carried ?? true
		await Static.insertBeforeKey(this, targetKey, eqt)
		await this.updateParentOf(targetKey, true)
		return [targetKey, eqt.carried && eqt.equipped]
	}

	_findEqtKeyForId(key: string, id: string) {
		let eqtkey
		let data = this.system
		Static.recurseList(data.equipment.carried, (e, k, _d) => {
			if (e[key] === id) eqtkey = `system.equipment.carried${k}`
		})
		if (!eqtkey)
			Static.recurseList(data.equipment.other, (e, k, _d) => {
				if (e[key] === id) eqtkey = `system.equipment.other${k}`
			})
		return eqtkey
	}

	async updateParentOf(srcKey: string, updatePuuid = true) {
		let pindex = 4
		let paths = srcKey.split(".")
		let sp = paths.slice(0, pindex).join(".")
		let parent = getProperty(this, sp)
		if (parent) {
			await StaticEquipment.calcUpdate(this, parent, sp)
			if (updatePuuid) {
				let puuid = ""
				if (paths.length >= 6) {
					sp = paths.slice(0, -2).join(".")
					puuid = getProperty(this, sp).uuid
				}
				await this.update({ [`${srcKey}.parentuuid`]: puuid })
				let eqt = getProperty(this, srcKey)
				if (eqt.itemid) {
					let item = this.items.get(eqt.itemid)
					if (item)
						await this.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.eqt.parentuuid": puuid }])
				}
			}
		}
	}

	async _addItemAdditions(itemData: StaticItemGURPS, eqtkey: string) {
		let commit = {}
		commit = { ...commit, ...(await this._addItemElement(itemData, eqtkey, "melee")) }
		commit = { ...commit, ...(await this._addItemElement(itemData, eqtkey, "ranged")) }
		commit = { ...commit, ...(await this._addItemElement(itemData, eqtkey, "ads")) }
		commit = { ...commit, ...(await this._addItemElement(itemData, eqtkey, "skills")) }
		commit = { ...commit, ...(await this._addItemElement(itemData, eqtkey, "spells")) }
		await this.update(commit, { diff: false })
		this.calculateDerivedValues() // New skills and bonuses may affect other items... force a recalc
	}

	async _addItemElement(
		itemData: StaticItemGURPS,
		eqtKey: string,
		key: keyof StaticCharacterSystemData & keyof StaticItemSystemData
	) {
		let found = false
		Static.recurseList(this.system[key], (e, _k, _d) => {
			if (e.itemid === itemData._id) found = true
		})
		if (found) return
		let list = { ...this.system[key] }
		let i = 0
		for (const k in itemData.system[key]) {
			let e = duplicate(itemData.system[key][k])
			e.itemid = itemData._id
			e.uuid = `${key}-${i++}-${e.itemid}`
			e.eqtkey = eqtKey
			e.imd = itemData.img
			Static.put(list, e)
		}
		return i === 0 ? {} : { [`system.${key}`]: list }
	}

	async importCharacter() {
		const import_path = this.system.additionalresources.importpath
		const import_name = import_path.match(/.*[/\\]Data[/\\](.*)/)
		if (import_name) {
			const file_path = import_name[1].replace(/\\/g, "/")
			const request = new XMLHttpRequest()
			request.open("GET", file_path)

			new Promise(resolve => {
				request.onload = () => {
					if (request.status === 200) {
						const text = request.response
						StaticCharacterImporter.import(this, {
							text: text,
							name: import_name[1],
							path: import_path,
						})
					} else this._openImportDialog()
					resolve(this)
				}
			})
			request.send(null)
		} else this._openImportDialog()
	}

	_openImportDialog() {
		setTimeout(async () => {
			new Dialog(
				{
					title: `Import character data for: ${this.name}`,
					content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/import.hbs`, {
						name: `"${this.name}"`,
					}),
					buttons: {
						import: {
							icon: '<i class="fas fa-file-import"></i>',
							label: "Import",
							callback: html => {
								const form = $(html).find("form")[0]
								const files = form.data.files
								if (!files.length) {
									return ui.notifications?.error("You did not upload a data file!")
								} else {
									const file = files[0]
									readTextFromFile(file).then(text =>
										StaticCharacterImporter.import(this, {
											text: text,
											name: file.name,
											path: file.path,
										})
									)
								}
							},
						},
						no: {
							icon: '<i class="fas fa-times"></i>',
							label: "Cancel",
						},
					},
					default: "import",
				},
				{
					width: 400,
				}
			).render(true)
		}, 200)
	}

	_findElementIn(list: string, uuid: string, name = "", mode = "") {
		let foundkey: any = null
		let l = getProperty(this, list)
		Static.recurseList(l, (e, k, _d) => {
			if ((uuid && e.uuid == uuid) || (e.name && e.name.startsWith(name) && e.mode == mode)) foundkey = k
		})
		return foundkey === null ? foundkey : getProperty(this, `${list}.${foundkey}`)
	}

	_migrateOtfsAndNotes(oldobj: any = {}, newobj: any = {}, importvttnotes = "") {
		if (!oldobj) return
		if (importvttnotes) newobj.notes += (newobj.notes ? " " : "") + importvttnotes
		this._updateOtf("check", oldobj, newobj)
		this._updateOtf("during", oldobj, newobj)
		this._updateOtf("pass", oldobj, newobj)
		this._updateOtf("fail", oldobj, newobj)
		if (oldobj.notes?.startsWith(newobj.notes))
			// Must be done AFTER OTFs have been stripped out
			newobj.notes = oldobj.notes
		if (oldobj.name?.startsWith(newobj.name)) newobj.name = oldobj.name
	}

	_updateOtf(otfkey: string, oldobj: any, newobj: any) {
		let objkey = `${otfkey}otf`
		let oldotf = oldobj[objkey] ?? ""
		newobj[objkey] = oldotf
		let notes
		let newotf
		;[notes, newotf] = this._removeOtf(otfkey, newobj.notes || "")
		if (newotf) newobj[objkey] = newotf
		newobj.notes = notes?.trim()
	}

	// Looking for OTFs in text.  ex:   c:[/qty -1] during:[/anim healing c]
	_removeOtf(key: string, text: string) {
		if (!text) return [text, null]
		let start
		let patstart = text.toLowerCase().indexOf(`${key[0]}:[`)
		if (patstart < 0) {
			patstart = text.toLowerCase().indexOf(`${key}:[`)
			if (patstart < 0) return [text, null]
			else start = patstart + key.length + 2
		} else start = patstart + 3
		let cnt = 1
		let i = start
		if (i >= text.length) return [text, null]
		do {
			let ch = text[i++]
			if (ch === "[") cnt++
			if (ch === "]") cnt--
		} while (i < text.length && cnt > 0)
		if (cnt === 0) {
			let otf = text.substring(start, i - 1)
			let front = text.substring(0, patstart)
			let end = text.substring(i)
			if ((front === "" || front.endsWith(" ")) && end.startsWith(" ")) end = end.substring(1)
			return [front + end, otf]
		} else return [text, null]
	}
}

interface StaticCharacterGURPS extends BaseActorGURPS {
	system: StaticCharacterSystemData
	_source: StaticCharacterSource
}

export { StaticCharacterGURPS }
