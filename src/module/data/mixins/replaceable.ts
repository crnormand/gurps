import { fields } from '@gurps-types/foundry/index.js'

/* ---------------------------------------- */

/**
 * Schema fields required for replaceable functionality
 */
const replaceableSchema = () => {
  return {
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
  }
}

type ReplaceableSchema = ReturnType<typeof replaceableSchema>

/* ---------------------------------------- */

/**
 * Interface for objects that can have replacement strings
 */
interface IReplaceable {
  /** Mapping of replacement strings */
  replacements: Record<string, string>
}

/* ---------------------------------------- */

/**
 * Type guard to check if an object implements IReplaceable
 */
function isReplaceable(obj: any): obj is IReplaceable {
  return typeof obj === 'object' && obj !== null && 'replacements' in obj
}

/* ---------------------------------------- */

export { replaceableSchema, isReplaceable, type ReplaceableSchema, type IReplaceable }
