import { CharacterGURPS } from "@actor";
import { Feature } from "@feature";
import { BaseFeature } from "@feature/base";
import { ItemGURPS } from "@item";
import { ItemFlagsGURPS, ItemSystemDataGURPS } from "@item/data";
import { EquipmentSystemData } from "@item/equipment/data";
import { EquipmentContainerSystemData } from "@item/equipment_container/data";
import { EquipmentModifierSystemData } from "@item/equipment_modifier/data";
import { EquipmentModifierContainerSystemData } from "@item/equipment_modifier_container/data";
import { NoteSystemData } from "@item/note/data";
import { NoteContainerSystemData } from "@item/note_container/data";
import { RitualMagicSpellSystemData } from "@item/ritual_magic_spell/data";
import { SkillSystemData } from "@item/skill/data";
import { SkillContainerSystemData } from "@item/skill_container/data";
import { SpellSystemData } from "@item/spell/data";
import { SpellContainerSystemData } from "@item/spell_container/data";
import { TechniqueSystemData } from "@item/technique/data";
import { TraitSystemData } from "@item/trait/data";
import { TraitContainerSystemData } from "@item/trait_container/data";
import { TraitModifierSystemData } from "@item/trait_modifier/data";
import { TraitModifierContainerSystemData } from "@item/trait_modifier_container/data";
import { AttributeObj } from "@module/attribute";
import { AttributeDefObj } from "@module/attribute/attribute_def";
import { CR } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { SkillDefault } from "@module/default";
import { BaseWeapon, Weapon } from "@module/weapon";
import { BasePrereq, PrereqList } from "@prereq";
import { i18n, i18n_f, newUUID, removeAccents } from "@util";
import { CharacterDataGURPS, CharacterSystemData } from "./data";
import { GCAImporter } from "./import_GCA";

export interface CharacterImportedData extends Omit<CharacterSystemData, "attributes"> {
	traits: Array<TraitSystemData | TraitContainerSystemData>;
	skills: Array<SkillSystemData | TechniqueSystemData | SkillContainerSystemData>;
	spells: Array<SpellSystemData | RitualMagicSpellSystemData | SpellContainerSystemData>;
	equipment: Array<EquipmentSystemData | EquipmentContainerSystemData>;
	other_equipment: Array<EquipmentSystemData | EquipmentContainerSystemData>;
	notes: Array<NoteSystemData | NoteContainerSystemData>;
	attributes: Array<AttributeObj>;
}

export class CharacterImporter {
	version: number;

	document: CharacterGURPS;

	constructor(document: CharacterGURPS) {
		this.version = 4;
		this.document = document;
	}

	static import(document: CharacterGURPS, file: { text: string; name: string; path: string }) {
		if (file.name.includes(".gca5")) return GCAImporter.import(document, file);
		const importer = new CharacterImporter(document);
		importer._import(document, file);
	}

