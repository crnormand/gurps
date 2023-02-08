import { CharacterGURPS } from "@actor"
import { BaseFeature } from "@feature"
import { BaseItemGURPS } from "@item/base"
import { ContainerGURPS } from "@item/container"
import { Feature, ItemDataGURPS, Weapon } from "@module/config"
import { ItemType, Study, SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { BaseWeapon, MeleeWeapon, RangedWeapon } from "@module/weapon"
import { PrereqList } from "@prereq"
import { getAdjustedStudyHours } from "@util"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"
import { ItemDataConstructorData } from "types/foundry/common/data/data.mjs/itemData"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { MergeObjectOptions } from "types/foundry/common/utils/helpers.mjs"
import { ItemGCSSystemData } from "./data"

class ItemGCS extends BaseItemGURPS {
	// @ts-ignore
	parent: CharacterGURPS | ContainerGURPS | null

	static override async updateDocuments(
		updates: any[],
		context: DocumentModificationContext & { options: any }
	): Promise<any[]> {
		if (!(parent instanceof Item)) return super.updateDocuments(updates, context)
		return parent.updateEmbeddedDocuments("Item", updates, context.options)
	}

	protected async _preCreate(
		data: ItemDataGURPS,
		options: DocumentModificationOptions,
		user: BaseUser
	): Promise<void> {
		let type = data.type.replace("_container", "")
		if (type === ItemType.Technique) type = ItemType.Skill
		else if (type === ItemType.RitualMagicSpell) type = ItemType.Spell
		else if (type === ItemType.Equipment) type = "equipment"
		else if (type === ItemType.LegacyEquipment) type = "legacy_equipment"
		// TODO: remove any
		if (this._source.img === (foundry.documents.BaseItem as any).DEFAULT_ICON)
			this._source.img = data.img = `systems/${SYSTEM_NAME}/assets/icons/${type}.svg`
		await super._preCreate(data, options, user)
	}

	override async update(
		data: DeepPartial<ItemDataConstructorData | (ItemDataConstructorData & Record<string, unknown>)>,
		context?: DocumentModificationContext & MergeObjectOptions & { noPrepare?: boolean }
	): Promise<this | undefined> {
		if (this.actor && context?.noPrepare) this.actor.noPrepare = true
		if (!(this.parent instanceof Item)) return super.update(data, context)
		data._id = this.id
		await this.parent.updateEmbeddedDocuments("Item", [data])
		// @ts-ignore
		this.render(false, { action: "update", data: data })
	}

	override delete(context?: DocumentModificationContext | undefined): Promise<any> {
		if (!(this.parent instanceof Item)) return super.delete(context)
		return this.parent.deleteEmbeddedDocuments("Item", [this.id!])
	}

	prepareData(): void {
		super.prepareData()
	}

	// Should not be necessary
	// override prepareBaseData(): void {
	// mergeObject(this.system, this._source.system)
	// mergeObject(this.flags, this._source.flags)
	// setProperty(this, "name", this._source.name)
	// setProperty(this, "sort", this._source.sort)
	// if (getProperty(this, "system.features"))
	// 	setProperty(this, "system.features", {
	// 		...getProperty(this, "system.features"),
	// 	})
	// if (getProperty(this, "system.prereqs.prereqs"))
	// 	setProperty(this, "system.prereqs.prereqs", {
	// 		...getProperty(this, "system.prereqs.prereqs"),
	// 	})
	// if (getProperty(this, "system.weapons"))
	// 	setProperty(this, "system.weapons", {
	// 		...getProperty(this, "system.weapons"),
	// 	})
	// }

	get formattedName(): string {
		return this.name ?? ""
	}

	get actor(): CharacterGURPS | null {
		if (this.parent) return this.parent instanceof Actor ? this.parent : this.parent.actor
		return null
	}

	get enabled(): boolean | undefined {
		return undefined
	}

	get tags(): string[] {
		return this.system.tags
	}

	get notes(): string {
		return this.system.notes
	}

	get reference(): string {
		return this.system.reference
	}

	get features(): Feature[] {
		if (this.system.hasOwnProperty("features")) {
			return (this.system as any).features.map(
				(e: Partial<Feature>) => new BaseFeature({ ...e, parent: this.uuid, item: this })
			)
		}
		return []
	}

	get prereqs() {
		if (!(this.system as any).prereqs) return new PrereqList()
		return new PrereqList((this.system as any).prereqs)
	}

	get prereqsEmpty(): boolean {
		if (!(this.system as any).prereqs.prereqs) return true
		return this.prereqs?.prereqs.length === 0
	}

	get meleeWeapons(): Map<string, MeleeWeapon> {
		return new Map([...this.weapons].filter(([_k, v]) => v instanceof MeleeWeapon)) as Map<string, MeleeWeapon>
	}

	get rangedWeapons(): Map<string, RangedWeapon> {
		return new Map([...this.weapons].filter(([_k, v]) => v instanceof RangedWeapon)) as Map<string, RangedWeapon>
	}

	get weapons(): Map<string, Weapon> {
		if (
			![
				"trait",
				"skill",
				"technique",
				"spell",
				"ritual_magic_spell",
				"equipment",
				"equipment_container",
			].includes(this.type)
		)
			return new Map()
		const weapons: Map<string, Weapon> = new Map()
		;(this.system as any).weapons.forEach((w: any, index: number) => {
			weapons.set(
				w.id,
				new BaseWeapon({
					...w,
					...{ parent: this, actor: this.actor, index: index },
				})
			)
		})
		return weapons
	}

	get studyHours(): number {
		if (!["trait", "skill", "technique", "spell", "ritual_magic_spell"].includes(this.type)) return 0
		return (this.system as any).study
			.map((e: Study) => getAdjustedStudyHours(e))
			.reduce((partialSum: number, a: number) => partialSum + a, 0)
	}

	get parents(): Array<any> {
		if (!this.parent) return []
		const grandparents = !(this.parent instanceof Actor) ? this.parent.parents : []
		return [this.parent, ...grandparents]
	}

	get parentCount(): number {
		let i = 0
		let p: any = this.parent
		while (p) {
			i++
			p = p.parent
		}
		return i
	}

	sameSection(compare: Item): boolean {
		const traits = ["trait", "trait_container"]
		const skills = ["skill", "technique", "skill_container"]
		const spells = ["spell", "ritual_magic_spell", "spell_container"]
		const equipment = ["equipment", "equipment_container"]
		const notes = ["note", "note_container"]
		const sections = [traits, skills, spells, equipment, notes]
		for (const i of sections) {
			if (i.includes(this.type) && i.includes(compare.type)) return true
		}
		return false
	}

	exportSystemData(keepOther: boolean): any {
		const system: any = this.system
		if ((this as any).children)
			system.children = (this as any).children.map((e: ItemGCS) => e.exportSystemData(false))
		if ((this as any).modifiers)
			system.modifiers = (this as any).modifiers.map((e: ItemGCS) => e.exportSystemData(false))
		if (system.weapons)
			system.weapons = system.weapons.map(function (e: BaseWeapon) {
				const f: any = { ...e }
				f.damage.base = new DiceGURPS(e.damage.base).toString(false)
				return f
			})
		if (!keepOther) delete system.other
		return system
	}
}

// @ts-ignore
interface ItemGCS extends BaseItemGURPS {
	parent: CharacterGURPS | ContainerGURPS | null
	readonly system: ItemGCSSystemData
}

export { ItemGCS }
