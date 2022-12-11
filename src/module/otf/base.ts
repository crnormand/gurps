export type OtF =
	| "modifier"
	| "pdf"
	| "roll"
	| "damage"
	| "derivedroll"
	| "deriveddamage"
	| "chat"
	| "href"
	| "test-if"
	| "test-exists"
	| "dragdrop"
	| "controlroll"
	| "attribute"
	| "skill"

export interface ParsedOtF {
	text: string
	action?: OtFAction
}

export interface OptionalCheckParameters {
	blindroll: boolean
	sourceId?: string
	htmldesc?: string
	overridetxt?: string
	clrmods?: boolean
	blindrollPrefix?: string
}

// Used by chat
export interface OtFAction {
	orig: string
	type: OtF
	overridetxt?: string
	blindroll?: boolean
	sourceId?: string
	spantext?: string
	desc?: string
}

interface OtfActionChain extends OtFAction {
	next?: OtFAction
}

// Used by roll, damage, derivedroll, deriveddamage
export interface OtFDamageAction extends OtfActionChain {
	displayformula?: string
	formula: string
	costs: string
	hitlocation?: string
	accumulate: boolean
	damagetype?: string
	extdamagetype?: string
	derivedformula?: string
}

// Used by modifier, controlroll
export interface OtFNumberedAction extends OtfActionChain {
	num?: number
}

// Used by test-if, test-exists
export interface OtFTestAction extends OtFAction {
	formula: string
}

// User by href, pdf, dragdrop
export interface OtFLinkedAction extends OtFAction {
	link: string
}

export interface OtFCostsAction extends OtFNumberedAction {
	margin?: string
	costs?: string
}

/**
Export interface OtFSkillAction extends OtFModifiedAction {
  isSpellOnly: isSpell,
  isSkillOnly: isSkill,
   target: !!target ? target[2] : undefined,
  floatingAttribute: floatingAttribute,
  floatingLabel: floatingLabel,
}
 */
