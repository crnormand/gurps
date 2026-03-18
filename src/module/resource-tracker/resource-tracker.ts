import { fields } from '@gurps-types/foundry/index.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'
import { ThresholdDescriptor } from '@rules/injury/hit-points.js'

import {
  IResourceTrackerTemplate,
  IResourceTrackerThreshold,
  IResourceTracker,
  OperatorFunctions,
  ComparisonFunctions,
  TrackerOperators,
  TrackerComparisons,
} from './types.js'

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
    const initialValue = template.tracker.initialValue

    if (initialValue !== null && initialValue !== '') {
      tracker.value = parseInt(initialValue) || 0

      if (isNaN(tracker.value)) {
        // Try to use initialValue as a path to another value.
        const foundValue = Number(foundry.utils.getProperty(actor, 'system.' + initialValue))

        tracker.value = isNaN(foundValue) ? template.tracker.value : foundValue
      }
    }

    return tracker
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

  get thresholdDescriptors(): ThresholdDescriptor[] {
    const results: ThresholdDescriptor[] = []

    // Make a copy of the thresholds array.
    const thresholds = [...this.thresholds]

    if (this.isAccumulator) {
      results.push({ value: 0, condition: thresholds.shift()?.condition ?? '', color: thresholds[0]?.color ?? '' })

      for (const threshold of thresholds) {
        results.push({
          value: Math.trunc(getOperator(threshold)(this.max, threshold.value)),
          condition: threshold.condition,
          color: threshold.color ?? '',
        })
      }
    } else {
      if (this.useBreakpoints) {
        results.push({
          value: this.max,
          condition: thresholds.shift()?.condition ?? '',
          color: thresholds[0]?.color ?? '',
        })

        for (const threshold of thresholds) {
          results.push({
            value: Math.trunc(getOperator(threshold)(this.max, threshold.value)),
            condition: threshold.condition,
            color: threshold.color ?? '',
          })
        }
      } else {
        results.push({
          value: this.max,
          condition: thresholds.shift()?.condition ?? '',
          color: thresholds[0]?.color ?? '',
        })

        for (const threshold of thresholds) {
          results.push({
            value: Math.trunc(getOperator(threshold)(this.max, threshold.value)),
            condition: threshold.condition,
            color: threshold.color ?? '',
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

  get max(): number {
    if (this.initialValue === null || this.initialValue === '') {
      return 0
    }

    if (isNaN(parseInt(this.initialValue))) {
      return foundry.utils.getProperty(this.parent, this.initialValue) as number
    }

    return Number(this.initialValue)
  }

  get value(): number {
    return this.currentValue ?? (this.isAccumulator ? 0 : this.max)
  }

  set value(newValue: number) {
    let value = this.isMinEnforced && newValue < this.min ? this.min : newValue

    value = this.isMaxEnforced && value > this.max ? this.max : value

    void this.update({ currentValue: value }).catch(error => {
      console.error('Failed to update tracker value', error)
    })
  }

  resetValue() {
    this.value = this.isAccumulator ? 0 : this.max
  }
}

/* ---------------------------------------- */

const resourceTrackerSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    name: new fields.StringField({ required: true, nullable: false, initial: '' }),

    // The current value of the resource. If null, the value is derived (0 for accumulators, max for non-accumulators).
    // After the first update, this will always be a number.
    currentValue: new fields.NumberField({ required: true, nullable: true, initial: null }),

    // Contains either a number or a property path to a number on the actor's system data. This allows the tracker to
    // either have a static max value or a dynamic one that references another value on the actor.
    initialValue: new fields.StringField({ required: true, nullable: true, initial: null }),

    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    alias: new fields.StringField({ required: true, nullable: false, initial: '' }),
    pdf: new fields.StringField({ required: true, nullable: false, initial: '' }),
    isMaxEnforced: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isMinEnforced: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isDamageType: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    isAccumulator: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    useBreakpoints: new fields.BooleanField({ required: true, nullable: false, initial: false }),
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
    autoapply: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type ResourceTrackerTemplateSchema = ReturnType<typeof resourceTrackerTemplateSchema>

/* ---------------------------------------- */

export {
  TrackerInstance,
  ResourceTrackerThreshold,
  ResourceTrackerTemplate,
  type ResourceTrackerSchema,
  type ResourceTrackerThresholdSchema,
  type ResourceTrackerTemplateSchema,
  resourceTrackerTemplateSchema,
}
