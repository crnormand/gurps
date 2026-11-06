import { rtfToText } from '@module/importer/gca-importer/rtf-to-text.js'

describe('rtfToText', () => {
  it('removes formatting controls and converts paragraphs and lines to newlines', () => {
    const rtf =
      '\\f0\\fs19 Physiology Modifiers apply (p. B181):\\par \\i Similar: \\i0\\f1 -2 to -4\\line Machine: No roll possible!'

    expect(rtfToText(rtf)).toBe('Physiology Modifiers apply (p. B181):\nSimilar: -2 to -4\nMachine: No roll possible!')
  })

  it('omits RTF header and font-table destination groups', () => {
    const rtf = '{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0 Arial;}}\\viewkind4\\pard Hello\\par World}'

    expect(rtfToText(rtf)).toBe('Hello\nWorld')
  })

  it('preserves escaped braces and backslashes', () => {
    expect(rtfToText('Literal \\{braces\\} and \\\\ slash')).toBe('Literal {braces} and \\ slash')
  })

  it('decodes common RTF quote controls and Windows-1252 hex escapes', () => {
    expect(rtfToText("GM\\rquote s \\emdash \\u8217? \\'e9")).toBe('GM\u2019s \u2014\u2019 \u00e9')
  })

  it('preserves text in formatting groups and omits ignorable destinations', () => {
    const rtf = 'Before {\\i emphasized} {\\*\\unknown hidden} after'

    expect(rtfToText(rtf)).toBe('Before emphasized  after')
  })

  it('leaves plain text unchanged', () => {
    expect(rtfToText('Plain text with (parentheses).')).toBe('Plain text with (parentheses).')
  })
})
