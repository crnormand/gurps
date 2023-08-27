import { ActorType, RollModifier, SYSTEM_NAME } from "@module/data"
import {
	BaseWeaponGURPS,
	ConditionGURPS,
	ConditionID,
	ContainerGURPS,
	EffectGURPS,
	EffectID,
	ItemFlags,
	ManeuverID,
	Postures,
	TraitContainerGURPS,
	TraitGURPS,
	TraitModifierGURPS,
} from "@item"
import {
	ActorConstructorContextGURPS,
	ActorFlags,
	ActorFlagsGURPS,
	ActorSystemData,
	BaseActorSourceGURPS,
} from "./data"
import { HitLocationTable } from "@actor/character/hit_location"
import {
	DamageAttacker,
	DamageRoll,
	DamageRollAdapter,
	DamageTarget,
	DamageWeapon,
	HitPointsCalc,
	TargetTrait,
	TargetTraitModifier,
	Vulnerability,
} from "@module/damage_calculator"
import { ApplyDamageDialog } from "@module/damage_calculator/apply_damage_dlg"
import { DamagePayload } from "@module/damage_calculator/damage_chat_message"
import { DiceGURPS } from "@module/dice"
import { ActorDataGURPS, ActorSourceGURPS } from "@module/config"
import Document, { DocumentModificationOptions, Metadata } from "types/foundry/common/abstract/document.mjs"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { Attribute } from "@module/attribute"
import { ActorDataConstructorData } from "types/foundry/common/data/data.mjs/actorData"
import { MergeObjectOptions } from "types/foundry/common/utils/helpers.mjs"
import { CharacterGURPS } from "@actor/character"

class BaseActorGURPS extends Actor {
	constructor(data: ActorSourceGURPS, context: ActorConstructorContextGURPS = {}) {
		if (context.gurps?.ready) {
			super(data, context)
			this.noPrepare = false
		} else {
			mergeObject(context, { gurps: { ready: true } })
			const ActorConstructor = CONFIG.GURPS.Actor.documentClasses[data.type]
			// eslint-disable-next-line no-constructor-return
			if (ActorConstructor) return new ActorConstructor(data, context)
			throw Error(`Invalid Actor Type "${data.type}"`)
		}
	}

	protected async _preCreate(data: any, options: DocumentModificationOptions, user: BaseUser): Promise<void> {
		if (this._source.img === foundry.CONST.DEFAULT_TOKEN)
			this._source.img = data.img = `systems/${SYSTEM_NAME}/assets/icons/${data.type}.svg`
		await super._preCreate(data, options, user)
	}

	protected async _preUpdate(
		changed: DeepPartial<ActorDataGURPS>,
		options: DocumentModificationOptions,
		user: BaseUser
	): Promise<void> {
		const defaultToken = `systems/${SYSTEM_NAME}/assets/icons/${this.type}.svg`
		if (changed.img && !(changed as any).prototypeToken?.texture?.src) {
			if (
				!(this as any).prototypeToken.texture.src ||
				(this as any).prototypeToken.texture.src === defaultToken
			) {
				setProperty(changed, "prototypeToken.texture.src", changed.img)
			} else {
				setProperty(changed, "prototypeToken.texture.src", (this as any).prototypeToken.texture.src)
			}
		}
		await super._preUpdate(changed, options, user)
	}

	get hitLocationTable(): HitLocationTable {
		return {
			name: "",
			roll: new DiceGURPS("3d6"),
			locations: [],
		}
	}

	static override async createDialog(
		data: { folder?: string } = {},
		options: Partial<FormApplicationOptions> = {}
	): Promise<any | undefined> {
		const original = game.system.documentTypes.Actor
		game.system.documentTypes.Actor = original.filter(
			(actorType: string) => ![ActorType.LegacyEnemy].includes(actorType as any)
		)
		options = { ...options, classes: [...(options.classes ?? []), "dialog-actor-create"] }
		const newActor = super.createDialog(data, options) as Promise<BaseActorGURPS | undefined>
		game.system.documentTypes.Actor = original
		return newActor
	}

