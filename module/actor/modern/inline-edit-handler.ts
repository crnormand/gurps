import { GurpsActor } from '../actor.js'

export function shouldUpdateName(newName: string, currentName: string): boolean {
  const trimmedName = newName.trim()
  return trimmedName.length > 0 && trimmedName !== currentName
}

export function shouldUpdateField(newValue: string, currentValue: string | undefined): boolean {
  const trimmedValue = newValue.trim()
  return trimmedValue !== (currentValue ?? '')
}

export function bindInlineEdit(html: JQuery, config: InlineEditConfig): void {
  const { displaySelector, containerSelector, inputSelector, editingClass = 'editing', onBlur } = config

  html.find(displaySelector).on('click', (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const container = (event.currentTarget as HTMLElement).closest(containerSelector) as HTMLElement
    container.classList.add(editingClass)
    const input = container.querySelector(inputSelector) as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select()
    }
  })

  html.find(inputSelector).on('blur', (event: JQuery.BlurEvent) => {
    const input = event.currentTarget as HTMLInputElement
    const container = input.closest(containerSelector) as HTMLElement
    setTimeout(() => {
      if (!container.contains(document.activeElement)) {
        container.classList.remove(editingClass)
        onBlur?.(input)
      }
    }, 100)
  })

  html.find(inputSelector).on('keydown', (event: JQuery.KeyDownEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const input = event.currentTarget as HTMLInputElement
      const container = input.closest(containerSelector) as HTMLElement
      container.classList.remove(editingClass)
      input.blur()
    }
  })
}

interface InlineEditConfigInternal extends InlineEditConfig {
  fieldType?: 'name' | 'tag'
}

const inlineEditConfigs: InlineEditConfigInternal[] = [
  {
    displaySelector: '.ms-resource-display',
    containerSelector: '.ms-resource',
    inputSelector: '.ms-resource-input'
  },
  {
    displaySelector: '.ms-name-display',
    containerSelector: '.ms-name-container',
    inputSelector: '.ms-name-input',
    fieldType: 'name'
  },
  {
    displaySelector: '.ms-tag-display',
    containerSelector: '.ms-tag',
    inputSelector: '.ms-tag-input',
    fieldType: 'tag'
  },
  {
    displaySelector: '.ms-dr-display',
    containerSelector: '.ms-loc-dr',
    inputSelector: '.ms-dr-input'
  }
]

export function buildOnBlurHandler(
  config: InlineEditConfigInternal,
  actor: GurpsActor
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

export function bindAllInlineEdits(html: JQuery, actor: GurpsActor): void {
  inlineEditConfigs.forEach(config => {
    const onBlur = buildOnBlurHandler(config, actor)
    bindInlineEdit(html, { ...config, onBlur })
  })
}

export function bindAttributeEdit(html: JQuery, actor: GurpsActor): void {
  const wrapperSelector = '.ms-attr-wrapper'
  const badgeSelector = '.ms-attr-badge'
  const inputSelector = '.ms-attr-input'
  const editButtonSelector = '.ms-attr-edit'
  const editingClass = 'editing'

  html.find(editButtonSelector).on('click', (event: JQuery.ClickEvent) => {
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

  html.find(badgeSelector).on('click', (event: JQuery.ClickEvent) => {
    const badge = event.currentTarget as HTMLElement
    if (badge.classList.contains(editingClass)) {
      event.stopPropagation()
    }
  })

  html.find(inputSelector).on('blur', (event: JQuery.BlurEvent) => {
    const input = event.currentTarget as HTMLInputElement
    const badge = input.closest(badgeSelector) as HTMLElement
    badge.classList.remove(editingClass)

    const attrName = badge.dataset.attr
    const fieldPath = `system.attributes.${attrName}.import`
    const newValue = parseInt(input.value, 10)
    const currentValue = foundry.utils.getProperty(actor, fieldPath) as number

    if (!isNaN(newValue) && newValue !== currentValue) {
      actor.update({ [fieldPath]: newValue })
    }
  })

  html.find(inputSelector).on('keydown', (event: JQuery.KeyDownEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      ;(event.currentTarget as HTMLInputElement).blur()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      const input = event.currentTarget as HTMLInputElement
      const badge = input.closest(badgeSelector) as HTMLElement
      badge.classList.remove(editingClass)
      const attrName = badge.dataset.attr
      const fieldPath = `system.attributes.${attrName}.import`
      input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
    }
  })
}

export function bindSecondaryStatsEdit(html: JQuery, actor: GurpsActor): void {
  const fieldsetSelector = '.ms-editable-stats'
  const editButtonSelector = '.ms-stat-box-edit'
  const inputSelector = '.ms-stat-input'
  const editingClass = 'editing'

  html.find(editButtonSelector).on('click', (event: JQuery.ClickEvent) => {
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

  html.find(`${fieldsetSelector} ${inputSelector}`).on('blur', (event: JQuery.BlurEvent) => {
    const input = event.currentTarget as HTMLInputElement
    const fieldset = input.closest(fieldsetSelector) as HTMLElement

    setTimeout(() => {
      if (!fieldset.contains(document.activeElement)) {
        fieldset.classList.remove(editingClass)

        const fieldPath = input.name
        const newValue = parseFloat(input.value)
        const currentValue = foundry.utils.getProperty(actor, fieldPath) as number

        if (!isNaN(newValue) && newValue !== currentValue) {
          actor.update({ [fieldPath]: newValue })
        }
      }
    }, 100)
  })

  html.find(`${fieldsetSelector} ${inputSelector}`).on('keydown', (event: JQuery.KeyDownEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const input = event.currentTarget as HTMLInputElement
      input.blur()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      const input = event.currentTarget as HTMLInputElement
      const fieldset = input.closest(fieldsetSelector) as HTMLElement
      fieldset.classList.remove(editingClass)
      const fieldPath = input.name
      input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
    }
  })
}
