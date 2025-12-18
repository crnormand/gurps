function calculateRoFModifier(rof: number): number {
  if (rof < 17) return Math.ceil(rof / 4) - 1
  if (rof < 25) return 4
  if (rof < 50) return 5
  if (rof < 100) return 6

  return Math.floor(rof / 100) + 6
}

export { calculateRoFModifier }
