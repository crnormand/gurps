import { fields } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

/* ---------------------------------------- */

/**
 * Schema fields required for replaceable functionality
 */
const nameableSchema = () => {
  return {
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
  }
}

type NameableSchema = ReturnType<typeof nameableSchema>

/* ---------------------------------------- */

interface INameableFiller {
  // Fill the Record with nameable keys
  fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void
}

/* ---------------------------------------- */

interface INameableAccesser {
  // Returns the replacements to be used with Nameables.
  nameableReplacements: Map<string, string>
}

/* ---------------------------------------- */

interface INameableApplier extends INameableFiller, INameableAccesser {
  // Applies the nameable keys to this object
  applyNameableKeys(replacements: Record<string, string>): void
}

/* ---------------------------------------- */

namespace INameable {
  export interface AccesserBaseData extends AnyObject {
    nameableReplacements: Map<string, string>
  }

  export function extract(
    this: INameableFiller,
    text: string | string[],
    map: Map<string, string>,
    existing?: Map<string, string>
  ): void {
    if (typeof text === 'string') text = [text]

    for (const line of text) {
      const matches = [...line.matchAll(/@([^@]+)@/gi)].map(match => match[1])

      for (const match of matches) {
        if (existing && existing.has(match)) map.set(match, existing.get(match) ?? match)
        else map.set(match, match)
      }
    }
  }

  export function applyToArray(this: INameableApplier, text: string[]): string[] {
    const newText = text.map(line => {
      if (!line.includes('@')) return line

      return apply.call(this, line)
    })

    return newText
  }

  export function apply(this: INameableApplier, text: string): string {
    for (const [key, value] of Object.entries(this.nameableReplacements)) {
      text = text.replaceAll(`@${key}@`, value)
    }

    return text
  }

  /* ---------------------------------------- */

  export function isAccesser(obj: unknown): obj is INameableAccesser {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'nameableReplacements' in obj &&
      typeof obj.nameableReplacements === 'object'
    )
  }

  /* ---------------------------------------- */

  export function isFiller(obj: unknown): obj is INameableFiller {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'fillWithNameableKeys' in obj &&
      typeof obj.fillWithNameableKeys === 'function'
    )
  }

  /* ---------------------------------------- */

  export function isApplier(obj: unknown): obj is INameableApplier {
    return isAccesser(obj) && isFiller(obj) && 'applyNameableKeys' in obj && typeof obj.applyNameableKeys === 'function'
  }
}

export {
  nameableSchema,
  type NameableSchema,
  INameable,
  type INameableApplier,
  type INameableAccesser,
  type INameableFiller,
}
