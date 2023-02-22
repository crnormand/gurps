import { EquipmentSystemData } from "@item/equipment/data"
import { EquipmentContainerSystemData } from "@item/equipment_container/data"
import { NoteSystemData } from "@item/note/data"
import { NoteContainerSystemData } from "@item/note_container/data"
import { RitualMagicSpellSystemData } from "@item/ritual_magic_spell/data"
import { SkillSystemData } from "@item/skill/data"
import { SkillContainerSystemData } from "@item/skill_container/data"
import { SpellSystemData } from "@item/spell/data"
import { SpellContainerSystemData } from "@item/spell_container/data"
import { TechniqueSystemData } from "@item/technique/data"
import { TraitSystemData } from "@item/trait/data"
import { TraitContainerSystemData } from "@item/trait_container/data"
import { AttributeObj } from "@module/attribute"
import { ActorType, DamageProgression, DisplayMode, SYSTEM_NAME } from "@module/data"
import { i18n, i18n_f, LengthUnits, WeightUnits } from "@util"
import { CharacterSystemData } from "./data"
import { CharacterSheetGURPS } from "./sheet"
import { ItemGURPS } from "@module/config"
import { ImportUtils } from "@util/import"

export interface CharacterImportedData extends Omit<CharacterSystemData, "attributes"> {
	traits: Array<TraitSystemData | TraitContainerSystemData>
	skills: Array<SkillSystemData | TechniqueSystemData | SkillContainerSystemData>
	spells: Array<SpellSystemData | RitualMagicSpellSystemData | SpellContainerSystemData>
	equipment: Array<EquipmentSystemData | EquipmentContainerSystemData>
	other_equipment: Array<EquipmentSystemData | EquipmentContainerSystemData>
	notes: Array<NoteSystemData | NoteContainerSystemData>
	attributes: Array<AttributeObj>
	third_party: any
}

export class CharacterImporter {
	version: number

	document: Actor

	constructor(document: Actor) {
		this.version = 4
		this.document = document
	}

	static import(document: Actor, file: { text: string; name: string; path: string }) {
		// If (file.name.includes(".gca5")) return GCAImporter.import(document, file)
		const importer = new CharacterImporter(document)
		importer._import(document, file)
	}

