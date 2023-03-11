import { BaseFeature } from "@feature"
import { ContainerGURPS } from "@item/container"
import { MeleeWeaponGURPS } from "@item/melee_weapon"
import { RangedWeaponGURPS } from "@item/ranged_weapon"
import { BaseWeaponGURPS } from "@item/weapon"
import { Feature, ItemDataGURPS } from "@module/config"
import { ActorType, ItemType, Study, SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { PrereqList } from "@prereq"
import { getAdjustedStudyHours } from "@util"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"
import { ItemDataConstructorData } from "types/foundry/common/data/data.mjs/itemData"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { MergeObjectOptions } from "types/foundry/common/utils/helpers.mjs"
import { ItemGCSSystemData } from "./data"

abstract class ItemGCS extends ContainerGURPS {
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
		if (this.actor && context?.noPrepare) (this.actor as any).noPrepare = true
		if (!(this.parent instanceof Item)) return super.update(data, context)
		data._id = this.id
		await this.parent.updateEmbeddedDocuments("Item", [data])
		// @ts-ignore
		this.render(false, { action: "update", data: data })
	}

	override get actor(): (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null {
		const actor = super.actor
		if (actor?.type === ActorType.Character) return actor
		return null
	}

	get formattedName(): string {
		return this.name ?? ""
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

	get meleeWeapons(): Collection<MeleeWeaponGURPS> {
		const meleeWeapons: Collection<MeleeWeaponGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof MeleeWeaponGURPS) meleeWeapons.set(item.uuid, item)
		}
		return meleeWeapons
	}

	get rangedWeapons(): Collection<RangedWeaponGURPS> {
		const rangedWeapons: Collection<RangedWeaponGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof RangedWeaponGURPS) rangedWeapons.set(item.uuid, item)
		}
		return rangedWeapons
	}

	get weapons(): Collection<BaseWeaponGURPS> {
		const weapons: Collection<BaseWeaponGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof BaseWeaponGURPS) weapons.set(item.uuid, item)
		}
		return weapons
	}

	get studyHours(): number {
		if (!["trait", "skill", "technique", "spell", "ritual_magic_spell"].includes(this.type)) return 0
		return (this.system as any).study
			.map((e: Study) => getAdjustedStudyHours(e))
			.reduce((partialSum: number, a: number) => partialSum + a, 0)
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
			system.weapons = system.weapons.map(function (e: BaseWeaponGURPS) {
				const f: any = { ...e }
				f.damage.base = new DiceGURPS(e.damage.base).toString(false)
				return f
			})
		if (!keepOther) delete system.other
		return system
	}
}

interface ItemGCS extends ContainerGURPS {
	readonly system: ItemGCSSystemData
}

export { ItemGCS }
