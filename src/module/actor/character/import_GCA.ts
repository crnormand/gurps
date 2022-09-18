import { ItemGURPS } from "@item";
import { ItemFlagsGURPS, ItemSystemDataGURPS, ItemType, NoteData } from "@item/data";
import { StringComparison } from "@module/data";
import { SkillDefault } from "@module/default";
import { DiceGURPS } from "@module/dice";
import { SETTINGS_TEMP, SYSTEM_NAME } from "@module/settings";
import { BasePrereq } from "@prereq";
import { capitalize, i18n, i18n_f, newUUID, removeAccents } from "@util";
import { XMLtoJS } from "@util/xml_js";
import { CharacterGURPS } from ".";
import { CharacterDataGURPS, HitLocationTable } from "./data";
import { CharacterImportedData } from "./import";

export class GCAImporter {
	version: string;

	document: CharacterGURPS;

	constructor(document: CharacterGURPS) {
		this.version = "5.0.189.0";
		this.document = document;
	}

	static import(document: CharacterGURPS, file: { text: string; name: string; path: string }) {
		const importer = new GCAImporter(document);
		importer._import(document, file);
	}

	async _import(document: CharacterGURPS, file: { text: string; name: string; path: string }) {
		const xml = file.text;
		// TODO: change to GCA5 format
		let r: CharacterImportedData | any;
		const errorMessages: string[] = [];
		try {
			r = XMLtoJS(xml).gca5.character;
			// R = XMLtoJS(xml);
		} catch (err) {
			console.error(err);
			errorMessages.push(i18n("gurps.error.import.no_json_detected"));
			return this.throwImportError(errorMessages);
		}
		console.log("raw data:", r);
		let commit: Partial<CharacterDataGURPS> = {};
		const imp = document.importData;
		imp.name = file.name ?? imp.name;
		imp.path = file.path ?? imp.path;
		imp.last_import = new Date().toISOString();
		try {
			const version: any[] | null = r.author?.version.match(/\d.\d+.\d+.\d+/) ?? null;
			if (version === null)
				return this.throwImportError([...errorMessages, i18n("gurps.error.import_gca.version_unknown")]);
			// If (version[0] > this.version)
			// 	return this.throwImportError([
			// 		...errorMessages,
			// 		i18n("gurps.error.import_gca.version_new"),
			// 	]);
			// if (version[0] < this.version)
			// 	return this.throwImportError([
			// 		...errorMessages,
			// 		i18n("gurps.error.import_gca.version_old"),
			// 	]);
			commit = { ...commit, ...{ "system.import": imp } };
			commit = { ...commit, ...{ name: r.name } };
			commit = { ...commit, ...this.importMiscData(r) };
			commit = { ...commit, ...(await this.importProfile(r)) };
			commit = { ...commit, ...this.importSettings(r) };
			commit = { ...commit, ...this.importAttributes(r) };

			// Begin item impoprt
			const items: Array<ItemGURPS> = [];
			// Items.push(...this.importItems(r.traits.templates, { data: r, js: commit }));
			items.push(
				...this.importItems(r.traits.advantages, {
					data: r,
					js: commit,
					type: "advantages",
				})
			);
			items.push(
				...this.importItems(r.traits.disadvantages, {
					data: r,
					js: commit,
					type: "disadvantages",
				})
			);
			items.push(
				...this.importItems(r.traits.perks, {
					data: r,
					js: commit,
					type: "perks",
				})
			);
			items.push(
				...this.importItems(r.traits.quirks, {
					data: r,
					js: commit,
					type: "quirks",
				})
			);
			items.push(
				...this.importItems(r.traits.skills, {
					data: r,
					js: commit,
					type: "skills",
				})
			);
			items.push(
				...this.importItems(r.traits.spells, {
					data: r,
					js: commit,
					type: "spells",
				})
			);
			items.push(
				...this.importItems(r.traits.equipment, {
					data: r,
					js: commit,
					type: "equipment",
				})
			);
			items.push(...(this.importNotes(r.description) as any));
			items.push(...(this.importNotes(r.notes) as any));

			if (items.filter(e => e.type === "ritual_magic_spell").length > 0)
				errorMessages.push(i18n("gurps.error.import.ritual_magic_gca"));

			commit = { ...commit, ...{ items: items } };
		} catch (err) {
			console.error(err);
			errorMessages.push(
				i18n_f("gurps.error.import.generic", {
					name: r.profile.name,
					message: (err as Error).message,
				})
			);
			return this.throwImportError(errorMessages);
		}

		try {
			await this.document.update(commit, {
				diff: false,
				recursive: false,
			});
		} catch (err) {
			console.error(err);
			errorMessages.push(
				i18n_f("gurps.error.import.generic", {
					name: r.profile.name,
					message: (err as Error).message,
				})
			);
			return this.throwImportError(errorMessages);
		}
		if (errorMessages.length > 0) return this.throwImportError(errorMessages);
		return true;
	}

