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
export function fractionOfMove(move: number, numerator: number, denominator: number): number {
  return Math.max(1, Math.floor((move * numerator) / denominator))
}
