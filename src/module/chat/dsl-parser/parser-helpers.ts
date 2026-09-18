// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

// ---------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------

/**
 * Find the index of the delimiter that matches the one at `startIndex`
 * (str[startIndex] must be `open`), honoring nesting of same-type
 * delimiters. The grammar defines no quoting/escaping mechanism, so this
 * does plain depth counting only.
 */
function findMatchingDelimiter(str: string, startIndex: number, open: string, close: string): number {
  let depth = 0

  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i]

    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return i
    }
  }

  throw new ParseError(`unmatched '${open}' starting at position ${startIndex}`)
}

export { findMatchingDelimiter, ParseError }