	importMiscData(data: any) {
		return {
			"system.id": "none",
			"system.created_date": new Date(data.author.datecreated).toISOString(),
			"system.modified_date": new Date().toISOString(),
			// Temporary
			"system.total_points": 0,
		};
	}

	async importProfile(data: any) {
		const p: any = {
			"system.profile.player_name": data.player || "",
			"system.profile.name": data.name || this.document.name,
			"system.profile.title": "",
			"system.profile.organization": "",
			"system.profile.age": data.vitals.age || "",
			"system.profile.birthday": "", // !
			"system.profile.eyes": "", // !
			"system.profile.hair": "", // !
			"system.profile.skin": "", // !
			"system.profile.handedness": "",
			"system.profile.height": data.vitals.height || "",
			"system.profile.weight": data.vitals.weight || "",
			"system.profile.SM": 0,
			"system.profile.gender": "",
			"system.profile.tech_level": "",
			"system.profile.religion": "",
		};

		const sizemod = data.traits.attributes.trait.find((e: any) => e.name === "Size Modifier");
		if (sizemod) p["system.profile.SM"] = parseInt(sizemod.score);
		const tech_level = data.traits.attributes.trait.find((e: any) => e.name === "Tech Level");
		if (tech_level) p["system.profile.tech_level"] = tech_level.score;

		if (data.vitals.portraitimage) {
			/**
			 *
			 */
			function getPortraitPath(): string {
				if ((game as Game).settings.get(SYSTEM_NAME, "portrait_path") === "global") return "images/portraits/";
				return `worlds/${(game as Game).world.id}/images/portraits`;
			}

			const path: string = getPortraitPath();
			let currentDir = "";
			for (const i of path.split("/")) {
				try {
					currentDir += `${i}/`;
					await FilePicker.createDirectory("data", currentDir);
				} catch (err) {
					continue;
				}
			}
			const portrait = data.vitals.portraitimage.replaceAll(/\n/g, "");
			const filename = `${removeAccents(data.name)}_${this.document.id}_portrait.png`.replaceAll(" ", "_");
			const url = `data:image/png;base64,${portrait}`;
			await fetch(url)
				.then(res => res.blob())
				.then(blob => {
					const file = new File([blob], filename);
					// TODO: get rid of as any when new types version drops
					(FilePicker as any).upload("data", path, file, {}, { notify: false });
				});
			p.img = (path + filename).replaceAll(" ", "_");
		}

		return p;
	}

