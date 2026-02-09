import { fields } from '../types/foundry/index.ts'

import { Feature, FeatureType } from './index.ts'

const leveledAmountSchema = () => {
  return {
    amount: new fields.NumberField({ required: true, nullable: false, default: 1 }),
    perLevel: new fields.BooleanField({ required: true, nullable: false, default: false }),
  }
}

type LeveledAmountSchema = ReturnType<typeof leveledAmountSchema>

/* ---------------------------------------- */

interface ILeveledAmount {
  amount: number
  perLevel: boolean

  /* ---------------------------------------- */

  get adjustedAmount(): number
}

/* ---------------------------------------- */

function isLeveledAmount(obj: unknown): obj is ILeveledAmount {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    'amount' in obj &&
    typeof (obj as any).amount === 'number' &&
    'perLevel' in obj &&
    typeof (obj as any).perLevel === 'boolean'
  )
}

/* ---------------------------------------- */

function getLeveledAmount<T extends FeatureType>(bonus: Feature<T> & ILeveledAmount): number {
  if (bonus.perLevel) {
    const level = 'level' in bonus.parent && typeof bonus.parent.level === 'number' ? bonus.parent.level : 1

    if (level < 0) return 0

    return level * bonus.amount
  }

  return bonus.amount
}

/* ---------------------------------------- */

export type { ILeveledAmount, LeveledAmountSchema }
export { isLeveledAmount, leveledAmountSchema, getLeveledAmount }
