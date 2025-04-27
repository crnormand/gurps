function closest(element: Element | null, selector: string): HTMLElement | null {
  const found = element?.closest(selector)
  return (found as HTMLElement) ?? null
}

/* -------------------------------------------- */

function querySelector(element: Element | null, selector: string): HTMLElement | null {
  const found = element?.querySelector(selector)
  return (found as HTMLElement) ?? null
}
/* -------------------------------------------- */

function querySelectorAll(element: Element | null, selector: string): NodeListOf<HTMLElement> {
  const found = element?.querySelectorAll(selector) ?? []
  return (found as NodeListOf<HTMLElement>) ?? []
}

/* -------------------------------------------- */

function siblings(element: Element | null, selector?: string): HTMLElement[] {
  return children(element?.parentElement ?? null, selector)
}

/* -------------------------------------------- */

function children(element: Element | null, selector?: string): HTMLElement[] {
  if (!element) return []
  const children = Array.from(element.children)
  if (!selector) return children as HTMLElement[]
  else {
    return children.filter(child => {
      child instanceof HTMLElement && child.matches(selector)
    }) as HTMLElement[]
  }
}

/* -------------------------------------------- */

function getValue(element: HTMLElement): string | string[] {
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
  )
    return ''

  if (element instanceof HTMLSelectElement && element.options && element.multiple) {
    return Array.from(element.options)
      .filter(option => option.selected)
      .map(option => option.value)
  } else {
    return element.value
  }
}

function setValue(element: HTMLElement, value: string | string[]): void {
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
  )
    return
  if (element instanceof HTMLSelectElement && element.options && element.multiple) {
    Array.from(element.options).forEach(option => {
      option.selected = value.includes(option.value)
    })
  } else {
    // NOTE: may want to rethink this, as it will set the value to the first element of the array
    element.value = typeof value === 'string' ? value : value[0]
  }
}

export { closest, querySelector, querySelectorAll, children, siblings, getValue, setValue }
