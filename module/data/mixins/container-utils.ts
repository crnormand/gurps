import { IContainable } from './containable.js'

/**
 * Utility class for container operations that can be used by any containable object.
 *
 * These utilities rely on the container objects (T) implementing `contents` (which returns an array of direct
 * children) and `container` (which returns the parent object).
 */
export class ContainerUtils {
  static isToggleable(obj: any): boolean {
    return obj && typeof obj === 'object' && 'toggleOpen' in obj && typeof obj.toggleOpen === 'function'
  }

  /**
   * Get all ancestors in the container hierarchy.
   */
  static getAncestors<T>(containable: IContainable<T>): T[] {
    const ancestors: T[] = []
    let current = containable.container
    while (current) {
      ancestors.unshift(current)
      current = (current as unknown as IContainable<T>).container
    }
    return ancestors
  }

  /* ---------------------------------------- */

  /**
   * Get all descendants with optional filtering.
   */
  static getDescendants<T>(containable: IContainable<T>, filter?: (item: T) => boolean): T[] {
    const descendants = containable.allContents
    return filter ? descendants.filter(filter) : descendants
  }

  /* ---------------------------------------- */

  /**
   * Check if a containable object is contained by (directly or indirectly) the specified container.
   */
  static isContainedBy<T>(containable: IContainable<T>, container: IContainable<T>): boolean {
    return container.containsItem(containable as unknown as T)
  }

  /* ---------------------------------------- */

  /**
   * Get all contents recursively (implementation of allContents).
   */
  static getAllContents<T>(containable: IContainable<T>): T[] {
    const result: T[] = []

    for (const child of containable.contents as IContainable<T>[]) {
      result.push(child as T)
      result.push(...(child.allContents as T[]))
    }

    return result
  }

  /* ---------------------------------------- */

  /**
   * Check if a container contains the specified item (directly or indirectly).
   */
  static containsItem<T>(container: IContainable<T>, item: T): boolean {
    const allContents = container.allContents
    return allContents.some(contained => (contained as IContainable<T>).id === (item as IContainable<T>).id)
  }

  /* ---------------------------------------- */

  /**
   * Get the container depth (how many levels deep this item is contained).
   */
  static getContainerDepth<T>(containable: IContainable<T>): number {
    if (!containable.isContained) return 0
    return 1 + (containable.container! as unknown as IContainable<T>).containerDepth
  }

  static isContained<T>(containable: IContainable<T>): boolean {
    return containable.containedBy !== null
  }
}
