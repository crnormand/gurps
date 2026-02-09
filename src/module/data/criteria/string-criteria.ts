import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

enum StringComparison {
  Any = 'any',
  Is = 'is',
  IsNot = 'isNot',
  Contains = 'contains',
  DoesNotContain = 'doesNotContain',
  StartsWith = 'startsWith',
  DoesNotStartWith = 'DoesNotStartWith',
  EndsWith = 'endsWith',
  DoesNotEndWith = 'doesNotEndWith',
}

/* ---------------------------------------- */

class StringCriteria extends DataModel<StringCriteriaSchema> {
  static override defineSchema(): StringCriteriaSchema {
    return stringCriteriaSchema()
  }

  /* ---------------------------------------- */

  static Comparison = StringComparison

  /* ---------------------------------------- */

  matches(value: string | string[]): boolean {
    if (Array.isArray(value)) {
      return this.matchesArray(value)
    }

    const lowerValue = value.toLowerCase().trim()
    const lowerQualifier = this.qualifier?.toLowerCase().trim() || ''

    switch (this.compare) {
      case StringComparison.Any:
        return true
      case StringComparison.Is:
        return lowerValue === lowerQualifier
      case StringComparison.IsNot:
        return lowerValue !== lowerQualifier
      case StringComparison.Contains:
        return lowerValue.includes(lowerQualifier)
      case StringComparison.DoesNotContain:
        return !lowerValue.includes(lowerQualifier)
      case StringComparison.StartsWith:
        return lowerValue.startsWith(lowerQualifier)
      case StringComparison.DoesNotStartWith:
        return !lowerValue.startsWith(lowerQualifier)
      case StringComparison.EndsWith:
        return lowerValue.endsWith(lowerQualifier)
      case StringComparison.DoesNotEndWith:
        return !lowerValue.endsWith(lowerQualifier)
      default:
        console.error(`Invalid string comparitor: ${this.compare}`)

        return true
    }
  }

  /* ---------------------------------------- */

  matchesArray(values: string[]): boolean {
    if (values.length === 0) return this.matches('')
    let matches = 0

    for (const value of values) {
      if (this.matches(value)) matches++
    }

    switch (this.compare) {
      case StringComparison.Any:
      case StringComparison.Is:
      case StringComparison.Contains:
      case StringComparison.StartsWith:
      case StringComparison.EndsWith:
        return matches > 0
      case StringComparison.IsNot:
      case StringComparison.DoesNotContain:
      case StringComparison.DoesNotStartWith:
      case StringComparison.DoesNotEndWith:
        return matches === values.length
      default:
        return matches > 0
    }
  }

  /* ---------------------------------------- */
}

const stringCriteriaSchema = () => {
  return {
    compare: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(StringComparison),
      initial: StringComparison.Any,
    }),
    qualifier: new fields.StringField({ required: true, nullable: true }),
  }
}

type StringCriteriaSchema = ReturnType<typeof stringCriteriaSchema>

/* ---------------------------------------- */

namespace StringCriteriaField {
  export interface Options extends fields.EmbeddedDataField.Options<typeof StringCriteria> {
    /**
     * An array of values or an object of values/labels which represent
     * allowed choices for the .compare field of this element. A function may be provided which dynamically
     * returns the array of choices.
     * @defaultValue `undefined`
     */
    choices?: fields.StringField.Choices | undefined
  }

  /* ---------------------------------------- */

  export type DefaultOptions = fields.EmbeddedDataField.DefaultOptions

  /* ---------------------------------------- */

  export type AssignmentType<Opts extends Options> = fields.EmbeddedDataField.AssignmentType<
    typeof StringCriteria,
    Opts
  >

  /* ---------------------------------------- */

  export type InitializedType<Opts extends Options> = fields.EmbeddedDataField.InitializedType<
    typeof StringCriteria,
    Opts
  >

  /* ---------------------------------------- */

  export type PersistedType<Opts extends Options> = fields.EmbeddedDataField.PersistedType<typeof StringCriteria, Opts>

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

class StringCriteriaField<
  const Options extends StringCriteriaField.Options,
  const AssignmentType = StringCriteriaField.AssignmentType<Options>,
  const InitializedType = StringCriteriaField.InitializedType<Options>,
  const PersistedType extends AnyObject | null | undefined = StringCriteriaField.PersistedType<Options>,
> extends fields.EmbeddedDataField<typeof StringCriteria, Options, AssignmentType, InitializedType, PersistedType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(StringCriteria, options, context)
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
      console.error('The string criteria comparitor field is not of type HTMLElement')

      return wrapper
    }

    if (!(qualifierField instanceof HTMLElement)) {
      console.error('The string criteria qualifier field is not of type HTMLElement')

      return wrapper
    }

    wrapper.append(compareField, qualifierField)

    return wrapper.children
  }
}

export { StringCriteria, StringComparison, StringCriteriaField }
