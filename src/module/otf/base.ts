
export type OtF = "modifier" | "pdf" | "roll" | "damage" | "derivedroll" | "deriveddamage" | "chat" | "href" | "test-if" | "test-exists" | "dragdrop" | "controlroll"

export interface ParsedOtF {
  text: string,
  action?: OtFAction 
}

export interface OptionalCheckParameters {
  blindroll: boolean, 
  sourceId?: string, 
  htmldesc?: string, 
  overridetxt?: string, 
  clrmods?: boolean,
  blindrollPrefix?: string,
}

export interface OtFAction {
  orig: string,
  type: OtF
  overridetxt?: string,
  blindroll?: boolean
  sourceId?: string,
  spantext?: string,
  desc?: string
}

interface OtfActionChain extends OtFAction {
  next?: OtFAction
}

export interface OtFDamageAction extends OtfActionChain {
  displayformula?: string,
  formula: string,
  costs: string,
  hitlocation?: string,
  accumulate: boolean,
  damagetype?: string,
  extdamagetype?: string,
  derivedformula?: string,
}

export interface OtFNumberedAction extends OtfActionChain {
  num: number
}

export interface OtFTestAction extends OtFAction {
  formula: string
}

export interface OtFLinkedAction extends OtFAction {
  link: string
}