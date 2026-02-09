// Regex to match shotgun rate of fire formats like '3x9', '2*5', etc.
const SHOTGUN_ROF = /(?<rof>\d+)[×xX*](?<projectiles>\d+)/

export type WeaponDescriptor = {
  rateOfFire: string
  recoil: string
}

export type PotentialHitsResult = {
  rateOfFire: string
  recoil: string
  potentialHits: number
}

/**
 * Calculates potential hits based on weapon stats and margin of success, and returns data for chat message.
 * @param weapon The weapon object containing rate of fire and recoil.
 * @param shots The number of shots fired.
 * @param marginOfSuccess The margin of success from the attack roll.
 * @return An object containing the rate of fire text, recoil value, and actual number of hits.
 */
export function computePotentialHits(
  weapon: WeaponDescriptor,
  shots: number | undefined,
  marginOfSuccess: number
): PotentialHitsResult {
  // Could be '3x9' for shotguns, but we want just the first number.
  const maxRateOfFire = parseInt(weapon.rateOfFire)

  const weaponRecoil = parseInt(weapon.recoil) || 1
  const numberShotsFired = Math.min(shots || 1, maxRateOfFire)

  // Support shotgun RoF (3x9, for example).
  const matchesShotgun = weapon.rateOfFire.match(SHOTGUN_ROF)

  const rofMultiplier = matchesShotgun ? parseInt(matchesShotgun.groups!.projectiles) : 1
  const currentRoF = numberShotsFired * rofMultiplier
  const rofText = matchesShotgun ? `${numberShotsFired}x${matchesShotgun.groups!.projectiles}` : currentRoF.toString()

  const maxNumberHits = Math.floor(marginOfSuccess / weaponRecoil) + 1
  const potentialHits = Math.min(currentRoF, maxNumberHits)

  return {
    rateOfFire: rofText,
    recoil: weapon.recoil,
    potentialHits: potentialHits,
  }
}
