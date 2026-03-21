import { diceValidate } from '@module/data/validators/dice-validator.js'
import { isHTMLElement, isHTMLInputElement } from '@module/util/guards.js'

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
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const container = target.closest(containerSelector)

      if (!isHTMLElement(container)) return
      container.classList.add(editingClass)
      const input = container.querySelector(inputSelector)

      if (isHTMLInputElement(input)) {
        input.focus()
        input.select()
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(inputSelector)

  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget

      if (!isHTMLInputElement(inputElement)) return
      const container = inputElement.closest(containerSelector)

      if (!isHTMLElement(container)) return
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
        const inputElement = event.currentTarget

        if (!isHTMLInputElement(inputElement)) return
        const container = inputElement.closest(containerSelector)

        if (!isHTMLElement(container)) return
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
    displaySelector: '.ms-tracker-display',
    containerSelector: '.ms-tracker-value',
    inputSelector: '.ms-tracker-input',
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
  actor: Actor.OfType<'character' | 'characterV2' | 'enemy'>
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

export function bindAllInlineEdits(
  html: HTMLElement,
  actor: Actor.OfType<'character' | 'characterV2' | 'enemy'>
): void {
  inlineEditConfigs.forEach(config => {
    const onBlur = buildOnBlurHandler(config, actor)

    bindInlineEdit(html, { ...config, onBlur })
  })
}

export function bindAttributeEdit(html: HTMLElement, actor: Actor.OfType<'character' | 'characterV2' | 'enemy'>): void {
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
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const wrapper = target.closest(wrapperSelector)

      if (!isHTMLElement(wrapper)) return
      const badge = wrapper.querySelector(badgeSelector)

      if (!isHTMLElement(badge)) return
      badge.classList.add(editingClass)
      const input = badge.querySelector(inputSelector)

      if (isHTMLInputElement(input)) {
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
      const inputElement = event.currentTarget

      if (!isHTMLInputElement(inputElement)) return
      const badge = inputElement.closest(badgeSelector)

      if (!isHTMLElement(badge)) return
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
        const inputElement = event.currentTarget

        if (isHTMLInputElement(inputElement)) inputElement.blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget

        if (!isHTMLInputElement(inputElement)) return
        const badge = inputElement.closest(badgeSelector)

        if (!isHTMLElement(badge)) return
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
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const fieldset = target.closest(fieldsetSelector)

      if (!isHTMLElement(fieldset)) return
      fieldset.classList.toggle(editingClass)

      if (fieldset.classList.contains(editingClass)) {
        const firstInput = fieldset.querySelector(inputSelector)

        if (isHTMLInputElement(firstInput)) {
          firstInput.focus()
          firstInput.select()
        }
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(`${fieldsetSelector} ${inputSelector}`)

  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget

      if (!isHTMLInputElement(inputElement)) return
      const fieldset = inputElement.closest(fieldsetSelector)

      if (!isHTMLElement(fieldset)) return

      setTimeout(() => {
        if (!fieldset.contains(document.activeElement)) {
          fieldset.classList.remove(editingClass)

          const fieldPath = inputElement.name

          if (fieldPath === 'system.thrust' || fieldPath === 'system.swing') {
            // Content for these fields must be in the format xd+/-y, such as 2d+1 or 3d-2. Validate this before updating
            // the actor.

            if (!diceValidate(input.value)) {
              // If the input doesn't match the expected format, reset it to the current value and exit without updating
              // the actor.
              input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')

              return
            }

            actor.update({ [fieldPath]: input.value.trim() })

            return
          }

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
        const inputElement = event.currentTarget

        if (isHTMLInputElement(inputElement)) inputElement.blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget

        if (!isHTMLInputElement(inputElement)) return
        const fieldset = inputElement.closest(fieldsetSelector)

        if (!isHTMLElement(fieldset)) return
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
      const itemElement = event.currentTarget

      if (!isHTMLElement(itemElement)) return
      if (itemElement.classList.contains(editingClass)) return

      itemElement.classList.add(editingClass)
      const input = itemElement.querySelector(inputSelector)

      if (isHTMLInputElement(input)) {
        input.focus()
        input.select()
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(inputSelector)

  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget

      if (!isHTMLInputElement(inputElement)) return
      const item = inputElement.closest(itemSelector)

      if (!isHTMLElement(item)) return
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
        const inputElement = event.currentTarget

        if (isHTMLInputElement(inputElement)) inputElement.blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget

        if (!isHTMLInputElement(inputElement)) return
        const item = inputElement.closest(itemSelector)

        if (!isHTMLElement(item)) return
        item.classList.remove(editingClass)
        const fieldPath = inputElement.name

        inputElement.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
        inputElement.blur()
      }
    })
  })
}

export function bindAllTrackerEdits(html: HTMLElement, actor: Actor.Implementation): void {
  const trackerSelector = '.ms-tracker-value'
  const inputSelector = '.ms-tracker-input'
  const editingClass = 'editing'

  const trackers = html.querySelectorAll<HTMLElement>(trackerSelector)

  trackers.forEach(tracker => {
    tracker.addEventListener('click', (event: MouseEvent) => {
      const trackerElement = event.currentTarget

      if (!isHTMLElement(trackerElement)) return
      if (trackerElement.classList.contains(editingClass)) return

      trackerElement.classList.add(editingClass)
      const input = trackerElement.querySelector(inputSelector)

      if (isHTMLInputElement(input)) {
        input.focus()
        input.select()
      }
    })
  })

  const inputs = html.querySelectorAll<HTMLInputElement>(inputSelector)

  inputs.forEach(input => {
    input.addEventListener('blur', (event: FocusEvent) => {
      const inputElement = event.currentTarget

      if (!isHTMLInputElement(inputElement)) return
      const trackerElement = inputElement.closest(trackerSelector)

      if (!isHTMLElement(trackerElement)) return
      trackerElement.classList.remove(editingClass)
      const trackerKey = inputElement.dataset.key

      if (!trackerKey) return
      const newValue = parseInt(inputElement.value, 10)
      const map = actor.system.additionalresources?.tracker

      if (!map) return
      const tracker = map.get(trackerKey)

      if (!tracker) return
      const currentValue = tracker.value

      if (!isNaN(newValue) && newValue !== currentValue) {
        tracker.value = newValue
      }
    })

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        const inputElement = event.currentTarget

        if (isHTMLInputElement(inputElement)) inputElement.blur()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const inputElement = event.currentTarget

        if (!isHTMLInputElement(inputElement)) return
        const tracker = inputElement.closest(trackerSelector)

        if (!isHTMLElement(tracker)) return
        tracker.classList.remove(editingClass)
        const trackerKey = inputElement.dataset.key

        if (!trackerKey) {
          inputElement.blur()

          return
        }

        const map = actor.system.additionalresources?.tracker

        if (!map) {
          inputElement.blur()

          return
        }

        const trackerData = map.get(trackerKey)
        const originalValue = trackerData?.value

        inputElement.value = originalValue !== undefined ? String(originalValue) : ''
        inputElement.blur()
      }
    })
  })
}
