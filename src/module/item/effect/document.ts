import { BaseFeature } from "@feature"
import { BaseItemGURPS } from "@item/base"
import { Feature } from "@module/config"
import { TokenGURPS } from "@module/token"
import { i18n } from "@util"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"
import { ItemDataBaseProperties, ItemDataConstructorData } from "types/foundry/common/data/data.mjs/itemData"
import { CombatData } from "types/foundry/common/data/module.mjs"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { PropertiesToSource } from "types/types/helperTypes"
import { DurationType, EffectSystemData } from "./data"

class EffectGURPS extends BaseItemGURPS {
	get features(): Feature[] {
		if (this.system.hasOwnProperty("features")) {
			return (this.system as any).features.map(
				(e: Partial<Feature>) => new BaseFeature({ ...e, parent: this.uuid, item: this })
			)
		}
		return []
	}

	get combat(): Combat | null {
		if (!this.system.duration?.combat) return null
		return (game as Game).combats?.get(this.system.duration!.combat) || null
	}

	get duration(): { remaining: number; type: DurationType; total: number } {
		if (!this.combat || !this.system.duration || this.system.duration.type === DurationType.None)
			return { remaining: 0, type: DurationType.None, total: 0 }
		let total = 0
		let remaining = 0
		if (this.system.duration.type === DurationType.Turns) {
			total = this.system.duration.turns || 0
			remaining = total + (this.system.duration.startTurn || 0) - (this.combat.turn || 0)
		}
		if (this.system.duration.type === DurationType.Rounds) {
			total = this.system.duration.rounds || 0
			remaining = total + (this.system.duration.startRound || 0) - this.combat.round
		}
		return {
			type: this.system.duration.type,
			total,
			remaining,
		}
	}

	get isExpired(): boolean {
		if (this.duration.type === DurationType.None) return false
		return this.duration.remaining >= 0
	}

	get level(): number {
		return this.system.levels?.current || 0
	}

	get maxLevel(): number {
		return this.system.levels?.max || 0
	}

	get canLevel(): boolean {
		return this.system.can_level
	}

	async updateLevel(level: number): Promise<this | undefined> {
		if (!this.canLevel) return
		if (level > this.maxLevel) return
		if (level < 0) return
		return this.update({ "system.level.current": level })
	}

	protected async _preCreate(data: any, options: DocumentModificationOptions, user: BaseUser): Promise<void> {
		if (!data.system.duration.combat && (game as Game).combat)
			data.system.duration.combat = (game as Game).combat!.id
		const combat = (game as Game).combat
		if (data.system.duration.combat) {
			if (data.system.duration.combat !== DurationType.None) {
				data.system.duration.startRound = combat?.round
				data.system.duration.startTurn = combat?.turn
			}
		}
		super._preCreate(data, options, user)
	}

	protected override _onCreate(data: this["_source"], options: DocumentModificationContext, userId: string): void {
		super._onCreate(data, options, userId)

		// If (!this.flags[SYSTEM_NAME]?.aura || (game as Game).combat?.started) {
		// if ((game as Game).combat?.started) {
		;(this.actor?.getActiveTokens().shift() as TokenGURPS)?.showFloatyText({ create: this })
		// }
	}

	/**
	 * Show floaty text when this effect is deleted from an actor
	 * @param options
	 * @param userId
	 */
	protected override _onDelete(options: DocumentModificationContext, userId: string): void {
		super._onDelete(options, userId)
		// If ((game as Game).combat?.started) {
		if (this.canLevel) this.system.levels!.current = 0
		;(this.actor?.getActiveTokens().shift() as TokenGURPS)?.showFloatyText({ delete: this })
		// }
	}

	protected _preUpdate(
		changed: DeepPartial<ItemDataConstructorData>,
		options: EffectModificationOptions,
		user: BaseUser
	): Promise<void> {
		options.previousLevel = this.level
		return super._preUpdate(changed, options, user)
	}

	protected _onUpdate(
		changed: DeepPartial<PropertiesToSource<ItemDataBaseProperties>>,
		options: EffectModificationOptions,
		userId: string
	): void {
		super._onUpdate(changed, options, userId)

		const [priorValue, newValue] = [options.previousLevel, this.level]
		const valueChanged = !!priorValue && !!newValue && priorValue !== newValue
		// Suppress floaty text on "linked" conditions
		if (valueChanged) {
			const change = newValue > priorValue ? { create: this } : { delete: this }
			;(this.actor?.getActiveTokens().shift() as TokenGURPS)?.showFloatyText(change)
		}
	}

	static async updateCombat(combat: Combat, _data: CombatData, _options: any, _userId: string) {
		const previous = combat.previous
		if (!previous.tokenId) return
		const token = canvas?.tokens?.get(previous.tokenId) as TokenGURPS
		if (token?.actor) {
			for (const effect of token.actor.gEffects) {
				if (effect.isExpired) {
					await effect.delete()
					ui?.notifications?.info(
						`${i18n("GURPS.effectExpired", "Effect has expired: ")} '[${i18n(effect.name!)}]'`
					)
				}
			}
		}
	}
}

interface EffectGURPS extends BaseItemGURPS {
	readonly system: EffectSystemData
}

interface EffectModificationOptions extends DocumentModificationOptions {
	previousLevel: number
}

export { EffectGURPS }
