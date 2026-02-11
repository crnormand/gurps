import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

import { Weight, WeightField } from '../common/weight.js'

import { NumericComparison } from './number-criteria.js'

class WeightCriteria extends DataModel<WeightCriteriaSchema> {
  static override defineSchema(): WeightCriteriaSchema {
    return numberCriteriaSchema()
  }

  /* ---------------------------------------- */

  static Comparison = NumericComparison

  /* ---------------------------------------- */

  matches(value: Weight): boolean {
    const valuePounds = value.to(Weight.Unit.Pound).value
    const qualifierPounds = this.qualifier.to(Weight.Unit.Pound).value

    switch (this.compare) {
      case NumericComparison.Any:
        return true
      case NumericComparison.Equals:
        return valuePounds === qualifierPounds
      case NumericComparison.NotEquals:
        return valuePounds !== qualifierPounds
      case NumericComparison.AtLeast:
        return valuePounds >= qualifierPounds
      case NumericComparison.AtMost:
        return valuePounds <= qualifierPounds
      default:
        console.error(`Invalid weight comparitor: ${this.compare}`)

        return true
    }
  }

  /* ---------------------------------------- */
}

const numberCriteriaSchema = () => {
  return {
    compare: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(NumericComparison),
      initial: NumericComparison.Any,
    }),
    qualifier: new WeightField({ required: true, nullable: false }),
  }
}

type WeightCriteriaSchema = ReturnType<typeof numberCriteriaSchema>

/* ---------------------------------------- */

namespace WeightCriteriaField {
  export interface Options extends fields.EmbeddedDataField.Options<typeof WeightCriteria> {
    /**
     * An array of values or an object of values/labels which represent
     * allowed choices for the .compare field of this element. A function may be provided which dynamically
     * returns the array of choices.
     * @defaultValue `undefined`
     */
    choices?: fields.StringField.Choices | undefined
  }

  /* ---------------------------------------- */

  export type AssignmentType<Opts extends Options> = fields.EmbeddedDataField.AssignmentType<
    typeof WeightCriteria,
    Opts
  >

  /* ---------------------------------------- */

  export type InitializedType<Opts extends Options> = fields.EmbeddedDataField.InitializedType<
    typeof WeightCriteria,
    Opts
  >

  /* ---------------------------------------- */

  export type PersistedType<Opts extends Options> = fields.EmbeddedDataField.PersistedType<typeof WeightCriteria, Opts>

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

class WeightCriteriaField<
  const Options extends WeightCriteriaField.Options,
  const AssignmentType = WeightCriteriaField.AssignmentType<Options>,
  const InitializedType = WeightCriteriaField.InitializedType<Options>,
  const PersistedType extends AnyObject | null | undefined = WeightCriteriaField.PersistedType<Options>,
> extends fields.EmbeddedDataField<typeof WeightCriteria, Options, AssignmentType, InitializedType, PersistedType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(WeightCriteria, options, context)
  }

  /* ---------------------------------------- */

  protected override _toInput(
    config: fields.DataField.ToInputConfig<InitializedType> | fields.DataField.ToInputConfigWithOptions<InitializedType>
  ): HTMLElement | HTMLCollection
  protected override _toInput(
    config: fields.DataField.ToInputConfigWithChoices<InitializedType, Options['choices']>
  ): HTMLElement | HTMLCollection {
    const compareField = this.fields.compare.toInput(config)
    const { choices, ...qualifierConfig } = config
    const qualifierField = this.fields.qualifier.toInput(qualifierConfig)

    // Dummy wrapper, not returned
    const wrapper = document.createElement('div')

    wrapper.innerText = 'ERROR!'

    if (!(compareField instanceof HTMLElement)) {
      console.error('The number criteria comparitor field is not of type HTMLElement')

      return wrapper
    }

    if (!(qualifierField instanceof HTMLElement)) {
      console.error('The number criteria qualifier field is not of type HTMLElement')

      return wrapper
    }

    wrapper.append(compareField, qualifierField)

    return wrapper.children
  }
}

export { WeightCriteria, NumericComparison, WeightCriteriaField }
