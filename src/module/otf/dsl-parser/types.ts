export type SkillType = 'skill-spell' | 'skill' | 'spell'

export interface DSLInput {
  phrases: PhraseNode[]
}

export interface PhraseNode {
  type: SkillType
  name: string

  modifier?: ModifierNode
  based?: BasedNode
  costs?: CostsNode
  description?: string
}

// --- Sub-nodes ---

export type ModifierNode =
  | { kind: 'flat'; value: number } // +3, -2
  | { kind: 'margin'; sign: '+' | '-' } // +@margin

export interface BasedNode {
  value: string // "IQ", "DX", "ZX", etc.
}

export interface CostsNode {
  keyword: 'per' | 'costs'
  amount: number
  text: string // "points", "HP", "energy", etc.
}