	async _import(document: CharacterGURPS, file: { text: string; name: string; path: string }) {
		const json = file.text;
		let r: CharacterImportedData;
		const errorMessages: string[] = [];
		try {
			r = JSON.parse(json);
		} catch (err) {
			console.error(err);
			errorMessages.push(i18n("gurps.error.import.no_json_detected"));
			return this.throwImportError(errorMessages);
		}

		let commit: Partial<CharacterDataGURPS> = {};
		const imp = document.importData;
		imp.name = file.name ?? imp.name;
		imp.path = file.path ?? imp.path;
		imp.last_import = new Date().toISOString();
		try {
			if (r.version < this.version)
				return this.throwImportError([...errorMessages, i18n("gurps.error.import.format_old")]);
			else if (r.version > this.version)
				return this.throwImportError([...errorMessages, i18n("gurps.error.import.format_new")]);
			commit = { ...commit, ...{ "system.import": imp } };
			commit = { ...commit, ...{ name: r.profile.name, "prototypeToken.name": r.profile.name } };
			commit = { ...commit, ...this.importMiscData(r) };
			commit = { ...commit, ...(await this.importProfile(r.profile)) };
			commit = { ...commit, ...this.importSettings(r.settings) };
			commit = { ...commit, ...this.importAttributes(r.attributes) };

			// Begin item import
			const items: Array<ItemGURPS> = [];
			items.push(...this.importItems(r.traits));
			items.push(...this.importItems(r.skills));
			items.push(...this.importItems(r.spells));
			items.push(...this.importItems(r.equipment));
			items.push(...this.importItems(r.other_equipment, { other: true }));
			items.push(...this.importItems(r.notes));
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
		return true;
	}

	importMiscData(data: CharacterImportedData) {
		return {
			"system.version": data.version,
			"system.id": data.id,
			"system.created_date": data.created_date,
			"system.modified_date": data.modified_date,
			"system.total_points": data.total_points,
		};
	}

	async importProfile(profile: CharacterImportedData["profile"]) {
		const p: any = {
			"system.profile.player_name": profile.player_name || "",
			"system.profile.name": profile.name || this.document.name,
			"system.profile.title": profile.title || "",
			"system.profile.organization": profile.organization || "",
			"system.profile.age": profile.age || "",
			"system.profile.birthday": profile.birthday || "",
			"system.profile.eyes": profile.eyes || "",
			"system.profile.hair": profile.hair || "",
			"system.profile.skin": profile.skin || "",
			"system.profile.handedness": profile.handedness || "",
			"system.profile.height": profile.height || "",
			"system.profile.weight": profile.weight || "",
			"system.profile.SM": profile.SM || 0,
			"system.profile.gender": profile.gender || "",
			"system.profile.tech_level": profile.tech_level || "",
			"system.profile.religion": profile.religion || "",
		};
		if (profile.portrait) {
			const path: string = this.getPortraitPath();
			let currentDir = "";
			for (const i of path.split("/")) {
				try {
					currentDir += `${i}/`;
					await FilePicker.createDirectory("data", currentDir);
				} catch (err) {
					continue;
				}
			}
			const filename = `${removeAccents(profile.name)}_${this.document.id}_portrait.png`.replaceAll(" ", "_");
			const url = `data:image/png;base64,${profile.portrait}`;
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

	getPortraitPath(): string {
		if ((game as Game).settings.get(SYSTEM_NAME, "portrait_path") === "global") return "images/portraits/";
		return `worlds/${(game as Game).world.id}/images/portraits`;
	}

	importSettings(settings: CharacterImportedData["settings"]) {
		const attributes: Record<string, AttributeDefObj> = {};
		for (const att of settings.attributes as unknown as AttributeDefObj[]) {
			attributes[att.id] = att;
		}
		return {
			"system.settings.default_length_units": settings.default_length_units ?? "ft_in",
			"system.settings.default_weight_units": settings.default_weight_units ?? "lb",
			"system.settings.user_description_display": settings.user_description_display ?? "tooltip",
			"system.settings.modifiers_display": settings.modifiers_display ?? "inline",
			"system.settings.notes_display": settings.notes_display ?? "inline",
			"system.settings.skill_level_adj_display": settings.skill_level_adj_display ?? "tooltip",
			"system.settings.use_multiplicative_modifiers": settings.use_multiplicative_modifiers ?? false,
			"system.settings.use_modifying_dice_plus_adds": settings.use_modifying_dice_plus_adds ?? false,
			"system.settings.damage_progression": settings.damage_progression ?? "basic_set",
			"system.settings.use_simple_metric_conversions": settings.use_simple_metric_conversions ?? true,
			"system.settings.show_difficulty": settings.show_difficulty ?? true,
			"system.settings.show_trait_modifier_adj": settings.show_trait_modifier_adj ?? false,
			"system.settings.show_equipment_modifier_adj": settings.show_equipment_modifier_adj ?? false,
			"system.settings.show_spell_adj": settings.show_spell_adj ?? true,
			"system.settings.use_title_in_footer": settings.use_title_in_footer ?? false,
			"system.settings.page": settings.page,
			"system.settings.block_layout": settings.block_layout,
			"system.settings.attributes": attributes,
			"system.settings.body_type": settings.body_type,
		};
	}

	importAttributes(attributes: AttributeObj[]) {
		const atts: Record<string, AttributeObj> = {};
		for (const a of attributes) {
			atts[a.attr_id] = a;
		}
		return {
			"system.attributes": atts,
		};
	}

	importItems(list: Array<ItemSystemDataGURPS>, context?: { container?: boolean; other?: boolean }): Array<any> {
		if (!list) return [];
		const items: Array<any> = [];
		for (const item of list) {
			item.name = item.name ?? (item as any).description ?? (item as any).text;
			const id = randomID();
			// Console.log(item.name);
			const [itemData, itemFlags]: [ItemSystemDataGURPS, ItemFlagsGURPS] = this.getItemData(item, context);
			const newItem = {
				name: item.name ?? "ERROR",
				type: item.type,
				system: itemData,
				flags: itemFlags,
				_id: id,
			};
			// Const newItem = new BaseItemGURPS({
			// 	name: item.name ?? "ERROR",
			// 	type: item.type,
			// 	system: itemData,
			// 	flags: itemFlags,
			// 	// _id: id,
			// });
			if (context?.container) {
				items.push({
					name: item.name,
					system: itemData,
					effects: [],
					flags: itemFlags,
					// Folder: newItem.folder as Folder,
					// img: newItem.img,
					// permission: newItem.permission,
					type: item.type,
					_id: id,
				});
			} else {
				items.push(newItem);
			}
		}
		return items;
	}

	getItemData(
		item: ItemSystemDataGURPS,
		context?: { container?: boolean; other?: boolean }
	): [ItemSystemDataGURPS, ItemFlagsGURPS] {
		let data: ItemSystemDataGURPS;
		const flags: ItemFlagsGURPS = { [SYSTEM_NAME]: { contentsData: [] } };
		switch (item.type) {
			case "trait":
				data = this.getTraitData(item as TraitSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).modifiers, { container: true });
				return [data, flags];
			case "trait_container":
				data = this.getTraitContainerData(item as TraitContainerSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, { container: true });
				flags[SYSTEM_NAME]!.contentsData!.concat(
					this.importItems((item as any).modifiers, {
						container: true,
					})
				);
				return [data, flags];
			case "modifier":
				return [this.getTraitModifierData(item as TraitModifierSystemData), flags];
			case "modifier_container":
				data = this.getTraitModifierContainerData(item as TraitModifierContainerSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, { container: true });
				return [data, flags];
			case "skill":
				return [this.getSkillData(item as SkillSystemData), flags];
			case "technique":
				return [this.getTechniqueData(item as TechniqueSystemData), flags];
			case "skill_container":
				data = this.getSkillContainerData(item as SkillContainerSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, { container: true });
				return [data, flags];
			case "spell":
				return [this.getSpellData(item as SpellSystemData), flags];
			case "ritual_magic_spell":
				return [this.getRitualMagicSpellData(item as RitualMagicSpellSystemData), flags];
			case "spell_container":
				data = this.getSpellContainerData(item as SpellContainerSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, { container: true });
				return [data, flags];
			case "equipment":
				data = this.getEquipmentData(item as EquipmentSystemData, context?.other);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).modifiers, { container: true });
				return [data, flags];
			case "equipment_container":
				data = this.getEquipmentContainerData(item as EquipmentContainerSystemData, context?.other);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, {
					container: true,
					other: context?.other,
				});
				flags[SYSTEM_NAME]!.contentsData!.concat(
					this.importItems((item as any).modifiers, {
						container: true,
						other: context?.other,
					})
				);
				return [data, flags];
			case "eqp_modifier":
				return [this.getEquipmentModifierData(item as EquipmentModifierSystemData), flags];
			case "eqp_modifier_container":
				data = this.getEquipmentModifierContainerData(item as EquipmentModifierContainerSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, { container: true });
				return [data, flags];
			case "note":
				return [this.getNoteData(item as NoteSystemData), flags];
			case "note_container":
				data = this.getNoteContainerData(item as NoteContainerSystemData);
				flags[SYSTEM_NAME]!.contentsData = this.importItems((item as any).children, { container: true });
				return [data, flags];
		}
	}

	getTraitData(data: TraitSystemData): TraitSystemData {
		return {
			name: data.name ?? "Trait",
			type: data.type ?? "trait",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			round_down: data.round_down ?? false,
			disabled: data.disabled ?? false,
			levels: data.levels ?? 0,
			base_points: data.base_points ?? 0,
			points_per_level: data.points_per_level ?? 0,
			cr: data.cr ?? CR.None,
			cr_adj: data.cr_adj ?? "none",
			features: data.features ? this.importFeatures(data.features) : [],
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
		};
	}

	getTraitContainerData(data: TraitContainerSystemData): TraitContainerSystemData {
		return {
			name: data.name ?? "Trait Container",
			type: data.type ?? "trait_container",
			container_type: data.container_type ?? "group",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			disabled: data.disabled ?? false,
			cr: data.cr ?? CR.None,
			cr_adj: data.cr_adj ?? "none",
			open: data.open ?? false,
		};
	}

	getTraitModifierData(data: TraitModifierSystemData): TraitModifierSystemData {
		return {
			name: data.name ?? "Trait Modifier",
			type: data.type ?? "modifier",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			disabled: data.disabled ?? false,
			cost_type: data.cost_type ?? "percentage",
			cost: data.cost ?? 0,
			affects: data.affects ?? "total",
			levels: data.levels ?? 0,
			features: data.features ? this.importFeatures(data.features) : [],
		};
	}

	getTraitModifierContainerData(data: TraitModifierContainerSystemData): TraitModifierContainerSystemData {
		return {
			name: data.name ?? "Trait Modifier Container",
			type: data.type ?? "modifier_container",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
		};
	}

	getSkillData(data: SkillSystemData): SkillSystemData {
		return {
			name: data.name ?? "Skill",
			type: data.type ?? "skill",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			points: data.points ?? 1,
			specialization: data.specialization ?? "",
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			encumbrance_penalty_multiplier: data.encumbrance_penalty_multiplier ?? 0,
			difficulty: data.difficulty ?? "dx/a",
			defaults: data.defaults ? this.importDefaults(data.defaults) : [],
			features: data.features ? this.importFeatures(data.features) : [],
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
		};
	}

	getTechniqueData(data: TechniqueSystemData): TechniqueSystemData {
		return {
			name: data.name ?? "Technique",
			type: data.type ?? "technique",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			points: data.points ?? 1,
			limit: data.limit ?? 0,
			limited: !!data.limit ?? false,
			tech_level: data.tech_level ?? "",
			encumbrance_penalty_multiplier: data.encumbrance_penalty_multiplier ?? 0,
			difficulty: data.difficulty ?? "dx/a",
			default: data.default ? new SkillDefault(data.default) : new SkillDefault(),
			defaults: data.defaults ? this.importDefaults(data.defaults) : [],
			features: data.features ? this.importFeatures(data.features) : [],
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
		};
	}

	getSkillContainerData(data: SkillContainerSystemData): SkillContainerSystemData {
		return {
			name: data.name ?? "Skill Container",
			type: data.type ?? "skill_container",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
		};
	}

	getSpellData(data: SpellSystemData): SpellSystemData {
		return {
			name: data.name ?? "Spell",
			type: data.type ?? "spell",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			points: data.points ?? 1,
			tech_level: data.tech_level ?? "",
			difficulty: data.difficulty ?? "dx/a",
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
			college: data.college ?? [],
			power_source: data.power_source ?? "",
			spell_class: data.spell_class ?? "",
			resist: data.resist ?? "",
			casting_cost: data.casting_cost ?? "",
			maintenance_cost: data.maintenance_cost ?? "",
			casting_time: data.casting_time ?? "",
			duration: data.duration ?? "",
		};
	}

	getRitualMagicSpellData(data: RitualMagicSpellSystemData): RitualMagicSpellSystemData {
		return {
			name: data.name ?? "Spell",
			type: data.type ?? "ritual_magic_spell",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			points: data.points ?? 1,
			tech_level: data.tech_level ?? "",
			difficulty: data.difficulty ?? "dx/a",
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
			college: data.college ?? [],
			power_source: data.power_source ?? "",
			spell_class: data.spell_class ?? "",
			resist: data.resist ?? "",
			casting_cost: data.casting_cost ?? "",
			maintenance_cost: data.maintenance_cost ?? "",
			casting_time: data.casting_time ?? "",
			duration: data.duration ?? "",
			base_skill: data.base_skill ?? "",
			prereq_count: data.prereq_count ?? 0,
		};
	}

	getSpellContainerData(data: SpellContainerSystemData): SpellContainerSystemData {
		return {
			name: data.name ?? "Spell Container",
			type: data.type ?? "spell_container",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
		};
	}

	getEquipmentData(data: EquipmentSystemData, other = false): EquipmentSystemData {
		return {
			name: data.name ?? "Equipment",
			type: data.type ?? "equipment",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			features: data.features ? this.importFeatures(data.features) : [],
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
			tech_level: data.tech_level ?? "",
			value: data.value ?? 0,
			weight: data.weight ?? 0,
			uses: data.uses ?? 0,
			max_uses: data.max_uses ?? 0,
			equipped: data.equipped ?? true,
			description: data.description ?? "",
			legality_class: data.legality_class ?? "4",
			quantity: data.quantity ?? 1,
			ignore_weight_for_skills: data.ignore_weight_for_skills ?? false,
			other: other,
		};
	}

	getEquipmentContainerData(data: EquipmentContainerSystemData, other = false): EquipmentContainerSystemData {
		return {
			name: data.name ?? "Equipment",
			type: data.type ?? "equipment",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : BasePrereq.list,
			features: data.features ? this.importFeatures(data.features) : [],
			weapons: data.weapons ? this.importWeapons(data.weapons) : [],
			tech_level: data.tech_level ?? "",
			value: data.value ?? 0,
			weight: data.weight ?? 0,
			uses: data.uses ?? 0,
			max_uses: data.max_uses ?? 0,
			equipped: data.equipped ?? true,
			description: data.description ?? "",
			legality_class: data.legality_class ?? "4",
			quantity: data.quantity ?? 1,
			ignore_weight_for_skills: data.ignore_weight_for_skills ?? false,
			other: other,
			open: data.open ?? false,
		};
	}

	getEquipmentModifierData(data: EquipmentModifierSystemData): EquipmentModifierSystemData {
		return {
			name: data.name ?? "Equipment Modifier",
			type: data.type ?? "eqp_modifier",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			cost_type: data.cost_type ?? "to_original_cost",
			cost: data.cost ?? "",
			weight_type: data.weight_type ?? "to_original_weight",
			weight: data.weight ?? "",
			tech_level: data.tech_level ?? "",
			features: data.features ? this.importFeatures(data.features) : [],
			disabled: data.disabled ?? false,
		};
	}

	getEquipmentModifierContainerData(
		data: EquipmentModifierContainerSystemData
	): EquipmentModifierContainerSystemData {
		return {
			name: data.name ?? "Equipment Modifier Container",
			type: data.type ?? "eqp_modifier_container",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
		};
	}

	getNoteData(data: NoteSystemData): NoteSystemData {
		return {
			name: data.text ?? "Note",
			type: data.type ?? "note",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			text: data.text ?? "",
		};
	}

	getNoteContainerData(data: NoteContainerSystemData): NoteContainerSystemData {
		return {
			name: data.name ?? "Note",
			type: data.type ?? "note_container",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			text: data.text ?? "",
			open: data.open ?? false,
		};
	}

	importFeatures(features: Feature[]): Feature[] {
		const list: Feature[] = [];
		for (const f of features) {
			list.push(new BaseFeature(f, {}));
		}
		return list;
	}

	importWeapons(features: Weapon[]): Weapon[] {
		const list: Weapon[] = [];
		for (const w of features) {
			list.push(new BaseWeapon(w));
		}
		return list;
	}

	importDefaults(features: SkillDefault[]): SkillDefault[] {
		const list: SkillDefault[] = [];
		for (const d of features) {
			list.push(new SkillDefault(d));
		}
		return list;
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
