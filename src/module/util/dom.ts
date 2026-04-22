type HTMLButtonOptions = {
  label?: string
  dataset?: Record<string, string>
  classes?: string[]
  icon?: string
  img?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

/* ---------------------------------------- */

export function constructHTMLButton({
  label = '',
  dataset = {},
  classes = [],
  icon = '',
  img = '',
  type = 'button',
  disabled = false,
}: HTMLButtonOptions): HTMLButtonElement {
  const button = document.createElement('button')

  button.type = type

  for (const [key, value] of Object.entries(dataset)) {
    button.dataset[key] = value
  }

  button.classList.add(...classes)
  let image = ''

  if (img) image = `<img src="${img}" alt="${label}">`
  else if (icon) image = `<i class="${icon}"></i> `
  if (disabled) button.disabled = true
  button.innerHTML = `${image}${label}`

  return button
}

export function syncLabelWidths(html: HTMLElement): void {
  for (const section of html.querySelectorAll<HTMLElement>('.ms-details')) {
    // Allow all labels to size to their natural content width for measurement.
    section.style.setProperty('--ms-label-width', 'max-content')

    // Accumulate the max label width per visual column index across all rows.
    const colMaxWidths: number[] = []

    const trackMax = (colIndex: number, label: HTMLElement) => {
      // getBoundingClientRect() forces a layout flush on first call, ensuring
      // the max-content style above is applied before any measurement.
      const width = label.getBoundingClientRect().width

      colMaxWidths[colIndex] = Math.max(colMaxWidths[colIndex] ?? 0, width)
    }

    for (const row of section.querySelectorAll<HTMLElement>('.ms-field-row')) {
      let colIndex = 0

      for (const group of row.querySelectorAll<HTMLElement>(':scope > .form-group')) {
        const label = group.querySelector<HTMLElement>('label')

        if (label) trackMax(colIndex, label)
        colIndex++
      }
    }

    // Standalone form-groups (direct children of .ms-details) are all column 0.
    for (const group of section.querySelectorAll<HTMLElement>(':scope > .form-group')) {
      const label = group.querySelector<HTMLElement>('label')

      if (label) trackMax(0, label)
    }

    // Nothing measured — section is not visible (inactive tab). Restore CSS default.
    if (!colMaxWidths.length || colMaxWidths.every(width => width === 0)) {
      section.style.removeProperty('--ms-label-width')
      continue
    }

    // Write per-column widths directly onto each row's grid-template-columns.
    for (const row of section.querySelectorAll<HTMLElement>('.ms-field-row')) {
      const groups = row.querySelectorAll(':scope > .form-group')
      const cols = Array.from(groups, (_, i) => {
        const width = Math.ceil(colMaxWidths[i] ?? colMaxWidths[0] ?? 80)

        return `${width}px 1fr`
      })

      row.style.gridTemplateColumns = cols.join(' ')
    }

    // Standalone labels use the CSS var; column 0 is the natural fit.
    section.style.setProperty('--ms-label-width', `${Math.ceil(colMaxWidths[0])}px`)
  }
}