	update(
		data?: DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)> | undefined,
		context?: (DocumentModificationContext & MergeObjectOptions) | undefined
	): Promise<this | undefined> {
		return super.update(data, context)
	}

	get gEffects(): Collection<EffectGURPS> {
		const effects: Collection<EffectGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof EffectGURPS) effects.set(item._id, item)
		}
		return effects
	}

	get conditions(): Collection<ConditionGURPS> {
		const conditions: Collection<ConditionGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof ConditionGURPS) conditions.set(item._id, item)
		}
		return conditions
	}

	get modifiers(): RollModifier[] {
		let modifiers: RollModifier[] = []
		this.gEffects.forEach(e => {
			modifiers = modifiers.concat(e.system.modifiers || [])
		})
		return modifiers
	}

	// override get temporaryEffects(): any {
	// 	const effects = this.gEffects
	// 		// .filter(e => !(e instanceof ConditionGURPS && e.cid === ConditionID.Dead))
	// 		.map(e => new ActiveEffect({ name: e.name, icon: e.img || "" } as any))
	// 	return super.temporaryEffects.concat(effects)
	// }
	override get temporaryEffects(): any {
		const effects = this.gEffects.map(e => {
			const overlay = e instanceof ConditionGURPS && e.cid === ConditionID.Dead
			const a = new ActiveEffect({ name: e.name, icon: e.img || "" } as any)
			// a.setFlag("core", "overlay", overlay)
			;(a as any).flags = { core: { overlay: overlay } }
			return a
		})
		return super.temporaryEffects.concat(effects)
	}

	get inCombat(): boolean {
		return game.combat?.combatants.some(c => c.actor?.id === this.id) || false
	}

	createEmbeddedDocuments(
		embeddedName: string,
		data: Array<Record<string, unknown>>,
		context: DocumentModificationContext & { temporary: boolean; substitutions?: boolean } = {
			temporary: false,
			renderSheet: false,
			render: true,
			substitutions: true,
		}
	): Promise<Array<any>> {
		if (embeddedName === "Item")
			data = data.filter(
				(e: any) =>
					e.flags?.[SYSTEM_NAME]?.[ItemFlags.Container] !== this.id ||
					CONFIG.GURPS.Actor.allowedContents[this.type].includes(e.type as string)
			)
		return super.createEmbeddedDocuments(embeddedName, data, context)
	}

	updateEmbeddedDocuments(
		embeddedName: string,
		updates?: Record<string, unknown>[] | undefined,
		context?: DocumentModificationContext | undefined
	): Promise<Document<any, this, Metadata<any>>[]> {
		return super.updateEmbeddedDocuments(embeddedName, updates, context)
	}

	deleteEmbeddedDocuments(
		embeddedName: string,
		ids: string[],
		context?: DocumentModificationContext | undefined
	): Promise<Document<any, this, Metadata<any>>[]> {
		if (embeddedName !== "Item") return super.deleteEmbeddedDocuments(embeddedName, ids, context)

		const newIds = ids
		ids.forEach(id => {
			const item = this.items.get(id)
			if (item instanceof ContainerGURPS)
				for (const i of item.deepItems) {
					if (!newIds.includes(i.id!)) newIds.push(i.id!)
				}
		})
		return super.deleteEmbeddedDocuments(embeddedName, newIds, context)
	}

	get sizeMod(): number {
		return 0
	}

	prepareDerivedData(): void {
		super.prepareDerivedData()
		setProperty(this.flags, `${SYSTEM_NAME}.${ActorFlags.SelfModifiers}`, [])
		setProperty(this.flags, `${SYSTEM_NAME}.${ActorFlags.TargetModifiers}`, [])

		const sizemod = this.sizeMod
		if (sizemod !== 0) {
			this.flags[SYSTEM_NAME][ActorFlags.TargetModifiers].push({
				name: "for Size Modifier",
				modifier: sizemod,
				tags: [],
			})
		}
	}

	handleDamageDrop(payload: DamagePayload): void {
		let attacker = undefined
		if (payload.attacker) {
			const actor = fromUuidSync(payload.attacker) as BaseActorGURPS
			attacker = new DamageAttackerAdapter(actor)
		}

		let weapon = undefined
		if (payload.weaponID) {
			const temp = fromUuidSync(payload.weaponID) as BaseWeaponGURPS
			weapon = new DamageWeaponAdapter(temp)
		}

		let roll: DamageRoll = new DamageRollAdapter(payload, attacker, weapon)
		let target: DamageTarget = new DamageTargetActor(this)
		ApplyDamageDialog.create(roll, target).then(dialog => dialog.render(true))
	}

	createDamageTargetAdapter(): DamageTarget {
		return new DamageTargetActor(this)
	}

	hasCondition(id: ConditionID | ConditionID[]): boolean {
		if (!Array.isArray(id)) id = [id]
		// if (id.includes(ConditionID.Dead)) return this.effects.some(e => e.getFlag("core", "statusId") === "dead")
		return this.conditions.some(e => id.includes(e.cid as any))
	}

	// toggleDefeated() {
	// 	const token = this.token?.object as TokenGURPS
	// 	const isDefeated = !this.hasCondition(ConditionID.Dead)
	// 	const effect = CONFIG.specialStatusEffects.DEFEATED
	// 	// if (token) token.toggleEffect(effect, { overlay: true, active: isDefeated })
	// 	if (token) {
	// 		token.document.overlayEffect = isDefeated ? effect : undefined
	// 		// const combatant = token.combatant
	// 		// if (combatant) combatant.update(defea)
	// 	}
	// }

	async addConditions(ids: ConditionID[]): Promise<ConditionGURPS[] | null> {
		ids = ids.filter(id => !this.hasCondition(id))
		// if (ids.includes(ConditionID.Dead)) {
		// 	ids = ids.filter(e => e !== ConditionID.Dead)
		// 	this.toggleDefeated()
		// }
		return this.createEmbeddedDocuments(
			"Item",
			ids.map(id => duplicate(ConditionGURPS.getData(id)))
		)
	}

	async removeConditions(ids: ConditionID[]): Promise<Document<any, this, Metadata<any>>[] | null> {
		const items: string[] = this.conditions.filter(e => ids.includes(e.cid as any)).map(e => e._id)
		// if (ids.includes(ConditionID.Dead)) {
		// 	ids = ids.filter(e => e !== ConditionID.Dead)
		// 	await this.toggleDefeated()
		// }
		return this.deleteEmbeddedDocuments("Item", items)
	}

	async increaseCondition(id: EffectID): Promise<ConditionGURPS | null> {
		if (Object.values(ManeuverID).includes(id as any)) return this.changeManeuver(id as ManeuverID)
		const existing = this.conditions.find(e => e.cid === id)
		if (existing) {
			if (existing.canLevel) {
				const newLevel = existing.level + 1
				if (newLevel <= existing.maxLevel) {
					await existing.update({ "system.levels.current": newLevel })
				}
				return existing
			} else {
				await existing.delete()
				return null
			}
		}
		const newCondition = duplicate(ConditionGURPS.getData(id))
		if (newCondition.system?.can_level) newCondition.system.levels!.current += 1
		const items = (await this.createEmbeddedDocuments("Item", [newCondition])) as ConditionGURPS[]
		return items[0]
	}

	async decreaseCondition(id: EffectID, { forceRemove } = { forceRemove: false }): Promise<void> {
		const condition = this.conditions.find(e => e.cid === id)
		if (!condition) return

		const value = condition.canLevel ? Math.max(condition.level - 1, 0) : null
		if (value && !forceRemove) {
			await condition.update({ "system.levels.current": value })
		} else {
			await condition.delete()
		}
	}

	async changeManeuver(id: ManeuverID | "none"): Promise<ConditionGURPS | null> {
		const existing = this.conditions.find(e => e.cid === id)
		if (existing) return null
		if (id === "none") return this.resetManeuvers()
		if ([ManeuverID.BLANK_1, ManeuverID.BLANK_2].includes(id as any)) return null
		const maneuvers = this.conditions.filter(e => Object.values(ManeuverID).includes(e.cid as any))
		const newCondition = duplicate(ConditionGURPS.getData(id))
		if (maneuvers.length) {
			const items = (await this.updateEmbeddedDocuments("Item", [
				{ _id: maneuvers[0]._id, ...newCondition },
			])) as unknown as ConditionGURPS[]
			return items[0]
		}
		const items = (await this.createEmbeddedDocuments("Item", [newCondition])) as ConditionGURPS[]
		return items[0]
	}

	async resetManeuvers(): Promise<null> {
		const maneuvers = this.conditions.filter(e => Object.values(ManeuverID).includes(e.cid as any))
		await this.deleteEmbeddedDocuments(
			"Item",
			maneuvers.map(e => e.id!)
		)
		return null
	}

	async changePosture(id: ConditionID | "standing"): Promise<ConditionGURPS | null> {
		const existing = this.conditions.find(e => e.cid === id)
		if (existing) return null
		if (id === "standing") return this.resetPosture()
		const postures = this.conditions.filter(e => Postures.includes(e.cid as any))
		const newCondition = duplicate(ConditionGURPS.getData(id))
		if (postures.length) {
			const items = this.updateEmbeddedDocuments("Item", [
				{ _id: postures[0]._id, ...newCondition },
			]) as unknown as ConditionGURPS[]
			return items[0]
		}
		const items = (await this.createEmbeddedDocuments("Item", [newCondition])) as ConditionGURPS[]
		return items[0]
	}

	async resetPosture(): Promise<null> {
		const maneuvers = this.conditions.filter(e => Object.values(Postures).includes(e.cid as any))
		await this.deleteEmbeddedDocuments(
			"Item",
			maneuvers.map(e => e.id!)
		)
		return null
	}
}

