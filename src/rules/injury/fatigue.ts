import { ThresholdDescriptor } from './hit-points.js'

export class Fatigue {
  /**
   * @source B426 "Lost Fatigue Points"
   *
   * • Less than 1/3 your FP left – You are tired.
   *
   * • 0 FP or less – You are on the verge of collapse.
   *
   * • -1xFP – You fall unconscious.
   *
   * @param maxFP - The maximum FP of the character. This is used to calculate the various FP thresholds for conditions.
   * @returns An array of threshold descriptors, each containing a value and a condition.
   */
  static getThresholds(maxFP: number): ThresholdDescriptor[] {
    if (!maxFP || maxFP <= 0) return []

    return [
      { value: maxFP, state: 'Rested' },
      { value: maxFP - 1, state: 'Tiring' },
      { value: Math.ceil(maxFP / 3) - 1, state: 'Tired' },
      { value: 0, state: 'Collapse' },
      { value: -maxFP, state: 'Unconscious' },
    ]
  }
}

export type { ThresholdDescriptor as IThresholdDescriptor } from './hit-points.js'
