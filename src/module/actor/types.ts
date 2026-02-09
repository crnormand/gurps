interface CheckInfo {
  img?: any
  symbol: string
  label: string
  mode?: string
  value: number | string
  damage?: string
  notes?: string
  otf: string
  otfDamage?: string
  isOTF?: boolean
}

interface CanRollResult {
  canRoll: boolean
  isSlam: boolean
  hasActions: boolean
  isCombatant: boolean
  message?: string
  targetMessage?: string
  maxActionMessage?: string
  maxAttackMessage?: string
  maxBlockmessage?: string
  maxParryMessage?: string
  rollBeforeStartMessage?: string
}

export { type CheckInfo, type CanRollResult }
