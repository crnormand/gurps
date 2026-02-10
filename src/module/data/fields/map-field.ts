import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { AnyMutableObject, AnyObject, SimpleMerge } from 'fvtt-types/utils'

class MapField<
  const KeyType extends fields.DataField.Any,
  const ValueType extends fields.DataField.Any,
  const Options extends MapField.AnyOptions = MapField.DefaultOptions,
  const AssignmentKeyType = MapField.AssignmentKeyType<KeyType>,
  const AssignmentValueType = MapField.AssignmentValueType<ValueType>,
  const InitializedKeyType = MapField.InitializedKeyType<KeyType>,
  const InitializedValueType = MapField.InitializedValueType<ValueType>,
  const PersistedKeyType = MapField.PersistedKeyType<KeyType>,
  const PersistedValueType = MapField.PersistedValueType<ValueType>,
  const PersistedType extends MapField.PersistedElementType<PersistedKeyType, PersistedValueType>[] | null | undefined =
    MapField.PersistedType<PersistedKeyType, PersistedValueType, Options>,
> extends fields.ArrayField<
  MapField.ElementFieldType<KeyType, ValueType>,
  Options,
  MapField.AssignmentElementType<AssignmentKeyType, AssignmentValueType>,
  MapField.InitializedElementType<InitializedKeyType, InitializedValueType>,
  MapField.AssignmentType<AssignmentKeyType, AssignmentValueType, Options>,
  MapField.InitializedType<InitializedKeyType, InitializedValueType, Options>,
  MapField.PersistedElementType<PersistedKeyType, PersistedValueType>,
  PersistedType
