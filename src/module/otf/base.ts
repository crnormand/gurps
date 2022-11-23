
export type OtF = "modifier" | "attribute" | "pdf" | "controlroll" | "roll" | "damage" | "derivedroll" | "deriveddamage"

export interface ParsedOtF {
  text: string,
  action?: OtFAction 
}

export interface OtFAction {
  orig: string,
  type: OtF
  overridetxt?: string,
  blindroll?: boolean
}

export interface OtFActionDamage extends OtFAction {
  displayformula?: string,
  formula: string,
  desc?: string, 
  costs: string,
  hitlocation?: string,
  accumulate: boolean,
  next?: OtFActionDamage,
  damagetype?: string,
  extdamagetype?: string
  derivedformula?: string
}
