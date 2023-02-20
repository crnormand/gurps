import { CharacterGURPS } from "@actor"
import { SkillGURPS, TechniqueGURPS } from "@item"
import { Attribute } from "@module/attribute"
import { ActorGURPS, ItemGURPS } from "@module/config"
import { DamageChat, DamagePayload } from "@module/damage_calculator/damage_chat_message"
import { RollModifier, RollType, SETTINGS, SYSTEM_NAME, UserFlags } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { i18n_f } from "@util"

enum RollSuccess {
	Success = "success",
	Failure = "failure",
	CriticalSuccess = "critical_success",
	CriticalFailure = "critical_failure",
}

export class RollGURPS extends Roll {
	originalFormula = ""

	usingMod = false

	system: Record<string, any> = {}

	static override CHAT_TEMPLATE = `systems/${SYSTEM_NAME}/templates/dice/roll.hbs`

	static override TOOLTIP_TEMPLATE = `systems/${SYSTEM_NAME}/templates/dice/tooltip.hbs`

	constructor(formula: string, data: any, options?: any) {
		const originalFormula = formula
		formula = formula.replace(/([0-9]+)[dD]([\D])/g, "$1d6$2")
		formula = formula.replace(/([0-9]+)[dD]$/g, "$1d6")
		super(formula, data, options)

		this.usingMod = formula.includes("@gmod")
		this.originalFormula = originalFormula
	}

	get formula() {
		return this.originalFormula
			.replace(/d6/g, "d")
			.replace(/\*/g, "x")
			.replace(/\+\s*@gmod[c]?/g, "")
			.trim()
	}

	static override replaceFormulaData(
		formula: string,
		data: any,
		options?: {
			missing: string
			warn: boolean
		}
	): string {
		let dataRgx = new RegExp(/\$([a-z.0-9_-]+)/gi)
		const newFormula = formula.replace(dataRgx, (match, term) => {
			if (data.actor) {
				let value: any = (data.actor as CharacterGURPS).resolveVariable(term.replace("$", "")) ?? null
				if (value === null) {
					if (options?.warn && ui.notifications)
						ui.notifications.warn(game.i18n.format("DICE.WarnMissingData", { match }))
					return options?.missing !== undefined ? String(options.missing) : match
				}
				return String(value).trim()
			}
			return ""
		})
		return super.replaceFormulaData(newFormula, data, options)
	}

