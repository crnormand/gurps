import { GurpsDSLParser } from '@module/otf/dsl-parser/gurps-dsl-parser.js'

describe('GurpsDSLParser', () => {
  describe('parse', () => {
    test('parses a minimal phrase', () => {
      const parser = new GurpsDSLParser('S:Stealth')

      expect(parser.parse()).toEqual({
        phrases: [
          {
            type: 'skill-spell',
            name: 'Stealth',
            modifier: undefined,
            based: undefined,
            costs: undefined,
            description: undefined,
          },
        ],
      })
    })

    test('parses quoted names, flat modifier, based, costs, and trailing description', () => {
      const parser = new GurpsDSLParser('Sk:"Fast-Talk" +2 (Based: IQ) *costs 1 FP in crowds')

      expect(parser.parse()).toEqual({
        phrases: [
          {
            type: 'skill',
            name: 'Fast-Talk',
            modifier: { kind: 'flat', value: 2 },
            based: { value: 'IQ' },
            costs: { keyword: 'costs', amount: 1, text: 'FP in crowds' },
            description: undefined,
          },
        ],
      })
    })

    test('parses negative flat modifier and per-cost keyword', () => {
      const parser = new GurpsDSLParser('Sp:Fireball -3 *per 2 points while charging')

      expect(parser.parse()).toEqual({
        phrases: [
          {
            type: 'spell',
            name: 'Fireball',
            modifier: { kind: 'flat', value: -3 },
            based: undefined,
            costs: { keyword: 'per', amount: 2, text: 'points while charging' },
            description: undefined,
          },
        ],
      })
    })

    test('parses margin modifier with either sign', () => {
      const plusParser = new GurpsDSLParser('S:Broadsword +@margin')
      const minusParser = new GurpsDSLParser('S:Shield -@margin')

      expect(plusParser.parse().phrases[0].modifier).toEqual({ kind: 'margin', sign: '+' })
      expect(minusParser.parse().phrases[0].modifier).toEqual({ kind: 'margin', sign: '-' })
    })

    test('treats leftover text as description when no costs are present', () => {
      const parser = new GurpsDSLParser('S:Stealth +1 in darkness only')

      expect(parser.parse()).toEqual({
        phrases: [
          {
            type: 'skill-spell',
            name: 'Stealth',
            modifier: { kind: 'flat', value: 1 },
            based: undefined,
            costs: undefined,
            description: 'in darkness only',
          },
        ],
      })
    })

    test('splits multiple phrases on pipe but keeps pipes inside quoted names', () => {
      const parser = new GurpsDSLParser("S:'Traps|Locks' +1 | Sk:Lockpicking")

      expect(parser.parse()).toEqual({
        phrases: [
          {
            type: 'skill-spell',
            name: 'Traps|Locks',
            modifier: { kind: 'flat', value: 1 },
            based: undefined,
            costs: undefined,
            description: undefined,
          },
          {
            type: 'skill',
            name: 'Lockpicking',
            modifier: undefined,
            based: undefined,
            costs: undefined,
            description: undefined,
          },
        ],
      })
    })

    test('supports escaped quotes inside quoted names', () => {
      const parser = new GurpsDSLParser('S:"He said \\\"Run\\\""')

      expect(parser.parse()).toEqual({
        phrases: [
          {
            type: 'skill-spell',
            name: 'He said "Run"',
            modifier: undefined,
            based: undefined,
            costs: undefined,
            description: undefined,
          },
        ],
      })
    })

    test('throws for an invalid type prefix', () => {
      const parser = new GurpsDSLParser('X:Stealth')

      expect(() => parser.parse()).toThrow('Invalid type')
    })

    test('throws when colon after type is missing', () => {
      const parser = new GurpsDSLParser('S Stealth')

      expect(() => parser.parse()).toThrow("Expected ':'")
    })
  })
})
