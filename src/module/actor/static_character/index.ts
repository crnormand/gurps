// @ts-nocheck

import { ActorConstructorContextGURPS, BaseActorGURPS } from "@actor/base";
import { ActorFlags } from "@actor/base/data";
import { ActorSheetGURPS } from "@actor/base/sheet";
import { StaticItemGURPS } from "@item/static";
import EmbeddedCollection from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/embedded-collection.mjs";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs";
import { RollModifier, UserFlags } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { i18n } from "@util";
import { MoveMode, MoveModeTypes, Posture, StaticCharacterSource, StaticCharacterSystemData } from "./data";

Hooks.on("createActor", async function (actor: StaticCharacterGURPS) {
	if (actor.type === "character")
		await actor.update({
			"_stats.systemVersion": (game as Game).system.version,
		});
});

class StaticCharacterGURPS extends BaseActorGURPS {
	// IgnoreRender = false;

	// constructor(data: StaticCharacterSource, context: ActorConstructorContextGURPS = {}) {
	// 	super(data, context);
	// }

	getOwners() {
		return (game as Game).users?.contents.filter(
			u => this.getUserLevel(u) ?? 0 >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER
		);
	}

	// Async openSheet(newSheet: ActorSheetGURPS): Promise<void> {
	// 	const sheet = this.sheet;
	// 	if (sheet) {
	// 		await sheet.close();
	// 		this._sheet = null;
	// 		delete this.apps[sheet.appId];
	// 		await this.setFlag("core", "sheetClass", newSheet);
	// 		this.sheet?.render(true);
	// 	}
	// }

	override prepareData(): void {
		super.prepareData();
	}

	override prepareBaseData(): void {
		// NOTE: why not set flags after sizemod calculation?
		super.prepareBaseData();
		this.system.conditions.posture = Posture.Standing;
		this.setFlag(SYSTEM_NAME, ActorFlags.SelfModifiers, []);
		this.setFlag(SYSTEM_NAME, ActorFlags.TargetModifiers, []);
		// This.system.conditions.self = { modifiers: [] };
		// this.system.conditions.target = { modifiers: [] };
		this.system.conditions.exhausted = false;
		this.system.conditions.reeling = false;

		let sizemod = this.system.traits.sizemod;
		if (sizemod !== 0) {
			this.system.conditions.target.modifiers.push();
			this.setFlag(SYSTEM_NAME, ActorFlags.TargetModifiers, [
				...(this.getFlag(SYSTEM_NAME, ActorFlags.TargetModifiers) as RollModifier[]),
				{
					name: "for Size Modifier",
					modifier: sizemod,
					tags: [],
				},
			]);
		}
		// Let attributes = this.getGurpsActorData().attributes;
		// if (foundry.utils.getType(attributes.ST.import) === "string")
		// 	this.getGurpsActorData().attributes.ST.import = parseInt(
		// 		attributes.ST.import,
		// 	);
	}

	prepareDerivedData(): void {
		super.prepareDerivedData();

		// Handle new move data -- if system.move exists, use the default value in that object to set the move
		// value in the first entry of the encumbrance object
		// TODO: migrate to GCS move calculation
		if (this.system.encumbrance) {
			let move: MoveMode = this.system.move;
			if (!move) {
				let currentMove = this.system.encumbrance["00000"].move ?? this.system.basicmove.value;
				let value: MoveMode = {
					mode: MoveModeTypes.Ground,
					basic: currentMove,
					default: true,
				};
				setProperty(this, "system.move.00000", value);
				move = this.system.move;
			}

			let current = Object.values(move).find(it => it.default);
			if (current) {
				this.system.encumbrance["00000"].move = current.basic;
			}
		}

		this.calculateDerivedValues();
	}

	// Execute after every import
	// async postImport() {
	// 	this.calculateDerivedValues();