	importSettings(data: any) {
		const body: Partial<HitLocationTable> = {
			roll: new DiceGURPS("3d"),
			locations: [],
		};
		body.name = data.bodytype || "";
		for (const part of data.hitlocationtable.hitlocationline) {
			let table_name = part.location;
			if (table_name === "Eye") table_name = "Eyes";
			if (table_name === "Hand") table_name = "Hands";
			if (table_name === "Foot") table_name = "Feet";
			const dr_bonus = parseInt(data.body.bodyitem.find((e: any) => e.name === table_name).basedr);
			let id = part.location.toLowerCase();
			if (id.includes("leg")) id = "leg";
			if (id.includes("arm")) id = "leg";
			if (table_name === "Eyes") id = table_name.toLowerCase();
			const choice_name = capitalize(id);
			const hit_penalty = parseInt(part.penalty);
			const rolls = part.roll.split("-");
			let slots = 0;
			if (rolls[0] && rolls[1]) slots = parseInt(rolls[1]) - parseInt(rolls[0]);
			let description = "";
			if (part.notes) {
				const notes = part.notes?.split(",");
				for (const i of notes) {
					if (description) description += "\n";
					description += data.hitlocationtable.hitlocationnote.find((e: any) => e.key === i).value;
				}
			}
			body.locations?.push({
				id: id,
				choice_name: choice_name,
				table_name: table_name,
				slots: slots,
				hit_penalty: hit_penalty,
				dr_bonus: dr_bonus,
				description: description,
			});
		}
		return {
			"system.settings": mergeObject(SETTINGS_TEMP.sheet, {
				body_type: body,
			}),
		};
	}

	importAttributes(data: any) {
		const atts: any = {};
		for (const att of data.traits.attributes.trait) {
			let id = this.translateAtt(att.name);
			if (id === "null") continue;
			atts[`${id}.adj`] = parseFloat(att.level);
			if (["hp", "fp"].includes(id)) {
				if (att.attackmodes) {
					atts[`${id}.damage`] = parseInt(att.attackmodes.attackmode.uses_used) || 0;
				} else {
					atts[`${id}.damage`] = 0;
				}
			}
		}
		return {
			"system.attributes": mergeObject(this.document.newAttributes(), atts),
		};
	}

	importNotes(data: any): Partial<NoteData>[] {
		if (!data) return [];
		const readableData = data.match(/fs17 (.*)\\\\par/);
		if (readableData) {
			return [
				{
					_id: randomID(),
					name: readableData[1],
					type: "note",
					flags: { [SYSTEM_NAME]: { contentsData: [] } },
					system: {
						name: readableData[1],
						text: readableData[1],
						reference: "",
						id: newUUID(),
						notes: "",
						tags: [],
						type: "note",
					},
				},
			];
		}
		return [];
	}

	importItems(data: any, context: any = {}): ItemGURPS[] {
		const list = data.trait;
		if (!list) return [];
		const items: Array<any> = [];
		for (const item of list) {
			if (item.parentkey && !context.container) continue;
			const id = randomID();
			const [itemData, itemFlags, itemType]: [ItemSystemDataGURPS, ItemFlagsGURPS, string] = this.getItemData(
				item,
				context
			);
			const newItem = {
				name: item.name,
				type: itemType,
				system: itemData,
				flags: itemFlags,
				_id: id,
			};
			// // const newItem: Partial<{
			// // 	flags: any;
			// // 	_id: string;
			// // 	system: Partial<ItemSystemDataGURPS> | null;
			// // }> = {};
			// newItem._id = randomID();
			// newItem.system = {};
			// newItem.system.name = item.name;
			// const [itemData, itemFlags]: [
			// 	Partial<ItemSystemDataGURPS> | null,
			// 	ItemFlagsGURPS | null,
			// ] = this.getItemData(item, data, context);
			// newItem.system = itemData;
			// newItem.flags = itemFlags;
			items.push(newItem);
		}
		return items;
	}

