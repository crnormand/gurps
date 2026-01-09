export function shouldUpdateName(newName: string, currentName: string): boolean {
  const trimmedName = newName.trim()
  return trimmedName.length > 0 && trimmedName !== currentName
}

export function shouldUpdateField(newValue: string, currentValue: string | undefined): boolean {
  const trimmedValue = newValue.trim()
  return trimmedValue !== (currentValue ?? '')
}

export function bindInlineEdit(html: HTMLElement, config: InlineEditConfig): void {
  const { displaySelector, containerSelector, inputSelector, editingClass = 'editing', onBlur } = config

  const displays = html.querySelectorAll<HTMLElement>(displaySelector)
  displays.forEach(display => {
    display.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault()
      const container = (event.currentTarget as HTMLElement).closest(containerSelector) as HTMLElement
      container.classList.add(editingClass)
      const input = container.querySelector(inputSelector) as HTMLInputElement | null
      if (input) {
        input.focus()
        input.select()
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(inputSelector)
  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget as HTMLInputElement
      const container = inputElement.closest(containerSelector) as HTMLElement
      setTimeout(() => {
        if (!container.contains(document.activeElement)) {
          container.classList.remove(editingClass)
          onBlur?.(inputElement)
        }
      }, 100)
    })

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        const inputElement = event.currentTarget as HTMLInputElement
        const container = inputElement.closest(containerSelector) as HTMLElement
        container.classList.remove(editingClass)
        inputElement.blur()
      }
    })
  })
}

interface InlineEditConfigInternal extends InlineEditConfig {
  fieldType?: 'name' | 'tag'
}

const inlineEditConfigs: InlineEditConfigInternal[] = [
  {
    displaySelector: '.ms-resource-display',
    containerSelector: '.ms-resource',
    inputSelector: '.ms-resource-input',
  },
  {
    displaySelector: '.ms-name-display',
    containerSelector: '.ms-name-container',
    inputSelector: '.ms-name-input',
    fieldType: 'name',
  },
  {
    displaySelector: '.ms-tag-display',
    containerSelector: '.ms-tag',
    inputSelector: '.ms-tag-input',
    fieldType: 'tag',
  },
  {
    displaySelector: '.ms-dr-display',
    containerSelector: '.ms-loc-dr',
    inputSelector: '.ms-dr-input',
  },
]

export function buildOnBlurHandler(
  config: InlineEditConfigInternal,
  actor: Actor.Implementation
): ((input: HTMLInputElement) => void) | undefined {
  if (config.fieldType === 'name') {
    return (input: HTMLInputElement) => {
      const newName = input.value
      if (shouldUpdateName(newName, actor.name)) {
        actor.update({ name: newName.trim() })
      }
    }
  }
  if (config.fieldType === 'tag') {
    return (input: HTMLInputElement) => {
      const field = input.dataset.field
      const newValue = input.value
      if (field) {
        const currentValue = foundry.utils.getProperty(actor, field) as string | undefined
        if (shouldUpdateField(newValue, currentValue)) {
          actor.update({ [field]: newValue.trim() })
        }
      }
    }
  }
  return undefined
}

export function bindAllInlineEdits(html: HTMLElement, actor: Actor.Implementation): void {
  inlineEditConfigs.forEach(config => {
    const onBlur = buildOnBlurHandler(config, actor)
    bindInlineEdit(html, { ...config, onBlur })
  })
}