/**
 * Adapt a BaseActorGURPS to the DamageTarget interface expected by the Damage Calculator.
 */
class DamageTargetActor implements DamageTarget {
	static DamageReduction = "Damage Reduction"

	private actor: BaseActorGURPS

	constructor(actor: BaseActorGURPS) {
		this.actor = actor
	}

	incrementDamage(delta: number): void {
		console.log(`Reduce HP by ${delta}`)
		const attributes = [...(this.actor as CharacterGURPS).system.attributes]
		const index = attributes.findIndex(it => it.attr_id === "hp")
		attributes[index].damage = attributes[index].damage! + delta
		this.actor.update({
			"system.attributes": attributes,
		})
	}

	get name(): string {
		return this.actor.name ?? ""
	}

	get ST(): number {
		return (this.actor.attributes.get("st") as any).calc.value
	}

	get hitPoints(): HitPointsCalc {
		return (this.actor.attributes.get("hp") as any).calc
	}

	get hitLocationTable(): HitLocationTable {
		return this.actor.hitLocationTable
	}

	/**
	 * @returns the FIRST trait we find with the given name.
	 *
	 * This is where we would add special handling to look for traits under different names.
	 *  Actor
	 *  .traits.contents.find(it => it.name === 'Damage Resistance')
	 *	 .modifiers.contents.filter(it => it.enabled === true).find(it => it.name === 'Hardened')
	 * @param name
	 */
	getTrait(name: string): TargetTrait | undefined {
		if (this.actor instanceof BaseActorGURPS) {
			let traits = this.actor.traits.contents.filter(it => it instanceof TraitGURPS)
			let found = traits.find(it => it.name === name)
			return found ? new TraitAdapter(found as TraitGURPS) : undefined
		}
		return undefined
	}

