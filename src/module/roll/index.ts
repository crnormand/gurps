import { ActorGURPS, CharacterGURPS } from "@actor"
import { ActorType } from "@actor/data"
import { DamageChat, DamagePayload } from "@module/damage_calculator/damage_chat_message"
import { RollModifier, RollType, SETTINGS, SYSTEM_NAME, UserFlags } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { i18n_f, toWord } from "@util"

enum RollSuccess {
	Success = "success",
	Failure = "failure",
	CriticalSuccess = "critical_success",
	CriticalFailure = "critical_failure",
}

const RollTemplate = {
	Skill: `systems/${SYSTEM_NAME}/templates/message/skill-roll.hbs`,
	Attack: `systems/${SYSTEM_NAME}/templates/message/attack-roll.hbs`,
	Damage: `systems/${SYSTEM_NAME}/templates/message/damage-roll.hbs`,
	Generic: `systems/${SYSTEM_NAME}/templates/message/generic-roll.hbs`,
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

	override async render(options: { flavor?: string; template?: string; isPrivate?: boolean }): Promise<string> {
		const template = options?.template ?? RollGURPS.CHAT_TEMPLATE
		const chatData = {
			formula: options.isPrivate ? "????" : this.formula,
			flavor: options.isPrivate ? null : options.flavor,
			user: (game as Game).userId,
			tooltip: options.isPrivate ? "" : await this.getTooltip(),
			total: options.isPrivate ? "?" : Math.round(this.total! * 100) / 100,
			usingMod: this.usingMod,
			modifiers: (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack),
			...this.system,
		}
		return renderTemplate(template, chatData)
	}

	override _prepareData(data: any) {
		let d: any = super._prepareData(data) ?? {}
		d.gmod = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal)
		if (!d.hasOwnProperty("gmodc"))
			Object.defineProperty(d, "gmodc", {
				get() {
					const mod = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal) as number
					;(game as any).ModifierButton.clear()
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
	static async handleRoll(
		user: StoredDocument<User> | null,
		actor: ActorGURPS | any,
		data: Record<string, any>
	): Promise<void> {
		const lastStack = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		const lastTotal = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal)
		await (game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.LastStack, lastStack)
		await (game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.LastTotal, lastTotal)
		let name = ""
		let rollData: any = {}
		if (actor?.type === ActorType.LegacyCharacter) return this.staticHandleRoll(user, actor, data)
		switch (data.type) {
			case RollType.Modifier:
				return this.addModifier(user, actor, data)
			case RollType.Attribute:
				// Name = `${data.item.formattedName}`;
				// rollData = await getRollData(user, actor, data, name, "3d6");
				return this.rollAttribute(user, actor, data, "3d6")
			case RollType.Skill:
			case RollType.SkillRelative:
			case RollType.Spell:
			case RollType.SpellRelative:
			case RollType.ControlRoll:
				name = `${data.item.formattedName}`
				rollData = await this.getRollData(user, actor, data, name, "3d6")
				return this.rollSkill(rollData)
			case RollType.Attack:
				name = `${data.weapon.name}${data.weapon.usage ? ` - ${data.weapon.usage}` : ""}`
				rollData = await this.getRollData(user, actor, data, name, "3d6")
				return this.rollAttack(rollData)
			case RollType.Damage:
				name = `${data.weapon.name}${data.weapon.usage ? ` - ${data.weapon.usage}` : ""}`
				// RollData = await getRollData(user, actor, data, name, "3d6")
				return this.rollDamage(user, actor, data)
			case RollType.Generic:
				return this.rollGeneric(user, data)
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
				return this.rollAttribute(user, actor, data, "3d6")
		}
	}

	/**
	 *
	 * @param user
	 * @param actor
	 * @param data
	 * @param name
	 * @param formula
	 */
	static async getRollData(
		user: StoredDocument<User> | null,
		actor: CharacterGURPS,
		data: { [key: string]: any },
		name: string,
		formula: string
	): Promise<any> {
		const roll = Roll.create(formula)
		await roll.evaluate({ async: true })
		const rolls = roll.dice[0].results.map(e => {
			return { result: e.result, word: toWord(e.result) }
		})
		let rollTotal = roll.total!
		const speaker = ChatMessage.getSpeaker({ actor: actor })

		/**
		 *
		 * @param data
		 */
		function getLevel(data: any): number {
			switch (data.type) {
				case RollType.Spell:
				case RollType.SpellRelative:
				case RollType.Skill:
				case RollType.SkillRelative:
					return parseInt(data.item.skillLevel) ?? 0
				case RollType.Attack:
					return data.weapon.skillLevel(false)
				case RollType.ControlRoll:
					return data.item.cr
				default:
					return 0
			}
		}
		const level = getLevel(data)

		const modifiers: Array<RollModifier & { class?: string }> = [
			...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
		]
		modifiers.forEach(m => {
			m.class = "zero"
			if (m.modifier > 0) m.class = "pos"
			if (m.modifier < 0) m.class = "neg"
		})
		let effective = ""
		const effectiveLevel = this.applyMods(level, user)
		if (effectiveLevel !== level)
			effective = `<div class="effective">${i18n_f("gurps.roll.effective_target", {
				level: effectiveLevel,
			})}</div>`
		const success = this.getSuccess(effectiveLevel, rollTotal)
		const margin = Math.abs(effectiveLevel - rollTotal)
		const marginMod: Partial<RollModifier> = {}
		let marginClass = ""
		let marginTemplate = "gurps.roll.just_made_it"
		if (margin > 0) marginTemplate = "gurps.roll.success_margin"
		else if (margin < 0) marginTemplate = "gurps.roll.failure_margin"
		if ([RollSuccess.CriticalSuccess, RollSuccess.Success].includes(success)) {
			marginMod.modifier = margin
			marginMod.name = i18n_f("gurps.roll.success_from", { from: name })
			marginClass = "pos"
		} else {
			marginMod.modifier = margin
			marginMod.name = i18n_f("gurps.roll.failure_from", { from: name })
			marginClass = "neg"
		}
		const marginText = `<div class="margin mod mod-${marginClass}" data-mod="${JSON.stringify(marginMod)}>${i18n_f(
			marginTemplate,
			{ margin: margin }
		)}</div>`

		return {
			user,
			actor,
			data,
			name,
			formula,
			roll,
			rollTotal,
			rolls,
			speaker,
			level,
			effective,
			modifiers,
			margin: marginText,
			tooltip: await roll.getTooltip(),
			// Margin,
			// marginMod,
			// marginClass,
		}
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
	 * Handles Skill Rolls
	 * @param user
	 * @param actor
	 * @param data
	 * @param formula
	 */
	static async rollAttribute(
		user: StoredDocument<User> | null,
		actor: ActorGURPS,
		data: any,
		formula: string
	): Promise<void> {
		const name = data.attribute.attribute_def.combinedName
		const roll = Roll.create(formula)
		await roll.evaluate({ async: true })
		const tooltip = await roll.getTooltip()
		const rolls = roll.dice[0].results.map(e => {
			return { result: e.result, word: toWord(e.result) }
		})
		let rollTotal = roll.total!
		const speaker = ChatMessage.getSpeaker({ actor: actor })

		const level = data.attribute.current

		const modifiers: Array<RollModifier & { class?: string }> = [
			...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
		]
		modifiers.forEach(m => {
			m.class = "zero"
			if (m.modifier > 0) m.class = "pos"
			if (m.modifier < 0) m.class = "neg"
		})
		let effective = ""
		const effectiveLevel = this.applyMods(level, user)
		if (effectiveLevel !== level)
			effective = `<div class="effective">${i18n_f("gurps.roll.effective_target", {
				level: effectiveLevel,
			})}</div>`
		const success = this.getSuccess(effectiveLevel, rollTotal)
		const margin = Math.abs(effectiveLevel - rollTotal)
		const marginMod: Partial<RollModifier> = {}
		let marginClass = ""
		let marginTemplate = "gurps.roll.just_made_it"
		if (margin > 0) marginTemplate = "gurps.roll.success_margin"
		else if (margin < 0) marginTemplate = "gurps.roll.failure_margin"
		if ([RollSuccess.CriticalSuccess, RollSuccess.Success].includes(success)) {
			marginMod.modifier = margin
			marginMod.name = i18n_f("gurps.roll.success_from", { from: name })
			marginClass = "pos"
		} else {
			marginMod.modifier = margin
			marginMod.name = i18n_f("gurps.roll.failure_from", { from: name })
			marginClass = "neg"
		}
		const marginText = `<div class="margin mod mod-${marginClass}" data-mod="${JSON.stringify(marginMod)}>${i18n_f(
			marginTemplate,
			{ margin: margin }
		)}</div>`

		const chatData: { [key: string]: any } = {
			data: data,
			name: name,
			success: this.getSuccess(effectiveLevel, rollTotal),
			total: rollTotal,
			level: level,
			effective: effective,
			margin: marginText,
			actor: actor,
			rolls: rolls,
			modifiers: modifiers,
			tooltip: tooltip,
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/attribute-roll.hbs`, chatData)

		const messageData = {
			user: user,
			speaker: speaker,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(roll),
			sound: CONFIG.sounds.dice,
		}
		ChatMessage.create(messageData, {})
		await this.resetMods(user)
	}

	/**
	 * Handles Skill Rolls
	 * @param {any} rollData
	 */
	static async rollSkill(rollData: any): Promise<void> {
		const chatData: { [key: string]: any } = {
			data: rollData.data,
			name: rollData.name,
			success: this.getSuccess(rollData.effectiveLevel, rollData.rollTotal),
			total: rollData.rollTotal,
			level: rollData.level,
			effective: rollData.effective,
			margin: rollData.margin,
			// MarginMod: rollData.marginMod,
			// marginClass: rollData.marginClass,
			actor: rollData.actor,
			item: rollData.data.item,
			rolls: rollData.rolls,
			modifiers: rollData.modifiers,
			tooltip: rollData.tooltip,
		}

		const message =
			chatData.data.type === RollType.ControlRoll
				? await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/cr-roll.hbs`, chatData)
				: await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/skill-roll.hbs`, chatData)

		const messageData = {
			user: rollData.user,
			speaker: rollData.speaker,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(rollData.roll),
			sound: CONFIG.sounds.dice,
		}
		ChatMessage.create(messageData, {})
		await this.resetMods(rollData.user)
	}

	/**
	 * Handle Attack Rolls.
	 * @param {any} rollData
	 */
	static async rollAttack(rollData: any): Promise<void> {
		// Set up Chat Data
		const chatData: { [key: string]: any } = {
			data: rollData.data,
			name: rollData.name,
			success: this.getSuccess(rollData.effectiveLevel, rollData.rollTotal),
			total: rollData.rollTotal,
			level: rollData.level,
			effective: rollData.effective,
			margin: rollData.margin,
			marginMod: rollData.marginMod,
			marginClass: rollData.marginClass,
			actor: rollData.actor,
			item: rollData.data.item,
			weapon: rollData.data.weapon,
			rolls: rollData.rolls,
			modifiers: rollData.modifiers,
			tooltip: rollData.tooltip,
			// Modifier: modifier,
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/attack-roll.hbs`, chatData)

		const messageData = {
			user: rollData.user,
			speaker: rollData.speaker,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(rollData.roll),
			sound: CONFIG.sounds.dice,
		}
		ChatMessage.create(messageData, {})
		await this.resetMods(rollData.user)
	}

	/**
	 * Handle Damage Rolls.
	 * @param {StoredDocument<User>} user
	 * @param {ActorGURPS} actor
	 */
	static async rollDamage(
		user: StoredDocument<User> | null,
		actor: ActorGURPS,
		data: { [key: string]: any }
	): Promise<void> {
		// Roll the damage for the weapon.
		const dice = new DiceGURPS(data.weapon.fastResolvedDamage)
		const roll = Roll.create(dice.toString(true))
		await roll.evaluate({ async: true })
		const tooltip = await roll.getTooltip()

		// Create an array suitable for drawing the dice on the ChatMessage.
		const rolls = roll.dice[0].results.map(e => {
			return { result: e.result, word: toWord(e.result) }
		})

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
		const modifierTotal = this.applyMods(0, user)
		const damage = rollTotal + modifierTotal
		const damageType = data.weapon.fastResolvedDamage.match(/\d*d?[+-]?\d*\s*(.*)/)[1] ?? ""

		const chatData: DamagePayload = {
			hitlocation: this.getHitLocationFromLastAttackRoll(actor),
			attacker: ChatMessage.getSpeaker({ actor: actor }),
			weapon: { itemUuid: `${data.item.uuid}`, weaponId: `${data.weapon.id}` },
			name: `${data.weapon.name}${data.weapon.usage ? ` – ${data.weapon.usage}` : ""}`,
			dice: dice,
			modifiers: modifiers,
			total: damage,
			damageType: damageType,
			rolls: rolls,
			modifierTotal: modifierTotal,
			tooltip: tooltip,
			// User,
			// actor,
			// data,
			// rolls,
			// damage,
			// damageType,
		}

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/damage-roll.hbs`, chatData)

		let messageData = {
			user: user,
			speaker: chatData.attacker,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(roll),
			sound: CONFIG.sounds.dice,
		}

		let userTarget = ""
		if ((game as Game).user?.targets.size) {
			userTarget = (game as Game).user?.targets.values().next().value
		}

		messageData = DamageChat.setTransferFlag(messageData, chatData, userTarget)

		ChatMessage.create(messageData, {})
	}

	/**
	 *
	 * @param user
	 * @param data
	 */
	static async rollGeneric(user: StoredDocument<User> | null, data: Record<string, any>): Promise<any> {
		// Const roll = Roll.create(data.formula)
		const dice = new DiceGURPS(data.formula)
		const roll = Roll.create(dice.toString(true))
		await roll.evaluate({ async: true })
		console.log(roll)

		// Create an array suitable for drawing the dice on the ChatMessage.
		const tooltip = await roll.getTooltip()

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
		const modifierTotal = this.applyMods(0, user)
		const finalTotal = rollTotal + modifierTotal

		console.log(rollTotal, modifierTotal, finalTotal)

		// ; (roll as RollGURPS).total += modifierTotal

		const chatData = {
			formula: roll.formula,
			dice: dice,
			modifiers: modifiers,
			total: finalTotal,
			// Rolls: rolls,
			// modifierTotal: modifierTotal,
			tooltip: tooltip,
		}

		// Const message = renderTemplate(`systems/${SYSTEM_NAME}/templates/message/generic-roll.hbs`, chatData)

		// let messageData: any = {
		// 	// user: user,
		// 	// name: roll.formula,
		// 	// speaker: chatData.attacker,
		// 	// type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		// 	content: message,
		// 	// roll: JSON.stringify(roll),
		// 	// sound: CONFIG.sounds.dice,
		// }
		// if (data.hidden) {
		// 	messageData.rollMode = CONST.DICE_ROLL_MODES.PRIVATE
		// 	messageData.whisper = [(game as Game).userId]
		// }

		const options: any = {}
		if (data.hidden) {
			options.rollMode = CONST.DICE_ROLL_MODES.PRIVATE
		}

		const messageData = {
			user: user,
			// Speaker: chatData.attacker,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			sound: CONFIG.sounds.dice,
			content: await renderTemplate(RollTemplate.Generic, chatData),
		}
		// Const messageData = {
		// 	user: rollData.user,
		// 	speaker: rollData.speaker,
		// 	type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		// 	content: message,
		// 	roll: JSON.stringify(rollData.roll),
		// 	sound: CONFIG.sounds.dice,
		// }

		// roll.toMessage({ content: roll.render({ template: RollTemplate.Generic }) }, options)
		// const cls = getDocumentClass("ChatMessage")
		// const msg = new cls(messageData)
		await this.resetMods(user)
		return ChatMessage.create(messageData, options)
		// Return cls.create(msg.toObject(), options)
	}

	/**
	 * Apply all modifiers to the level to get the effective level
	 * @param {number} level
	 * @param {StoredDocument<User>} user
	 * @returns {number}
	 */
	static applyMods(level: number, user: StoredDocument<User> | null): number {
		const modStack: RollModifier[] = (user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
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
