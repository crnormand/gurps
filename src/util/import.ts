import { BaseFeature } from "@feature"
import {
	EquipmentContainerSystemData,
	EquipmentModifierContainerSystemData,
	EquipmentModifierSystemData,
	EquipmentSystemData,
	ItemGCSSystemData,
	NoteContainerSystemData,
	NoteSystemData,
	RitualMagicSpellSystemData,
	SkillContainerSystemData,
	SkillSystemData,
	SpellContainerSystemData,
	SpellSystemData,
	TechniqueSystemData,
	TraitContainerSystemData,
	TraitModifierContainerSystemData,
	TraitModifierSystemData,
	TraitSystemData,
} from "@item"
import { ItemFlagsGURPS, ItemSystemDataGURPS, ItemType } from "@item/data"
import { Feature, Weapon } from "@module/config"
import { CR, SYSTEM_NAME } from "@module/data"
import { SkillDefault } from "@module/default"
import { BaseWeapon } from "@module/weapon"
import { PrereqList } from "@prereq"
import { i18n_f, newUUID } from "./misc"

class ImportUtils {
	static importItems(list: Array<ItemGCSSystemData>, context?: { container?: boolean; other?: boolean }): Array<any> {
		if (!list) return []
		const items: Array<any> = []
		for (const item of list) {
			item.name ??= (item as any).description ?? (item as any).text
			const id = randomID()
			const [itemData, itemFlags]: [ItemGCSSystemData, ItemFlagsGURPS] = ImportUtils.getItemData(item, context)
			const newItem = {
				name: item.name ?? "ERROR",
				type: itemData.type,
				system: itemData,
				flags: itemFlags,
				_id: id,
			}
			if (context?.container) {
				items.push({
					name: item.name,
					system: itemData,
					effects: [],
					flags: itemFlags,
					type: itemData.type,
					_id: id,
				})
			} else {
				items.push(newItem)
			}
		}
		return items
	}

