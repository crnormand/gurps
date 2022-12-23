import { ActorDataGURPS, ActorSourceGURPS } from "@actor/data"
import Document, {
	Context,
	DocumentModificationOptions,
	Metadata,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs"
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData"
import { BaseUser } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs"
import { SYSTEM_NAME } from "@module/data"
import { TraitContainerGURPS, TraitGURPS, TraitModifierGURPS } from "@item"
import { ActorFlags, ActorSystemData, BaseActorSourceGURPS } from "./data"
import { Attribute } from "@module/attribute"
import { HitLocationTable } from "@actor/character/hit_location"
import {
	DamageRoll,
	DamageRollAdapter,
	DamageTarget,
	HitPointsCalc,
	TargetTrait,
	TargetTraitModifier,
} from "@module/damage_calculator"
import { ApplyDamageDialog } from "@module/damage_calculator/apply_damage_dlg"
import { DamagePayload } from "@module/damage_calculator/damage_chat_message"

export interface ActorConstructorContextGURPS extends Context<TokenDocument> {
	gurps?: {
		ready?: boolean
		imported?: boolean
	}
}

class BaseActorGURPS extends Actor {
	constructor(data: ActorSourceGURPS, context: ActorConstructorContextGURPS = {}) {
		if (context.gurps?.ready) {
			super(data, context)
			this.noPrepare = false
		} else {
			mergeObject(context, { gurps: { ready: true } })
			const ActorConstructor = (CONFIG as any).GURPS.Actor.documentClasses[data.type]
			return ActorConstructor ? new ActorConstructor(data, context) : new BaseActorGURPS(data, context)
		}
	}

	protected async _preCreate(
		data: ActorDataConstructorData & ActorDataGURPS,
		options: DocumentModificationOptions,
		user: BaseUser
	): Promise<void> {
		// @ts-ignore TODO:
		if (this._source.img === foundry.documents.BaseActor.DEFAULT_ICON)
			this._source.img = data.img = `systems/${SYSTEM_NAME}/assets/icons/${data.type}.svg`
		await super._preCreate(data, options, user)
	}

	protected async _preUpdate(
		changed: DeepPartial<ActorDataConstructorData & ActorDataGURPS>,
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

	get deepItems(): Collection<Item> {
		const deepItems: Item[] = []
		for (const item of this.items as any as Collection<Item>) {
			deepItems.push(item)
			if ((item as any).items)
				for (const i of (item as any).deepItems) {
					deepItems.push(i)
				}
		}
		return new Collection(
			deepItems.map(e => {
				return [e.id!, e]
			})
		)
	}

	updateEmbeddedDocuments(
		embeddedName: string,
		updates?: Record<string, unknown>[] | undefined,
		context?: DocumentModificationContext | undefined
	): Promise<Document<any, this, Metadata<any>>[]> {
		return super.updateEmbeddedDocuments(embeddedName, updates, context)
	}

	get sizeMod(): number {
		return 0
	}

	prepareDerivedData(): void {
		super.prepareDerivedData()
		// @ts-ignore until foundry types v10
		setProperty(this.flags, `${SYSTEM_NAME}.${ActorFlags.SelfModifiers}`, [])
		// @ts-ignore until foundry types v10
		setProperty(this.flags, `${SYSTEM_NAME}.${ActorFlags.TargetModifiers}`, [])

		const sizemod = this.sizeMod
		if (sizemod !== 0) {
			// @ts-ignore until foundry types v10
			this.flags[SYSTEM_NAME][ActorFlags.TargetModifiers].push({
				name: "for Size Modifier",
				modifier: sizemod,
				tags: [],
			})
		}
	}

	handleDamageDrop(payload: DamagePayload): void {
		let roll: DamageRoll = new DamageRollAdapter(payload)
		let target: DamageTarget = new DamageTargetActor(this)
		ApplyDamageDialog.create(roll, target).then(dialog => dialog.render(true))
	}

	createDamageTargetAdapter(): DamageTarget {
		return new DamageTargetActor(this)
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

	get name(): string {
		return this.actor.name ?? ""
	}

	get ST(): number {
		// @ts-ignore
		return this.actor.attributes.get("st")?.calc.value
	}

	get hitPoints(): HitPointsCalc {
		// @ts-ignore
		return this.actor.attributes.get("hp")?.calc
	}

	get hitLocationTable(): HitLocationTable {
		// @ts-ignore
		return this.actor.system.settings.body_type
	}

	/**
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

interface BaseActorGURPS extends Actor {
	// Readonly data: BaseActorDataGURPS;
	noPrepare: boolean
	deepItems: Collection<Item>
	attributes: Map<string, Attribute>
	traits: Collection<TraitGURPS | TraitContainerGURPS>
	// Temp
	system: ActorSystemData
	_source: BaseActorSourceGURPS
	_id: string
}

export { BaseActorGURPS }
