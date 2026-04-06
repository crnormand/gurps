/**
 * Implementation of the Conditional Injury optional rule.
 * @source Pyramid #3/120
 */

import { ThresholdDescriptor } from '../hit-points.ts'

type PainLevel = 'Mild' | 'Moderate' | 'Severe' | 'Terrible' | 'Agony'

interface CIThresholdDescriptor extends ThresholdDescriptor {
  days: number
  shock: number
  pain: PainLevel | null
}

/* ---------------------------------------- */

export class ConditionalInjury {
  /** @source Pyramid #3/120 */
  static thresholds: CIThresholdDescriptor[] = [
    {
      value: -7,
      state: 'Healthy',
      days: 0,
      shock: 0,
      pain: null,
    },
    {
      value: -6,
      state: 'Scratch',
      days: 1,
      shock: -1,
      pain: 'Mild',
    },
    {
      value: -5,
      state: 'MinorWound1',
      days: 1.5,
      shock: -2,
      pain: 'Mild',
    },
    {
      value: -4,
      state: 'MinorWound2',
      days: 2,
      shock: -2,
      pain: 'Moderate',
    },
    {
      value: -3,
      state: 'MinorWound3',
      days: 5,
      shock: -2,
      pain: 'Moderate',
    },
    {
      value: -2,
      state: 'MajorWound',
      days: 7,
      shock: -4,
      pain: 'Severe',
    },
    {
      value: -1,
      state: 'Reeling',
      days: 10,
      shock: -4,
      pain: 'Terrible',
    },
    {
      value: 0,
      state: 'Crippled1',
      days: 14,
      shock: -4,
      pain: 'Agony',
    },
    {
      value: 1,
      state: 'Crippled2',
      days: 21,
      shock: -4,
      pain: 'Agony',
    },
    {
      value: 2,
      state: 'MortalWound1',
      days: 35,
      shock: -4,
      pain: 'Agony',
    },
    {
      value: 3,
      state: 'MortalWound2',
      days: 49,
      shock: -4,
      pain: 'Agony',
    },
    {
      value: 4,
      state: 'InstantlyFatal1',
      days: 70,
      shock: -4,
      pain: 'Agony',
    },
    {
      value: 5,
      state: 'InstantlyFatal2',
      days: 105,
      shock: -4,
      pain: 'Agony',
    },
    {
      value: 6,
      state: 'Destroyed',
      days: 0,
      shock: 0,
      pain: null,
    },
  ]

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static thresholdForSeverity(severity: number): CIThresholdDescriptor {
    if (severity < -6) {
      return this.thresholds.find(threshold => threshold.value === -7)!
    }

    for (const row of this.thresholds) {
      if (severity === row.value) {
        return row
      }
    }

    return this.thresholds.at(-1)!
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static daysToHealForSeverity(severity: number): number | null {
    // gotta love untyped languages
    if (severity < -6 || severity === null || severity === undefined || typeof severity !== 'number') {
      return 0
    }

    for (const row of this.thresholds) {
      if (severity === row.value) {
        return row.days
      }
    }

    return null
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static severityForDaysToHeal(days: number): number | null {
    if (days <= 0 || !days) {
      return null
    }

    for (const row of this.thresholds) {
      if (days <= row.days) {
        return row.value
      }
    }

    return 5
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static grossEffectsForSeverity(severity: number): string {
    // gotta love untyped languages
    if (severity < -6 || severity === null || severity === undefined || typeof severity !== 'number') {
      return 'Healthy'
    }

    for (const row of this.thresholds) {
      if (severity === row.value) {
        return row.state
      }
    }

    return 'Destroyed'
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static incrementSeverity(severity: number | null): number {
    if (severity === null || severity === undefined || typeof severity !== 'number') {
      severity = -6
    }

    const incrementedSeverity = severity + 1

    return incrementedSeverity > 6 ? 6 : incrementedSeverity
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static decrementSeverity(severity: number | null): number {
    if (severity === null || severity === undefined || typeof severity !== 'number') {
      severity = -6
    }

    let decrementedSeverity = severity - 1

    if (decrementedSeverity > 6) {
      decrementedSeverity = 6
    }

    return decrementedSeverity < -6 ? -6 : decrementedSeverity
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static incrementDaysToHeal(days: number, delta = 1): number {
    if (days === null || days === undefined || typeof days !== 'number') {
      days = 0
    }

    return days + delta
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static decrementDaysToHeal(days: number, delta = 1): number {
    if (days === null || days === undefined || typeof days !== 'number') {
      days = 0
    }

    const decrementedDays = days - delta

    return decrementedDays < 0 ? 0 : decrementedDays
  }

  /* ---------------------------------------- */

  /** @source Pyramid #3/120 */
  static setSeverity(severity: number): number {
    if (severity === null || severity === undefined || typeof severity !== 'number') {
      return -6
    }

    if (severity < -6) {
      return -6
    }

    return severity > 6 ? 6 : severity
  }

  /** @source Pyramid #3/120 */
  static setDaysToHeal(days: number): number {
    if (days === null || days === undefined || typeof days !== 'number') {
      return 0
    }

    return days < 0 ? 0 : days
  }
}
