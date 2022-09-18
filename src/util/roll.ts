import { ActorGURPS, CharacterGURPS } from "@actor";
import { RollModifier, RollType, UserFlags } from "@module/data";
import { DiceGURPS } from "@module/dice";
import { GURPS } from "@module/gurps";
import { SYSTEM_NAME } from "@module/settings";
import { i18n_f, toWord } from "./misc";

/**
 * Master function to handle various types of roll
 * @param {StoredDocument<User>} user
 * @param {ActorGURPS} actor
 */
export async function handleRoll(
	user: StoredDocument<User> | null,
	actor: ActorGURPS | any,
	data: { [key: string]: any }
): Promise<void> {
	// Console.log(user, actor, data);
	let name = "";
	let rollData: any = {};
	switch (data.type) {
		case RollType.Modifier:
			return addModifier(user, actor, data);
		case RollType.Attribute:
			// Name = `${data.item.formattedName}`;
			// rollData = await getRollData(user, actor, data, name, "3d6");
			return rollAttribute(user, actor, data, "3d6");
		case RollType.Skill:
		case RollType.SkillRelative:
		case RollType.Spell:
		case RollType.SpellRelative:
			// Console.log(data);
			name = `${data.item.formattedName}`;
			rollData = await getRollData(user, actor, data, name, "3d6");
			return rollSkill(rollData);
		case RollType.Attack:
			console.log(data);
			name = `${data.weapon.name}${data.weapon.usage ? ` - ${data.weapon.usage}` : ""}`;
			rollData = await getRollData(user, actor, data, name, "3d6");
			return rollAttack(rollData);
		case RollType.Damage:
			return rollDamage(user, actor, data);
	}
	if (data.type === RollType.Modifier) addModifier(user, actor, data);
}

/**
 *
 * @param user
 * @param actor
 * @param name
 * @param formula
 */
async function getRollData(
	user: StoredDocument<User> | null,
	actor: CharacterGURPS,
	data: { [key: string]: any },
	name: string,
	formula: string
): Promise<any> {
	console.log(data);
	const roll = Roll.create(formula);
	await roll.evaluate({ async: true });
	const rolls = roll.dice[0].results.map(e => {
		return { result: e.result, word: toWord(e.result) };
	});
	let rollTotal = roll.total!;
	const speaker = ChatMessage.getSpeaker({ actor: actor });

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
				return parseInt(data.item.skillLevel) ?? 0;
			case RollType.Attack:
				return data.weapon.skillLevel(false);
			default:
				return 0;
		}
	}
	const level = getLevel(data);
	console.log(name, level);

	const modifiers: Array<RollModifier & { class?: string }> = [
		...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
	];
	modifiers.forEach(m => {
		m.class = "zero";
		if (m.modifier > 0) m.class = "pos";
		if (m.modifier < 0) m.class = "neg";
	});
	const effectiveLevel = applyMods(level, user);
	const success = getSuccess(effectiveLevel, rollTotal);
	const margin = Math.abs(effectiveLevel - rollTotal);
	const marginMod: Partial<RollModifier> = {};
	let marginClass = "";
	if ([RollSuccess.CriticalSuccess, RollSuccess.Success].includes(success)) {
		marginMod.modifier = margin;
		marginMod.name = i18n_f("gurps.roll.success_from", { from: name });
		marginClass = "pos";
	} else {
		marginMod.modifier = margin;
		marginMod.name = i18n_f("gurps.roll.failure_from", { from: name });
		marginClass = "neg";
	}

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
		effectiveLevel,
		modifiers,
		margin,
		marginMod,
		marginClass,
	};
}

/**
 *
 * @param user
 */
async function resetMods(user: StoredDocument<User> | null) {
	if (!user) return;
	const sticky = user.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky);
	if (sticky === false) {
		await user.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, []);
		const button = GURPS.ModifierButton;
		return button.render();
	}
}

/**
 * Handle adding modifiers via OTF
 * @param {StoredDocument<User>} user
 * @param {ActorGURPS} actor
 */
function addModifier(user: StoredDocument<User> | null, actor: ActorGURPS, data: { [key: string]: any }) {
	if (!user) return;
	throw new Error("Function not implemented.");
}

