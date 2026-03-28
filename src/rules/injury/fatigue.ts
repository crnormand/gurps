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
      { value: maxFP, condition: 'GURPS.status.Rested', color: '#4a9b4b' },
      { value: maxFP - 1, condition: 'GURPS.status.Tiring', color: '#7ab648' },
      { value: Math.ceil(maxFP / 3) - 1, condition: 'GURPS.status.Tired', color: '#d4a017' },
      { value: 0, condition: 'GURPS.collapse', color: '#d4621a' },
      { value: -maxFP, condition: 'GURPS.unconscious', color: '#4a0c0c' },
    ]
  }
}

export type { ThresholdDescriptor as IThresholdDescriptor } from './hit-points.js'