	/**
	 *
	 * @param name
	 * @returns all traits with the given name.
	 */
	getTraits(name: string): TargetTrait[] {
		if (this.actor instanceof BaseActorGURPS) {
			let traits = this.actor.traits.contents.filter(it => it instanceof TraitGURPS)
			return traits.filter(it => it.name === name).map(it => new TraitAdapter(it as TraitGURPS))
		}
		return []
	}

	hasTrait(name: string): boolean {
		return !!this.getTrait(name)
	}

	get isUnliving(): boolean {
		// Try "Injury Tolerance (Unliving)" and "Unliving"
		if (this.hasTrait("Unliving")) return true
		if (!this.hasTrait("Injury Tolerance")) return false
		let trait = this.getTrait("Injury Tolerance")
		return !!trait?.getModifier("Unliving")
	}

	get isHomogenous(): boolean {
		if (this.hasTrait("Homogenous")) return true
		if (!this.hasTrait("Injury Tolerance")) return false
		let trait = this.getTrait("Injury Tolerance")
		return !!trait?.getModifier("Homogenous")
	}

	get isDiffuse(): boolean {
		if (this.hasTrait("Diffuse")) return true
		if (!this.hasTrait("Injury Tolerance")) return false
		let trait = this.getTrait("Injury Tolerance")
		return !!trait?.getModifier("Diffuse")
	}
}

