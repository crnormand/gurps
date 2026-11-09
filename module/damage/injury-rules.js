const piercingDamageTypes = ['pi-', 'pi', 'pi+', 'pi++']

/**
 * Apply the Injury Tolerance (Diffuse) injury cap, except for attacks that
 * have the Basic Set area-effect, cone, or explosion exception.
 */
export function applyDiffuseInjuryLimit(injury, damageType, isDiffuse, attackTypes = {}) {
  const bypassDiffuseLimit = attackTypes.isExplosion || attackTypes.isAreaEffect || attackTypes.isCone
  if (!isDiffuse || bypassDiffuseLimit) return injury
  return Math.min(piercingDamageTypes.includes(damageType) || damageType === 'imp' ? 1 : 2, injury)
}
