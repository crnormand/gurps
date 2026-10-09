/**
 * Move arithmetic, kept out of GurpsActor so the rules can be exercised without a Foundry actor.
 */

/**
 * The Move left to a character by a posture or maneuver that allows only a fraction of it.
 *
 * The fraction is taken as a numerator and denominator rather than a ratio so that 2/3 of Move 3 is
 * 2 and not the 1 that `Math.floor(3 * (2 / 3))` produces.
 *
 * Fractions round down. B9 makes that the default for any math deciding "what a character can do"
 * and says rules "always explicitly note any exceptions"; the posture table (B551) and the
 * half-Move maneuvers (B365, B366) note none. B387 states the same postures as movement point
 * surcharges, which floor by construction because nobody enters a fraction of a hex.
 *
 * The one-yard floor is B387: "You can *always* move at least one hex per turn, no matter how
 * severe the penalties."
 */
export namespace Movement {
  export function fractionOfMove(move: number, numerator: number, denominator: number): number {
    return Math.max(1, Math.floor((move * numerator) / denominator))
  }

  /**
   * Calculate the Step a character has based on their Move.
   *
   * Step is equal to 1/10 of Move, but never less than 1 yard. Round all fractions up. (B368)
   */

  export function step(move: number): number {
    return Math.max(1, Math.ceil(move / 10))
  }

  /** The conditions that halve Move: reeling from wounds (B380) and very tired (B426). */
  export interface MoveConditions {
    reeling?: boolean
    exhausted?: boolean
  }

  /**
   * The Move a character has before any posture or maneuver limits it.
   *
   * The order is the books'. B17 defines Move as "your Basic Move modified for your encumbrance
   * level," so encumbrance takes its share first, dropping the fraction it leaves per B9. B380 and
   * B426 then halve "your Move" -- the score encumbrance has already made -- each rounding up, as
   * both rules say in so many words.
   *
   * The encumbrance level is applied as tenths rather than as a ratio so that Light encumbrance
   * leaves an exact 0.8 of Basic Move rather than a float a hair under or over it.
   */
  export function currentMove(basicMove: number, encumbranceLevel: number, conditions: MoveConditions = {}): number {
    let move = Math.max(1, Math.floor((basicMove * (10 - 2 * encumbranceLevel)) / 10))

    if (conditions.reeling) move = Math.ceil(move / 2)
    if (conditions.exhausted) move = Math.ceil(move / 2)

    return move
  }

  /**
   * Sprinting adds 20% to Move after one second (B354). On a battlemap, where distances are measured in
   * hexes, drop all fractions to get a round Move score. Assume even the slowest runners gets +1 Move.
   */
  export function sprintingMove(move: number, encumbranceLevel: number, conditions: MoveConditions = {}): number {
    const current = currentMove(move, encumbranceLevel, conditions)
    const additionalMove = Math.max(1, Math.ceil(current * 0.2))

    return current + additionalMove
  }
}