	private static getItemData(
		item: ItemSystemDataGURPS,
		context?: { container?: boolean; other?: boolean }
	): [ItemSystemDataGURPS, ItemFlagsGURPS] {
		let data: ItemSystemDataGURPS
		const flags: ItemFlagsGURPS = { [SYSTEM_NAME]: { contentsData: [] } }
		switch (item.type) {
			case "trait":
				data = ImportUtils.getTraitData(item as TraitSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).modifiers, { container: true })
				return [data, flags]
			case "trait_container":
				data = ImportUtils.getTraitContainerData(item as TraitContainerSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, { container: true })
				flags[SYSTEM_NAME]!.contentsData!.concat(
					ImportUtils.importItems((item as any).modifiers, {
						container: true,
					})
				)
				return [data, flags]
			case "modifier":
				return [ImportUtils.getTraitModifierData(item as TraitModifierSystemData), flags]
			case "modifier_container":
				data = ImportUtils.getTraitModifierContainerData(item as TraitModifierContainerSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, { container: true })
				return [data, flags]
			case "skill":
				return [ImportUtils.getSkillData(item as SkillSystemData), flags]
			case "technique":
				return [ImportUtils.getTechniqueData(item as TechniqueSystemData), flags]
			case "skill_container":
				data = ImportUtils.getSkillContainerData(item as SkillContainerSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, { container: true })
				return [data, flags]
			case "spell":
				return [ImportUtils.getSpellData(item as SpellSystemData), flags]
			case "ritual_magic_spell":
				return [ImportUtils.getRitualMagicSpellData(item as RitualMagicSpellSystemData), flags]
			case "spell_container":
				data = ImportUtils.getSpellContainerData(item as SpellContainerSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, { container: true })
				return [data, flags]
			case "equipment":
				data = ImportUtils.getEquipmentData(item as EquipmentSystemData, context?.other)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).modifiers, { container: true })
				return [data, flags]
			case "equipment_container":
				data = ImportUtils.getEquipmentContainerData(item as EquipmentContainerSystemData, context?.other)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, {
					container: true,
					other: context?.other,
				})
				flags[SYSTEM_NAME]!.contentsData!.concat(
					ImportUtils.importItems((item as any).modifiers, {
						container: true,
						other: context?.other,
					})
				)
				return [data, flags]
			case "eqp_modifier":
				return [ImportUtils.getEquipmentModifierData(item as EquipmentModifierSystemData), flags]
			case "eqp_modifier_container":
				data = ImportUtils.getEquipmentModifierContainerData(item as EquipmentModifierContainerSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, { container: true })
				return [data, flags]
			case "note":
				return [ImportUtils.getNoteData(item as NoteSystemData), flags]
			case "note_container":
				data = ImportUtils.getNoteContainerData(item as NoteContainerSystemData)
				flags[SYSTEM_NAME]!.contentsData = ImportUtils.importItems((item as any).children, { container: true })
				return [data, flags]
			default:
				throw new Error(i18n_f("gcsga.error.import.invalid_item_type", { type: item.type }))
		}
	}

	private static getTraitData(data: TraitSystemData): TraitSystemData {
		return {
			name: data.name ?? "Trait",
			type: ItemType.Trait,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			round_down: data.round_down ?? false,
			disabled: data.disabled ?? false,
			can_level: data.can_level ?? false,
			levels: data.levels ?? 0,
			base_points: data.base_points ?? 0,
			points_per_level: data.points_per_level ?? 0,
			cr: data.cr ?? CR.None,
			cr_adj: data.cr_adj ?? "none",
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
		}
	}

	private static getTraitContainerData(data: TraitContainerSystemData): TraitContainerSystemData {
		return {
			name: data.name ?? "Trait Container",
			type: ItemType.TraitContainer,
			container_type: data.container_type ?? "group",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			disabled: data.disabled ?? false,
			cr: data.cr ?? CR.None,
			cr_adj: data.cr_adj ?? "none",
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getTraitModifierData(data: TraitModifierSystemData): TraitModifierSystemData {
		return {
			name: data.name ?? "Trait Modifier",
			type: ItemType.TraitModifier,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			disabled: data.disabled ?? false,
			cost_type: data.cost_type ?? "percentage",
			cost: data.cost ?? 0,
			affects: data.affects ?? "total",
			levels: data.levels ?? 0,
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getTraitModifierContainerData(
		data: TraitModifierContainerSystemData
	): TraitModifierContainerSystemData {
		return {
			name: data.name ?? "Trait Modifier Container",
			type: ItemType.TraitModifierContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getSkillData(data: SkillSystemData): SkillSystemData {
		return {
			name: data.name ?? "Skill",
			type: ItemType.Skill,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			specialization: data.specialization ?? "",
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			encumbrance_penalty_multiplier: data.encumbrance_penalty_multiplier ?? 0,
			difficulty: data.difficulty ?? "dx/a",
			defaults: data.defaults ? ImportUtils.importDefaults(data.defaults) : [],
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
		}
	}

	private static getTechniqueData(data: TechniqueSystemData): TechniqueSystemData {
		return {
			name: data.name ?? "Technique",
			type: ItemType.Technique,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			limit: data.limit ?? 0,
			limited: !!data.limit ?? false,
			tech_level: data.tech_level ?? "",
			encumbrance_penalty_multiplier: data.encumbrance_penalty_multiplier ?? 0,
			difficulty: data.difficulty ?? "dx/a",
			default: data.default ? new SkillDefault(data.default) : new SkillDefault(),
			defaults: data.defaults ? ImportUtils.importDefaults(data.defaults) : [],
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
		}
	}

	private static getSkillContainerData(data: SkillContainerSystemData): SkillContainerSystemData {
		return {
			name: data.name ?? "Skill Container",
			type: ItemType.SkillContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getSpellData(data: SpellSystemData): SpellSystemData {
		return {
			name: data.name ?? "Spell",
			type: ItemType.Spell,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			difficulty: data.difficulty ?? "dx/a",
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
			college: data.college ?? [],
			power_source: data.power_source ?? "",
			spell_class: data.spell_class ?? "",
			resist: data.resist ?? "",
			casting_cost: data.casting_cost ?? "",
			maintenance_cost: data.maintenance_cost ?? "",
			casting_time: data.casting_time ?? "",
			duration: data.duration ?? "",
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
		}
	}

	private static getRitualMagicSpellData(data: RitualMagicSpellSystemData): RitualMagicSpellSystemData {
		return {
			name: data.name ?? "Spell",
			type: ItemType.RitualMagicSpell,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			difficulty: data.difficulty ?? "dx/a",
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
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
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
		}
	}

	private static getSpellContainerData(data: SpellContainerSystemData): SpellContainerSystemData {
		return {
			name: data.name ?? "Spell Container",
			type: ItemType.SpellContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentData(data: EquipmentSystemData, other = false): EquipmentSystemData {
		return {
			name: data.name ?? "Equipment",
			type: ItemType.Equipment,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
			tech_level: data.tech_level ?? "",
			value: data.value ?? 0,
			weight: data.weight ?? "0 lb",
			uses: data.uses ?? 0,
			max_uses: data.max_uses ?? 0,
			equipped: data.equipped ?? true,
			description: data.description ?? "",
			legality_class: data.legality_class ?? "4",
			quantity: data.quantity ?? 1,
			ignore_weight_for_skills: data.ignore_weight_for_skills ?? false,
			other: other,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentContainerData(
		data: EquipmentContainerSystemData,
		other = false
	): EquipmentContainerSystemData {
		return {
			name: data.name ?? "Equipment",
			type: ItemType.EquipmentContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? new PrereqList(data.prereqs) : new PrereqList(),
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			weapons: data.weapons ? ImportUtils.importWeapons(data.weapons) : [],
			tech_level: data.tech_level ?? "",
			value: data.value ?? 0,
			weight: data.weight ?? "0 lb",
			uses: data.uses ?? 0,
			max_uses: data.max_uses ?? 0,
			equipped: data.equipped ?? true,
			description: data.description ?? "",
			legality_class: data.legality_class ?? "4",
			quantity: data.quantity ?? 1,
			ignore_weight_for_skills: data.ignore_weight_for_skills ?? false,
			other: other,
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentModifierData(data: EquipmentModifierSystemData): EquipmentModifierSystemData {
		return {
			name: data.name ?? "Equipment Modifier",
			type: ItemType.EquipmentModifier,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			cost_type: data.cost_type ?? "to_original_cost",
			cost: data.cost ?? "",
			weight_type: data.weight_type ?? "to_original_weight",
			weight: data.weight ?? "",
			tech_level: data.tech_level ?? "",
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			disabled: data.disabled ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentModifierContainerData(
		data: EquipmentModifierContainerSystemData
	): EquipmentModifierContainerSystemData {
		return {
			name: data.name ?? "Equipment Modifier Container",
			type: ItemType.EquipmentModifierContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getNoteData(data: NoteSystemData): NoteSystemData {
		return {
			name: data.text ?? "Note",
			type: ItemType.Note,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			text: data.text ?? "",
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getNoteContainerData(data: NoteContainerSystemData): NoteContainerSystemData {
		return {
			name: data.name ?? "Note",
			type: ItemType.NoteContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			text: data.text ?? "",
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static importFeatures(features: Feature[]): Feature[] {
		const list: Feature[] = []
		for (const f of features) {
			list.push(new BaseFeature(f, {}))
		}
		return list
	}

	private static importWeapons(features: Weapon[]): Weapon[] {
		const list: Weapon[] = []
		for (const w of features) {
			list.push(new BaseWeapon(w))
		}
		return list
	}

	private static importDefaults(features: SkillDefault[]): SkillDefault[] {
		const list: SkillDefault[] = []
		for (const d of features) {
			list.push(new SkillDefault(d))
		}
		return list
	}
}

export { ImportUtils }