> {
  key: KeyType
  value: ValueType

  /* ---------------------------------------- */

  constructor(key: KeyType, value: ValueType, options?: Options, context?: fields.DataField.ConstructionContext) {
    const element = new fields.SchemaField({ key, value })

    super(element, options, context)
    this.key = this.element.get('key') as KeyType
    this.value = this.element.get('value') as ValueType
  }

  /* ---------------------------------------- */

  override getInitialValue(
    data?: unknown
  ): MapField.InitializedType<InitializedKeyType, InitializedValueType, Options> {
    const initial = super.getInitialValue(data)

    if (initial === undefined) {
      return this.required ? new Map() : initial
    }

    if (initial === null) return initial

    // Avoid wrapping an existing Map instance.
    if (initial instanceof Map) return initial

    return new Map(initial)
  }

  /* ---------------------------------------- */

  override initialize(
    value: PersistedType,
    model: DataModel.Any,
    options?: fields.DataField.InitializeOptions
  ):
    | MapField.InitializedType<InitializedKeyType, InitializedValueType, Options>
    | (() => MapField.InitializedType<InitializedKeyType, InitializedValueType, Options> | null) {
    if (!value) return value as MapField.InitializedType<InitializedKeyType, InitializedValueType, Options>

    // If already a Map, initialize entries in-place to preserve reference.
    if (value instanceof Map) {
      const entries = Array.from(value.entries()) as [unknown, unknown][]

      value.clear()

      for (const [entryKey, entryValue] of entries) {
        value.set(this.key.initialize(entryKey, model, options), this.value.initialize(entryValue, model, options))
      }

      return value as MapField.InitializedType<InitializedKeyType, InitializedValueType, Options>
    }

    const arr: [InitializedKeyType, InitializedValueType][] = []

    if (!(value instanceof Array)) return new Map()

    value.forEach((element, i) => {
      if (element instanceof Array && element.length === 2) {
        arr[i] = [this.key.initialize(element[0], model, options), this.value.initialize(element[1], model, options)]
      } else if (
        !(element instanceof Array) &&
        element &&
        typeof element === 'object' &&
        Object.hasOwn(element, 'key') &&
        Object.hasOwn(element, 'value')
      ) {
        arr[i] = [
          this.key.initialize(element.key, model, options),
          this.value.initialize(element.value, model, options),
        ]
      } else {
        console.error(`MapField: Invalid element encountered during initialization: ${element}`)
      }
    })

    return new Map(arr)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): MapField.AssignmentType<AssignmentKeyType, AssignmentValueType, Options> {
    const type = foundry.utils.getType(value)

    if (type === 'Map') return value as Map<AssignmentKeyType, AssignmentValueType>

    if (type === 'Object') {
      const arr: [AssignmentKeyType, AssignmentValueType][] = []

      for (const [key, element] of Object.entries(value as AnyObject)) {
        const i = Number(key)

        const elementType = foundry.utils.getType(element)

        if (elementType === 'Array' && (element as unknown[]).length === 2) {
          if (Number.isInteger(i) && i >= 0) arr[i] = element as [AssignmentKeyType, AssignmentValueType]
        }
      }

      return new Map(arr)
    } else if (type === 'Set') return new Map(value as Set<[AssignmentKeyType, AssignmentValueType]>)

    return value instanceof Array ? new Map(value) : new Map([value as [AssignmentKeyType, AssignmentValueType]])
  }

  /* ---------------------------------------- */

  protected override _cleanType(
    value: MapField.InitializedType<InitializedKeyType, InitializedValueType, Options>,
    options?: fields.DataField.CleanOptions
  ): MapField.InitializedType<InitializedKeyType, InitializedValueType, Options> {
    if (value === undefined || value === null) return value

    if (!(value instanceof Map)) {
      console.error('MapField: Expected a Map instance during cleaning, but received:', value)

      return value
    }

    // Clean entries in-place to preserve the Map reference.
    const entries = Array.from(value.entries())

    value.clear()

    for (const [entryKey, entryValue] of entries) {
      value.set(
        this.key.clean(entryKey, { ...options, partial: false }),
        this.value.clean(entryValue, { ...options, partial: false })
      )
    }

    return value
  }

  /* ---------------------------------------- */

  protected override _validateType(
    value: MapField.InitializedType<InitializedKeyType, InitializedValueType, Options>,
    options?: fields.DataField.ValidateOptions<this>
  ): boolean | foundry.data.validation.DataModelValidationFailure | void {
    if (!(value instanceof Map)) throw new Error('must be a Map')

    return this._validateEntries(value, options)
  }

  /* ---------------------------------------- */

  protected _validateEntries(
    value: Map<unknown, unknown>,
    options?: fields.DataField.ValidateOptions<this>
  ): foundry.data.validation.DataModelValidationFailure | void {
    const mapFailure = new foundry.data.validation.DataModelValidationFailure()
    const keyFailure = new foundry.data.validation.DataModelValidationFailure()
    const valueFailure = new foundry.data.validation.DataModelValidationFailure()

    for (const [entryKey, entryValue] of Array.from(value.entries())) {
      const keyFailureResult = this._validateKey(entryKey, { ...options, partial: false })
      const valueFailureResult = this._validateValue(entryValue, { ...options, partial: false })

      if (keyFailureResult) {
        keyFailure.elements.push({ id: entryKey as string, failure: keyFailureResult })
        mapFailure.unresolved ||= keyFailureResult.unresolved
      }

      if (valueFailureResult) {
        valueFailure.elements.push({ id: entryKey as string, failure: valueFailureResult })
        mapFailure.unresolved ||= valueFailureResult.unresolved
      }
    }

    if (keyFailure.elements.length) mapFailure.elements.push({ id: 'keys', failure: keyFailure })
    if (valueFailure.elements.length) mapFailure.elements.push({ id: 'values', failure: valueFailure })

    if (mapFailure.elements.length) return mapFailure
  }

  /* ---------------------------------------- */

  protected _validateKey(
    value: unknown,
    options: fields.DataField.ValidateOptions<this>
  ): foundry.data.validation.DataModelValidationFailure | void {
    return this.key.validate(value, { ...options, partial: false } as fields.DataField.ValidateOptions<KeyType>)
  }

  protected _validateValue(
    value: unknown,
    options: fields.DataField.ValidateOptions<this>
  ): foundry.data.validation.DataModelValidationFailure | void {
    return this.value.validate(value, { ...options, partial: false } as fields.DataField.ValidateOptions<ValueType>)
  }

  /* ---------------------------------------- */

  override _updateDiff(
    source: AnyMutableObject,
    key: string,
    value: unknown,
    difference: AnyMutableObject,
    _options?: DataModel.UpdateOptions
  ): void {
    const current = source[key]

    value = foundry.utils.applySpecialKeys(value)

    // NOTE: Foundry extends the Array type, providing the `equals` instance property
    // which compares Arrays itemwise
    if (
      value === current ||
      [...(value as Map<AssignmentKeyType, AssignmentValueType>)]?.equals([
        ...(current as Map<AssignmentKeyType, AssignmentValueType>),
      ])
    )
      return
    source[key] = value
    difference[key] = foundry.utils.deepClone(value)
  }

  /* ---------------------------------------- */

  /**
   * Commit map field changes by replacing map contents while preserving the map reference itself.
   * @override
   */
  override _updateCommit(
    source: AnyMutableObject,
    key: string,
    value: unknown,
    _diff: unknown,
    _options?: DataModel.UpdateOptions
  ): void {
    const map = source[key] as Map<unknown, unknown>

    // Special Cases: * -> undefined, * -> null, undefined -> *, null -> *
    if (!map || !value) {
      source[key] = value

      return
    }

    map.clear()

    for (const [entryKey, entryValue] of [...(value as Map<unknown, unknown>).entries()]) {
      map.set(entryKey, entryValue)
    }
  }
}

/* ---------------------------------------- */

namespace MapField {
  export type Any = MapField<fields.DataField.Any, fields.DataField.Any, AnyOptions>

  /* ---------------------------------------- */

  type BaseAssignmentType<AssignmentKeyType, AssignmentValueType> =
    | Record<string, { key: AssignmentKeyType; value: AssignmentValueType }>
    | Iterable<[AssignmentKeyType, AssignmentValueType]>
    | [AssignmentKeyType, AssignmentValueType][]
    | [AssignmentKeyType, AssignmentValueType]

