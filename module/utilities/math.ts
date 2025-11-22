export function roundTo(num: number, decimals: number = 2) {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}
