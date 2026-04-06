export interface ThresholdDescriptor {
  value: number
  state: string
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
      { value: maxHP, state: 'Healthy' },
      { value: maxHP - 1, state: 'Wounded' },
      { value: Math.ceil(maxHP / 3) - 1, state: 'Reeling' },
      { value: 0, state: 'Collapse' },
      { value: -maxHP, state: 'DeathCheck1' },
      { value: -2 * maxHP, state: 'DeathCheck2' },
      { value: -3 * maxHP, state: 'DeathCheck3' },
      { value: -4 * maxHP, state: 'DeathCheck4' },
      { value: -5 * maxHP, state: 'Dead' },
      { value: -10 * maxHP, state: 'Destroyed' },
    ]
  }
}