export function bindAttributeEdit(html: HTMLElement, actor: Actor.Implementation): void {
  const wrapperSelector = '.ms-attr-wrapper'
  const badgeSelector = '.ms-attr-badge'
  const inputSelector = '.ms-attr-input'
  const editButtonSelector = '.ms-attr-edit'
  const editingClass = 'editing'

  const editButtons = html.querySelectorAll<HTMLElement>(editButtonSelector)
  editButtons.forEach(button => {
    button.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const wrapper = (event.currentTarget as HTMLElement).closest(wrapperSelector) as HTMLElement
      const badge = wrapper.querySelector(badgeSelector) as HTMLElement
      badge.classList.add(editingClass)
      const input = badge.querySelector(inputSelector) as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    })
  })

  const badges = html.querySelectorAll<HTMLElement>(badgeSelector)
  badges.forEach(badge => {
    badge.addEventListener('click', (event: MouseEvent) => {
      if (badge.classList.contains(editingClass)) {
        event.stopPropagation()
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(inputSelector)
  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget as HTMLInputElement
      const badge = inputElement.closest(badgeSelector) as HTMLElement
      badge.classList.remove(editingClass)

      const attrName = badge.dataset.attr
      const fieldPath = `system.attributes.${attrName}.import`
      const newValue = parseInt(inputElement.value, 10)
      const currentValue = foundry.utils.getProperty(actor, fieldPath) as number

      if (!isNaN(newValue) && newValue !== currentValue) {
        actor.update({ [fieldPath]: newValue })
      }
    })

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        ;(event.currentTarget as HTMLInputElement).blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget as HTMLInputElement
        const badge = inputElement.closest(badgeSelector) as HTMLElement
        badge.classList.remove(editingClass)
        const attrName = badge.dataset.attr
        const fieldPath = `system.attributes.${attrName}.import`
        inputElement.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
        inputElement.blur()
      }
    })
  })
}

export function bindSecondaryStatsEdit(html: HTMLElement, actor: Actor.Implementation): void {
  const fieldsetSelector = '.ms-editable-stats'
  const editButtonSelector = '.ms-stat-box-edit'
  const inputSelector = '.ms-stat-input'
  const editingClass = 'editing'

  const editButtons = html.querySelectorAll<HTMLElement>(editButtonSelector)
  editButtons.forEach(button => {
    button.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const fieldset = (event.currentTarget as HTMLElement).closest(fieldsetSelector) as HTMLElement
      fieldset.classList.toggle(editingClass)
      if (fieldset.classList.contains(editingClass)) {
        const firstInput = fieldset.querySelector(inputSelector) as HTMLInputElement
        if (firstInput) {
          firstInput.focus()
          firstInput.select()
        }
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(`${fieldsetSelector} ${inputSelector}`)
  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget as HTMLInputElement
      const fieldset = inputElement.closest(fieldsetSelector) as HTMLElement

      setTimeout(() => {
        if (!fieldset.contains(document.activeElement)) {
          fieldset.classList.remove(editingClass)

          const fieldPath = inputElement.name
          const newValue = parseFloat(inputElement.value)
          const currentValue = foundry.utils.getProperty(actor, fieldPath) as number

          if (!isNaN(newValue) && newValue !== currentValue) {
            actor.update({ [fieldPath]: newValue })
          }
        }
      }, 100)
    })

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        const inputElement = event.currentTarget as HTMLInputElement
        inputElement.blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget as HTMLInputElement
        const fieldset = inputElement.closest(fieldsetSelector) as HTMLElement
        fieldset.classList.remove(editingClass)
        const fieldPath = inputElement.name
        inputElement.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
        inputElement.blur()
      }
    })
  })
}

export function bindPointsEdit(html: HTMLElement, actor: Actor.Implementation): void {
  const itemSelector = '.ms-points-item'
  const inputSelector = '.ms-points-input'
  const editingClass = 'editing'

  const items = html.querySelectorAll<HTMLElement>(itemSelector)
  items.forEach(item => {
    item.addEventListener('click', (event: MouseEvent) => {
      const itemElement = event.currentTarget as HTMLElement
      if (itemElement.classList.contains(editingClass)) return

      itemElement.classList.add(editingClass)
      const input = itemElement.querySelector(inputSelector) as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(inputSelector)
  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget as HTMLInputElement
      const item = inputElement.closest(itemSelector) as HTMLElement
      item.classList.remove(editingClass)

      const fieldPath = inputElement.name
      const newValue = parseInt(inputElement.value, 10)
      const currentValue = foundry.utils.getProperty(actor, fieldPath) as number

      if (!isNaN(newValue) && newValue !== currentValue) {
        actor.update({ [fieldPath]: newValue })
      }
    })

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        ;(event.currentTarget as HTMLInputElement).blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget as HTMLInputElement
        const item = inputElement.closest(itemSelector) as HTMLElement
        item.classList.remove(editingClass)
        const fieldPath = inputElement.name
        inputElement.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
        inputElement.blur()
      }
    })
  })
}
