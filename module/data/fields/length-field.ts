import { Length } from '../common/length.js'
import EmbeddedDataField = foundry.data.fields.EmbeddedDataField
import DataField = foundry.data.fields.DataField
import { AnyObject } from 'fvtt-types/utils'

class LengthField<
  const Options extends LengthField.Options = LengthField.DefaultOptions,
  const AssignmentType = LengthField.AssignmentType<Options>,
  const InitializedType = LengthField.InitializedType<Options>,
  const PersistedType extends AnyObject | null | undefined = LengthField.PersistedType<Options>,
> extends EmbeddedDataField<typeof Length, Options, AssignmentType, InitializedType, PersistedType> {
  constructor(options?: Options, context?: DataField.Context) {
    super(Length, options, context)
  }

  /* ---------------------------------------- */

  override clean(value: AssignmentType, options?: DataField.CleanOptions): InitializedType {
    if (typeof value === 'number' || typeof value === 'string') {
      const data = Length.from(value, Length.Unit.Inch, true).toObject()
      return super.clean(data as AssignmentType, options)
    }
    return super.clean(value, options)
  }

  /* ---------------------------------------- */

  protected override _toInput(config: DataField.ToInputConfig<InitializedType>): HTMLElement | HTMLCollection {
    console.log(config)
    if (config.value === undefined) config.value = this.getInitialValue({})
    const value = Length.objectToString(config.value as Length)
    const inputConfig = {
      ...config,
      value,
    }
    return foundry.applications.fields.createTextInput(inputConfig)
  }
}

/* ---------------------------------------- */

namespace LengthField {
  export type Options = EmbeddedDataField.Options<typeof Length>

  /* ---------------------------------------- */

  export type DefaultOptions = EmbeddedDataField.DefaultOptions

  /* ---------------------------------------- */

  export type AssignmentType<Opts extends Options> = EmbeddedDataField.AssignmentType<typeof Length, Opts>

  /* ---------------------------------------- */

  export type InitializedType<Opts extends Options> = EmbeddedDataField.InitializedType<typeof Length, Opts>

  /* ---------------------------------------- */

  export type PersistedType<Opts extends Options> = EmbeddedDataField.PersistedType<typeof Length, Opts>
}

export { LengthField }
