// Regex to match shotgun rate of fire formats like '3x9', '2*5', etc.
const SHOTGUN_ROF = /(?<rof>\d+)[×xX\*](?<projectiles>\d+)/

/**
 * Calclates potential hits based on weapon stats and margin of success, and returns data for chat message.
 * @param optionalArgs.obj The weapon object containing rate of fire and recoil.
 * @param optionalArgs.shots The number of shots fired.
 * @param marginOfSuccess The margin of success from the attack roll.
 * @param chatdata.rof The rate of fire text to display in chat.
 * @param chatdata.rcl The recoil value of the weapon.
 * @param chatdata.rofrcl The actual number of hits possible given the rate of fire and recoil.
 */
export function computePotentialHits(
  optionalArgs: { obj: { rcl: string; rof: string }; shots?: number },
  marginOfSuccess: number,
  chatdata: Record<string, unknown>
): void {
  const weapon = optionalArgs.obj

  // Could be '3x9' for shotguns, but we want just the first number.
  const maxRateOfFire = parseInt(weapon.rof)
  const weaponRecoil = parseInt(weapon.rcl)
  const numberShotsFired = Math.min(optionalArgs.shots || 1, maxRateOfFire)

  // Support shotgun RoF (3x9, for example).
  const matchesShotgun = weapon.rof.match(SHOTGUN_ROF)

  const rofMultiplier = matchesShotgun ? parseInt(matchesShotgun.groups!.projectiles) : 1
  const currentRoF = numberShotsFired * rofMultiplier
  const rofText = matchesShotgun ? `${numberShotsFired}x${matchesShotgun.groups!.projectiles}` : currentRoF.toString()

  const potentialHits = Math.floor(marginOfSuccess / weaponRecoil) + 1
  const actualHits = Math.min(currentRoF, potentialHits)

  chatdata['rof'] = rofText
  chatdata['rcl'] = weapon.rcl
  chatdata['rofrcl'] = actualHits
}
