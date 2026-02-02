export function bindContainerCollapse(html: JQuery, actorId: string, config: ContainerCollapseConfig): void {
  const { tableSelector, rowSelector, excludeSelectors = [] } = config

  html.find(tableSelector).each((_index: number, table: HTMLElement) => {
    const rows = Array.from(table.querySelectorAll(rowSelector)) as HTMLElement[]

    restoreCollapsedState(rows, actorId)

    rows.forEach((row, rowIndex) => {
      const hasChildren = row.dataset.hasChildren === 'true'
      if (!hasChildren) return

      row.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const shouldExclude = excludeSelectors.some(selector => target.closest(selector))
        if (shouldExclude) return

        const isCollapsed = row.classList.toggle('container-collapsed')
        if (isCollapsed) {
          row.classList.remove('expanded')
        } else {
          row.classList.add('expanded')
        }
        const rowIndent = parseInt(row.dataset.indent || '0', 10)

        for (let nextIndex = rowIndex + 1; nextIndex < rows.length; nextIndex++) {
          const nextRow = rows[nextIndex]
          const nextIndent = parseInt(nextRow.dataset.indent || '0', 10)

          if (nextIndent <= rowIndent) break

          if (isCollapsed) {
            nextRow.classList.add('ms-child-hidden')
          } else {
            const parentCollapsed = isParentCollapsed(rows, nextIndex, rowIndent)
            if (!parentCollapsed) {
              nextRow.classList.remove('ms-child-hidden')
            }
          }
        }

        saveCollapsedState(rows, actorId)
      })
    })
  })
}

const isParentCollapsed = (rows: HTMLElement[], childIndex: number, stopAtIndent: number): boolean => {
  const childIndent = parseInt(rows[childIndex].dataset.indent || '0', 10)

  for (let parentIndex = childIndex - 1; parentIndex >= 0; parentIndex--) {
    const parentRow = rows[parentIndex]
    const parentIndent = parseInt(parentRow.dataset.indent || '0', 10)

    if (parentIndent < childIndent && parentIndent > stopAtIndent) {
      if (parentRow.classList.contains('container-collapsed')) {
        return true
      }
    }
    if (parentIndent <= stopAtIndent) break
  }
  return false
}

const getStorageKey = (actorId: string): string => `gurps-modern-collapsed-${actorId}`

const saveCollapsedState = (rows: HTMLElement[], actorId: string): void => {
  const collapsedKeys = rows
    .filter(row => row.classList.contains('container-collapsed'))
    .map(row => row.dataset.key)
    .filter(Boolean)

  sessionStorage.setItem(getStorageKey(actorId), JSON.stringify(collapsedKeys))
}

const restoreCollapsedState = (rows: HTMLElement[], actorId: string): void => {
  const stored = sessionStorage.getItem(getStorageKey(actorId))
  const collapsedKeys = stored ? (JSON.parse(stored) as string[]) : []
  const collapsedSet = new Set(collapsedKeys)

  rows.forEach((row, rowIndex) => {
    const hasChildren = row.dataset.hasChildren === 'true'
    if (!hasChildren) return

    const key = row.dataset.key
    const isCollapsed = key && collapsedSet.has(key)

    if (isCollapsed) {
      row.classList.add('container-collapsed')
      const rowIndent = parseInt(row.dataset.indent || '0', 10)

      for (let nextIndex = rowIndex + 1; nextIndex < rows.length; nextIndex++) {
        const nextRow = rows[nextIndex]
        const nextIndent = parseInt(nextRow.dataset.indent || '0', 10)

        if (nextIndent <= rowIndent) break
        nextRow.classList.add('ms-child-hidden')
      }
    } else {
      row.classList.add('expanded')
    }
  })
}

export function bindRowExpand(html: JQuery, config: RowExpandConfig): void {
  const { rowSelector, excludeSelectors = [], expandedClass = 'expanded' } = config

  html.find(rowSelector).on('click', (event: JQuery.ClickEvent) => {
    const target = event.target as HTMLElement
    const shouldExclude = excludeSelectors.some(selector => target.closest(selector))
    if (shouldExclude) return

    const row = event.currentTarget as HTMLElement
    row.classList.toggle(expandedClass)
  })
}

export function bindSectionCollapse(html: JQuery, config: SectionCollapseConfig): void {
  const { headerSelector, excludeSelectors = [], collapsedClass = 'collapsed' } = config

  html.find(headerSelector).on('click', (event: JQuery.ClickEvent) => {
    const target = event.target as HTMLElement
    const shouldExclude = excludeSelectors.some(selector => target.closest(selector))
    if (shouldExclude) return

    const header = event.currentTarget as HTMLElement
    const section = header.closest('.ms-section') as HTMLElement
    section.classList.toggle(collapsedClass)
    header.classList.toggle(collapsedClass)
  })
}

export function bindResourceReset(html: JQuery, actor: Actor.Implementation, configs: ResourceResetConfig[]): void {
  configs.forEach(({ selector, resourcePath, maxPath }) => {
    html.find(selector).on('click', (event: JQuery.ClickEvent) => {
      event.preventDefault()
      const maxValue = foundry.utils.getProperty(actor, maxPath)
      actor.update({ [resourcePath]: maxValue })
    })
  })
}
