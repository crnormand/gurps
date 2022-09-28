import { ActorDataGURPS, ActorSourceGURPS } from "@actor/data"
import {
	Context,
	DocumentModificationOptions,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs"
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData"
import { BaseUser } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs"
import { SYSTEM_NAME } from "@module/settings"
import { ContainerGURPS, ItemGURPS } from "@item"
import { ActorFlags, ActorSystemData, BaseActorSourceGURPS } from "./data"
// Import { MergeObjectOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/utils/helpers.mjs"

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
		} else {
			mergeObject(context, { gurps: { ready: true } })
			const ActorConstructor = (CONFIG as any).GURPS.Actor.documentClasses[data.type]
			return ActorConstructor ? new ActorConstructor(data, context) : new BaseActorGURPS(data, context)
		}
	}

	// Update(
	// 	data?: DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)> | undefined,
	// 	context?: (DocumentModificationContext & MergeObjectOptions) | undefined
	// ): Promise<this | undefined> {
	// 	console.log(data, context)
	// 	return super.update(data, context)
	// }

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

	get deepItems(): Collection<ItemGURPS> {
		const deepItems: ItemGURPS[] = []
		for (const item of this.items as any as Collection<ItemGURPS>) {
			deepItems.push(item)
			if (item instanceof ContainerGURPS)
				for (const i of item.deepItems) {
					deepItems.push(i)
				}
		}
		return new Collection(
			deepItems.map(e => {
				return [e.id!, e]
			})
		)
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
}

interface BaseActorGURPS extends Actor {
	// Readonly data: BaseActorDataGURPS;
	deepItems: Collection<ItemGURPS>
	// Temp
	system: ActorSystemData
	_source: BaseActorSourceGURPS
	_id: string
}

export { BaseActorGURPS }