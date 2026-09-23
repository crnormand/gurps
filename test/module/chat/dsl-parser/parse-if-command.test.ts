import { IfParser } from '@module/chat/dsl-parser/if-parser.js'
import { ParseError } from '@module/chat/dsl-parser/parser-helpers.js'

describe('parseIfCommand', () => {
  test.each([
    [
      'simple if statement with negation and else branch',
      '/if ! [DX] [success] /else [failure]',
      {
        type: 'SimpleIfStatement',
        negated: true,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: '[success]',
        },
        elseAction: {
          type: 'Block',
          value: '[failure]',
        },
        text: '/if ! [DX] [success] /else [failure]',
      },
    ],
    [
      'simple if statement without negation and else branch',
      '/if [DX] [success] /else [failure]',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: '[success]',
        },
        elseAction: {
          type: 'Block',
          value: '[failure]',
        },
        text: '/if [DX] [success] /else [failure]',
      },
    ],
    [
      'simple if statement with no else branch',
      '/if [DX] [success]',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: '[success]',
        },
        text: '/if [DX] [success]',
      },
    ],
    [
      'simple if statement without else keyword',
      '/if [DX] [success] [failure]',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: '[success]',
        },
        elseAction: {
          type: 'Block',
          value: '[failure]',
        },
        text: '/if [DX] [success] [failure]',
      },
    ],
    [
      'simple if statement with chat-commands',
      '/if [DX] /roll 1d20',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: '/roll 1d20',
        },
        // elseAction is omitted when not present
        text: '/if [DX] /roll 1d20',
      },
    ],
    [
      'simple if statement with chat-commands and else branch',
      '/if [DX] /roll 1d20 /else /help',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: '/roll 1d20',
        },
        elseAction: {
          type: 'Block',
          value: '/help',
        },
        text: '/if [DX] /roll 1d20 /else /help',
      },
    ],
    [
      'simple if statement with narrative text',
      '/if [DX] This is a narrative text',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: 'This is a narrative text',
        },
        text: '/if [DX] This is a narrative text',
      },
    ],
    [
      'simple if statement with narrative text and else',
      '/if [DX] This is a narrative text /else This is the else narrative text',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: 'This is a narrative text',
        },
        elseAction: {
          type: 'Block',
          value: 'This is the else narrative text',
        },
        text: '/if [DX] This is a narrative text /else This is the else narrative text',
      },
    ],
    [
      'simple if statement with curly braces',
      '/if [DX] {This is a narrative text in curly braces} /else {This is the else narrative text in curly braces}',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: 'This is a narrative text in curly braces',
        },
        elseAction: {
          type: 'Block',
          value: 'This is the else narrative text in curly braces',
        },
        text: '/if [DX] {This is a narrative text in curly braces} /else {This is the else narrative text in curly braces}',
      },
    ],
    [
      'simple if statement with curly braces',
      '/if [DX] {This is a narrative text in curly braces}',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: 'This is a narrative text in curly braces',
        },
        text: '/if [DX] {This is a narrative text in curly braces}',
      },
    ],
    [
      'simple if statement nested',
      '/if [DX] /if [IQ] [A] [B] ',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'SimpleIfStatement',
          negated: false,
          condition: 'IQ',
          thenAction: {
            type: 'Block',
            value: '[A]',
          },
          elseAction: {
            type: 'Block',
            value: '[B]',
          },
          text: '/if [IQ] [A] [B]',
        },
        text: '/if [DX] /if [IQ] [A] [B]',
      },
    ],
    [
      'simple if statement with curly braces without /else',
      '/if [DX] {This is a narrative text} {This is an else block}',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'DX',
        thenAction: {
          type: 'Block',
          value: 'This is a narrative text',
        },
        elseAction: {
          type: 'Block',
          value: 'This is an else block',
        },
        text: '/if [DX] {This is a narrative text} {This is an else block}',
      },
    ],
    [
      'disambiguating dangling /else',
      '/if [A] /if [B] [X] /else [Y]',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'A',
        thenAction: {
          type: 'SimpleIfStatement',
          negated: false,
          condition: 'B',
          thenAction: {
            type: 'Block',
            value: '[X]',
          },
          elseAction: {
            type: 'Block',
            value: '[Y]',
          },
          text: '/if [B] [X] /else [Y]',
        },
        text: '/if [A] /if [B] [X] /else [Y]',
      },
    ],
    [
      'simple if statement with nested if',
      '/if [ST] {/if [S:Tra] {/if [IQ-2] {You found the Grail!} {Ah so close}} {Failed tracking}} {Failed ST}',
      {
        type: 'SimpleIfStatement',
        negated: false,
        condition: 'ST',
        thenAction: {
          type: 'SimpleIfStatement',
          negated: false,
          condition: 'S:Tra',
          thenAction: {
            type: 'SimpleIfStatement',
            negated: false,
            condition: 'IQ-2',
            thenAction: {
              type: 'Block',
              value: 'You found the Grail!',
            },
            elseAction: {
              type: 'Block',
              value: 'Ah so close',
            },
            text: '{/if [IQ-2] {You found the Grail!} {Ah so close}}',
          },
          elseAction: {
            type: 'Block',
            value: 'Failed tracking',
          },
          text: '{/if [S:Tra] {/if [IQ-2] {You found the Grail!} {Ah so close}} {Failed tracking}}',
        },
        elseAction: {
          type: 'Block',
          value: 'Failed ST',
        },
        text: '/if [ST] {/if [S:Tra] {/if [IQ-2] {You found the Grail!} {Ah so close}} {Failed tracking}} {Failed ST}',
      },
    ],
  ])('parses %s', (_name, input, expected) => {
    const result = IfParser.parse(input)

    expect(result).toMatchObject(expected)
  })

  test.each([
    [
      'all explicit outcome branches',
      '/if [DX] cs:{crit-success} s:{success} f:{failure} cf:{crit-failure}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critSuccessAction: { type: 'Block', value: 'crit-success' },
        successAction: { type: 'Block', value: 'success' },
        failureAction: { type: 'Block', value: 'failure' },
        critFailureAction: { type: 'Block', value: 'crit-failure' },
        text: '/if [DX] cs:{crit-success} s:{success} f:{failure} cf:{crit-failure}',
      },
    ],
    [
      'outcome if statement with only success and failure',
      '/if [DX] s:{success} f:{failure}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        successAction: { type: 'Block', value: 'success' },
        failureAction: { type: 'Block', value: 'failure' },
        text: '/if [DX] s:{success} f:{failure}',
      },
    ],
    [
      'outcome if statement with only critical success and critical failure',
      '/if [DX] cs:{crit-success} cf:{crit-failure}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critSuccessAction: { type: 'Block', value: 'crit-success' },
        critFailureAction: { type: 'Block', value: 'crit-failure' },
        text: '/if [DX] cs:{crit-success} cf:{crit-failure}',
      },
    ],
    [
      'outcome if statement with only critical success',
      '/if [DX] cs:{crit-success}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critSuccessAction: { type: 'Block', value: 'crit-success' },
        text: '/if [DX] cs:{crit-success}',
      },
    ],
    [
      'outcome if statement with only critical failure',
      '/if [DX] cf:{crit-failure}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critFailureAction: { type: 'Block', value: 'crit-failure' },
        text: '/if [DX] cf:{crit-failure}',
      },
    ],
    [
      'outcome if statement with positional success and failure',
      '/if [DX] cs:{crit-success} {success} {failure}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critSuccessAction: { type: 'Block', value: 'crit-success' },
        successAction: { type: 'Block', value: 'success' },
        failureAction: { type: 'Block', value: 'failure' },
        text: '/if [DX] cs:{crit-success} {success} {failure}',
      },
    ],
    [
      'outcome if statement with nested simple if',
      '/if [DX] cs:{crit-success} {success} {/if [HT] {You hang on!}}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critSuccessAction: { type: 'Block', value: 'crit-success' },
        successAction: { type: 'Block', value: 'success' },
        failureAction: {
          type: 'SimpleIfStatement',
          condition: 'HT',
          text: '/if [HT] {You hang on!}',
          negated: false,
          thenAction: { type: 'Block', value: 'You hang on!' },
        },
        text: '/if [DX] cs:{crit-success} {success} {/if [HT] {You hang on!}}',
      },
    ],
    [
      'outcome if statement with nested outcome if',
      '/if [DX] cs:{crit-success} {success} {/if [HT] cs:{Unaffected} {You hang on!} {You faint!} cf:{You pass out!}}',
      {
        type: 'OutcomeIfStatement',
        condition: 'DX',
        critSuccessAction: { type: 'Block', value: 'crit-success' },
        successAction: { type: 'Block', value: 'success' },
        failureAction: {
          type: 'OutcomeIfStatement',
          condition: 'HT',
          critSuccessAction: { type: 'Block', value: 'Unaffected' },
          successAction: { type: 'Block', value: 'You hang on!' },
          failureAction: { type: 'Block', value: 'You faint!' },
          critFailureAction: { type: 'Block', value: 'You pass out!' },
          text: '/if [HT] cs:{Unaffected} {You hang on!} {You faint!} cf:{You pass out!}',
        },
        text: '/if [DX] cs:{crit-success} {success} {/if [HT] cs:{Unaffected} {You hang on!} {You faint!} cf:{You pass out!}}',
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
