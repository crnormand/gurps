function getCssVariable(element: HTMLElement, variable: string, fallback: string = '#101010'): string {
  const style = getComputedStyle(element)
  const seen = new Set<string>()
  let value = style.getPropertyValue(variable).trim()

  while (value.startsWith('var(') && value.endsWith(')')) {
    const innerVar = value.slice(4, -1).trim()

    if (seen.has(innerVar)) return fallback
    seen.add(innerVar)
    value = style.getPropertyValue(innerVar).trim()
  }

  return value || fallback
}

export { getCssVariable as getCssVariable }
