/**
 * GURPS critical failure rules for a targeted 3d6 roll.
 * A failure by 10 or more is not a critical failure for a ranged attack.
 */
export function isCriticalFailure(rollTotal, effectiveTarget, isRangedAttack = false) {
  return (
    rollTotal >= 18 ||
    (rollTotal === 17 && effectiveTarget <= 15) ||
    (!isRangedAttack && rollTotal - effectiveTarget >= 10 && effectiveTarget > 0)
  )
}
