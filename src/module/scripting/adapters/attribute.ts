import { GcsAttribute } from '../../actor/data/gcs-character/attribute.js'
import { SelfProvider } from '../types.js'

class ScriptAttribute {
  #attribute: GcsAttribute

  static newProvider(attribute: GcsAttribute): SelfProvider<ScriptAttribute> {
    return {
      id: '$' + attribute.id,
      provider: new ScriptAttribute(attribute),
    }
  }

  constructor(attribute: GcsAttribute) {
    this.#attribute = attribute
  }

  /* ---------------------------------------- */

  get id(): string {
    return this.#attribute.id
  }

  /* ---------------------------------------- */

  get kind(): string {
    return this.#attribute.definition?.kind ?? ''
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#attribute.definition?.name ?? ''
  }

  /* ---------------------------------------- */

  get fullName(): string {
    return this.#attribute.definition?.resolvedFullName ?? ''
  }

  /* ---------------------------------------- */

  get maximum(): number {
    return this.#attribute.max
  }

  /* ---------------------------------------- */

  get isDecimal(): boolean {
    return this.#attribute.definition?.allowsDecimal ?? false
  }

  /* ---------------------------------------- */

  valueOf(): number {
    return this.#attribute.max
  }
}

export { ScriptAttribute }
