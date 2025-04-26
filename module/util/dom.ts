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

export { closest, querySelector, querySelectorAll, children, siblings }
