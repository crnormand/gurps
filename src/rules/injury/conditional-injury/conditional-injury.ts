/**
 * Implementation of the Conditional Injury optional rule.
 * @source Pyramid #3/120
 */

import { ThresholdDescriptor } from '../hit-points.ts'

interface CIThresholdDescriptor extends ThresholdDescriptor {
  days: number
  shock: number
  pain: string | null
}

/* ---------------------------------------- */

export class ConditionalInjury {
  /** @source Pyramid #3/120 */
  static thresholds: CIThresholdDescriptor[] = [
    {
      value: -7,
      condition: 'GURPS.conditionalInjury.severity.none',
      days: 0,
      shock: 0,
      pain: null,
      color: '#4a9b4b',
    },
    {
      value: -6,
      condition: 'GURPS.conditionalInjury.severity.scratch',
      days: 1,
      shock: -1,
      pain: 'GURPS.status.MildPain',
      color: '#7ab648',
    },
    {
      value: -5,
      condition: 'GURPS.conditionalInjury.severity.minorWound',
      days: 1.5,
      shock: -2,
      pain: 'GURPS.status.MildPain',
      color: '#d4a017',
    },
    {
      value: -4,
      condition: 'GURPS.conditionalInjury.severity.minorWound',
      days: 2,
      shock: -2,
      pain: 'GURPS.status.ModeratePain',
      color: '#d4a017',
    },
    {
      value: -3,
      condition: 'GURPS.conditionalInjury.severity.minorWound',
      days: 5,
      shock: -2,
      pain: 'GURPS.status.ModeratePain',
      color: '#d4a017',
    },
    {
      value: -2,
      condition: 'GURPS.conditionalInjury.severity.majorWound',
      days: 7,
      shock: -4,
      pain: 'GURPS.status.SeverePain',
      color: '#d4621a',
    },
    {
      value: -1,
      condition: 'GURPS.conditionalInjury.severity.reeling',
      days: 10,
      shock: -4,
      pain: 'GURPS.status.TerriblePain',
      color: '#c03a25',
    },
    {
      value: 0,
      condition: 'GURPS.conditionalInjury.severity.crippled',
      days: 14,
      shock: -4,
      pain: 'GURPS.status.Agony',
      color: '#a82a20',
    },
    {
      value: 1,
      condition: 'GURPS.conditionalInjury.severity.crippled',
      days: 21,
      shock: -4,
      pain: 'GURPS.status.Agony',
      color: '#a82a20',
    },
    {
      value: 2,
      condition: 'GURPS.conditionalInjury.severity.mortalWound',
      days: 35,
      shock: -4,
      pain: 'GURPS.status.Agony',
      color: '#8e1f1a',
    },
    {
      value: 3,
      condition: 'GURPS.conditionalInjury.severity.mortalWound',
      days: 49,
      shock: -4,
      pain: 'GURPS.status.Agony',
      color: '#8e1f1a',
    },
    {
      value: 4,
      condition: 'GURPS.conditionalInjury.severity.instantlyFatal',
      days: 70,
      shock: -4,
      pain: 'GURPS.status.Agony',
      color: '#4a0c0c',
    },
    {
      value: 5,
      condition: 'GURPS.conditionalInjury.severity.instantlyFatal',
      days: 105,
      shock: -4,
      pain: 'GURPS.status.Agony',
      color: '#4a0c0c',
    },
    {
      value: 6,
      condition: 'GURPS.conditionalInjury.severity.totalDestruction',
      days: 0,
      shock: 0,
      pain: '',
      color: '#1a0505',
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
    if (severity < -6 || !severity) {
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
      return 'GURPS.conditionalInjury.severity.none'
    }

    for (const row of this.thresholds) {
      if (severity === row.value) {
        return row.condition
      }
    }

    return 'GURPS.conditionalInjury.severity.totalDestruction'
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