	async _import(document: Actor, file: { text: string; name: string; path: string }) {
		const json = file.text
		let r: CharacterImportedData
		const errorMessages: string[] = []
		try {
			r = JSON.parse(json)
		} catch (err) {
			console.error(err)
			errorMessages.push(i18n("gurps.error.import.no_json_detected"))
			return this.throwImportError(errorMessages)
		}

		let commit: Partial<CharacterSystemData> = {}
		const imp = (document as any).importData
		imp.name = file.name ?? imp.name
		imp.path = file.path ?? imp.path
		imp.last_import = new Date().toISOString()
		try {
			if (r.version < this.version)
				return this.throwImportError([...errorMessages, i18n("gurps.error.import.format_old")])
			else if (r.version > this.version)
				return this.throwImportError([...errorMessages, i18n("gurps.error.import.format_new")])
			if (this.document.type === ActorType.LegacyCharacter) {
				commit = { ...commit, ...{ type: ActorType.Character } }
			}
			commit = { ...commit, ...{ "system.import": imp } }
			commit = { ...commit, ...{ name: r.profile.name, "prototypeToken.name": r.profile.name } }
			commit = { ...commit, ...this.importMiscData(r) }
			commit = { ...commit, ...(await this.importProfile(r.profile)) }
			commit = { ...commit, ...this.importSettings(r.settings) }
			commit = { ...commit, ...this.importAttributes(r.attributes) }
			commit = { ...commit, ...this.importResourceTrackers(r.third_party) }

			// Begin item import
			const items: Array<ItemGURPS> = []
			items.push(...ImportUtils.importItems(r.traits))
			items.push(...ImportUtils.importItems(r.skills))
			items.push(...ImportUtils.importItems(r.spells))
			items.push(...ImportUtils.importItems(r.equipment))
			items.push(...ImportUtils.importItems(r.other_equipment, { other: true }))
			items.push(...ImportUtils.importItems(r.notes))
			commit = { ...commit, ...{ items: items } }
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

		try {
			await this.document.update(commit, {
				diff: false,
				recursive: false,
			})
			if ((this.document.sheet as unknown as CharacterSheetGURPS)?.config !== null) {
				;(this.document.sheet as unknown as CharacterSheetGURPS)?.config?.render(true)
			}
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

	importMiscData(data: CharacterImportedData) {
		return {
			"system.version": data.version,
			"system.id": data.id,
			"system.created_date": data.created_date,
			"system.modified_date": data.modified_date,
			"system.total_points": data.total_points,
			"system.points_record": data.points_record || [],
		}
	}

	async importProfile(profile: CharacterImportedData["profile"]) {
		const r: any = {
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
			"system.profile.weight": profile.weight,
			"system.profile.SM": profile.SM || 0,
			"system.profile.gender": profile.gender || "",
			"system.profile.tech_level": profile.tech_level || "",
			"system.profile.religion": profile.religion || "",
		}

		if (profile.portrait) {
			if (game.user?.hasPermission("FILES_UPLOAD")) {
				r.img = `data:image/png;base64,${profile.portrait}.png`
			} else {
				console.error(i18n("gurps.error.import.portait_permissions"))
				ui.notifications?.error(i18n("gurps.error.import.portait_permissions"))
			}
		}
		return r
	}

	importSettings(settings: CharacterImportedData["settings"]) {
		return {
			"system.settings.default_length_units": settings.default_length_units ?? LengthUnits.FeetAndInches,
			"system.settings.default_weight_units": settings.default_weight_units ?? WeightUnits.Pound,
			"system.settings.user_description_display": settings.user_description_display ?? DisplayMode.Tooltip,
			"system.settings.modifiers_display": settings.modifiers_display ?? DisplayMode.Inline,
			"system.settings.notes_display": settings.notes_display ?? DisplayMode.Inline,
			"system.settings.skill_level_adj_display": settings.skill_level_adj_display ?? DisplayMode.Tooltip,
			"system.settings.use_multiplicative_modifiers": settings.use_multiplicative_modifiers ?? false,
			"system.settings.use_modifying_dice_plus_adds": settings.use_modifying_dice_plus_adds ?? false,
			"system.settings.damage_progression": settings.damage_progression ?? DamageProgression.BasicSet,
			"system.settings.show_trait_modifier_adj": settings.show_trait_modifier_adj ?? false,
			"system.settings.show_equipment_modifier_adj": settings.show_equipment_modifier_adj ?? false,
			"system.settings.show_spell_adj": settings.show_spell_adj ?? false,
			"system.settings.use_title_in_footer": settings.use_title_in_footer ?? false,
			"system.settings.exclude_unspent_points_from_total": settings.exclude_unspent_points_from_total ?? false,
			"system.settings.page": settings.page,
			"system.settings.block_layout": settings.block_layout,
			"system.settings.attributes": settings.attributes,
			"system.settings.resource_trackers": [],
			"system.settings.body_type": settings.body_type,
		}
	}

	importAttributes(attributes: AttributeObj[]) {
		return {
			"system.attributes": attributes,
		}
	}

	importResourceTrackers(tp: any) {
		if (!tp) return
		return {
			"system.settings.resource_trackers": tp.settings?.resource_trackers ?? [],
			"system.resource_trackers": tp.resource_trackers ?? [],
		}
	}

	async throwImportError(msg: string[]) {
		ui.notifications?.error(msg.join("<br>"))

		await ChatMessage.create({
			content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/chat/character-import-error.hbs`, {
				lines: msg,
			}),
			user: game.user!.id,
			type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
			whisper: [game.user!.id],
		})
		return false
	}
}
