import { BasicSetStrategy } from '../../../module/actor/strength-calculator.ts'

describe('BasicSetStrategy', () => {
  let strength: BasicSetStrategy

  beforeEach(() => {
    strength = new BasicSetStrategy()
  })

  it.each([
    { st: 1, swing: '1d-5', thrust: '1d-6', lift: 0.2 },
    { st: 2, swing: '1d-5', thrust: '1d-6', lift: 0.8 },
    { st: 3, swing: '1d-4', thrust: '1d-5', lift: 1.8 },
    { st: 4, swing: '1d-4', thrust: '1d-5', lift: 3.2 },
    { st: 5, swing: '1d-3', thrust: '1d-4', lift: 5 },
    { st: 6, swing: '1d-3', thrust: '1d-4', lift: 7.2 },
    { st: 7, swing: '1d-2', thrust: '1d-3', lift: 9.8 },
    { st: 8, swing: '1d-2', thrust: '1d-3', lift: 13 },
    { st: 9, swing: '1d-1', thrust: '1d-2', lift: 16 },
    { st: 10, swing: '1d', thrust: '1d-2', lift: 20 },
    { st: 11, swing: '1d+1', thrust: '1d-1', lift: 24 },
    { st: 12, swing: '1d+2', thrust: '1d-1', lift: 29 },
    { st: 13, swing: '2d-1', thrust: '1d', lift: 34 },
    { st: 14, swing: '2d', thrust: '1d', lift: 39 },
    { st: 15, swing: '2d+1', thrust: '1d+1', lift: 45 },
    { st: 20, swing: '3d+2', thrust: '2d-1', lift: 80 },
    { st: 21, swing: '4d-1', thrust: '2d', lift: 88 },
    { st: 22, swing: '4d', thrust: '2d', lift: 97 },
    { st: 26, swing: '5d', thrust: '2d+2', lift: 135 },
    { st: 27, swing: '5d+1', thrust: '3d-1', lift: 146 },
    { st: 28, swing: '5d+1', thrust: '3d-1', lift: 157 },
    { st: 29, swing: '5d+2', thrust: '3d', lift: 168 },
    { st: 30, swing: '5d+2', thrust: '3d', lift: 180 },
    { st: 40, swing: '7d-1', thrust: '4d+1', lift: 320 },
    { st: 45, swing: '7d+1', thrust: '5d', lift: 405 },
    { st: 50, swing: '8d-1', thrust: '5d+2', lift: 500 },
    { st: 55, swing: '8d+1', thrust: '6d', lift: 605 },
    { st: 60, swing: '9d', thrust: '7d-1', lift: 720 },
    { st: 65, swing: '9d+2', thrust: '7d+1', lift: 845 },
    { st: 70, swing: '10d', thrust: '8d', lift: 980 },
    { st: 75, swing: '10d+2', thrust: '8d+2', lift: 1125 },
    { st: 80, swing: '11d', thrust: '9d', lift: 1280 },
    { st: 85, swing: '11d+2', thrust: '9d+2', lift: 1445 },
    { st: 90, swing: '12d', thrust: '10d', lift: 1620 },
    { st: 95, swing: '12d+2', thrust: '10d+2', lift: 1805 },
    { st: 100, swing: '13d', thrust: '11d', lift: 2000 },
  ])('should calculate damage and lift for ST = $st', ({ st, swing, thrust, lift }) => {
    expect(strength.calculateLift(st)).toBe(lift)
    expect(strength.calculateSwingDamage(st)).toBe(swing)
    expect(strength.calculateThrustDamage(st)).toBe(thrust)
  })
})
