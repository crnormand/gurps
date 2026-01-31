export interface EntryData {
  itemid?: string
  contains?: Record<string, EntryData>
  collapsed?: Record<string, EntryData>
}

export interface DeletionItem {
  path: string
  itemid: string | undefined
}

export function collectDeletions(data: EntryData, basePath: string): DeletionItem[] {
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
