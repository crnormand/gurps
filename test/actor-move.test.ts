import { fractionOfMove } from '../module/actor/move.js'

/**
 * B9 sets the default: when math decides "what a character can do," fractions round *down*, and
 * "Rules always explicitly note any exceptions." The posture table (B551) gives Crouching 2/3 Move
 * and Kneeling and Crawling 1/3, noting no exception, so the default stands.
 *
 * B387 is the clincher. It restates those same postures as movement point surcharges -- Crouching
 * +1/2 MP per hex, Kneeling and Crawling +2 -- which work out to the same fractions (Move/1.5 and
 * Move/3) by a route that cannot help but floor them, since nobody enters a fraction of a hex.
 * Rounding up would put the two halves of the Basic Set in direct contradiction.
 *
 * The same default governs the maneuvers that allow a fraction of Move: B365 and B366 say "up to
 * half your Move" and note no exception either.
 */
describe('fractionOfMove', () => {
  it('leaves a crouching Move 5 character 3 yards', () => {
    expect(fractionOfMove(5, 2, 3)).toBe(3)
  })

  it('leaves a kneeling Move 5 character 1 yard', () => {
    expect(fractionOfMove(5, 1, 3)).toBe(1)
  })

  it('leaves a Move 5 character taking a half-Move maneuver 2 yards', () => {
    expect(fractionOfMove(5, 1, 2)).toBe(2)
  })

  test('the fraction divides evenly', () => {
    expect(fractionOfMove(6, 2, 3)).toBe(4)
  })

  // B387: "You can *always* move at least one hex per turn, no matter how severe the penalties."
  it('leaves a kneeling Move 2 character 1 yard rather than none', () => {
    expect(fractionOfMove(2, 1, 3)).toBe(1)
  })
})