/**
 * Handles Skill Rolls
 * @param user
 * @param actor
 * @param data
 * @param formula
 */
async function rollAttribute(
	user: StoredDocument<User> | null,
	actor: ActorGURPS,
	data: any,
	formula: string
): Promise<void> {
	const name = data.attribute.attribute_def.combinedName;
	const roll = Roll.create(formula);
	await roll.evaluate({ async: true });
	const rolls = roll.dice[0].results.map(e => {
		return { result: e.result, word: toWord(e.result) };
	});
	let rollTotal = roll.total!;
	const speaker = ChatMessage.getSpeaker({ actor: actor });

	const level = data.attribute.current;

	const modifiers: Array<RollModifier & { class?: string }> = [
		...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
	];
	modifiers.forEach(m => {
		m.class = "zero";
		if (m.modifier > 0) m.class = "pos";
		if (m.modifier < 0) m.class = "neg";
	});
	const effectiveLevel = applyMods(level, user);
	const success = getSuccess(effectiveLevel, rollTotal);
	const margin = Math.abs(effectiveLevel - rollTotal);
	const marginMod: Partial<RollModifier> = {};
	let marginClass = "";
	if ([RollSuccess.CriticalSuccess, RollSuccess.Success].includes(success)) {
		marginMod.modifier = margin;
		marginMod.name = i18n_f("gurps.roll.success_from", { from: name });
		marginClass = "pos";
	} else {
		marginMod.modifier = margin;
		marginMod.name = i18n_f("gurps.roll.failure_from", { from: name });
		marginClass = "neg";
	}

	const chatData: { [key: string]: any } = {
		data: data,
		name: name,
		success: getSuccess(effectiveLevel, rollTotal),
		total: rollTotal,
		level: level,
		effectiveLevel: effectiveLevel,
		margin: margin,
		marginMod: marginMod,
		marginClass: marginClass,
		actor: actor,
		rolls: rolls,
		modifiers: modifiers,
	};

	// Console.log("chatData", chatData);

	const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/skill-roll.hbs`, chatData);

	const messageData = {
		user: user,
		speaker: speaker,
		type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		content: message,
		roll: JSON.stringify(roll),
		sound: CONFIG.sounds.dice,
	};
	ChatMessage.create(messageData, {});
	await resetMods(user);
}

/**
 * Handles Skill Rolls
 * @param {any} rollData
 */
async function rollSkill(rollData: any): Promise<void> {
	const chatData: { [key: string]: any } = {
		data: rollData.data,
		name: rollData.name,
		success: getSuccess(rollData.effectiveLevel, rollData.rollTotal),
		total: rollData.rollTotal,
		level: rollData.level,
		effectiveLevel: rollData.effectiveLevel,
		margin: rollData.margin,
		marginMod: rollData.marginMod,
		marginClass: rollData.marginClass,
		actor: rollData.actor,
		item: rollData.data.item,
		rolls: rollData.rolls,
		modifiers: rollData.modifiers,
	};

	// Console.log("chatData", chatData);

	const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/skill-roll.hbs`, chatData);

	const messageData = {
		user: rollData.user,
		speaker: rollData.speaker,
		type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		content: message,
		roll: JSON.stringify(rollData.roll),
		sound: CONFIG.sounds.dice,
	};
	ChatMessage.create(messageData, {});
	await resetMods(rollData.user);
}

/**
 * Handle Attack Rolls.
 * @param {any} rollData
 */
