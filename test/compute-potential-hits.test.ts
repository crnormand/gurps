// @ts-expect-error - test-only import; module resolution not configured in tsconfig for this path
import { computePotentialHits } from '../module/dierolls/compute-potential-hits'

describe('Compute Potential Hits', () => {
  const chatdata: Record<string, unknown> = {}

  test('caps hits by available shots', () => {
    computePotentialHits({ obj: { rcl: '2', rof: '4' }, shots: 3 }, 5, chatdata)
    expect(chatdata).toEqual({ rof: '3', rcl: '2', rofrcl: 3 })
  })

  test('limits potential hits to current RoF', () => {
    computePotentialHits({ obj: { rcl: '2', rof: '4' }, shots: 1 }, 20, chatdata)
    expect(chatdata).toEqual({ rof: '1', rcl: '2', rofrcl: 1 })
  })

  describe('caps hits by recoil and margin of success', () => {
    let optionalArgs: { obj: { rcl: string; rof: string }; shots: number } = { obj: { rcl: '0', rof: '0' }, shots: 0 }
    let margin: number | undefined = undefined

    beforeEach(() => {
      const text = expect.getState().currentTestName!.split('#> ')[1]
      if (text) {
        const rofMatch = text.match(/RoF\("(?<rof>\d+([×xX\*]\d+)?)"\)/)
        const rclMatch = text.match(/Recoil\("(?<rcl>\d+)"\)/)
        const shotsMatch = text.match(/Shots\((?<shots>\d+)\)/)
        const marginMatch = text.match(/Margin\((?<margin>-?\d+)\)/)

        optionalArgs = {
          obj: {
            rof: `${rofMatch!.groups!.rof}`,
            rcl: `${rclMatch!.groups!.rcl}`,
          },
          shots: parseInt(shotsMatch!.groups!.shots, 10),
        }
        margin = marginMatch ? parseInt(marginMatch.groups!.margin, 10) : undefined
      }
    })

    test('#> Recoil("2") RoF("4") Shots(4) Margin(0)', () => {
      computePotentialHits(optionalArgs, margin, chatdata)
      expect(chatdata).toEqual({ rof: '4', rcl: '2', rofrcl: 1 })
    })

    test('#> Recoil("2") RoF("4") Shots(4) Margin(1)', () => {
      computePotentialHits(optionalArgs, margin, chatdata)
      expect(chatdata).toEqual({ rof: '4', rcl: '2', rofrcl: 1 })
    })

    test('#> Recoil("2") RoF("12") Shots(12) Margin(10)', () => {
      computePotentialHits(optionalArgs, margin, chatdata)
      expect(chatdata).toEqual({ rof: '12', rcl: '2', rofrcl: 6 })
    })

    describe('supports Shotgun RoF notation', () => {
      test('#> Recoil("2") RoF("2x9") Shots(1) Margin(7) = 4', () => {
        computePotentialHits(optionalArgs, margin, chatdata)
        expect(chatdata).toEqual({ rof: '1x9', rcl: '2', rofrcl: 4 })
      })

      test('#> Recoil("2") RoF("3x9") Shots(2) Margin(10) = 6', () => {
        computePotentialHits(optionalArgs, margin, chatdata)
        expect(chatdata).toEqual({ rof: '2x9', rcl: '2', rofrcl: 6 })
      })

      test('#> Recoil("1") RoF("3x9") Shots(3) Margin(10) = 11', () => {
        computePotentialHits(optionalArgs, margin, chatdata)
        expect(chatdata).toEqual({ rof: '3x9', rcl: '1', rofrcl: 11 })
      })
    })
  })
})
