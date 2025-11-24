import { SizeAndSpeedRangeTable } from '../../../lib/size-speed-range-table.js'
import { SlamCalculator } from '../../../module/chat/slam-calc.js'

describe('SlamCalculator', () => {
  let slamCalculator: SlamCalculator | null = null

  beforeEach(() => {
    slamCalculator = new SlamCalculator({
      sizeAndSpeedRangeTable: new SizeAndSpeedRangeTable(),
    })
  })

  describe('DFRPG Slams...you each roll your thrust-2 crushing damage on the other.', () => {
    const data = {
      useDFRPGRules: true,
      attackerHp: 10,
      attackerThr: '2d',
      targetHp: 8,
      targetThr: '1d',
      relativeSpeed: 0,
      isAoAStrong: false,
      shieldDB: 0,
    }

    test('2d and 1d', () => {
      data.attackerThr = '2d'
      data.targetThr = '1d'

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
      expect(result.targetAdds).toEqual(0)
    })

    test('1d+1 and 1d-1', () => {
      data.attackerThr = '1d+1'
      data.targetThr = '1d-1'

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: -1 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -3 })
      expect(result.targetAdds).toEqual(0)
    })

    describe('Look up how many hexes you ran this turn in the “Linear Measurement” column of Size and Speed/Range Table and add the corresponding “Size” modifier to each die of damage rolled by both sides', () => {
      test('2d and 1d, 1 yard', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 1

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(0)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(0)
      })

      test('2d and 1d, 2 yards', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 2

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(0)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(0)
      })

      test('2d and 1d, 3 yards', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 3

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(2)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(1)
      })

      test('2d and 1d, 5 yards', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 5

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(4)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(2)
      })

      test('2d and 1d, 6 yards', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 6

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(6)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(3)
      })

      test('2d and 1d, 7 yards', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 7

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(6)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(3)
      })
    })

    test('You can use All-Out Attack (Strong) to increase your damage', () => {
      data.attackerThr = '2d'
      data.targetThr = '1d'
      data.relativeSpeed = 7
      data.isAoAStrong = true

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
      expect(result.attackerAdds).toEqual(8)
      expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
      expect(result.targetAdds).toEqual(3)
    })

    describe('Shield rushes work like slams but require a shield', () => {
      test('Add the shield’s Defense Bonus (+1 to +3) to your damage roll and subtract it from your target’s damage roll', () => {
        data.attackerThr = '2d'
        data.targetThr = '1d'
        data.relativeSpeed = 7
        data.isAoAStrong = true
        data.shieldDB = 1

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: -2 })
        expect(result.attackerAdds).toEqual(9)
        expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
        expect(result.targetAdds).toEqual(2)
      })
    })
  })

  describe('GURPS Slams...you each roll your HP x velocity / 100 crushing damage on the other.', () => {
    const data = {
      useDFRPGRules: false,
      attackerHp: 10,
      targetHp: 8,
      relativeSpeed: 0,
      isAoAStrong: false,
      shieldDB: 0,
    }

    test('10 and 8, speed 1 -- treat fractions up to 0.25 as 1d-3', () => {
      data.attackerHp = 10
      data.targetHp = 8
      data.relativeSpeed = 1

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: -3 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -3 })
      expect(result.targetAdds).toEqual(0)
    })

    test('10 and 8, speed 2 -- treat fractions up to 0.25 as 1d-3', () => {
      data.attackerHp = 10
      data.targetHp = 8
      data.relativeSpeed = 1

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: -3 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -3 })
      expect(result.targetAdds).toEqual(0)
    })

    test('10 and 5, speed 5 -- treat fractions up to 0.5 as 1d-2', () => {
      data.attackerHp = 10
      data.targetHp = 5
      data.relativeSpeed = 5

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: -2 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -3 })
      expect(result.targetAdds).toEqual(0)
    })

    test('10 and 5, speed 6 -- and any larger fraction as 1d-1', () => {
      data.attackerHp = 10
      data.targetHp = 5
      data.relativeSpeed = 6

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: -1 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
      expect(result.targetAdds).toEqual(0)
    })

    test('10 and 5, speed 10', () => {
      data.attackerHp = 10
      data.targetHp = 5
      data.relativeSpeed = 10

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: 0 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -2 })
      expect(result.targetAdds).toEqual(0)
    })

    test('10 and 5, speed 14', () => {
      data.attackerHp = 10
      data.targetHp = 5
      data.relativeSpeed = 14

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 1, adds: 0 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(result.targetAdds).toEqual(0)
    })

    test('10 and 5, speed 15 -- round fractions of 0.5 or more up to a full die', () => {
      data.attackerHp = 10
      data.targetHp = 5
      data.relativeSpeed = 15

      const result = slamCalculator!._getSlamData(data)

      expect(result.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(result.attackerAdds).toEqual(0)
      expect(result.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(result.targetAdds).toEqual(0)
    })

    describe('You can use All-Out Attack (Strong) to increase your damage.', () => {
      test('10 and 5, speed 14', () => {
        data.isAoAStrong = true
        data.attackerHp = 10
        data.targetHp = 5
        data.relativeSpeed = 14

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 1, adds: 0 })
        expect(result.attackerAdds).toEqual(2)
        expect(result.targetDice).toEqual({ dice: 1, adds: -1 })
        expect(result.targetAdds).toEqual(0)
      })

      test('10 and 5, speed 15', () => {
        data.isAoAStrong = true
        data.attackerHp = 10
        data.targetHp = 5
        data.relativeSpeed = 15

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: 0 })
        expect(result.attackerAdds).toEqual(2)
        expect(result.targetDice).toEqual({ dice: 1, adds: -1 })
        expect(result.targetAdds).toEqual(0)
      })
    })

    describe('Shield Rush: add your shield’s Defense Bonus to your damage roll', () => {
      test('10 and 5, speed 14', () => {
        data.isAoAStrong = true
        data.attackerHp = 10
        data.targetHp = 5
        data.relativeSpeed = 14
        data.shieldDB = 3

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 1, adds: 0 })
        expect(result.attackerAdds).toEqual(5)
        expect(result.targetDice).toEqual({ dice: 1, adds: -1 })
        expect(result.targetAdds).toEqual(0)
      })

      test('10 and 5, speed 15', () => {
        data.isAoAStrong = true
        data.attackerHp = 10
        data.targetHp = 5
        data.relativeSpeed = 15
        data.shieldDB = 2

        const result = slamCalculator!._getSlamData(data)

        expect(result.attackerDice).toEqual({ dice: 2, adds: 0 })
        expect(result.attackerAdds).toEqual(4)
        expect(result.targetDice).toEqual({ dice: 1, adds: -1 })
        expect(result.targetAdds).toEqual(0)
      })
    })
  })
})