	getItemData(item: any, context: any = {}): [any, any, string] {
		let itemData: Partial<ItemSystemDataGURPS> = {};
		this.importFeatures(item, itemData, context);
		this.importPrereqs(item, itemData, context);
		const flags: ItemFlagsGURPS = { [SYSTEM_NAME]: { contentsData: [] } };
		if (item.childkeylist) {
			const childKeys = item.childkeylist.split(", ");
			flags[SYSTEM_NAME]!.contentsData = this.importItems(
				{
					trait: context.data.traits[context.type].trait.filter((e: any) =>
						childKeys.includes(`k${e["@idkey"]}`)
					),
				},
				{ ...context, container: true }
			);
		}
		switch (item["@type"]) {
			case "Advantages":
			case "Disadvantages":
			case "Perks":
			case "Quirks":
				itemData = { ...itemData, ...this.getTraitData(item) };
				// Flags[SYSTEM_NAME]!.contentsData = this.getNestedItems(item, data, context);
				return [itemData, flags, "trait"];
			case "Skills":
				if (item.type.includes("Tech")) {
					itemData = this.getTechniqueData(item, context);
					return [itemData, flags, "technique"];
				} else {
					itemData = this.getSkillData(item, context);
					return [itemData, flags, "skill"];
				}
			case "Spells":
				if (item.type.includes("Tech")) {
					itemData = this.getRitualMagicSpellData(item, context);
					return [itemData, flags, "ritual_magic_spell"];
				} else {
					itemData = this.getSpellData(item);
					return [itemData, flags, "spell"];
				}
			case "Equipment":
				itemData = this.getEquipmentData(item, context);
				return [itemData, flags, "equipment"];
			default:
				return [null, null, "error"];
		}
	}

	importFeatures(item: any, itemData: Partial<ItemSystemDataGURPS> | any, context: any = {}): void {
		const bonuses = item.bonuses?.bonus;
		if (!bonuses) return;
		else itemData.features = [];
		for (const bonus of bonuses) {
			if (bonus.targettype === "Attributes" && bonus.targetname !== "dr") {
				const att = this.translateAtt(bonus.targetname);
				if (att === "null") continue;
				itemData.features.push({
					type: "attribute_bonus",
					amount: parseInt(bonus.value),
					attribute: att,
					limitation: "none", // TODO: use case for lifting st etc.
					per_level: bonus.bonustype !== "3",
				});
			}
			if (bonus.targettype === "Me" && bonus.targettag === "dr") {
				const parts = new Set();
				for (const part of context.js["system.settings"].body_type.locations) {
					parts.add(part.id);
				}
				for (const part of parts) {
					if (part === "eyes") continue;
					itemData.features.push({
						type: "dr_bonus",
						location: part,
						specialization: "all",
						amount: parseInt(bonus.value),
						per_level: bonus.bonustype !== "3",
					});
				}
			}
			if (bonus.targettype === "Attributes" && bonus.targetname === "dr") {
				const parts = new Set();
				for (const part of context.js["system.settings"].body_type.locations) {
					parts.add(part.id);
				}
				for (const part of parts) {
					itemData.features.push({
						type: "dr_bonus",
						location: part,
						specialization: "all",
						amount: parseInt(bonus.value),
						per_level: bonus.bonustype !== "3",
					});
				}
			}
			if (bonus.targettype === "Unknown" && bonus.targetprefix === "GR") {
				for (const groupitem of context.data.groups.group.find(
					(e: any) => e.name.toLowerCase() === bonus.targetname.toLowerCase()
				).groupitem) {
					if (groupitem.itemtype === "Stats") {
						itemData.features.push({
							type: "attribute_bonus",
							amount: parseInt(bonus.value),
							attribute: this.translateAtt(groupitem.name),
							limitation: "none", // TODO: use case for lifting st etc.
							per_level: bonus.bonustype !== "3",
						});
					}
					if (groupitem.itemtype === "Skills") {
						itemData.features.push({
							type: "skill_bonus",
							selection_type: "skills_with_name",
							amount: parseInt(bonus.value),
							name: {
								compare: StringComparison.Is,
								qualifier: groupitem.name,
							},
							per_level: bonus.bonustype !== "3",
						});
					}
				}
			}
		}
	}

	importPrereqs(_item: any, itemData: Partial<ItemSystemDataGURPS> | any, _context: any = {}): void {
		itemData.prereqs = { ...BasePrereq.list };
	}

