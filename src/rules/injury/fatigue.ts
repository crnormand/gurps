import { ThresholdDescriptor } from './hit-points.ts'

export class Fatigue {
  /**
   * @source B426 "Lost Fatigue Points"
   * @param maxFP - The maximum FP of the character. This is used to calculate the various FP thresholds for conditions.
   * @returns An array of threshold descriptors, each containing a value and a condition.
   */
  static getThresholds(maxFP: number): ThresholdDescriptor[] {
    if (!maxFP || maxFP <= 0) return []

    return [
      { value: maxFP, condition: 'GURPS.status.Rested' },
      { value: Math.ceil(maxFP / 3) - 1, condition: 'GURPS.status.Tired' },
      { value: 0, condition: 'GURPS.collapse' },
      { value: -maxFP, condition: 'GURPS.unconscious' },
    ]
  }
}

export type { ThresholdDescriptor as IThresholdDescriptor } from './hit-points.ts'
