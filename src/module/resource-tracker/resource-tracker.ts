import { fields } from '@gurps-types/foundry/index.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'

import { IResourceTrackerTemplate, IResourceTrackerThreshold, IThresholdDescriptor, IResourceTracker } from './types.js'

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

/* ---------------------------------------- */

class TrackerInstance extends PseudoDocument<ResourceTrackerSchema> implements IResourceTracker {
  static override defineSchema() {
    return resourceTrackerSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'ResourceTracker'> {
    return {
      documentName: 'ResourceTracker',
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

  override async prepareDerivedData() {
    super.prepareDerivedData()

    // If tracker has an initialValue term, we need to evaluate it and set the tracker's value accordingly.
    if (this.initialValue) {
      // First try to parse initialValue as a number.
      let value = parseInt(this.initialValue)

      if (isNaN(value)) {
        // If parsing failed, try to use initialValue as a path to another value on the actor.
        const foundValue = foundry.utils.getProperty(this.parent, this.initialValue)

        value = typeof foundValue === 'number' ? foundValue : this.value
      }

      const updates: Partial<TrackerInstance> = {}

      updates.max = value
      updates.value = this.isAccumulator ? this.min : value
      updates.initialValue = null

      await this.update(updates)
    }
  }

  async applyTemplate(template: ResourceTrackerTemplate) {
    const initialData = new fields.SchemaField(resourceTrackerSchema()).getInitialValue()
    const data = template.tracker.toObject()

    return this.updateSource(foundry.utils.mergeObject(initialData, data))
  }

  get currentThreshold(): ResourceTrackerThreshold | null {
    const threshold = this.thresholds[this.#indexOfThreshold()]

    return threshold || null
  }

  get thresholdDescriptors(): IThresholdDescriptor[] {
    const results: IThresholdDescriptor[] = []

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
      if (this.useBreakpoints) {
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
   * @returns the index of the threshold that matches the current value of the resource.
   */
  #indexOfThreshold(): number {
    if (this.useBreakpoints) {
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
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    alias: new fields.StringField({ required: true, nullable: false, initial: '' }),
    pdf: new fields.StringField({ required: true, nullable: false, initial: '' }),
    isMaxEnforced: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isMinEnforced: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isDamageType: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isAccumulator: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    useBreakpoints: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    initialValue: new fields.StringField({ required: true, nullable: true, initial: null }),
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

class ResourceTrackerThreshold
  extends foundry.abstract.DataModel<ResourceTrackerThresholdSchema>
  implements IResourceTrackerThreshold
{
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
    color: new fields.StringField({ required: true, nullable: true, initial: null }),
  }
}

type ResourceTrackerThresholdSchema = ReturnType<typeof resourceTrackerThresholdSchema>

/* ---------------------------------------- */

class ResourceTrackerTemplate
  extends foundry.abstract.DataModel<ResourceTrackerTemplateSchema>
  implements IResourceTrackerTemplate
{
  static override defineSchema() {
    return resourceTrackerTemplateSchema()
  }

  get name(): string {
    return this.tracker.name
  }
}

/* ---------------------------------------- */

const resourceTrackerTemplateSchema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    tracker: new fields.EmbeddedDataField(TrackerInstance, { required: true, nullable: false }),
    initialValue: new fields.StringField({ required: true, nullable: true, initial: null }),
    autoapply: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type ResourceTrackerTemplateSchema = ReturnType<typeof resourceTrackerTemplateSchema>

/* ---------------------------------------- */

export {
  TrackerOperators,
  TrackerComparators,
  OperatorFunctions,
  ComparisonFunctions,
  TrackerInstance,
  ResourceTrackerThreshold,
  ResourceTrackerTemplate,
  type ResourceTrackerSchema,
  type ResourceTrackerThresholdSchema,
  type ResourceTrackerTemplateSchema,
}