	translateAtt(att: string): string {
		if (
			![
				"ST",
				"DX",
				"IQ",
				"HT",
				"Perception",
				"Will",
				"Vision",
				"Hearing",
				"Taste/Smell",
				"Touch",
				"Fright Check",
				"Basic Speed",
				"Basic Move",
				"Hit Points",
				"Fatigue Points",
			].includes(att)
		)
			return "null";
		att = att.toLowerCase().replaceAll(" ", "_").replaceAll("/", "_");
		switch (att) {
			case "hit_points":
				return "hp";
			case "fatigue_points":
				return "fp";
			case "perception":
				return "per";
			default:
				return att.toLowerCase();
		}
	}

	getTraitData(item: any): any {
		// TODO: taboo -> prereq
		let disabled = false;
		if (
			item.extended &&
			item.extended.extendedtag &&
			item.extended.extendedtag.tagname === "inactive" &&
			item.extended.extendedtag.tagvalue === "yes"
		)
			disabled = true;
		let [base_points, points_per_level] = [0, 0];
		let strCost = item.calcs.cost;
		if (strCost.includes("/")) {
			const arCost = strCost.split("/");
			base_points = parseInt(arCost[0]);
			points_per_level = parseInt(arCost[1]) - base_points;
			// Handles cases where traits of higher levels may be different advantages
			if (item.calcs.levelnames) points_per_level = 0;
			else if (
				points_per_level % base_points === 0 &&
				parseInt(item.calcs.premodspoints) === parseInt(item.level) * base_points
			) {
				points_per_level = base_points;
				base_points = 0;
			}
		} else base_points = parseInt(strCost);
		const levels = points_per_level > 0 ? parseInt(item.level) : 0;
		let cr = 0;
		if (item.modifiers && item.modifiers.modifier.find((e: any) => e.group === "Self-Control"))
			cr = parseInt(item.modifiers.modifier.find((e: any) => e.shortname));
		let tags: string[] = item.cat.split(", ") ?? [];
		tags = tags.filter(e => !e.startsWith("_"));
		const traitData = {
			name: item.name ?? "Trait",
			type: "trait",
			id: item["@idkey"],
			reference: item.ref.page ?? "",
			notes: "",
			tags: tags,
			prereqs: BasePrereq.list,
			round_down: true,
			disabled: disabled,
			levels: levels,
			base_points: base_points,
			points_per_level: points_per_level,
			cr: cr,
			cr_adj: "none",
		};
		return traitData;
	}

	getSkillData(item: any, context: any = {}) {
		let tags: string[] = item.cat.split(", ") ?? [];
		tags = tags.filter(e => !e.startsWith("_"));
		let defaults: Partial<SkillDefault>[] = [];
		if (item.ref.default) {
			for (let e of item.ref.default?.split(",")) {
				const def: Partial<SkillDefault> = {};
				e = e.trim().replaceAll("\\", "").replaceAll('"', "");
				if (e.startsWith("SK:")) {
					def.type = "skill";
					const arName: string[] = [];
					const arSpecialization: string[] = [];
					const arModifier: string[] = [];
					for (const i of e.replace("SK:", "").replace("::level", "").split(" ")) {
						if (i.startsWith("-") || arModifier.length > 0) arModifier.push(i);
						else if (i.startsWith("(") || arSpecialization.length > 0)
							arSpecialization.push(i.replace("(", "").replace(")", ""));
						else arName.push(i);
					}
					def.name = arName.join(" ");
					def.specialization = arSpecialization.join(" ");
					def.modifier = parseInt(arModifier.join("")) || 0;
				} else {
					def.type = this.translateAtt(e.split(" ")[0]);
					def.modifier = parseInt(e.split(" ").slice(1).join("")) || 0;
				}
				defaults.push(def);
			}
		}
		let epm = 0;
		const enc_pens = context.data.traits.attributes.trait.find((e: any) => e.name === "Encumbrance Penalty")
			.conditionals.bonus;
		for (const e of enc_pens) {
			const penalty = parseInt(e.bonuspart) * -1;
			let skills = e.targetname.replace("(", "").replace(")", "").replaceAll("sk:", "").split(", ");
			if (skills.includes(item.name.toLowerCase())) epm = penalty;
		}
		const skillData = {
			name: item.name ?? "Skill",
			type: "skill" as ItemType,
			id: item["@idkey"],
			reference: item.ref.page ?? "",
			tech_level: item.tl,
			specialization: item.nameext,
			notes: "",
			tags: tags,
			prereqs: BasePrereq.list,
			difficulty: item.type.toLowerCase(),
			encumbrance_penalty_multiplier: epm as any,
			points: parseInt(item.calcs.basepoints),
			defaults: defaults,
			weapons: [],
		};
		return skillData;
	}

