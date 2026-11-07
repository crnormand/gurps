interface RtfGroupState {
  atGroupStart: boolean
  ignorable: boolean
  skip: boolean
  unicodeFallbackCount: number
}

const ignoredDestinations = new Set([
  'annotation',
  'colortbl',
  'datastore',
  'filetbl',
  'fonttbl',
  'footer',
  'footerf',
  'footerl',
  'footerr',
  'generator',
  'header',
  'headerf',
  'headerl',
  'headerr',
  'info',
  'listoverridetable',
  'listtable',
  'object',
  'pict',
  'revtbl',
  'rsidtbl',
  'stylesheet',
  'themedata',
  'xmlnstbl',
])

const windows1252SpecialCharacters: Record<number, string> = {
  0x80: '\u20ac',
  0x82: '\u201a',
  0x83: '\u0192',
  0x84: '\u201e',
  0x85: '\u2026',
  0x86: '\u2020',
  0x87: '\u2021',
  0x88: '\u02c6',
  0x89: '\u2030',
  0x8a: '\u0160',
  0x8b: '\u2039',
  0x8c: '\u0152',
  0x8e: '\u017d',
  0x91: '\u2018',
  0x92: '\u2019',
  0x93: '\u201c',
  0x94: '\u201d',
  0x95: '\u2022',
  0x96: '\u2013',
  0x97: '\u2014',
  0x98: '\u02dc',
  0x99: '\u2122',
  0x9a: '\u0161',
  0x9b: '\u203a',
  0x9c: '\u0153',
  0x9e: '\u017e',
  0x9f: '\u0178',
}

const controlWordText: Record<string, string> = {
  bullet: '\u2022',
  emdash: '\u2014',
  endash: '\u2013',
  lquote: '\u2018',
  ldblquote: '\u201c',
  rdblquote: '\u201d',
  rquote: '\u2019',
  tab: '\t',
}

/**
 * Converts the text-bearing parts of a simple RTF string to plain text.
 * Formatting controls and destination groups such as font tables are omitted.
 */
export function rtfToText(rtf: string): string {
  const rootState: RtfGroupState = {
    atGroupStart: false,
    ignorable: false,
    skip: false,
    unicodeFallbackCount: 1,
  }
  const groups = [rootState]
  let output = ''
  let fallbackCharactersToSkip = 0

  const appendText = (text: string, state: RtfGroupState) => {
    if (state.skip) return

    if (fallbackCharactersToSkip > 0) {
      fallbackCharactersToSkip--

      return
    }

    output += text
  }

  for (let index = 0; index < rtf.length; index++) {
    const character = rtf[index]
    const state = groups[groups.length - 1]

    if (character === '{') {
      groups.push({ ...state, atGroupStart: true, ignorable: false })
      continue
    }

    if (character === '}') {
      if (groups.length > 1) groups.pop()
      continue
    }

    if (character === '\r' || character === '\n') continue

    if (character !== '\\') {
      state.atGroupStart = false
      appendText(character, state)
      continue
    }

    const nextCharacter = rtf[index + 1]

    if (nextCharacter === undefined) {
      appendText('\\', state)
      continue
    }

    if (nextCharacter === '\\' || nextCharacter === '{' || nextCharacter === '}') {
      index++
      state.atGroupStart = false
      appendText(nextCharacter, state)
      continue
    }

    if (nextCharacter === "'") {
      const hex = rtf.slice(index + 2, index + 4)

      if (/^[\da-f]{2}$/i.test(hex)) {
        index += 3
        state.atGroupStart = false
        const byte = parseInt(hex, 16)

        appendText(windows1252SpecialCharacters[byte] ?? String.fromCharCode(byte), state)
        continue
      }
    }

    if (!/[a-z]/i.test(nextCharacter)) {
      index++

      if (nextCharacter === '*') {
        state.ignorable = true
      } else {
        state.atGroupStart = false
        const symbolText: Record<string, string> = {
          '~': '\u00a0',
          _: '\u2011',
          '-': '',
        }

        appendText(symbolText[nextCharacter] ?? '', state)
      }

      continue
    }

    let end = index + 1

    while (end < rtf.length && /[a-z]/i.test(rtf[end])) end++
    const word = rtf.slice(index + 1, end).toLowerCase()

    let parameter: number | undefined

    if (rtf[end] === '-' || /\d/.test(rtf[end] ?? '')) {
      const parameterStart = end

      if (rtf[end] === '-') end++
      while (end < rtf.length && /\d/.test(rtf[end])) end++
      parameter = parseInt(rtf.slice(parameterStart, end), 10)
    }

    if (rtf[end] === ' ') end++
    index = end - 1

    if (state.atGroupStart) {
      if (state.ignorable || ignoredDestinations.has(word)) state.skip = true
      state.atGroupStart = false
      state.ignorable = false
    }

    if (word === 'uc' && parameter !== undefined) {
      state.unicodeFallbackCount = Math.max(0, parameter)
    } else if (word === 'u' && parameter !== undefined) {
      appendText(String.fromCharCode(parameter & 0xffff), state)
      fallbackCharactersToSkip = state.unicodeFallbackCount
    } else if (word === 'par' || word === 'line') {
      appendText('\n', state)
    } else if (controlWordText[word] !== undefined) {
      appendText(controlWordText[word], state)
    }
  }

  return output
}