  /* ---------------------------------------- */

  export type ElementFieldType<
    KeyType extends fields.DataField.Any,
    ValueType extends fields.DataField.Any,
  > = fields.SchemaField<{ key: KeyType; value: ValueType }>

  /* ---------------------------------------- */

  export type Options<AssignmentKeyType, AssignmentValueType> = fields.ArrayField.Options<
    BaseAssignmentType<AssignmentKeyType, AssignmentValueType>
  >

  /* ---------------------------------------- */

  export type AnyOptions = Options<unknown, unknown>

  /* ---------------------------------------- */

  // NOTE: Currently, there is no difference between this and ArrayField.DefaultOptions
  // so we can get away with just passing through the same type.
  export type DefaultOptions = fields.ArrayField.DefaultOptions

  /* ---------------------------------------- */

  type MergedOptions<Opts extends AnyOptions> = SimpleMerge<DefaultOptions, Opts>

  /* ---------------------------------------- */

  export type _EffectiveOptions<Options extends AnyOptions> = Options['initial'] extends undefined
    ? Options['min'] extends 0
      ? SimpleMerge<Options, { initial: [] }>
      : Options // If `min` is set to anything but `0` the effective `initial` of `[]` is invalid.
    : Options

  /* ---------------------------------------- */

  export type AssignmentKeyType<KeyType extends fields.DataField.Any> = KeyType extends
    | (abstract new (...args: infer _1) => { ' __fvtt_types_internal_assignment_data': infer AssignmentData })
    | { ' __fvtt_types_internal_assignment_data': infer AssignmentData }
    ? AssignmentData
    : never

  export type AssignmentValueType<ValueType extends fields.DataField.Any> = ValueType extends
    | (abstract new (...args: infer _1) => { ' __fvtt_types_internal_assignment_data': infer AssignmentData })
    | { ' __fvtt_types_internal_assignment_data': infer AssignmentData }
    ? AssignmentData
    : never

  export type AssignmentElementType<AssignmentKeyType, AssignmentValueType> =
    | { key: AssignmentKeyType; value: AssignmentValueType }
    | [AssignmentKeyType, AssignmentValueType]

  /* ---------------------------------------- */

  export type InitializedKeyType<KeyType extends fields.DataField.Any> = KeyType extends
    | (abstract new (...args: infer _1) => { ' __fvtt_types_internal_initialized_data': infer InitializedData })
    | { ' __fvtt_types_internal_initialized_data': infer InitializedData }
    ? InitializedData
    : never

  export type InitializedValueType<ValueType extends fields.DataField.Any> = ValueType extends
    | (abstract new (...args: infer _1) => { ' __fvtt_types_internal_initialized_data': infer InitializedData })
    | { ' __fvtt_types_internal_initialized_data': infer InitializedData }
    ? InitializedData
    : never

  export type InitializedElementType<InitializedKeyType, InitializedValueType> =
    | { key: InitializedKeyType; value: InitializedValueType }
    | [InitializedKeyType, InitializedValueType]

  /* ---------------------------------------- */

  export type PersistedKeyType<KeyType extends fields.DataField.Any> = KeyType extends
    | (abstract new (...args: infer _1) => { ' __fvtt_types_internal_source_data': infer PersistedData })
    | { ' __fvtt_types_internal_source_data': infer PersistedData }
    ? PersistedData
    : never

  export type PersistedValueType<ValueType extends fields.DataField.Any> = ValueType extends
    | (abstract new (...args: infer _1) => { ' __fvtt_types_internal_source_data': infer PersistedData })
    | { ' __fvtt_types_internal_source_data': infer PersistedData }
    ? PersistedData
    : never

  export type PersistedElementType<PersistedKeyType, PersistedValueType> =
    | [PersistedKeyType, PersistedValueType]
    | { key: PersistedKeyType; value: PersistedValueType }

  /* ---------------------------------------- */

  export type AssignmentType<
    AssignmentKeyType,
    AssignmentValueType,
    Opts extends AnyOptions,
  > = fields.DataField.DerivedAssignmentType<
    BaseAssignmentType<AssignmentKeyType, AssignmentValueType>,
    MapField._EffectiveOptions<MergedOptions<Opts>>
  >

  /* ---------------------------------------- */

  export type InitializedType<
    InitializedKeyType,
    InitializedValueType,
    Opts extends AnyOptions,
  > = fields.DataField.DerivedInitializedType<
    Map<InitializedKeyType, InitializedValueType>,
    MapField._EffectiveOptions<MergedOptions<Opts>>
  >

  export type PersistedType<
    PersistedKeyType,
    PersistedValueType,
    Opts extends AnyOptions,
  > = fields.DataField.DerivedInitializedType<
    [PersistedKeyType, PersistedValueType][],
    MapField._EffectiveOptions<MergedOptions<Opts>>
  >
}

/* ---------------------------------------- */

export { MapField }
