function getCssVariable(element: HTMLElement, variable: string, fallback: string = '#101010'): string {
  return getComputedStyle(element).getPropertyValue(variable).trim() || fallback
}

export { getCssVariable as getCssVariable }
