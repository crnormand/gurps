import { SimpleMerge } from 'fvtt-types/utils'

import { fields } from '../../types/foundry/index.js'

/**
 * A StringField subclass that supports replaceable values.
 */
class ExtendedStringField<
  Options extends ExtendedStringField.Options = ExtendedStringField.DefaultOptions,
> extends fields.StringField<Options> {
  #replaceable: boolean = ExtendedStringField._defaults.replaceable!

  /* ---------------------------------------- */

  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(options, context)

    if (options && Object.hasOwn(options, 'replaceable') && options.replaceable !== undefined) {
      this.#replaceable = options.replaceable
    }
  }

  /* ---------------------------------------- */

  get replaceable(): boolean {
    return this.#replaceable
  }

  /* ---------------------------------------- */

  protected static override get _defaults(): ExtendedStringField.Options<unknown> {
    return Object.assign(super._defaults, { replaceable: false })
  }
}

/* ---------------------------------------- */

namespace ExtendedStringField {
  export interface Options<Type = string> extends fields.StringField.Options<Type> {
    /**
     * Can part of the value of this field be replaced using a replacement map?
     * @defaultValue: false
     */
    replaceable?: boolean
  }
  /* ---------------------------------------- */

  export type DefaultOptions = SimpleMerge<
    fields.StringField.DefaultOptions,
    {
      replaceable: false
    }
  >
}

/* ---------------------------------------- */

export { ExtendedStringField }
