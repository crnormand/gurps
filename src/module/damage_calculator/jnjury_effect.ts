import { RollType } from "@module/data"

/**
 * InjuryEffect represents some effect of sudden injury.
 *
 * Right now, it is just data. At some point in the future, some of them may become Active Effects.
 */
class InjuryEffect {
	/* A unique identifier for the kind of effect. Might be an enum? */
	id: string

	/* An array of RollModifiers that is a direct consequence of the effect. */
	modifiers: RollModifier[]

	/* An array of EffectChecks. */
	checks: EffectCheck[]

	constructor(id: string, modifiers: RollModifier[] = [], checks: EffectCheck[] = []) {
		this.id = id
		this.modifiers = modifiers
		this.checks = checks
	}
}

/**
 * RollModifier represents a generic modifier to some kind of roll.
 *
 * modifier - the numeric value used to modify the roll or check.
 * rollType - the type of the roll/check modified.
 * id - either the id of an attribute or name of the thing (skill, spell, etc).
 */
class RollModifier {
	id: string

	rollType: RollType

	modifier: number

	constructor(id: string, rollType: RollType, modifier: number) {
		this.id = id
		this.rollType = rollType
		this.modifier = modifier
	}
}

/**
 * An Effect Check is a conditional injury effect that requires a check of some kind, with consequences if failed.
 */
class EffectCheck {
	/**
	 * An array of modified rolls which, if failed, triggers the failures listed below.
	 * Resolution of the check requires selecting the *best* of the following rolls.
	 */
	checks: RollModifier[]

	/* An array of consequences if the check fails. */
	failures: CheckFailureConsequence[]

	constructor(checks: RollModifier[], failures: CheckFailureConsequence[]) {
		this.checks = checks
		this.failures = failures
	}
}

/**
 * The consequence of failing a check.
 *
 * margin - "margin of failure" at which this effect is applied.
 * id - the identifier of a consequence.
 *
 * The actual effect on an actor is resolved elsewhere.
 */
class CheckFailureConsequence {
	margin: number

	id: ConsequenceId

	constructor(id: ConsequenceId, margin: number) {
		this.id = id
		this.margin = margin
	}
}

type ConsequenceId = "fall prone" | "stun" | "unconscious"

/**
 * TODO I'm kind of torn on this ... maybe it should just be a string, rather than an enum?
 */
enum InjuryEffectType {
	shock = "shock",
	majorWound = "majorWound",
	knockback = "knockback",
}

export { InjuryEffect, RollModifier, InjuryEffectType, CheckFailureConsequence, EffectCheck }
