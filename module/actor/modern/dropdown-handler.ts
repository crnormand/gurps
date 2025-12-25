export function bindDropdownToggle(html: JQuery, config: DropdownConfig): void {
  const { dropdownSelector, toggleSelector, optionSelector, onSelect } = config

  html.find(toggleSelector).on('click', (event: JQuery.ClickEvent) => {
    event.stopPropagation()
    const dropdown = event.currentTarget.closest(dropdownSelector) as HTMLElement
    dropdown.classList.toggle('open')
  })

  html.find(optionSelector).on('click', async (event: JQuery.ClickEvent) => {
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const value = target.dataset.value ?? ''
    const dropdown = target.closest(dropdownSelector) as HTMLElement
    dropdown.classList.remove('open')
    await onSelect(value)
  })

  html.on('click', (event: JQuery.ClickEvent) => {
    const dropdown = html.find(`${dropdownSelector}.open`)[0]
    if (dropdown && !dropdown.contains(event.target as Node)) {
      dropdown.classList.remove('open')
    }
  })
}
