import { isHTMLElement } from '../../utilities/guards.js'

export function bindContainerCollapse(html: HTMLElement, actorId: string, config: ContainerCollapseConfig): void {
  const { tableSelector, rowSelector, excludeSelectors = [] } = config

  const tables = html.querySelectorAll<HTMLElement>(tableSelector)

  tables.forEach(table => {
    const rows = Array.from(table.querySelectorAll<HTMLElement>(rowSelector))

    restoreCollapsedState(rows, actorId)

    rows.forEach((row, rowIndex) => {
      const hasChildren = row.dataset.hasChildren === 'true'

      if (!hasChildren) return

      row.addEventListener('click', (event: MouseEvent) => {
        const target = event.target

        if (!isHTMLElement(target)) return
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

export function bindRowExpand(html: HTMLElement, config: RowExpandConfig): void {
  const { rowSelector, excludeSelectors = [], expandedClass = 'expanded' } = config

  const rows = html.querySelectorAll<HTMLElement>(rowSelector)

  rows.forEach(row => {
    row.addEventListener('click', (event: MouseEvent) => {
      const target = event.target

      if (!isHTMLElement(target)) return
      const shouldExclude = excludeSelectors.some(selector => target.closest(selector))

      if (shouldExclude) return

      row.classList.toggle(expandedClass)
    })
  })
}

export function bindSectionCollapse(html: HTMLElement, config: SectionCollapseConfig): void {
  const { headerSelector, excludeSelectors = [], collapsedClass = 'collapsed' } = config

  const headers = html.querySelectorAll<HTMLElement>(headerSelector)

  headers.forEach(header => {
    header.addEventListener('click', (event: MouseEvent) => {
      const target = event.target

      if (!isHTMLElement(target)) return
      const shouldExclude = excludeSelectors.some(selector => target.closest(selector))

      if (shouldExclude) return

      const section = header.closest('.ms-section')

      if (!isHTMLElement(section)) return
      section.classList.toggle(collapsedClass)
      header.classList.toggle(collapsedClass)
    })
  })
}

export function bindResourceReset(
  html: HTMLElement,
  actor: Actor.Implementation,
  configs: ResourceResetConfig[]
): void {
  configs.forEach(({ selector, resourcePath, maxPath }) => {
    const buttons = html.querySelectorAll<HTMLElement>(selector)

    buttons.forEach(button => {
      button.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault()
        const maxValue = foundry.utils.getProperty(actor, maxPath)

        actor.update({ [resourcePath]: maxValue })
      })
    })
  })
}
