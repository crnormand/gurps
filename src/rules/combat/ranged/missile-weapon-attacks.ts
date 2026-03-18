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

export class MissileWeaponAttacks {
  /**
   * @source B373 "Rapid Fire"
   * Firing a large number of shots per attack gives a bonus to hit.
   *
   * @param rof The number of shots fired in the attack.
   * @return The modifier to apply to the attack roll.
   */
  static calculateRoFModifier(rof: number): number {
    if (rof < 17) return Math.ceil(rof / 4) - 1
    if (rof < 25) return 4
    if (rof < 50) return 5
    if (rof < 100) return 6

    return Math.floor(rof / 100) + 6
  }

  /**
   * @source B374 "Rapid Fire"
   * Rapid fire may score multiple hits from a single attack. A successful attack means you scored at least one hit –
   * and possibly a number of extra hits, up to a maximum equal to the number of shots you fired. To find the number of
   * hits you scored, compare your margin of success on the attack roll to your weapon’s Recoil. An attack scores one
   * extra hit for every full multiple of Recoil by which you make your attack roll.
   *
   * For example, if your margin of success is 5 and your weapon’s Recoil is 2, you score 3 hits: one for the initial
   * success, plus one extra hit for each full multiple of 2 in your margin of success (4/2 = 2). If your weapon has a
   * RoF of 4 and you fired all 4 shots, you could have scored up to 4 hits on that attack, but since your margin of
   * success only allows for 3 hits, you would only score 3 hits.
   *
   * @param weapon The weapon object containing rate of fire and recoil.
   * @param shots The number of shots fired.
   * @param marginOfSuccess The margin of success from the attack roll.
   * @return An object containing the rate of fire text, recoil value, and actual number of hits.
   */
  static computePotentialHits(
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
}
