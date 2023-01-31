import { ActorGURPS } from "@actor"
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

	override async render(
		options: {
			flavor?: string,
			template: string,
			isPrivate: boolean
		} = {
				template: RollGURPS.CHAT_TEMPLATE,
				isPrivate: false

			}): Promise<string> {
		console.log(this.system)
		const chatData = mergeObject(
			{
				formula: options.isPrivate ? "????" : this.formula,
				flavor: options.isPrivate ? null : options.flavor,
				user: (game as Game).userId,
				tooltip: options.isPrivate ? "" : await this.getTooltip(),
				total: options.isPrivate ? "?" : Math.round(this.total! * 100) / 100,
			},
			this.system
		)
		console.log(chatData)
		return renderTemplate(options.template, chatData)
	}

	override _prepareData(data: any) {
		let d: any = super._prepareData(data) ?? {}
		d.gmod = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal)
		if (!d.hasOwnProperty("gmodc"))
			Object.defineProperty(d, "gmodc", {
				get() {
					const mod = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal) as number
						; (game as any).ModifierButton.clear()
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
					data.hidden
				)
			case RollType.Skill:
			case RollType.SkillRelative:
			case RollType.Spell:
			case RollType.SpellRelative:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.item.skillLevel,
					"3d6",
					data.item.formattedName,
					RollType.Skill,
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
					data.hidden
				)
			case RollType.Attack:
				return RollGURPS.rollAgainst(
					user,
					actor,
					data.weapon.skillLevel(null),
					"3d6",
					`${data.weapon.name}${data.weapon.usage ? ` - ${data.weapon.usage}` : ""}`,
					RollType.Attack,
					data.hidden
				)
			case RollType.Damage:
				return this.rollDamage(
					user,
					actor,
					data,
					`${data.weapon.name}${data.weapon.usage ? ` - ${data.weapon.usage}` : ""}`,
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
		console.log(marginMod)
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
		actor: ActorGURPS,
		level: number,
		formula: string,
		name: string,
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

		const effectiveLevel = this.applyMods(level, modifiers)

		const roll = Roll.create(formula) as RollGURPS
		await roll.evaluate({ async: true })
		const [success, margin] = this.getMargin(name, effectiveLevel, roll.total!)

		let effectiveTemplate = "gurps.roll.effective_skill"
		if (type === RollType.Attribute) effectiveTemplate = "gurps.roll.effective_target"

		let displayName = i18n_f("gurps.roll.skill_level", { name, level })
		if (type === RollType.ControlRoll) displayName = i18n_f("gurps.roll.cr_level", { name, level })

		const chatData = {
			name,
			displayName,
			level,
			modifiers,
			success,
			margin,
			type,
			total: roll.total!,
			tooltip: await roll.getTooltip(),
			effective: `<div class="effective">${i18n_f(effectiveTemplate, {
				level: effectiveLevel,
			})}</div>`,
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/roll-against.hbs`, chatData)

		const messageData: any = {
			user: user,
			speaker: actor.id,
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
			const button = (game as any).ModifierButton
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
		return (game as any).ModifierButton.window.addModifier(mod)
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
		// Roll the damage for the weapon.
		const dice = new DiceGURPS(data.weapon.fastResolvedDamage)
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
		const damageType = data.weapon.fastResolvedDamage.match(/\d*d?[+-]?\d*\s*(.*)/)[1] ?? ""

		// @ts-ignore
		const chatData: DamagePayload = {
			hitlocation: this.getHitLocationFromLastAttackRoll(actor),
			attacker: ChatMessage.getSpeaker({ actor: actor }),
			weapon: { itemUuid: `${data.item.uuid}`, weaponId: `${data.weapon.id}` },
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
		if ((game as Game).user?.targets.size) {
			userTarget = (game as Game).user?.targets.values().next().value
		}

		messageData = DamageChat.setTransferFlag(messageData, chatData, userTarget)

		await ChatMessage.create(messageData, {})
		await this.resetMods(user)
	}

	/**
	 *
	 * @param user
	 * @param data
	 * @param actor
	 * @param formula
	 * @param type
	 * @param hidden
	 */
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
			speaker: actor.id,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(roll),
			sound: CONFIG.sounds.dice,
		}
		if (hidden) messageData.rollMode = CONST.DICE_ROLL_MODES.PRIVATE

		await ChatMessage.create(messageData, {})
		await this.resetMods(user)
	}

	static applyMods(level: number, modStack: RollModifier[]): number {
		// Const modStack: RollModifier[] = (user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
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
	 * @param actor
	 * @param _actor
	 */
	static getHitLocationFromLastAttackRoll(_actor: ActorGURPS): string {
		return (game as Game).settings.get(SYSTEM_NAME, SETTINGS.DEFAULT_DAMAGE_LOCATION) as string
	}
}
