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

export { closest, querySelector, querySelectorAll }