	override _prepareData(data: any) {
		let d: any = super._prepareData(data) ?? {}
		d.gmod = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal)
		if (!d.hasOwnProperty("gmodc"))
			Object.defineProperty(d, "gmodc", {
				get() {
					const mod = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal) as number
					game.ModifierButton.clear()
					return mod
				},
			})
		return d
	}

	/**
	 * Master function to handle various types of roll
	 * @param {StoredDocument<User>} user
	 * @param {ActorGURPS} actor
	 * @param data
	 */
	static async handleRoll(user: StoredDocument<User> | null, actor: ActorGURPS | any, data: any): Promise<void> {
		const lastStack = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		const lastTotal = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal)
		await user?.setFlag(SYSTEM_NAME, UserFlags.LastStack, lastStack)
		await user?.setFlag(SYSTEM_NAME, UserFlags.LastTotal, lastTotal)

		switch (data.type) {
			case RollType.Modifier:
				return this.addModifier(user, actor, data)
			case RollType.Attribute:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.attribute.effective,
					"3d6",
					data.attribute.attribute_def.combinedName,
					RollType.Attribute,
					data.attribute,
					data.hidden
				)
			case RollType.Skill:
			case RollType.SkillRelative:
			case RollType.Spell:
			case RollType.SpellRelative:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.item.effectiveLevel,
					"3d6",
					data.item.formattedName,
					RollType.Skill,
					data.item,
					data.hidden
				)
			case RollType.ControlRoll:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.item.skillLevel,
					"3d6",
					data.item.formattedName,
					RollType.ControlRoll,
					data.item,
					data.hidden
				)
			case RollType.Attack:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.item.skillLevel(null),
					"3d6",
					`${data.item.itemName}${data.item.usage ? ` - ${data.item.usage}` : ""}`,
					RollType.Attack,
					data.item,
					data.hidden
				)
			case RollType.Damage:
				return this.rollDamage(
					user,
					actor,
					data,
					`${data.item.itemName}${data.item.usage ? ` - ${data.item.usage}` : ""}`,
					data.hidden
				)
			case RollType.Generic:
				return this.rollGeneric(user, actor, data.formula, RollType.Generic, data.hidden)
		}
	}

	/**
	 *
	 * @param user
	 * @param actor
	 * @param data
	 */
	static async staticHandleRoll(
		user: StoredDocument<User> | null,
		actor: ActorGURPS | any,
		data: Record<string, any>
	): Promise<void> {
		switch (data.type) {
			case RollType.Modifier:
				return this.addModifier(user, actor, data)
			case RollType.Attribute:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.attribute.current,
					"3d6",
					data.attribute.attribute_def.combinedName,
					RollType.Attribute,
					data.hidden
				)
		}
	}

	static getMargin(name: string, level: number, roll: number): [RollSuccess, string] {
		const success = this.getSuccess(level, roll)
		const margin = Math.abs(level - roll)
		const marginMod: Partial<RollModifier> = { modifier: margin }
		marginMod.name = i18n_f("gurps.roll.success_from", { from: name })
		let marginClass = "zero"
		let marginTemplate = "gurps.roll.just_made_it"
		if ([RollSuccess.Failure, RollSuccess.CriticalFailure].includes(success)) {
			marginTemplate = "gurps.roll.failure_margin"
			marginClass = "neg"
			marginMod.name = i18n_f("gurps.roll.failure_from", { from: name })
			marginMod.modifier = -margin
		} else if (margin > 0) {
			marginTemplate = "gurps.roll.success_margin"
			marginClass = "pos"
		}
		return [
			success,
			`<div
			class="margin mod mod-${marginClass}"
			data-mod='${JSON.stringify(marginMod)}'
			>${i18n_f(marginTemplate, { margin: margin })}</div>`,
		]
	}

	static async rollAgainst(
		user: StoredDocument<User> | null,
		actor: CharacterGURPS,
		level: number,
		formula: string,
		name: string,
		type: RollType,
		item?: ItemGURPS | Attribute | null,
		hidden = false
	): Promise<any> {
		// Create an array of Modifiers suitable for display.
		const modifiers: Array<RollModifier & { class?: string }> = [
			...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
		]
		const encumbrance = actor.encumbranceLevel(true)
		if (item instanceof SkillGURPS && item.encumbrancePenaltyMultiplier && encumbrance.level > 0) {
			modifiers.unshift({
				name: i18n_f("gurps.roll.encumbrance", { name: encumbrance.name }),
				modifier: encumbrance.penalty,
			})
			level -= encumbrance.penalty
		}
		modifiers.forEach(m => {
			m.class = "zero"
			if (m.modifier > 0) m.class = "pos"
			if (m.modifier < 0) m.class = "neg"
		})

		const effectiveLevel = this.applyMods(level, modifiers)

		const roll = Roll.create(formula) as RollGURPS
		await roll.evaluate({ async: true })
		const [success, margin] = this.getMargin(name, effectiveLevel, roll.total!)

		let effectiveTemplate = "gurps.roll.effective_skill"
		if (type === RollType.Attribute) effectiveTemplate = "gurps.roll.effective_target"

		let displayName = i18n_f("gurps.roll.skill_level", { name, level })
		if (type === RollType.ControlRoll) displayName = i18n_f("gurps.roll.cr_level", { name, level })

		let itemData: any = {}
		if (item instanceof SkillGURPS || item instanceof TechniqueGURPS) {
			itemData = { name: item.name, specialization: item.specialization }
			if (item.dummyActor && item.defaultedFrom) {
				itemData.default = `${item.defaultedFrom.fullName(actor as any)}`
				const modifier =
					(item.defaultedFrom.modifier < 0 ? " - " : " + ") + Math.abs(item.defaultedFrom.modifier)
				itemData.default += modifier
			}
		}

		const effective = `<div class="effective">${i18n_f(effectiveTemplate, {
			level: effectiveLevel,
		})}</div>`

		console.log(effective)

		const chatData = {
			name,
			displayName,
			level,
			modifiers,
			success,
			margin,
			type,
			encumbrance,
			item: itemData,
			total: roll.total!,
			tooltip: await roll.getTooltip(),
			eff: `<div class="effective">${i18n_f(effectiveTemplate, {
				level: effectiveLevel,
			})}</div>`,
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/roll-against.hbs`, chatData)

		const messageData: any = {
			user: user,
			speaker: { actor: actor.id },
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(roll),
			sound: CONFIG.sounds.dice,
		}
		if (hidden) messageData.rollMode = CONST.DICE_ROLL_MODES.PRIVATE

		await ChatMessage.create(messageData, {})
		await this.resetMods(user)
	}

	/**
	 *
	 * @param user
	 */
	static async resetMods(user: StoredDocument<User> | null) {
		if (!user) return
		const sticky = user.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky)
		if (sticky === false) {
			await user.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, [])
			await user.setFlag(SYSTEM_NAME, UserFlags.ModifierTotal, 0)
			const button = game.ModifierButton
			return button.render()
		}
	}

	/**
	 * Handle adding modifiers via OTF
	 * @param {StoredDocument<User>} user
	 * @param {ActorGURPS} _actor
	 */
	static addModifier(user: StoredDocument<User> | null, _actor: ActorGURPS, data: { [key: string]: any }) {
		if (!user) return
		const mod: RollModifier = {
			name: data.comment,
			modifier: data.modifier,
			tags: [],
		}
		return game.ModifierButton.window.addModifier(mod)
	}

	/**
	 * Handle Damage Rolls.
	 * @param {StoredDocument<User>} user
	 * @param {ActorGURPS} actor
	 * @param data
	 * @param name
	 * @param hidden
	 */
	static async rollDamage(
		user: StoredDocument<User> | null,
		actor: ActorGURPS,
		data: Record<string, any>,
		name: string,
		hidden = false
	): Promise<void> {
		// Roll the damage for the attack.
		const dice = new DiceGURPS(data.item.fastResolvedDamage)
		const roll = Roll.create(dice.toString(true))
		await roll.evaluate({ async: true })

		// Create an array of Modifiers suitable for display.
		const modifiers: Array<RollModifier & { class?: string }> = [
			...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
		]
		modifiers.forEach(m => {
			m.class = "zero"
			if (m.modifier > 0) m.class = "pos"
			if (m.modifier < 0) m.class = "neg"
		})

		const rollTotal = roll.total!
		const modifierTotal = this.applyMods(0, modifiers)
		const damage = rollTotal + modifierTotal
		const damageType = data.item.fastResolvedDamage.match(/\d*d?[+-]?\d*\s*(.*)/)[1] ?? ""

		const chatData: Partial<DamagePayload> = {
			hitlocation: this.getHitLocationFromLastAttackRoll(actor),
			attacker: ChatMessage.getSpeaker({ actor: actor }),
			weaponID: `${data.item.system.id}`,
			name,
			dice: dice,
			modifiers: modifiers,
			total: damage,
			tooltip: await roll.getTooltip(),
			damageType: damageType,
			modifierTotal: modifierTotal,
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/damage-roll.hbs`, chatData)

		let messageData: any = {
			user: user,
			speaker: chatData.attacker,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(roll),
			sound: CONFIG.sounds.dice,
		}
		if (hidden) messageData.rollMode = CONST.DICE_ROLL_MODES.PRIVATE

		let userTarget = ""
		if (game.user?.targets.size) {
			userTarget = game.user?.targets.values().next().value
		}

		messageData = DamageChat.setTransferFlag(messageData, chatData, userTarget)

		await ChatMessage.create(messageData, {})
		await this.resetMods(user)
	}

	static async rollGeneric(
		user: StoredDocument<User> | null,
		actor: ActorGURPS,
		formula: string,
		type: RollType,
		hidden = false
	): Promise<any> {
		// Create an array of Modifiers suitable for display.
		const modifiers: Array<RollModifier & { class?: string }> = [
			...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
		]
		modifiers.forEach(m => {
			m.class = "zero"
			if (m.modifier > 0) m.class = "pos"
			if (m.modifier < 0) m.class = "neg"
		})

		const roll = Roll.create(formula) as RollGURPS
		await roll.evaluate({ async: true })

		const total = this.applyMods(roll.total!, modifiers)

		const chatData = {
			formula,
			name: roll.formula,
			total,
			modifiers,
			type,
			tooltip: await roll.getTooltip(),
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/generic-roll.hbs`, chatData)

		const messageData: any = {
			user: user,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(roll),
			sound: CONFIG.sounds.dice,
		}
		if (actor) messageData.speaker.actor = actor
		if (hidden) messageData.rollMode = CONST.DICE_ROLL_MODES.PRIVATE

		await ChatMessage.create(messageData, {})
		await this.resetMods(user)
	}

	static applyMods(level: number, modStack: RollModifier[]): number {
		let effectiveLevel = level
		modStack.forEach(m => {
			effectiveLevel += m.modifier
		})
		return effectiveLevel
	}

	// TODO: change from string to enum
	/**
	 * Check to see if the roll succeeded, and return the type of success/failure (normal/critical).
	 * @param {number} level
	 * @param {number} rollTotal
	 * @returns {RollSuccess}
	 */
	static getSuccess(level: number, rollTotal: number): RollSuccess {
		if (rollTotal === 18) return RollSuccess.CriticalFailure
		if (rollTotal <= 4) return RollSuccess.CriticalSuccess
		if (level >= 15 && rollTotal <= 5) return RollSuccess.CriticalSuccess
		if (level >= 16 && rollTotal <= 6) return RollSuccess.CriticalSuccess
		if (level <= 15 && rollTotal === 17) return RollSuccess.CriticalFailure
		if (rollTotal - level >= 10) return RollSuccess.CriticalFailure
		if (level >= rollTotal) return RollSuccess.Success
		return RollSuccess.Failure
	}

	/**
	 * Determine Hit Location. In the future, the Attack roll (above) should be able to determine if there is a modifier
	 * for hit location. If there is, use that. Otherwise go to the world settings to determine the default damage
	 * location. (Or, eventually, we could ask the target for it's default hit location...).
	 *
	 * @param _actor
	 */
	static getHitLocationFromLastAttackRoll(_actor: ActorGURPS): string {
		return game.settings.get(SYSTEM_NAME, SETTINGS.DEFAULT_DAMAGE_LOCATION) as string
	}
}
