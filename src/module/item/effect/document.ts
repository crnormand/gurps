import { BaseFeature } from "@feature"
import { BaseItemGURPS } from "@item/base"
import { Feature } from "@module/config"
import { TokenGURPS } from "@module/token"
import { LocalizeGURPS } from "@util"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"
import { ItemDataBaseProperties, ItemDataConstructorData } from "types/foundry/common/data/data.mjs/itemData"
import { CombatData } from "types/foundry/common/data/module.mjs"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { PropertiesToSource } from "types/types/helperTypes"
import { DurationType, EffectModificationOptions, EffectSystemData } from "./data"

class EffectGURPS extends BaseItemGURPS {
	_statusId: string | null = null

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
		return game.combats?.get(this.system.duration!.combat) || null
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
		if (!data.system) return super._preCreate(data, options, user)
		if (!data.system?.duration?.combat && game.combat) data.system.duration.combat = game.combat!.id
		const combat = game.combat
		if (data.system?.duration?.combat) {
			if (data.system.duration.combat !== DurationType.None) {
				data.system.duration.startRound = combat?.round
				data.system.duration.startTurn = combat?.turn
			}
		}
		super._preCreate(data, options, user)
	}

	protected override _onCreate(data: this["_source"], options: DocumentModificationContext, userId: string): void {
		super._onCreate(data, options, userId)
		this._displayScrollingStatus(true)
		this._statusId = Object.values(CONFIG.specialStatusEffects).includes(this.system.id ?? "")
			? this.system.id
			: null
		if (this._statusId) this.#dispatchTokenStatusChange(this._statusId, true)
	}

	protected override _onDelete(options: DocumentModificationContext, userId: string): void {
		super._onDelete(options, userId)
		// If (game.combat?.started) {
		if (this.canLevel) this.system.levels!.current = 0
		this._displayScrollingStatus(false)
		if (this._statusId) this.#dispatchTokenStatusChange(this._statusId, false)
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
		if (valueChanged) {
			const change = newValue > priorValue
			this._displayScrollingStatus(change)
			// If (this._statusId) this.#dispatchTokenStatusChange(this._statusId, false);
		}
	}

	_displayScrollingStatus(enabled: boolean) {
		const actor = this.parent
		if (!actor) return
		const tokens = actor.isToken ? [actor.token?.object] : actor.getActiveTokens(true)
		let label = `${enabled ? "+" : "-"} ${this.name}`
		if (this.canLevel && this.level) label += ` ${this.level}`
		for (let t of tokens) {
			if (!t.visible || !t.renderable) continue
			;(canvas as any).interface.createScrollingText(t.center, label, {
				anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
				direction: enabled ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
				distance: 2 * t.h,
				fontSize: 28,
				stroke: 0x000000,
				strokeThickness: 4,
				jitter: 0.25,
			})
		}
	}

	#dispatchTokenStatusChange(statusId: string, active: boolean) {
		const tokens = this.parent.getActiveTokens()
		for (const token of tokens) token._onApplyStatusEffect(statusId, active)
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
						LocalizeGURPS.format(LocalizeGURPS.translations.gurps.combat.effect_expired, {
							effect: effect.name!,
						})
					)
				}
			}
		}
	}
}

interface EffectGURPS extends BaseItemGURPS {
	readonly system: EffectSystemData
}

export { EffectGURPS }
