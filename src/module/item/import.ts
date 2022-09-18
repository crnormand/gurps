import { Feature } from "@feature";
import { BaseFeature } from "@feature/base";
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
import { CR } from "@module/data";
import { SYSTEM_NAME } from "@module/settings";
import { SkillDefault } from "@module/default";
import { BaseWeapon, Weapon } from "@module/weapon";
import { BasePrereq, PrereqList } from "@prereq";
import { i18n, i18n_f, newUUID } from "@util";
import { GURPS } from "@module/gurps";

interface ItemLibraryData {
	type: ItemLibraryType;
	version: number;
	rows: Array<ItemSystemDataGURPS>;
}

enum ItemLibraryType {
	TraitLibrary = "trait_list",
	TraitModifierLibrary = "modifier_list",
	SkillLibrary = "skill_list",
	SpellLibrary = "spell_list",
	EquipmentLibrary = "equipment_list",
	EquipmentModifierLibrary = "eqp_modifier_list",
	NoteLibrary = "note_list",
}

export class ItemImporter {
	version: number;

	constructor() {
		this.version = 4;
	}

	static showDialog() {
		setTimeout(async () => {
			new Dialog(
				{
					title: i18n("gurps.system.library_import.title"),
					content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/library-import.hbs`, {}),
					buttons: {
						import: {
							icon: '<i class="fas fa-file-import"></i>',
							label: i18n("gurps.system.library_import.import"),
							callback: (html: HTMLElement | JQuery<HTMLElement>) => {
								const form = $(html).find("form")[0];
								const files = form.data.files;
								if (!files.length) return ui.notifications?.error(i18n("gurps.error.import.no_file"));
								else {
									const file = files[0];
									readTextFromFile(file).then(text =>
										ItemImporter.import({
											text: text,
											name: file.name,
											path: file.path,
										})
									);
								}
							},
						},
						no: {
							icon: '<i class="fas fa-times"></i>',
							label: i18n("gurps.system.library_import.cancel"),
						},
					},
					default: "import",
				},
				{
					width: 400,
				}
			).render(true);
		}, 200);
	}

	static import(file: { text: string; name: string; path: string }) {
		const importer = new ItemImporter();
		importer._import(file);
	}

	async _import(file: { text: string; name: string; path: string }) {
		const json = file.text;
		// Console.log(file);
		// Return;
		const name = file.name.split(".")[0];
		// Const name = "Library Test";
		let r: ItemLibraryData | any;
		const errorMessages: string[] = [];
		try {
			r = JSON.parse(json);
		} catch (err) {
			console.error(err);
			errorMessages.push(i18n("gurps.error.import.no_json_detected"));
			return this.throwImportError(errorMessages);
		}

		// Let commit: ItemLibraryData | any = {};
		try {
			if (r.version < this.version)
				return this.throwImportError(errorMessages.concat(i18n("gurps.error.import.format_old")));
			if (r.version > this.version)
				return this.throwImportError(errorMessages.concat(i18n("gurps.error.import.format_new")));

			// Commit = { ...commit, ...{ type: r.type } };
			// commit = { ...commit, ...{ version: r.version } };

			const items: Array<ItemSystemDataGURPS> = [];
			items.push(...this.importItems(r.rows));
			// Commit = { ...commit, ...{ rows: items } };

			// console.log(commit);

			let pack = (game as Game).packs.find(p => p.metadata.name === name);
			if (!pack) {
				pack = await CompendiumCollection.createCompendium({
					type: "Item",
					label: name,
					name: name,
					package: "world",
					path: "",
					private: true,
				});
			}
			ui.notifications?.info(i18n_f("gurps.system.library_import.start", { name: name }));
			let counter = items.length;
			// Console.log(items);
			Item.create(items as any, { pack: `world.${name}` });
			ui.notifications?.info(i18n_f("gurps.system.library_import.finished", { number: counter }));
			const cb = GURPS.CompendiumBrowser;
			console.log(cb, cb.rendered);
			if (cb.rendered) cb.render(true);
		} catch (err) {
			console.error(err);
			errorMessages.push(
				i18n_f("gurps.error.import.generic", {
					name: name,
					message: (err as Error).message,
				})
			);
			return this.throwImportError(errorMessages);
		}
	}

	importItems(list: Array<ItemSystemDataGURPS>, context?: { container?: boolean; other?: boolean }): Array<any> {
		if (!list) return [];
		const items: Array<any> = [];
		for (const item of list) {
			item.name = item.name ?? (item as any).description ?? (item as any).text;
			const id = randomID();
			const [itemData, itemFlags]: [ItemSystemDataGURPS, ItemFlagsGURPS] = this.getItemData(item, context);
			// Console.log(itemData);
			const newItem = {
				name: item.name ?? "ERROR",
				type: item.type,
				system: itemData,
				flags: itemFlags,
				_id: id,
			};
			if (context?.container) {
				items.push({
					name: item.name,
					data: itemData,
					effects: [],
					flags: itemFlags,
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

	importWeapons(weapons: Weapon[]): Weapon[] {
		const list: Weapon[] = [];
		for (const w of weapons) {
			list.push(new BaseWeapon(w));
		}
		return list;
	}

	importDefaults(defaults: SkillDefault[]): SkillDefault[] {
		const list: SkillDefault[] = [];
		for (const d of defaults) {
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
