import { IfParser } from '@module/chat/dsl-parser/if-parser.js'
import { ParseError } from '@module/chat/dsl-parser/parser-helpers.js'

describe('parseIfCommand', () => {
  test('parses a simple if statement with a negation flag and else branch', () => {
    const result = IfParser.parse('/if ! [DX] [success] /else [failure]')

    expect(result).toMatchObject({
      kind: 'SimpleIfStatement',
      negated: true,
      condition: 'DX',
      thenAction: {
        kind: 'Block',
        text: 'success',
      },
      elseAction: {
        kind: 'Block',
        text: 'failure',
      },
    })
  })

  test.each([
    [
      'all explicit outcome branches',
      '/if [DX] cs:{crit-success} s:{success} f:{failure} cf:{crit-failure}',
      {
        kind: 'OutcomeIfStatement',
        condition: 'DX',
        cs: { kind: 'Block', text: 'crit-success' },
        s: { kind: 'Block', text: 'success' },
        f: { kind: 'Block', text: 'failure' },
        cf: { kind: 'Block', text: 'crit-failure' },
      },
    ],
  ])('parses %s', (_name, input, expected) => {
    const result = IfParser.parse(input)

    expect(result).toMatchObject(expected)
  })

  test('throws a ParseError for malformed input', () => {
    expect(() => IfParser.parse('/if')).toThrow(ParseError)
  })
})
