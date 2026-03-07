import { IThresholdDescriptor } from './hit-points.js'

export function getFPThresholds(maxFP: number): IThresholdDescriptor[] {
  if (!maxFP || maxFP <= 0) return []

  return [
    { value: maxFP, condition: 'GURPS.status.Rested' },
    { value: Math.ceil(maxFP / 3) - 1, condition: 'GURPS.status.Tired' },
    { value: 0, condition: 'GURPS.collapse' },
    { value: -maxFP, condition: 'GURPS.unconscious' },
  ]
}

export type { IThresholdDescriptor } from './hit-points.js'
