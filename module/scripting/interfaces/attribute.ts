import { GcsAttribute } from '../../actor/data/gcs-attribute.ts'

class ScriptAttribute {
  #attribute: GcsAttribute

  // id: string
  // kind: string
  // name: string
  // fullName: string
  // maximum: number
  // isDecimal: boolean
  // valueOf: number

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
    return this.#attribute.definition?.isDecimal ?? false
  }

  valueOf(): number {
    return this.#attribute.max
  }
}

/* ---------------------------------------- */

export { ScriptAttribute }
