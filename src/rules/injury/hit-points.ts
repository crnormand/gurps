import { getCssVariable } from '@module/util/get-css-value.js'

const POOL_COLOR_VARIABLE = '--gcs-color-default-pool'

export interface ThresholdDescriptor {
  value: number
  condition: string
  color: string
}

export class HitPoints {
  /**
   * @source B419 "General Injury: Lost Hit Points"
   *
   * • Less than 1/3 your HP left – You are reeling from your wounds.
   *
   * • 0 HP or less – You are in immediate danger of collapse.
   *
   * • -1xHP – In addition to the above effects, make an immediate HT roll or die. Roll again each time you suffer
   *    injury equal to a further multiple of your HP.
   *
   * • -5xHP – You die immediately.
   *
   * • -10xHP – Total bodily destruction.
   *
   * @param maxHP - The maximum HP of the character. This is used to calculate the various HP thresholds for conditions
   *  and death.
   * @returns An array of threshold descriptors, each containing a value and a condition.
   */
  static getThresholds(maxHP: number): ThresholdDescriptor[] {
    if (!maxHP || maxHP <= 0) return []

    return [
      {
        value: maxHP,
        condition: 'GURPS.status.Healthy',
        color: getCssVariable(document.body, POOL_COLOR_VARIABLE, '#B1D175'),
      },
      { value: maxHP - 1, condition: 'GURPS.status.Wounded', color: '#D8E871' },
      { value: Math.ceil(maxHP / 3) - 1, condition: 'GURPS.status.Reeling', color: '#DAD06A' },
      { value: 0, condition: 'GURPS.collapse', color: '#EFAC78' },
      { value: -maxHP, condition: 'GURPS.check1', color: '#B25A56' },
      { value: -2 * maxHP, condition: 'GURPS.check2', color: '#9A4D4A' },
      { value: -3 * maxHP, condition: 'GURPS.check3', color: '#834140' },
      { value: -4 * maxHP, condition: 'GURPS.check4', color: '#6B3535' },
      { value: -5 * maxHP, condition: 'GURPS.dead', color: '#54292B' },
      { value: -10 * maxHP, condition: 'GURPS.destroyed', color: '#3D1E20' },
    ]
  }
}
