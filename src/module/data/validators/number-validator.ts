export type NumberValidationOptions = {
  integerOnly?: boolean
  nonnegative?: boolean
  nonzero?: boolean
}

export function numberValidate(value: unknown, options: NumberValidationOptions = {}): boolean {
  let numericValue: number

  // Return true for finite numbers and numeric strings, false otherwise.
  if (typeof value === 'number') {
    numericValue = value
  } else if (typeof value === 'string') {
    const normalizedValue = value.trim()

    if (normalizedValue === '') return false

    numericValue = Number(normalizedValue)
  } else {
    return false
  }

  if (!Number.isFinite(numericValue)) return false

  if (options.integerOnly && !Number.isInteger(numericValue)) return false

  if (options.nonnegative && numericValue < 0) return false

  if (options.nonzero && numericValue === 0) return false

  return true
}