	getTechniqueData(item: any, context: any) {
		let tags: string[] = item.cat.split(", ") ?? [];
		tags = tags.filter(e => !e.startsWith("_"));
		let defaults: Partial<SkillDefault>[] = [];
		if (item.ref.default) {
			for (let e of item.ref.default?.split(",")) {
				const def: Partial<SkillDefault> = {};
				e = e.trim().replaceAll("\\", "").replaceAll('"', "");
				if (e.startsWith("SK:")) {
					def.type = "skill";
					const arName: string[] = [];
					const arSpecialization: string[] = [];
					const arModifier: string[] = [];
					for (const i of e.replace("SK:", "").replace("::level", "").split(" ")) {
						if (i.startsWith("-") || arModifier.length > 0) arModifier.push(i);
						else if (i.startsWith("(") || arSpecialization.length > 0)
							arSpecialization.push(i.replace("(", "").replace(")", ""));
						else arName.push(i);
					}
					def.name = arName.join(" ");
					def.specialization = arSpecialization.join(" ");
					def.modifier = parseInt(arModifier.join("")) || 0;
				} else {
					def.type = this.translateAtt(e.split(" ")[0]);
					def.modifier = parseInt(e.split(" ").slice(1).join("")) || 0;
				}
				defaults.push(def);
			}
		}
		let epm = 0;
		const enc_pens = context.data.traits.attributes.trait.find((e: any) => e.name === "Encumbrance Penalty")
			.conditionals.bonus;
		for (const e of enc_pens) {
			const penalty = parseInt(e.bonuspart) * -1;
			let skills = e.targetname.replace("(", "").replace(")", "").replaceAll("sk:", "").split(", ");
			if (skills.includes(item.name.toLowerCase())) epm = penalty;
		}
		let limitStr = item.calcs.upto;
		if (limitStr !== "prereq") limitStr = item.calcs.upto.replace("prereq", "").replaceAll(" ", "");
		else limitStr = "0";
		const skillData = {
			name: item.name ?? "Skill",
			type: "skill" as ItemType,
			id: item["@idkey"],
			reference: item.ref.page ?? "",
			tech_level: item.tl,
			specialization: item.nameext,
			notes: "",
			tags: tags,
			prereqs: BasePrereq.list,
			difficulty: item.type.toLowerCase().split("/")[1],
			default: defaults[0],
			encumbrance_penalty_multiplier: epm as any,
			points: parseInt(item.points) || 0,
			weapons: [],
			limit: limitStr ? parseInt(limitStr) : undefined,
			limited: !!limitStr,
		};
		return skillData;
	}

	getSpellData(item: any) {
		let tags: string[] = item.cat.split(", ") ?? [];
		tags = tags.filter(e => !e.startsWith("_"));

		let resist = "";
		let power_source = "Arcane";
		for (const tag of tags) if (tag.includes("Clerical")) power_source = "Clerical";
		if (item.ref.class.includes("/")) resist = item.ref.class.split("/")[1].replace("R-", "");
		const spellData = {
			type: "spell" as ItemType,
			name: item.name,
			id: item["@idkey"],
			reference: item.ref.page ?? "",
			notes: "",
			tags: tags,
			prereqs: BasePrereq.list,
			difficulty: item.type.toLowerCase(),
			tech_level: item.tl ?? "",
			college: tags.filter(e => !e.startsWith("~")),
			power_source: power_source,
			spell_class: item.ref.class.split("/")[0],
			resist: resist,
			casting_cost: item.ref.castingcost.split("/")[0],
			maintenance_cost: item.ref.castingcost.includes("/") ? item.ref.castingcost.split("/")[1] : "",
			casting_time: item.ref.time,
			duration: item.ref.duration,
			points: parseInt(item.points),
		};

		return spellData;
	}

