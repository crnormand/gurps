import { GurpsActor } from '../actor.js'

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

export function bindResourceReset(html: JQuery, actor: GurpsActor, configs: ResourceResetConfig[]): void {
  configs.forEach(({ selector, resourcePath, maxPath }) => {
    html.find(selector).on('click', (event: JQuery.ClickEvent) => {
      event.preventDefault()
      const maxValue = foundry.utils.getProperty(actor, maxPath)
      actor.update({ [resourcePath]: maxValue })
    })
  })
}
