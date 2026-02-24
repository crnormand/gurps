import { fields } from '@gurps-types/foundry/index.js'
import {
  PseudoDocument,
  PseudoDocumentMetadata,
  pseudoDocumentSchema,
} from '@module/pseudo-document/pseudo-document.js'

const TrackerOperators = {
  PLUS: '+',
  MINUS: '\u002D',
  UNICODE_MINUS_SIGN: '\u2212',
  MULTIPLY: '×',
  DIVIDE: '÷',
} as const

const TrackerComparators = {
  LT: '<',
  LTE: '≤',
  EQ: '=',
  GTE: '≥',
  GT: '>',
} as const

type TrackerOperators = (typeof TrackerOperators)[keyof typeof TrackerOperators]
type TrackerComparisons = (typeof TrackerComparators)[keyof typeof TrackerComparators]
type binomialFunction = (left: number, right: number) => number
type comparisonFunction = (left: number, right: number) => boolean

const OperatorFunctions: Record<TrackerOperators, binomialFunction> = {
  [TrackerOperators.PLUS]: (left: number, right: number) => left + right,
  [TrackerOperators.MINUS]: (left: number, right: number) => left - right,
  [TrackerOperators.UNICODE_MINUS_SIGN]: (left: number, right: number) => left - right,
  [TrackerOperators.MULTIPLY]: (left: number, right: number) => left * right,
  [TrackerOperators.DIVIDE]: (left: number, right: number) => left / right,
} as const

const ComparisonFunctions: Record<TrackerComparisons, comparisonFunction> = {
  [TrackerComparators.LT]: (left: number, right: number) => left < right,
  [TrackerComparators.LTE]: (left: number, right: number) => left <= right,
  [TrackerComparators.EQ]: (left: number, right: number) => left === right,
  [TrackerComparators.GTE]: (left: number, right: number) => left >= right,
  [TrackerComparators.GT]: (left: number, right: number) => left > right,
} as const

type ThresholdDescriptor = {
  value: number
  condition: string
}

/* ---------------------------------------- */

