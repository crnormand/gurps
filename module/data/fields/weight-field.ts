import { Weight } from '../common/weight.js'
import EmbeddedDataField = foundry.data.fields.EmbeddedDataField
import DataField = foundry.data.fields.DataField
import { AnyObject } from 'fvtt-types/utils'

class WeightField<
  const Options extends WeightField.Options = WeightField.DefaultOptions,
  const AssignmentType = WeightField.AssignmentType<Options>,
  const InitializedType = WeightField.InitializedType<Options>,
  const PersistedType extends AnyObject | null | undefined = WeightField.PersistedType<Options>,
> extends EmbeddedDataField<typeof Weight, Options, AssignmentType, InitializedType, PersistedType> {
  constructor(options?: Options, context?: DataField.Context) {
    super(Weight, options, context)
  }

  /* ---------------------------------------- */

  override clean(value: AssignmentType, options?: DataField.CleanOptions): InitializedType {
    if (typeof value === 'number' || typeof value === 'string') {
      const data = Weight.from(value, Weight.Unit.Inch, true).toObject()
      return super.clean(data as AssignmentType, options)
    }
    return super.clean(value, options)
  }

  /* ---------------------------------------- */

  protected override _toInput(config: DataField.ToInputConfig<InitializedType>): HTMLElement | HTMLCollection {
    console.log(config)
    if (config.value === undefined) config.value = this.getInitialValue({})
    const value = Weight.objectToString(config.value as Weight)
    const inputConfig = {
      ...config,
      value,
    }
    return foundry.applications.fields.createTextInput(inputConfig)
  }
}

/* ---------------------------------------- */

namespace WeightField {
  export type Options = EmbeddedDataField.Options<typeof Weight>

  /* ---------------------------------------- */

  export type DefaultOptions = EmbeddedDataField.DefaultOptions

  /* ---------------------------------------- */

  export type AssignmentType<Opts extends Options> = EmbeddedDataField.AssignmentType<typeof Weight, Opts>

  /* ---------------------------------------- */

  export type InitializedType<Opts extends Options> = EmbeddedDataField.InitializedType<typeof Weight, Opts>

  /* ---------------------------------------- */

  export type PersistedType<Opts extends Options> = EmbeddedDataField.PersistedType<typeof Weight, Opts>
}

export { WeightField }
