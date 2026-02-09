import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

enum NumericComparison {
  Any = 'any',
  Equals = 'is',
  NotEquals = 'isNot',
  AtLeast = 'atLeast',
  AtMost = 'atMost',
}

/* ---------------------------------------- */

class NumberCriteria extends DataModel<NumberCriteriaSchema> {
  static override defineSchema(): NumberCriteriaSchema {
    return numberCriteriaSchema()
  }

  /* ---------------------------------------- */

  static Comparison = NumericComparison

  /* ---------------------------------------- */

  matches(value: number | null): boolean {
    if (this.qualifier === null || this.qualifier === undefined) {
      if (this.compare === NumericComparison.Any || this.compare === NumericComparison.NotEquals) return true

      return false
    }

    if (value === null || value === undefined) {
      if (this.compare === NumericComparison.Any || this.compare === NumericComparison.NotEquals) return true

      return false
    }

    switch (this.compare) {
      case NumericComparison.Any:
        return true
      case NumericComparison.Equals:
        return value === this.qualifier
      case NumericComparison.NotEquals:
        return value !== this.qualifier
      case NumericComparison.AtLeast:
        return value >= this.qualifier
      case NumericComparison.AtMost:
        return value <= this.qualifier
      default:
        console.error(`Invalid numeric comparitor: ${this.compare}`)

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
    qualifier: new fields.NumberField({ required: true, nullable: true }),
  }
}

type NumberCriteriaSchema = ReturnType<typeof numberCriteriaSchema>

/* ---------------------------------------- */

namespace NumberCriteriaField {
  export interface Options extends fields.EmbeddedDataField.Options<typeof NumberCriteria> {
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
    typeof NumberCriteria,
    Opts
  >

  /* ---------------------------------------- */

  export type InitializedType<Opts extends Options> = fields.EmbeddedDataField.InitializedType<
    typeof NumberCriteria,
    Opts
  >

  /* ---------------------------------------- */

  export type PersistedType<Opts extends Options> = fields.EmbeddedDataField.PersistedType<typeof NumberCriteria, Opts>

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

class NumberCriteriaField<
  const Options extends NumberCriteriaField.Options,
  const AssignmentType = NumberCriteriaField.AssignmentType<Options>,
  const InitializedType = NumberCriteriaField.InitializedType<Options>,
  const PersistedType extends AnyObject | null | undefined = NumberCriteriaField.PersistedType<Options>,
> extends fields.EmbeddedDataField<typeof NumberCriteria, Options, AssignmentType, InitializedType, PersistedType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(NumberCriteria, options, context)
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

export { NumberCriteria, NumericComparison, NumberCriteriaField }