	// 	// TODO: figure out how to change the type of this.items to the appropriate type
	// 	let orig: StaticItemGURPS[] = (this.items as EmbeddedCollection<typeof StaticItemGURPS, ActorData>).contents
	// 		.slice()
	// 		.sort((a, b) => b.name?.localeCompare(a.name ?? "") ?? 0);
	// 	let good: StaticItemGURPS[] = [];
	// 	while (orig.length > 0) {
	// 		// We are trying to place 'parent' items before we place 'children' items
	// 		let left: StaticItemGURPS[] = [];
	// 		let atLeastOne = false;
	// 		for (const i of orig) {
	// 			if (!i.system.eqt.parentuuid || good.find(e => e.system.eqt.uuid === i.system.eqt.parentuuid)) {
	// 				atLeastOne = true;
	// 				good.push(i);
	// 			} else left.push(i);
	// 		}
	// 		if (atLeastOne) orig = left;
	// 		else {
	// 			// If unable to move at least one, just copy the rest and hpe for the best
	// 			good = [...good, ...left];
	// 			orig = [];
	// 		}
	// 	}
	// 	for (const item of good) await this.addItemData(item.data);

	// 	await this.update(
	// 		{ "data.migrationVersion": (game as Game).system.data.version },
	// 		{ diff: false, render: false }
	// 	);

	// 	// Set custom trackers based on templates. Should be last because it may need other data to initialize.
	// 	await this.setResourceTrackers();
	// 	await this.syncLanguages();
	// }

	// // Ensure Language Advantages conform to a standard (for Polygot module)
	// async syncLanguages(): Promise<void> {
	// 	if (this.system.languages) {
	// 		// Let updated = false;
	// 		let newads = this.system.ads;
	// 		let langn = new RegExp("Language:?", "i");
	// 		let langt = new RegExp(`${i18n("GURPS.language")}:?`, "i");
	// 		recurselist(this.system.languages, (e: StaticAdvantage, _k: any, _d: any) => {
	// 			let a = GURPS.findAdDisad(this, `*${e.name}`); // Is there an advantage including the same name
	// 			if (a) {
	// 				if (!a.name.match(langn) && !a.name.match(langt)) {
	// 					// GCA4 / GCS style
	// 					a.name = `${i18n("GURPS.language")}: ${a.name}`;
	// 					// Updated = true;
	// 				}
	// 			} else {
	// 				// GCA5 style (Language without Adv)
	// 				let n = `${i18n("GURPS.language")}: ${e.name}`;
	// 				if (e.spoken === e.written) n += ` (${e.spoken})`;
	// 				// TODO: may be broken, check later
	// 				// Otherwise, report type and level (like GCA4)
	// 				else if (e.spoken) n += ` (${i18n("GURPS.spoken")}) (${e.spoken})`;
	// 				else n += ` (${i18n("GURPS.written")}) (${e.written})`;
	// 				let a = new StaticAdvantage();
	// 				a.name = n;
	// 				a.points = e.points;
	// 				// Why is put global?
	// 				put(newads, a);
	// 				// Updated = true;
	// 			}
	// 		});
	// 	}
	// }

	// // This will ensure that every characater at least starts with these new data values.  actor-sheet.js may change them.
	// calculateDerivedValues() {
	// 	let saved = !!this.ignoreRender;
	// 	this.ignoreRender = true;
	// 	this._initializeStartingValues();
	// 	this.applyItemBonuses();

	// 	// Must be done after bonuses, but before weights
	// 	this._calculateEncumbranceIssues();

	// 	// Must be after bonuses and encumbrance effects on ST
	// 	this._recalcItemFeatures();
	// 	this._calculateRangedRanges();

	// 	// Must be done at end
	// 	this._calculateWeights();
	// }

	// // Initialize the attribute starting values/levels.
	// // The code is expecting 'value' or 'level' for many things, and instead of changing all of the GUIs and OTF logic
	// // we are just going to switch the rug out from underneath.
	// // "Import" data will be in the 'import' key and then we will calculate value/level when the actor is loaded.
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

	// 	// We don't really need to use recurselist for melee/ranged... but who knows, they may become hierarchical in the future

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
	// 	// (we don't really need to use recurselist... but who knows, hitlocations may become hierarchical in the future)
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
	// 								let m = `${e.parry}`.match(/(\d+)(.*)/);
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
	// 									let m = `${e.parry}`.match(/(\d+)(.*)/);
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
}

interface StaticCharacterGURPS extends BaseActorGURPS {
	system: StaticCharacterSystemData;
	_source: StaticCharacterSource;
}

export { StaticCharacterGURPS };
