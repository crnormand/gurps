export namespace Combat {
  /**
   * Your Dodge active defense is Basic Speed + 3, dropping all fractions, less a penalty equal to your encumbrance level. (B374)
   *
   * If you are reeling (less than 1/3 HP remaining), your Dodge is halved. (B380)
   *
   * If you are very tired (less than 1/3 FP remaining), your Dodge is halved. (B380)
   */
  export function calculateDodge(
    basicDodge: number,
    encumbranceLevel: number,
    conditions: { reeling: boolean; exhausted: boolean }
  ) {
    let dodge = Math.max(1, basicDodge - encumbranceLevel)

    if (conditions.reeling) {
      dodge = Math.ceil(dodge / 2)
    }

    if (conditions.exhausted) {
      dodge = Math.ceil(dodge / 2)
    }

    return Math.max(1, dodge)
  }
}
