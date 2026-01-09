export function bindDropdownToggle(html: HTMLElement, config: DropdownConfig): void {
  const { dropdownSelector, toggleSelector, optionSelector, onSelect } = config

  const toggles = html.querySelectorAll<HTMLElement>(toggleSelector)
  toggles.forEach(toggle => {
    toggle.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation()
      const dropdown = (event.currentTarget as HTMLElement).closest(dropdownSelector) as HTMLElement
      dropdown.classList.toggle('open')
    })
  })

  const options = html.querySelectorAll<HTMLElement>(optionSelector)
  options.forEach(option => {
    option.addEventListener('click', async (event: MouseEvent) => {
      event.stopPropagation()
      const target = event.currentTarget as HTMLElement
      const value = target.dataset.value ?? ''
      const dropdown = target.closest(dropdownSelector) as HTMLElement
      dropdown.classList.remove('open')
      await onSelect(value)
    })
  })

  // Close dropdown when clicking outside
  html.addEventListener('click', (event: MouseEvent) => {
    const openDropdown = html.querySelector(`${dropdownSelector}.open`)
    if (openDropdown && !openDropdown.contains(event.target as Node)) {
      openDropdown.classList.remove('open')
    }
  })
}