class TrackerInstance extends PseudoDocument<ResourceTrackerSchema> {
  static override defineSchema() {
    return resourceTrackerSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata<'ResourceTracker'> {
    return {
      documentName: 'ResourceTracker',
      label: '',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  static fromTemplate(template: ResourceTrackerTemplate, actor: Actor.Implementation): TrackerInstance {
    const tracker = new TrackerInstance(template.tracker.toObject())

    if (template.initialValue !== null) {
      tracker.value = parseInt(template.initialValue) || 0

      if (isNaN(tracker.value)) {
        // try to use initialValue as a path to another value
        // TODO: verify this works
        const foundValue = Number(foundry.utils.getProperty(actor, 'system.' + template.initialValue))

        tracker.value = isNaN(foundValue) ? template.tracker.value : foundValue
      }
    }

    return tracker
  }

  // TODO: verify this works
  async applyTemplate(template: ResourceTrackerTemplate) {
    const initialData = new fields.SchemaField(resourceTrackerSchema()).getInitialValue()
    const data = template.tracker.toObject()

    return this.updateSource(foundry.utils.mergeObject(initialData, data))
  }

  get currentThreshold(): ResourceTrackerThreshold | null {
    const threshold = this.thresholds[this.#indexOfThreshold()]

    return threshold || null
  }

  get thresholdDescriptors(): ThresholdDescriptor[] {
    const results: ThresholdDescriptor[] = []

    // Make a copy of the thresholds array.
    const thresholds = [...this.thresholds]

    if (this.isAccumulator) {
      results.push({ value: 0, condition: thresholds.shift()?.condition ?? '' })

      for (const threshold of thresholds) {
        results.push({
          value: Math.trunc(getOperator(threshold)(this.max, threshold.value)),
          condition: threshold.condition,
        })
      }
    } else {
      if (this.breakpoints) {
        results.push({ value: this.max, condition: thresholds.shift()?.condition ?? '' })

        for (const threshold of thresholds) {
          results.push({
            value: Math.trunc(getOperator(threshold)(this.max, threshold.value)),
            condition: threshold.condition,
          })
        }
      } else {
        results.push({ value: this.max, condition: thresholds.shift()?.condition ?? '' })

        for (const threshold of thresholds) {
          results.push({
            value: Math.trunc(getOperator(threshold)(this.max, threshold.value)),
            condition: threshold.condition,
          })
        }
      }
    }

    return results

    function getOperator(threshold: ResourceTrackerThreshold) {
      return OperatorFunctions[threshold.operator as TrackerOperators]
    }
  }

  /**
   * A better name for this attribute.
   *
   * An accumulator is a resource that starts at 0 and increases, like a damage tracker. A non-accumulator is a
   * resource that starts at its max value and decreases, like a health tracker. This is technically separate from
   * whether the tracker is a damage type or not, but in practice all damage trackers are accumulators and all
   * non-accumulators are not damage trackers, so we can use this as a proxy.
   */
  get isAccumulator() {
    return this.isDamageTracker
  }

  /**
   * @returns the index of the threshold that matches the current value of the resource.
   */
  #indexOfThreshold(): number {
    if (this.breakpoints) {
      // return the index of the threshold that the value falls into
      const matches = this.thresholds.filter(threshold => {
        const op = OperatorFunctions[threshold.operator as TrackerOperators]
        const comparison = ComparisonFunctions[threshold.comparison as TrackerComparisons]
        const testValue = op(this.max, threshold.value)

        return comparison(this.value, testValue)
      })

      return matches.length ? this.thresholds.lastIndexOf(matches.pop()!) : -1
    } else {
      // return the index of the threshold that the value falls into
      let result: number | null = null

      this.thresholds.some((threshold, _index) => {
        const op = OperatorFunctions[threshold.operator as TrackerOperators]
        const comparison = ComparisonFunctions[threshold.comparison as TrackerComparisons]
        const testValue = op(this.max, threshold.value)

        return comparison(this.value, testValue) ? ((result = _index), true) : false
      })

      return result ?? -1
    }
  }
}

/* ---------------------------------------- */

const resourceTrackerSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    name: new fields.StringField({ required: true, nullable: false, initial: '' }),
    alias: new fields.StringField({ required: true, nullable: false, initial: '' }),
    pdf: new fields.StringField({ required: true, nullable: false, initial: '' }),
    max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    isDamageType: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isDamageTracker: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    breakpoints: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    thresholds: new fields.ArrayField(
      new fields.EmbeddedDataField(ResourceTrackerThreshold, { required: true, nullable: false }),
      {
        required: true,
        nullable: false,
        initial: [],
      }
    ),
  }
}

type ResourceTrackerSchema = ReturnType<typeof resourceTrackerSchema>

/* ---------------------------------------- */

class ResourceTrackerThreshold extends foundry.abstract.DataModel<ResourceTrackerThresholdSchema> {
  static override defineSchema() {
    return resourceTrackerThresholdSchema()
  }
}

/* ---------------------------------------- */

const resourceTrackerThresholdSchema = () => {
  return {
    comparison: new fields.StringField({ required: true, nullable: false }),

    operator: new fields.StringField({ required: true, nullable: false }),
    value: new fields.NumberField({ required: true, nullable: false }),
    condition: new fields.StringField({ required: true, nullable: false }),
    color: new fields.StringField({ required: true, nullable: false }),
  }
}

type ResourceTrackerThresholdSchema = ReturnType<typeof resourceTrackerThresholdSchema>

/* ---------------------------------------- */

class ResourceTrackerTemplate extends foundry.abstract.DataModel<ResourceTrackerTemplateSchema> {
  static override defineSchema() {
    return resourceTrackerTemplateSchema()
  }
}

/* ---------------------------------------- */

const resourceTrackerTemplateSchema = () => {
  return {
    tracker: new fields.EmbeddedDataField(TrackerInstance, { required: true, nullable: false }),
    initialValue: new fields.StringField({ required: true, nullable: false }),
    // @deprecated slot is replaced by autoapply, but we keep it for migration purposes. It will be removed in a future update.
    slot: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    autoapply: new fields.BooleanField({ required: true, nullable: true, initial: false }),
  }
}

type ResourceTrackerTemplateSchema = ReturnType<typeof resourceTrackerTemplateSchema>

/* ---------------------------------------- */

export {
  TrackerOperators,
  TrackerComparators,
  OperatorFunctions,
  ComparisonFunctions,
  type ThresholdDescriptor,
  TrackerInstance,
  ResourceTrackerThreshold,
  ResourceTrackerTemplate,
  type ResourceTrackerSchema,
  type ResourceTrackerThresholdSchema,
  type ResourceTrackerTemplateSchema,
}
