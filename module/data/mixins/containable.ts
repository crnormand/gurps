const fields = foundry.data.fields

/* ---------------------------------------- */

/**
 * Schema fields required for containable functionality
 */
const containableSchema = () => {
  return {
    containedBy: new fields.StringField({ required: true, nullable: true, initial: null }),
    open: new fields.BooleanField({ required: true, nullable: true, initial: true }),
  }
}

type ContainableSchema = ReturnType<typeof containableSchema>

/* ---------------------------------------- */

/**
 * Interface for objects that can be contained in a hierarchical structure
 */
interface IContainable<T = any> {
  /** Unique identifier for this object */
  readonly id: string | null

  /** ID of the containing object, null if top-level */
  containedBy: string | null

  /** Whether this container is expanded in the UI */
  open: boolean | null

  /** Get the parent container object */
  readonly container: T | null

  /** Check if this object is contained by another */
  readonly isContained: boolean

  /** Get direct children of this container */
  readonly contents: T[]

  /** Get all descendants recursively */
  readonly allContents: T[]

  /** Get the depth in the container hierarchy */
  readonly containerDepth: number

  /** Check if this container contains the specified item */
  containsItem(item: T): boolean

  /** Get all ancestors in the container hierarchy. */
  readonly ancestors: T[]

  /** Get all descendants with optional filtering. */
  getDescendants(filter?: (item: T) => boolean): T[]

  /** Check if this object is contained by (directly or indirectly) the specified container. */
  isContainedBy(item: T): boolean
}

/* ---------------------------------------- */

/**
 * Type guard to check if an object implements IContainable
 */
function isContainable<T>(obj: any): obj is IContainable<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'containedBy' in obj &&
    'container' in obj &&
    'isContained' in obj &&
    'contents' in obj &&
    'allContents' in obj &&
    'containerDepth' in obj &&
    'contains' in obj &&
    typeof obj.contains === 'function' &&
    'ancestors' in obj &&
    'getDescendants' in obj &&
    typeof obj.getDescendants === 'function' &&
    'isContainedBy' in obj &&
    typeof obj.isContainedBy === 'function'
  )
}

/* ---------------------------------------- */

export { containableSchema, isContainable, type ContainableSchema, type IContainable }
