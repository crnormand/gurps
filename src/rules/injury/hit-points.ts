export interface ThresholdDescriptor {
  value: number
  condition: string
}

export class HitPoints {
  /**
   * @source B419 "General Injury: Lost Hit Points"
   * @param maxHP - The maximum HP of the character. This is used to calculate the various HP thresholds for conditions
   *  and death.
   * @returns An array of threshold descriptors, each containing a value and a condition.
   */
  static getThresholds(maxHP: number): ThresholdDescriptor[] {
    if (!maxHP || maxHP <= 0) return []

    return [
      { value: maxHP, condition: 'GURPS.status.Healthy' },
      { value: Math.ceil(maxHP / 3) - 1, condition: 'GURPS.status.Reeling' },
      { value: 0, condition: 'GURPS.collapse' },
      { value: -maxHP, condition: 'GURPS.check1' },
      { value: -2 * maxHP, condition: 'GURPS.check2' },
      { value: -3 * maxHP, condition: 'GURPS.check3' },
      { value: -4 * maxHP, condition: 'GURPS.check4' },
      { value: -5 * maxHP, condition: 'GURPS.dead' },
      { value: -10 * maxHP, condition: 'GURPS.destroyed' },
    ]
  }
}
