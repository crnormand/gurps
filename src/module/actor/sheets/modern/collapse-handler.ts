import { isHTMLElement } from '@module/util/guards.js'

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
