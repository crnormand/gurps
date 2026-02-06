import { computePotentialHits, WeaponDescriptor } from '../../../module/dierolls/compute-potential-hits.ts'

describe('Compute Potential Hits', () => {
  test('caps hits by available shots', () => {
    const result = computePotentialHits({ recoil: '2', rateOfFire: '4' }, 3, 5)

    expect(result).toEqual({ rateOfFire: '3', recoil: '2', potentialHits: 3 })
  })

  test('limits potential hits to current RoF', () => {
    const result = computePotentialHits({ recoil: '2', rateOfFire: '4' }, 1, 20)

    expect(result).toEqual({ rateOfFire: '1', recoil: '2', potentialHits: 1 })
  })

  describe('caps hits by recoil and margin of success', () => {
    let weapon: WeaponDescriptor | undefined = undefined
    let shots: number | undefined = undefined
    let margin: number | undefined = undefined

    beforeEach(() => {
      const text = expect.getState().currentTestName!.split('#> ')[1]

      if (text) {
        const rofMatch = text.match(/RoF\("(?<rof>\d+([×xX*]\d+)?)"\)/)
        const rclMatch = text.match(/Recoil\("(?<rcl>\d+)"\)/)
        const shotsMatch = text.match(/Shots\((?<shots>\d+)\)/)
        const marginMatch = text.match(/Margin\((?<margin>-?\d+)\)/)

        weapon = {
          rateOfFire: `${rofMatch!.groups!.rof}`,
          recoil: `${rclMatch!.groups!.rcl}`,
        }
        shots = parseInt(shotsMatch!.groups!.shots, 10) || undefined
        margin = marginMatch ? parseInt(marginMatch.groups!.margin, 10) : undefined
      }
    })

    test('#> Recoil("2") RoF("4") Shots(4) Margin(0)', () => {
      const result = computePotentialHits(weapon!, shots!, margin!)

      expect(result).toEqual({ rateOfFire: '4', recoil: '2', potentialHits: 1 })
    })

    test('#> Recoil("2") RoF("4") Shots(4) Margin(1)', () => {
      const result = computePotentialHits(weapon!, shots!, margin!)

      expect(result).toEqual({ rateOfFire: '4', recoil: '2', potentialHits: 1 })
    })

    test('#> Recoil("2") RoF("12") Shots(12) Margin(10)', () => {
      const result = computePotentialHits(weapon!, shots!, margin!)

      expect(result).toEqual({ rateOfFire: '12', recoil: '2', potentialHits: 6 })
    })

    describe('supports Shotgun RoF notation', () => {
      test('#> Recoil("2") RoF("2x9") Shots(1) Margin(7) = 4', () => {
        const result = computePotentialHits(weapon!, shots!, margin!)

        expect(result).toEqual({ rateOfFire: '1x9', recoil: '2', potentialHits: 4 })
      })

      test('#> Recoil("2") RoF("3x9") Shots(2) Margin(10) = 6', () => {
        const result = computePotentialHits(weapon!, shots!, margin!)

        expect(result).toEqual({ rateOfFire: '2x9', recoil: '2', potentialHits: 6 })
      })

      test('#> Recoil("1") RoF("3x9") Shots(3) Margin(10) = 11', () => {
        const result = computePotentialHits(weapon!, shots!, margin!)

        expect(result).toEqual({ rateOfFire: '3x9', recoil: '1', potentialHits: 11 })
      })
    })
  })
})
