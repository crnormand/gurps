import { getCssVariable } from '@module/util/get-css-value.js'

import { ThresholdDescriptor } from './hit-points.js'

const CSS_ELEMENT = document.body
const POOL_COLOR_VARIABLE = '--gcs-color-default-pool'

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
      {
        value: maxFP,
        condition: 'GURPS.status.Rested',
        color: getCssVariable(CSS_ELEMENT, POOL_COLOR_VARIABLE, '#B1D175'),
      },
      { value: maxFP - 1, condition: 'GURPS.status.Tiring', color: '#D8E871' },
      { value: Math.ceil(maxFP / 3) - 1, condition: 'GURPS.status.Tired', color: '#DAD06A' },
      { value: 0, condition: 'GURPS.collapse', color: '#EFAC78' },
      { value: -maxFP, condition: 'GURPS.unconscious', color: '#B25A56' },
    ]
  }
}

export type { ThresholdDescriptor as IThresholdDescriptor } from './hit-points.js'