	getRitualMagicSpellData(item: any, context: any) {
		let tags: string[] = item.cat.split(", ") ?? [];
		tags = tags.filter(e => !e.startsWith("_"));

		let resist = "";
		if (item.ref.class.includes("/")) resist = item.ref.class.split("/")[1].replace("R-", "");
		let prereq_count = 0;
		const prereq_match = item.ref.description.match(/Prereq Count: (\d+)/);
		if (prereq_match) prereq_count = parseInt(prereq_match[1]);
		const firstdef = context.data.traits.skills.trait.find((e: any) => e["@idkey"] === item.calcs.deffromid);
		let seconddef = null;
		if (firstdef)
			seconddef = context.data.traits.skills.trait.find((e: any) => e["@idkey"] === firstdef.calcs.deffromid);
		const spellData = {
			type: "ritual_magic_spell" as ItemType,
			name: item.name,
			id: item["@idkey"],
			reference: item.ref.page ?? "",
			notes: "",
			tags: tags,
			prereqs: BasePrereq.list,
			difficulty: item.type.toLowerCase().split("/")[1],
			tech_level: item.tl ?? "",
			college: tags,
			power_source: "Arcane", // TODO: change for clerical
			spell_class: item.ref.class.split("/")[0],
			resist: resist,
			casting_cost: item.ref.castingcost.split("/")[0],
			maintenance_cost: item.ref.castingcost.includes("/") ? item.ref.castingcost.split("/")[1] : "",
			casting_time: item.ref.time,
			duration: item.ref.duration,
			points: parseInt(item.points),
			base_skill: seconddef ? seconddef.name : "",
			prereq_count: prereq_count,
		};

		return spellData;
	}

	getEquipmentData(item: any, context: any) {
		let tags: string[] = item.cat.split(", ") ?? [];
		tags = tags.filter(e => !e.startsWith("_"));
		const lc = item.attackmodes?.attackmode?.find((e: any) => Object.keys(e).includes("lc"))?.lc ?? "4";
		const useattack = item.attackmodes?.attackmode?.find((e: any) => Object.keys(e).includes("uses")) ?? {
			uses: "0",
			uses_used: "0",
		};
		const equipped =
			!(item.extended?.extendedtag?.find((e: any) => e.tagname === "inactive")?.tagvalue === "yes") ?? true;
		const equipmentData = {
			type: "equipment" as ItemType,
			name: item.name,
			id: item["@idkey"],
			reference: item.ref.page ?? "",
			notes: "",
			tags: tags,
			description: item.name,
			prereqs: BasePrereq.list,
			equipped: equipped,
			quantity: parseInt(item.count),
			tech_level: item.ref.techlvl,
			legality_class: lc,
			value: parseFloat(item.calcs.basecost),
			weight: `${parseFloat(item.calcs.baseweight) || 0} ${item.ref.charunits}`,
			uses: parseInt(useattack.uses) - parseInt(useattack.uses_used),
			max_uses: parseInt(useattack.uses),
			other: false,
		};
		return equipmentData;
	}

	getNestedItems(item: any, data: any, context?: { container?: boolean }) {
		return [];
	}

	async throwImportError(msg: string[]) {
		ui.notifications?.error(msg.join("<br>"));

		await ChatMessage.create({
			content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/chat/character-import-error.hbs`, {
				lines: msg,
			}),
			user: (game as Game).user!.id,
			type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
			whisper: [(game as Game).user!.id],
		});
		return false;
	}
}
