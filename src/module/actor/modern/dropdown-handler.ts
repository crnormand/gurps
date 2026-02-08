import { isHTMLElement } from '../../util/guards.ts'

export function bindDropdownToggle(html: HTMLElement, config: DropdownConfig): void {
  const { dropdownSelector, toggleSelector, optionSelector, onSelect } = config

  const toggles = html.querySelectorAll<HTMLElement>(toggleSelector)

  toggles.forEach(toggle => {
    toggle.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const dropdown = target.closest(dropdownSelector)

      if (!isHTMLElement(dropdown)) return
      dropdown.classList.toggle('open')
    })
  })

  const options = html.querySelectorAll<HTMLElement>(optionSelector)

  options.forEach(option => {
    option.addEventListener('click', async (event: MouseEvent) => {
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const value = target.dataset.value ?? ''
      const dropdown = target.closest(dropdownSelector)

      if (!isHTMLElement(dropdown)) return
      dropdown.classList.remove('open')
      await onSelect(value)
    })
  })

  html.addEventListener('click', (event: MouseEvent) => {
    const openDropdown = html.querySelector(`${dropdownSelector}.open`)
    const target = event.target

    if (openDropdown && target instanceof Node && !openDropdown.contains(target)) {
      openDropdown.classList.remove('open')
    }
  })
}