/**
 * Adapt a TraitGURPS to the TargetTrait interface expected by the Damage Calculator.
 */
class TraitAdapter implements TargetTrait {
	private trait: TraitGURPS

	// Actor
	//  .traits.contents.find(it => it.name === 'Damage Resistance')
	//  .modifiers.contents.filter(it => it.enabled === true).find(it => it.name === 'Hardened')

	getModifier(name: string): TraitModifierAdapter | undefined {
		return this.modifiers?.find(it => it.name === name)
	}

	get levels() {
		return this.trait.levels
	}

	get name() {
		return this.trait.name
	}

	get modifiers(): TraitModifierAdapter[] {
		return this.trait.modifiers.contents
			.filter(it => it instanceof TraitModifierGURPS)
			.filter(it => it.enabled === true)
			.map(it => new TraitModifierAdapter(it as TraitModifierGURPS))
	}

	constructor(trait: TraitGURPS) {
		this.trait = trait
	}
}

/**
 * Adapt the TraitModifierGURPS to the interface expected by Damage calculator.
 */
class TraitModifierAdapter implements TargetTraitModifier {
	private modifier: TraitModifierGURPS

	get levels() {
		return this.modifier.levels
	}

	get name(): string {
		return this.modifier.name!
	}

	constructor(modifier: TraitModifierGURPS) {
		this.modifier = modifier
	}
}

class DamageAttackerAdapter implements DamageAttacker {
	private actor: BaseActorGURPS

	constructor(actor: BaseActorGURPS) {
		this.actor = actor
	}

	get name(): string | null {
		return this.actor.name
	}
}

class DamageWeaponAdapter implements DamageWeapon {
	base: BaseWeaponGURPS | undefined

	constructor(base: BaseWeaponGURPS) {
		this.base = base
	}

	get name(): string {
		return `${this.base?.container?.name} (${this.base?.name})`
	}

	get damageDice(): string {
		return this.base?.fastResolvedDamage ?? ""
	}
}

interface BaseActorGURPS extends Actor {
	flags: ActorFlagsGURPS
	noPrepare: boolean
	// deepItems: Collection<ItemGURPS>
	attributes: Map<string, Attribute>
	traits: Collection<TraitGURPS | TraitContainerGURPS>
	// Temp
	system: ActorSystemData
	_source: BaseActorSourceGURPS
	_id: string
}

export { BaseActorGURPS }