async function rollAttack(rollData: any): Promise<void> {
	// Console.log("rollAttack", user, actor, data);

	// Set up Chat Data
	const chatData: { [key: string]: any } = {
		data: rollData.data,
		name: rollData.name,
		success: getSuccess(rollData.effectiveLevel, rollData.rollTotal),
		total: rollData.rollTotal,
		level: rollData.level,
		effectiveLevel: rollData.effectiveLevel,
		margin: rollData.margin,
		marginMod: rollData.marginMod,
		marginClass: rollData.marginClass,
		actor: rollData.actor,
		item: rollData.data.item,
		weapon: rollData.data.weapon,
		rolls: rollData.rolls,
		modifiers: rollData.modifiers,
		// Modifier: modifier,
	};

	// Console.log("chatData", chatData);

	const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/attack-roll.hbs`, chatData);

	const messageData = {
		user: rollData.user,
		speaker: rollData.speaker,
		type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		content: message,
		roll: JSON.stringify(rollData.roll),
		sound: CONFIG.sounds.dice,
	};
	ChatMessage.create(messageData, {});
	await resetMods(rollData.user);
}

/**
 * Handle Damage Rolls.
 * @param {StoredDocument<User>} user
 * @param {ActorGURPS} actor
 */
async function rollDamage(
	user: StoredDocument<User> | null,
	actor: ActorGURPS,
	data: { [key: string]: any }
): Promise<void> {
	console.log(data);
	const dice = new DiceGURPS(data.weapon.fastResolvedDamage);
	const roll = Roll.create(dice.toString(true));
	await roll.evaluate({ async: true });
	const rolls = roll.dice[0].results.map(e => {
		return { result: e.result, word: toWord(e.result) };
	});
	let rollTotal = roll.total!;
	const speaker = ChatMessage.getSpeaker({ actor: actor });

	const modifiers: Array<RollModifier & { class?: string }> = [
		...(user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]),
	];
	modifiers.forEach(m => {
		m.class = "zero";
		if (m.modifier > 0) m.class = "pos";
		if (m.modifier < 0) m.class = "neg";
	});
	const damage = applyMods(rollTotal, user);
	const damageType = data.weapon.fastResolvedDamage.match(/\d*d?[+-]?\d*\s*(.*)/)[1] ?? "";

	const chatData = {
		user,
		actor,
		data,
		rolls,
		damage,
		damageType,
	};
	console.log(chatData);

	// Const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/damage-roll.hbs`, chatData);

	// const messageData = {
	// 	user: user,
	// 	speaker: speaker,
	// 	type: CONST.CHAT_MESSAGE_TYPES.ROLL,
	// 	content: message,
	// 	roll: JSON.stringify(roll),
	// 	sound: CONFIG.sounds.dice,
	// };
	// ChatMessage.create(messageData, {});
	// await resetMods(user);
	// if ([RollSuccess.CriticalSuccess, RollSuccess.Success].includes(success)) {
	// 	marginMod.modifier = margin;
	// 	marginMod.name = i18n_f("gurps.roll.success_from", { from: name });
	// 	marginClass = "pos";
	// } else {
	// 	marginMod.modifier = margin;
	// 	marginMod.name = i18n_f("gurps.roll.failure_from", { from: name });
	// 	marginClass = "neg";
	// }
}

enum RollSuccess {
	Success = "success",
	Failure = "failure",
	CriticalSuccess = "critical_success",
	CriticalFailure = "critical_failure",
}

/**
 * Apply all modifiers to the level to get the effective level
 * @param {number} level
 * @param {StoredDocument<User>} user
 * @returns {number}
 */
function applyMods(level: number, user: StoredDocument<User> | null): number {
	const modStack: RollModifier[] = (user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? [];
	let effectiveLevel = level;
	modStack.forEach(m => {
		effectiveLevel += m.modifier;
	});
	return effectiveLevel;
}

// TODO: change from string to enum
/**
 * Check to see if the roll succeeded, and return the type of success/failure (normal/critical).
 * @param {number} level
 * @param {number} rollTotal
 * @returns {RollSuccess}
 */
function getSuccess(level: number, rollTotal: number): RollSuccess {
	if (rollTotal === 18) return RollSuccess.CriticalFailure;
	if (rollTotal <= 4) return RollSuccess.CriticalSuccess;
	if (level >= 15 && rollTotal <= 5) return RollSuccess.CriticalSuccess;
	if (level >= 16 && rollTotal <= 6) return RollSuccess.CriticalSuccess;
	if (level <= 15 && rollTotal === 17) return RollSuccess.CriticalFailure;
	if (rollTotal - level >= 10) return RollSuccess.CriticalFailure;
	if (level >= rollTotal) return RollSuccess.Success;
	return RollSuccess.Failure;
}
