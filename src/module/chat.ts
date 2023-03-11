import { LastActor, LocalizeGURPS } from "@util"
import { gid, RollModifier, RollType } from "./data"
import { RollGURPS } from "@module/roll"
import { ActorGURPS } from "./config"
import { CharacterGURPS } from "@actor"

/**
 *
 * @param command
 * @param matches
 * @param chatData
 * @param createOptions
 */
export async function _processDiceCommand(
	command: string,
	matches: RegExpMatchArray[],
	chatData: any,
	createOptions: any
): Promise<void> {
	const actor = ChatMessage.getSpeakerActor(chatData.speaker) || game.user?.character
	const rollData: any = actor ? actor.getRollData() : {}
	const rolls = []
	for (const match of matches) {
		if (!match) continue
		const [formula, flavor] = match.slice(2, 4)
		if (flavor && !chatData.flavor) chatData.flavor = flavor
		const roll = Roll.create(formula, rollData)
		await roll.evaluate({ async: true })
		rolls.push(roll)
	}
	chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL
	chatData.rolls = rolls
	chatData.sound = CONFIG.sounds.dice
	chatData.content = rolls.reduce((t, r) => t + r.total!, 0)
	createOptions.rollMode = command
}

/**
 *
 * @param html
 */
export function addChatListeners(html: JQuery<HTMLElement>): void {
	html.find(".rollable").on("click", event => _onRollClick(event))
	html.find(".rollable.damage").on("click", event => _onDamageRoll(event))
	html.find(".rollable").on("mouseover", event => _onRollableHover(event, true))
	html.find(".rollable").on("mouseout", event => _onRollableHover(event, false))
	html.find(".mod").on("click", event => _onModClick(event))
	html.find(".mod").on("contextmenu", event => _onModRClick(event))
}

/**
 *
 * @param event
 */
async function _onModClick(event: JQuery.ClickEvent): Promise<void> {
	event.preventDefault()
	event.stopPropagation()
	const mod: RollModifier = $(event.currentTarget).data("mod")
	return game.ModifierButton.window.addModifier(mod)
}

/**
 *
 * @param event
 */
async function _onModRClick(event: JQuery.ContextMenuEvent): Promise<void> {
	event.preventDefault()
	event.stopPropagation()
	const mod: RollModifier = duplicate($(event.currentTarget).data("mod"))
	mod.modifier = -mod.modifier
	return game.ModifierButton.window.addModifier(mod)
}

/**
 *
 * @param event
 */
async function _onRollClick(event: JQuery.ClickEvent) {
	event.preventDefault()
	event.stopPropagation()
	const type: RollType = $(event.currentTarget).data("type")
	const data: Record<string, any> = { type: type, hidden: event.ctrlKey }
	const actor: ActorGURPS | null = await LastActor.get()

	if (type === RollType.Attribute) {
		const id = $(event.currentTarget).data("id")
		if (id === gid.Dodge) data.attribute = actor?.dodgeAttribute
		// Else if (id === gid.SizeModifier) data.attribute = this.actor.sizeModAttribute
		else data.attribute = actor?.attributes.get(id)
	} else if (
		[
			// RollType.Damage,
			// RollType.Attack,
			RollType.Skill,
			RollType.SkillRelative,
			// RollType.Spell,
			// RollType.SpellRelative,
			// RollType.ControlRoll,
		].includes(type)
	) {
		if (actor instanceof CharacterGURPS) {
			const itemData = $(event.currentTarget).data("json")
			// Const skill = new BaseItemGURPS(json) as SkillGURPS | TechniqueGURPS

			// Grab best skill or default
			data.item = actor.bestSkillNamed(itemData.name!, itemData.specialization || "", false, null)

			// Update level at least once to calculate default level
			data.item?.updateLevel()
			if (!data.item || data.item.effectiveLevel === -Infinity) {
				ui.notifications?.warn(LocalizeGURPS.translations.gurps.notification.no_default_skill)
				return
			}
		}
	}
	if (type === RollType.Modifier) {
		data.modifier = $(event.currentTarget).data("modifier")
		data.comment = $(event.currentTarget).data("comment")
	}
	return RollGURPS.handleRoll(game.user, actor, data)
	// If (
	// 	[
	// 		// RollType.Damage,
	// 		// RollType.Attack,
	// 		RollType.Skill,
	// 		// RollType.SkillRelative,
	// 		// RollType.Spell,
	// 		// RollType.SpellRelative,
	// 	].includes(type)
	// ) {
	// 	const item = await fromUuid($(event.currentTarget).data("uuid"))
	// 	const name = item?.name
	// 	const specialization = item instanceof SkillGURPS ? item.specialization : ""
	// 	data.item = character.bestSkillNamed(name, specialization, false, null)
	// }
	// // Data.item = this.actor.deepItems.get($(event.currentTarget).data("item-id"));
	// if ([RollType.Damage, RollType.Attack].includes(type)) {
	// 	const item = await fromUuid($(event.currentTarget).data("uuid"))
	// 	const weapon = (item as any)?.weapons.get($(event.currentTarget).data("weapon"))
	// 	data.weapon = character.bestWeaponNamed(item?.name, weapon.usage, weapon.type, null)
	// }
	// if ([RollType.Attribute].includes(type)) {
	// 	const id = $(event.currentTarget).data("id")
	// 	let attribute: any = null
	// 	if (id === gid.Dodge) attribute = character.dodgeAttribute
	// 	else attribute = character.attributes.get(id)
	// 	data.attribute = attribute
	// }
	// if ([RollType.Generic].includes(type)) {
	// 	data.formula = $(event.currentTarget).data("formula")
	// 	// Const mods = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as any[]
	// 	// if (mods.length) data.formula += "+ @gmd"
	// }
	// // If (type === RollType.Modifier) {
	// // 	data.modifier = $(event.currentTarget).data("modifier");
	// // 	data.comment = $(event.currentTarget).data("comment");
	// // }

	// TODO: change to GURPS.LastActor
	// return RollGURPS.handleRoll(game.user, character, data)
}

/**
 *
 * @param event
 */
async function _onDamageRoll(event: JQuery.ClickEvent) {
	event.preventDefault()
	event.stopPropagation()
	const actor = game.actors!.get($(event.currentTarget).data("actorId")) as ActorGURPS
	const type: RollType = $(event.currentTarget).data("type")
	const data: { [key: string]: any } = { type: type }
	if (
		[
			RollType.Damage,
			RollType.Attack,
			RollType.Skill,
			RollType.SkillRelative,
			RollType.Spell,
			RollType.SpellRelative,
		].includes(type)
	)
		data.item = actor!.deepItems.get($(event.currentTarget).data("item-id"))
	if ([RollType.Damage, RollType.Attack].includes(type))
		data.weapon = data.item.weapons.get($(event.currentTarget).data("attack-id"))
	if (type === RollType.Modifier) {
		data.modifier = $(event.currentTarget).data("modifier")
		data.comment = $(event.currentTarget).data("comment")
	}
	return RollGURPS.handleRoll(game.user, actor, data)
}

/**
 *
 * @param event
 * @param hover
 */
async function _onRollableHover(event: JQuery.MouseOverEvent | JQuery.MouseOutEvent, hover: boolean) {
	event.preventDefault()
	if (hover) event.currentTarget.classList.add("hover")
	else event.currentTarget.classList.remove("hover")
}
