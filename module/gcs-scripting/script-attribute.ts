import { GcsAttribute } from '../actor/data/gcs-attribute.ts'

class ScriptAttribute {
  #attribute: GcsAttribute

  constructor(attribute: GcsAttribute) {
    this.#attribute = attribute
  }

  /* ---------------------------------------- */

  get id(): string {
    return this.#attribute.id
  }

  /* ---------------------------------------- */

  get kind(): string | null {
    const definition = this.#attribute.definition

    if (!definition) return null

    return definition.kind
  }

  /* ---------------------------------------- */

  get name(): string | null {
    const definition = this.#attribute.definition

    if (!definition) return null

    if (definition.name === '') return definition.fullName

    return definition.name
  }

  /* ---------------------------------------- */

  get fullName(): string | null {
    const definition = this.#attribute.definition

    if (!definition) return null

    return definition.resolvedFullName
  }
}

export { ScriptAttribute }
