export interface EntryData {
  itemid?: string
  contains?: Record<string, EntryData>
  collapsed?: Record<string, EntryData>
}

export interface DeletionItem {
  path: string
  itemid: string | undefined
}

export const collectDeletions = (data: EntryData, basePath: string): DeletionItem[] => {
  const items: DeletionItem[] = []

  if (data.contains)
    for (const key of Object.keys(data.contains).sort().reverse())
      items.push(...collectDeletions(data.contains[key], `${basePath}.contains.${key}`))

  if (data.collapsed)
    for (const key of Object.keys(data.collapsed).sort().reverse())
      items.push(...collectDeletions(data.collapsed[key], `${basePath}.collapsed.${key}`))

  items.push({ path: basePath, itemid: data.itemid })
  return items
}

export interface RemoveKeyResult<T> {
  deleteKey: string
  objectPath: string
  updatedObject: Record<string, T>
}

const toZeroFilledKey = (index: number): string => String(index).padStart(5, '0')

const findConsecutiveKeys = <T>(startIndex: number, data: Record<string, T>): string[] => {
  const key = toZeroFilledKey(startIndex)
  return Object.hasOwn(data, key) ? [key, ...findConsecutiveKeys(startIndex + 1, data)] : []
}

export const prepareRemoveKey = <T>(path: string, objectData: Record<string, T>): RemoveKeyResult<T> => {
  const lastDotIndex = path.lastIndexOf('.')
  const objectPath = path.substring(0, lastDotIndex)
  const removedKey = path.substring(lastDotIndex + 1)

  const secondLastDotIndex = objectPath.lastIndexOf('.')
  const parentPath = objectPath.substring(0, secondLastDotIndex)
  const objectKey = objectPath.substring(secondLastDotIndex + 1)

  const removedIndex = parseInt(removedKey, 10)
  const consecutiveKeys = new Set(findConsecutiveKeys(removedIndex + 1, objectData))

  const updatedObject = Object.entries(objectData)
    .filter(([key]) => key !== removedKey)
    .reduce<Record<string, T>>((acc, [key, value]) => {
      if (consecutiveKeys.has(key)) {
        acc[toZeroFilledKey(parseInt(key, 10) - 1)] = value
      } else {
        acc[key] = value
      }
      return acc
    }, {})

  return {
    deleteKey: `${parentPath}.-=${objectKey}`,
    objectPath,
    updatedObject,
  }
}
