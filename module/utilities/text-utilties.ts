/**
 * Converts a range text string into an array of numbers.
 * @param rangeText The range text to convert (e.g. "1-3,5").
 * @returns An array of numbers representing the range.
 */
export function convertRangeTextToArray(rangeText: string): number[] {
  const ranges = rangeText.split(',').map(e => e.trim())
  let result: number[] = []

  for (const range of ranges) {
    const parsed = parseRangeToken(range)

    result.push(...parsed)
  }

  result = Array.from(new Set(result))
  result.sort((first, second) => first - second)

  return result
}

function parseRangeToken(token: string): number[] {
  const parts = token.split('-').map(part => part.trim())

  if (parts.length === 0) return []
  if (parts.length === 1) return isNaN(parseInt(parts[0])) ? [] : [parseInt(parts[0])]
  if (parts.length > 2) return []

  const start = parseInt(parts[0])
  const end = parseInt(parts[1])

  if (isNaN(start) || isNaN(end) || start > end) return []

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
