import { parseForRollOrDamage, parselink } from '../lib/parselink.js'
import { DamageTable } from '../module/damage/damage-tables.js'

beforeAll(() => {
  globalThis.GURPS = {} as any

  /** @type {Game} */
  // @ts-ignore
  globalThis.game = {
    i18n: {
      // @ts-ignore
      localize: str => str,
    },
  }
})

describe('parseForRollOrDamage', () => {
  beforeAll(() => {
    GURPS.DamageTables = new DamageTable()
  })

  test.each([
    [
      '1d6+2 cr',
      {
        orig: '1d6+2 cr',
        type: 'damage',
        formula: '1d6+2',
        damagetype: 'cr',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '1d-2! cr',
      {
        orig: '1d-2! cr',
        type: 'damage',
        formula: '1d-2!',
        damagetype: 'cr',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '12 pi++',
      {
        orig: '12 pi++',
        type: 'damage',
        formula: '12',
        damagetype: 'pi++',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '1d ctrl',
      {
        orig: '1d ctrl',
        type: 'roll',
        formula: '1d6',
        displayformula: '1d',
        desc: 'ctrl',
        accumulate: false,
        costs: undefined,
        hitlocation: undefined,
        next: undefined,
      },
    ],
    [
      '2d-1x3 pi++ @torso',
      {
        orig: '2d-1x3 pi++ @torso',
        type: 'damage',
        formula: '2d-1x3',
        damagetype: 'pi++',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: 'torso',
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '2d-1 imp *costs 1 FP',
      {
        orig: '2d-1 imp *costs 1 FP',
        type: 'damage',
        formula: '2d-1',
        damagetype: 'imp',
        extdamagetype: undefined,
        costs: '*costs 1 FP',
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '2d-1(2) burn ex',
      {
        orig: '2d-1(2) burn ex',
        type: 'damage',
        formula: '2d-1(2)',
        damagetype: 'burn',
        extdamagetype: 'ex',
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '8(0.5) burn ex',
      {
        orig: '8(0.5) burn ex',
        type: 'damage',
        formula: '8(0.5)',
        damagetype: 'burn',
        extdamagetype: 'ex',
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '2d burn, 1d tox',
      {
        orig: '2d burn, 1d tox',
        type: 'damage',
        formula: '2d',
        damagetype: 'burn',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: {
          accumulate: false,
          costs: undefined,
          damagetype: 'tox',
          extdamagetype: undefined,
          formula: '1d',
          hitlocation: undefined,
          next: undefined,
          orig: '1d tox',
          type: 'damage',
        },
      },
    ],
    [
      '2d burn, foo',
      {
        orig: '2d burn, foo',
        type: 'damage',
        formula: '2d',
        damagetype: 'burn',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      '2d charm fat',
      {
        orig: '2d charm fat',
        type: 'damage',
        formula: '2d',
        damagetype: 'fat',
        extdamagetype: undefined,
        costs: undefined,
        hitlocation: undefined,
        accumulate: false,
        next: undefined,
      },
    ],
    [
      'sw+1 cut',
      {
        accumulate: false,
        costs: undefined,
        damagetype: 'cut',
        derivedformula: 'sw',
        extdamagetype: undefined,
        formula: '+1',
        hitlocation: undefined,
        orig: 'sw+1 cut',
        type: 'deriveddamage',
      },
    ],
    [
      'sw+1 ctrl',
      {
        accumulate: false,
        costs: undefined,
        derivedformula: 'sw',
        desc: 'ctrl',
        formula: '+1',
        hitlocation: undefined,
        orig: 'sw+1 ctrl',
        type: 'derivedroll',
      },
    ],
    [
      'sw +1 cut',
      {
        accumulate: false,
        costs: undefined,
        damagetype: 'cut',
        formula: '+1',
        hitlocation: undefined,
        orig: 'sw +1 cut',
        type: 'deriveddamage',
        extdamagetype: undefined,
        derivedformula: 'sw',
      },
    ],
    [
      'swing+1 cut',
      {
        accumulate: false,
        costs: undefined,
        damagetype: 'cut',
        formula: '+1',
        hitlocation: undefined,
        orig: 'swing+1 cut',
        type: 'deriveddamage',
        extdamagetype: undefined,
        derivedformula: 'swing',
      },
    ],
    [
      'THR+1 imp',
      {
        accumulate: false,
        costs: undefined,
        damagetype: 'imp',
        formula: '+1',
        hitlocation: undefined,
        orig: 'THR+1 imp',
        type: 'deriveddamage',
        extdamagetype: undefined,
        derivedformula: 'THR',
      },
    ],
    [
      'THRUST +1 imp',
      {
        accumulate: false,
        costs: undefined,
        damagetype: 'imp',
        formula: '+1',
        hitlocation: undefined,
        orig: 'THRUST +1 imp',
        type: 'deriveddamage',
        extdamagetype: undefined,
        derivedformula: 'THRUST',
      },
    ],
    [
      'swing +1 ctrl',
      {
        accumulate: false,
        costs: undefined,
        derivedformula: 'swing',
        desc: 'ctrl',
        formula: '+1',
        hitlocation: undefined,
        orig: 'swing +1 ctrl',
        type: 'derivedroll',
      },
    ],
    [
      '6d-10*3! pi++ (0.5) *Costs 1FP',
      {
        accumulate: false,
        costs: '*Costs 1FP',
        damagetype: 'pi++',
        extdamagetype: '(0.5)',
        formula: '6d-10*3!',
        hitlocation: undefined,
        orig: '6d-10*3! pi++ (0.5) *Costs 1FP',
        type: 'damage',
      },
    ],
  ])('parses %s correctly', (input, expected) => {
    const result = parseForRollOrDamage(input)
    expect(result!.action).toEqual(expected)
  })

  test('#> 8', () => {
    expect(parseForRollOrDamage('8')).toBeUndefined()
  })
})

describe('parseLink', () => {
  let input: string

  beforeEach(() => {
    input = expect.getState().currentTestName!.split('#> ')[1]
  })

  test('#> A', () => {
    const result = parselink(input)

    expect(result).toEqual({
      text: 'A',
    })
  })

  describe('Common prefixes (override text, actor id, blind roll)', () => {
    test('Overridetext: #> "Modifiers" +1 mod', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        desc: 'mod',
        mod: '+1',
        orig: '+1 mod',
        overridetxt: 'Modifiers',
        spantext: '+1 mod',
        type: 'modifier',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='+1 mod'>Modifiers</span>"))
    })

    test("Overridetext: #> 'Modifiers' +1 mod", () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        desc: 'mod',
        mod: '+1',
        orig: '+1 mod',
        overridetxt: 'Modifiers',
        spantext: '+1 mod',
        type: 'modifier',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='+1 mod'>Modifiers</span>"))
    })

    test('Blind Roll: #> "text" !HT-1', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: true,
        mod: '-1',
        name: 'HT',
        orig: 'HT-1',
        overridetxt: 'text',
        path: 'attributes.HT.value',
        spantext: 'HT -1 ',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='!HT-1'>text</span>"))
    })

    test('Actor ID: #> "Hello" @actorid@ HT-1', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        mod: '-1',
        name: 'HT',
        orig: 'HT-1',
        overridetxt: 'Hello',
        path: 'attributes.HT.value',
        sourceId: 'actorid',
        spantext: 'HT -1 ',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT-1'>Hello</span>"))
    })

    test('Actor ID + Blind Roll: #> !@actorid@ HT-1', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: true,
        mod: '-1',
        name: 'HT',
        orig: 'HT-1',
        path: 'attributes.HT.value',
        sourceId: 'actorid',
        spantext: 'HT -1 ',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='!HT-1'>(Blind Roll) HT -1</span>"))
    })
  })

  describe('Damage', () => {
    test('#> !@actorid@ 2d+2 cut', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '2d+2 cut',
        type: 'damage',
        formula: '2d+2',
        damagetype: 'cut',
        accumulate: false,
        blindroll: true,
        sourceId: 'actorid',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='2d+2 cut'>2d+2 cut</span>"))
    })
  })

  describe('Modifiers', () => {
    test('#> !@actorid@ –2 for Stun', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '-2 for Stun',
        spantext: '-2 for Stun',
        type: 'modifier',
        mod: '-2',
        desc: 'for Stun',
      })
      expect(result.text).toEqual(expect.stringContaining("-2 for Stun'>&minus;2 for Stun</span>"))
    })

    test('#> !@actorid@ -2', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '-2',
        spantext: '-2 ',
        type: 'modifier',
        mod: '-2',
        desc: '',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='-2'>&minus;2 </span>"))
    })

    test('#> !@actorid@ -4 the GM hates me & IQ-2', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '-4 the GM hates me & IQ-2',
        spantext: '-4 the GM hates me',
        type: 'modifier',
        mod: '-4',
        desc: 'the GM hates me',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='-4 the GM hates me & IQ-2'>&minus;4 the GM hates me</span>")
      )
    })

    test('#> !@actorid@ -2 for Stun &+1 for Luck&-3 My GM hates me', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '-2 for Stun &+1 for Luck&-3 My GM hates me',
        spantext: '-2 for Stun & +1 for Luck & -3 My GM hates me',
        type: 'modifier',
        mod: '-2',
        desc: 'for Stun',
        next: {
          desc: 'for Luck',
          mod: '+1',
          orig: '+1 for Luck&-3 My GM hates me',
          spantext: '+1 for Luck & -3 My GM hates me',
          type: 'modifier',
          next: {
            orig: '-3 My GM hates me',
            desc: 'My GM hates me',
            mod: '-3',
            spantext: '-3 My GM hates me',
            type: 'modifier',
            next: undefined,
          },
        },
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='-2 for Stun &+1 for Luck&-3 My GM hates me'>&minus;2 for Stun & +1 for Luck & -3 My GM hates me</span>"
        )
      )
    })

    test('#> +@margin For some reason & -1 for stupidity', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '+@margin For some reason & -1 for stupidity',
        spantext: '+@margin For some reason & -1 for stupidity',
        type: 'modifier',
        mod: '+@margin',
        desc: '+@margin For some reason',
        next: {
          orig: '-1 for stupidity',
          spantext: '-1 for stupidity',
          type: 'modifier',
          mod: '-1',
          desc: 'for stupidity',
        },
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='+@margin For some reason & -1 for stupidity'>+@margin For some reason & -1 for stupidity</span>"
        )
      )
    })

    test('#> +@margin For some reason & ST12', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '+@margin For some reason & ST12',
        spantext: '+@margin For some reason',
        type: 'modifier',
        mod: '+@margin',
        desc: '+@margin For some reason',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='+@margin For some reason & ST12'>+@margin For some reason</span>")
      )
    })

    test('#> +@margin', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '+@margin',
        spantext: '+@margin ',
        type: 'modifier',
        mod: '+@margin',
        desc: '+@margin',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='+@margin'>+@margin </span>"))
    })

    test('#> +A:"Night Vision"', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '+A:"Night Vision"',
        spantext: '+A:"Night Vision" ',
        type: 'modifier',
        mod: '+A:"Night Vision"',
        desc: '',
      })
      expect(result.text).toEqual(expect.stringContaining(`data-otf='+A:"Night Vision"'>+A:"Night Vision" </span>`))
    })

    test('#> +a:Night*Vision', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: '+a:Night*Vision',
        spantext: '+A:Night*Vision ',
        type: 'modifier',
        mod: '+A:Night*Vision',
        desc: '',
      })
      expect(result.text).toEqual(expect.stringContaining(`data-otf='+a:Night*Vision'>+A:Night*Vision </span>`))
    })
  })

  describe('Chat Commands', () => {
    test('#> /chat command', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        quiet: false,
        orig: '/chat command',
        type: 'chat',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='/chat command'>/chat command</span"))
    })

    test('Macro: #> /:chat command', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        quiet: false,
        orig: '/:chat command',
        type: 'chat',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='/:chat command'>/:chat command</span"))
    })
  })

  describe('if test', () => {
    test('#> @margin > 1', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@margin > 1',
        name: 'margin',
        equation: '> 1',
      })
      expect(result.text).toEqual('@margin > 1')
    })

    test('#> @margin >= 1', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@margin >= 1',
        name: 'margin',
        equation: '>= 1',
      })
      expect(result.text).toEqual('@margin >= 1')
    })

    test('#> @margin >= 1.5', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@margin >= 1.5',
        name: 'margin',
        equation: '>= 1.5',
      })
      expect(result.text).toEqual('@margin >= 1.5')
    })

    test('#> @isCritSuccess', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@isCritSuccess',
        name: 'isCritSuccess',
      })
      expect(result.text).toEqual('@isCritSuccess')
    })

    test('#> @isCritFailure = 0', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@isCritFailure = 0',
        name: 'isCritFailure',
        equation: '= 0',
      })
      expect(result.text).toEqual('@isCritFailure = 0')
    })
  })

  describe('Drag and Drop', () => {
    test('#> JournalEntry[1234]{some text}', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'dragdrop',
        orig: 'JournalEntry[1234]{some text}',
        link: 'JournalEntry',
        id: '1234',
        overridetxt: '{some text}',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='JournalEntry[1234]{some text}'>{some text}</span>")
      )
    })

    test('Actor -- dragdrop ignores quoted override text #> "Hello" Actor[1234]{some text}', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'dragdrop',
        orig: 'Actor[1234]{some text}',
        link: 'Actor',
        id: '1234',
        overridetxt: '{some text}',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Actor[1234]{some text}'>{some text}</span>"))
    })

    test('Actor -- dragdrop ignores quoted override text #> "PDF" Actor[1234]{}', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        type: 'dragdrop',
        orig: 'Actor[1234]{}',
        link: 'Actor',
        id: '1234',
        overridetxt: '{}',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Actor[1234]{}'>{}</span>"))
    })
  })

  describe('Attribute', () => {
    test('#> ST', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: 'ST',
        spantext: 'ST ',
        type: 'attribute',
        attribute: 'ST',
        attrkey: 'ST',
        name: 'ST',
        path: 'attributes.ST.value',
        blindroll: false,
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='ST'>ST</span>"))
    })

    test('#> Per12', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: 'Per12',
        spantext: 'Per12 ',
        type: 'attribute',
        attribute: 'Per',
        attrkey: 'PER',
        name: 'PER',
        path: 'attributes.PER.value',
        blindroll: false,
        target: '12',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per12'>Per12</span>"))
    })

    test('#> Per 12', () => {
      const result = parselink(input)
      expect(result.action).toEqual({
        attribute: 'Per',
        attrkey: 'PER',
        blindroll: false,
        desc: '12',
        name: 'PER',
        orig: 'Per 12',
        path: 'attributes.PER.value',
        spantext: 'Per 12',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per 12'>Per 12</span>"))
    })

    test('#> Per: 12', () => {
      const result = parselink(input)
      expect(result.action).toEqual({
        attribute: 'Per',
        attrkey: 'PER',
        blindroll: false,
        desc: '12',
        name: 'PER',
        orig: 'Per: 12',
        path: 'attributes.PER.value',
        spantext: 'Per: 12',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per: 12'>Per: 12</span>"))
    })

    test('#> Fright Check -2 for Fear', () => {
      let result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'Fright Check',
        attrkey: 'FRIGHT CHECK',
        blindroll: false,
        desc: 'for Fear',
        mod: '-2',
        name: 'FRIGHT CHECK',
        orig: 'Fright Check -2 for Fear',
        path: 'frightcheck',
        spantext: 'Fright Check -2 for Fear',
        type: 'attribute',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='Fright Check -2 for Fear'>Fright Check -2 for Fear</span>")
      )
    })

    test('#> Fright Check14', () => {
      let result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'Fright Check',
        attrkey: 'FRIGHT CHECK',
        blindroll: false,
        name: 'FRIGHT CHECK',
        orig: 'Fright Check14',
        path: 'frightcheck',
        spantext: 'Fright Check14 ',
        target: '14',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Fright Check14'>Fright Check14</span>"))
    })

    test('#> ST12 +2 Some description', () => {
      let result = parselink(input)

      expect(result.action).toEqual({
        orig: 'ST12 +2 Some description',
        spantext: 'ST12 +2 Some description',
        type: 'attribute',
        attribute: 'ST',
        attrkey: 'ST',
        mod: '+2',
        name: 'ST',
        path: 'attributes.ST.value',
        desc: 'Some description',
        blindroll: false,
        target: '12',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='ST12 +2 Some description'>ST12 +2 Some description</span>")
      )
    })

    test('(Russian DX) #> ЛВ', () => {
      const result = parselink(input)

      // TODO code comments says it deals with non-English translations, but it doesn't seem to do anything.
      expect(result).toEqual({ text: 'ЛВ' })
    })

    test('#> HT +@margin', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: 'HT +@margin',
        spantext: 'HT +@margin ',
        type: 'attribute',
        attribute: 'HT',
        attrkey: 'HT',
        name: 'HT',
        blindroll: false,
        mod: '+@margin',
        path: 'attributes.HT.value',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT +@margin'>HT +@margin</span>"))
    })

    test('#> Per +a:Magery', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'Per',
        attrkey: 'PER',
        blindroll: false,
        mod: '+a:Magery',
        name: 'PER',
        orig: 'Per +a:Magery',
        path: 'attributes.PER.value',
        spantext: 'Per +a:Magery ',
        type: 'attribute',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per +a:Magery'>Per +a:Magery</span>"))
    })

    test('#> HT description', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        orig: 'HT description',
        spantext: 'HT description',
        type: 'attribute',
        attribute: 'HT',
        attrkey: 'HT',
        name: 'HT',
        blindroll: false,
        desc: 'description',
        path: 'attributes.HT.value',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT description'>HT description</span>"))
    })

    test('#> Parry:Broadsword +2 Description', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'Parry',
        attrkey: 'PARRY',
        blindroll: false,
        desc: 'Description',
        melee: 'Broadsword',
        mod: '+2',
        name: 'PARRY',
        orig: 'Parry:Broadsword +2 Description',
        path: 'equippedparry',
        spantext: 'Parry:Broadsword +2 Description',
        type: 'attribute',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='Parry:Broadsword +2 Description'>Parry:Broadsword +2 Description</span>")
      )
    })

    // TODO Make this work (weapon with a space in the name and/or non-alphanumeric characters)
    test('#> Parry:Wizard*s*Staff +2 Description', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'Parry',
        attrkey: 'PARRY',
        blindroll: false,
        desc: 'Description',
        melee: 'Wizard*s*Staff',
        mod: '+2',
        name: 'PARRY',
        orig: 'Parry:Wizard*s*Staff +2 Description',
        path: 'equippedparry',
        spantext: 'Parry:Wizard*s*Staff +2 Description',
        type: 'attribute',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='Parry:Wizard*s*Staff +2 Description'>Parry:Wizard*s*Staff +2 Description</span>"
        )
      )
    })

    test('#> HT | DX', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        next: {
          attribute: 'DX',
          attrkey: 'DX',
          blindroll: false,
          orig: 'DX',
          path: 'attributes.DX.value',
          spantext: 'DX ',
          type: 'attribute',
          name: 'DX',
        },
        orig: 'HT | DX',
        path: 'attributes.HT.value',
        spantext: 'HT  | DX ',
        type: 'attribute',
        name: 'HT',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT | DX'>HT  | DX</span>"))
    })

    test('#> HT | Somthing else', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        orig: 'HT | Somthing else',
        path: 'attributes.HT.value',
        spantext: 'HT ',
        type: 'attribute',
        name: 'HT',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT | Somthing else'>HT</span>"))
    })

    test('#> IQ-2 ? "Idea!", "No Clue"', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'IQ',
        attrkey: 'IQ',
        blindroll: false,
        falsetext: 'No Clue',
        orig: 'IQ-2 ? "Idea!", "No Clue"',
        path: 'attributes.IQ.value',
        spantext: 'IQ -2 ',
        truetext: 'Idea!',
        type: 'attribute',
        name: 'IQ',
        mod: '-2',
      })
      expect(result.text).toEqual(expect.stringContaining('data-otf=\'IQ-2 ? "Idea!", "No Clue"\'>IQ -2</span>'))
    })

    // TODO: This is a bug.
    test('#> HT ? "Awake" : "Fall asleep"', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        falsetext: 'Fall asleep',
        orig: 'HT ? "Awake" : "Fall asleep"',
        path: 'attributes.HT.value',
        spantext: 'HT ',
        truetext: 'Awake',
        type: 'attribute',
        name: 'HT',
      })
      expect(result.text).toEqual(expect.stringContaining('data-otf=\'HT ? "Awake" : "Fall asleep"\'>HT</span>'))
    })

    test('#> IQ ? "Idea!"', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        attribute: 'IQ',
        attrkey: 'IQ',
        blindroll: false,
        orig: 'IQ ? "Idea!"',
        path: 'attributes.IQ.value',
        spantext: 'IQ ',
        truetext: 'Idea!',
        type: 'attribute',
        name: 'IQ',
      })
      expect(result.text).toEqual(expect.stringContaining('data-otf=\'IQ ? "Idea!"\'>IQ</span>'))
    })
  })

  test('#> CR: 9 to resist temptation', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      blindroll: false,
      desc: 'to resist temptation',
      orig: 'CR: 9 to resist temptation',
      target: 9, // TODO target is sometimes a string, sometimes a number.
      type: 'controlroll',
    })
    expect(result.text).toEqual(
      expect.stringContaining("data-otf='CR: 9 to resist temptation'>CR: 9 to resist temptation</span>")
    )
  })

  test('#> CR: 15', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      blindroll: false,
      desc: '',
      orig: 'CR: 15',
      target: 15,
      type: 'controlroll',
    })
    expect(result.text).toEqual(expect.stringContaining("data-otf='CR: 15'>CR: 15</span>"))
  })

  test('#> PDF:B345', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      link: 'B345',
      orig: 'PDF:B345',
      type: 'pdf',
    })
    expect(result.text).toEqual("<span class='pdflink' data-pdf='B345'>B345</span>")
  })

  test('#> "Basic" PDF:B345', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      link: 'B345',
      orig: 'PDF:B345',
      type: 'pdf',
    })
    expect(result.text).toEqual("<span class='pdflink' data-pdf='B345'>Basic</span>")
  })

  describe('Skill-Spell', () => {
    test('#> S:Stealth', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: false,
        isSpellOnly: false,
        name: 'Stealth',
        orig: 'S:Stealth',
        spantext: '<b>S:</b>Stealth',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='S:Stealth'><b>S:</b>Stealth</span>"))
    })

    test('#> S:Stealth Comment', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'Comment',
        isSkillOnly: false,
        isSpellOnly: false,
        name: 'Stealth',
        orig: input,
        spantext: '<b>S:</b>Stealth Comment',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='S:Stealth Comment'><b>S:</b>Stealth Comment</span>")
      )
    })

    test('#> S:Savoir-faire -3 description | something else', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'description',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: '-3',
        name: 'Savoir-faire',
        orig: 'S:Savoir-faire -3 description | something else',
        spantext: '<b>S:</b>Savoir-faire -3 description',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='S:Savoir-faire -3 description | something else'><b>S:</b>Savoir-faire -3 description</span>"
        )
      )
    })

    test('#> S:Acrobatics-6', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: false,
        isSpellOnly: false,
        name: 'Acrobatics',
        orig: 'S:Acrobatics-6',
        spantext: '<b>S:</b>Acrobatics -6',
        type: 'skill-spell',
        mod: '-6',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='S:Acrobatics-6'><b>S:</b>Acrobatics -6</span>"))
    })

    test('#> Sp:"Bigby\'s Crushing Hand" +1 Description', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'Description',
        isSkillOnly: false,
        isSpellOnly: true,
        mod: '+1',
        name: "Bigby's Crushing Hand",
        orig: 'Sp:"Bigby\'s Crushing Hand" +1 Description',
        spantext: "<b>Sp:</b>Bigby's Crushing Hand +1 Description",
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='Sp:\"Bigby's Crushing Hand\" +1 Description'><b>Sp:</b>Bigby's Crushing Hand +1 Description</span>"
        )
      )
    })

    test("#> Sp:'Bigbys Crushing Hand' +1 Description", () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'Description',
        isSkillOnly: false,
        isSpellOnly: true,
        mod: '+1',
        name: 'Bigbys Crushing Hand',
        orig: "Sp:'Bigbys Crushing Hand' +1 Description",
        spantext: '<b>Sp:</b>Bigbys Crushing Hand +1 Description',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='Sp:'Bigbys Crushing Hand' +1 Description'><b>Sp:</b>Bigbys Crushing Hand +1 Description</span>"
        )
      )
    })

    // TODO this should be an error!
    test("#> Sp:'' +1 Description", () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'Description',
        isSkillOnly: false,
        isSpellOnly: true,
        mod: '+1',
        name: '',
        orig: "Sp:'' +1 Description",
        spantext: '<b>Sp:</b> +1 Description',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='Sp:'' +1 Description'><b>Sp:</b>+1 Description</span>")
      )
    })

    test('Modifiers require a space: #> Sk:Stealth -1', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '-1',
        name: 'Stealth',
        orig: 'Sk:Stealth -1',
        spantext: '<b>Sk:</b>Stealth -1',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Sk:Stealth -1'><b>Sk:</b>Stealth -1</span>"))
    })

    test('#> SP:Stealth +3', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: false,
        isSpellOnly: true,
        mod: '+3',
        name: 'Stealth',
        orig: 'SP:Stealth +3',
        spantext: '<b>Sp:</b>Stealth +3',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='SP:Stealth +3'><b>Sp:</b>Stealth +3</span>"))
    })

    test('#> Sk:Stealth +3 (Based: IQ) Comment this', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'Comment this',
        floatingAttribute: 'attributes.IQ.value',
        floatingLabel: 'IQ',
        floatingType: 'attribute',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '+3',
        name: 'Stealth',
        orig: 'Sk:Stealth +3 (Based: IQ) Comment this',
        spantext: '<b>Sk:</b>Stealth +3 Comment this (Based:IQ)',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='Sk:Stealth +3 (Based: IQ) Comment this'><b>Sk:</b>Stealth +3 Comment this (Based:IQ)</span>"
        )
      )
    })

    test('#> Sk:Stealth +3 (Based: ZX) Comment this', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'Comment this',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '+3',
        name: 'Stealth',
        orig: 'Sk:Stealth +3 (Based: ZX) Comment this',
        spantext: '<b>Sk:</b>Stealth +3 Comment this',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='Sk:Stealth +3 (Based: ZX) Comment this'><b>Sk:</b>Stealth +3 Comment this</span>"
        )
      )
    })

    test('#> Sk:Stealth +3 *Costs 2 HP', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '*Costs 2 HP',
        desc: '',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '+3',
        name: 'Stealth',
        orig: 'Sk:Stealth +3 *Costs 2 HP',
        spantext: '<b>Sk:</b>Stealth *Costs 2 HP +3',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='Sk:Stealth +3 *Costs 2 HP'><b>Sk:</b>Stealth *Costs 2 HP +3</span>")
      )
    })

    test('#> Sk:Stealth +3 * Per 2HP', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '* Per 2HP',
        desc: '',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '+3',
        name: 'Stealth',
        orig: 'Sk:Stealth +3 * Per 2HP',
        spantext: '<b>Sk:</b>Stealth * Per 2HP +3',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='Sk:Stealth +3 * Per 2HP'><b>Sk:</b>Stealth * Per 2HP +3</span>")
      )
    })

    test('#> Sk:Stealth -2 for armor ? "Sneaky" , "Alarm!"', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'for armor',
        falsetext: 'Alarm!',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '-2',
        name: 'Stealth',
        orig: 'Sk:Stealth -2 for armor ? "Sneaky" , "Alarm!"',
        spantext: '<b>Sk:</b>Stealth -2 for armor',
        truetext: 'Sneaky',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          'data-otf=\'Sk:Stealth -2 for armor ? "Sneaky" , "Alarm!"\'><b>Sk:</b>Stealth -2 for armor</span>'
        )
      )
    })

    test('#> Sk:Stealth -2 for armor ? "Sneaky" : "Alarm!"', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'for armor',
        falsetext: 'Alarm!',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '-2',
        name: 'Stealth',
        orig: 'Sk:Stealth -2 for armor ? "Sneaky" : "Alarm!"',
        spantext: '<b>Sk:</b>Stealth -2 for armor',
        truetext: 'Sneaky',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          'data-otf=\'Sk:Stealth -2 for armor ? "Sneaky" : "Alarm!"\'><b>Sk:</b>Stealth -2 for armor</span>'
        )
      )
    })

    test('#> S:Stealth +@margin for Spell', () => {
      // Is there a way to get the test name?

      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'for Spell',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: '+@margin',
        name: 'Stealth',
        orig: 'S:Stealth +@margin for Spell',
        spantext: '<b>S:</b>Stealth +@margin for Spell',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='S:Stealth +@margin for Spell'><b>S:</b>Stealth +@margin for Spell</span>")
      )
    })

    test('#> S:Stealth+@margin for Spell', () => {
      // Is there a way to get the test name?

      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'for Spell',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: '+@margin',
        name: 'Stealth',
        orig: 'S:Stealth+@margin for Spell',
        spantext: '<b>S:</b>Stealth +@margin for Spell',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='S:Stealth+@margin for Spell'><b>S:</b>Stealth +@margin for Spell</span>")
      )
    })

    test('#> S:Savoir-faire -3 description | IQ -6 default', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'description',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: '-3',
        name: 'Savoir-faire',
        next: {
          attribute: 'IQ',
          attrkey: 'IQ',
          blindroll: false,
          desc: 'default',
          mod: '-6',
          name: 'IQ',
          orig: 'IQ -6 default',
          path: 'attributes.IQ.value',
          spantext: 'IQ -6 default',
          type: 'attribute',
        },
        orig: input,
        spantext: '<b>S:</b>Savoir-faire -3 description | IQ -6 default',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='S:Savoir-faire -3 description | IQ -6 default'><b>S:</b>Savoir-faire -3 description | IQ -6 default</span>"
        )
      )
    })

    test('#> S:Acrobatics | DX-6', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: undefined,
        name: 'Acrobatics',
        next: {
          attribute: 'DX',
          attrkey: 'DX',
          blindroll: false,
          desc: undefined,
          mod: '-6',
          name: 'DX',
          orig: 'DX-6',
          path: 'attributes.DX.value',
          spantext: 'DX -6 ',
          type: 'attribute',
        },
        orig: input,
        spantext: '<b>S:</b>Acrobatics | DX -6 ',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='S:Acrobatics | DX-6'><b>S:</b>Acrobatics | DX -6</span>")
      )
    })
  })

  describe('Melee/Ranged/Attack/Damage/Block/Parry', () => {
    test('#> A:', () => {
      const result = parselink(input)
      expect(result.action).toBeUndefined()
    })

    test('#> M:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isMelee: true,
        isRanged: false,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='M:Broadsword'><b>M:</b>Broadsword</span>"))
    })

    test('#> M:Broadsword (Swung)', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isMelee: true,
        isRanged: false,
        name: 'Broadsword (Swung)',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='M:Broadsword (Swung)'><b>M:</b>Broadsword (Swung)</span>")
      )
    })

    test('#> A:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='A:Broadsword'><b>A:</b>Broadsword</span>"))
    })

    test('#> A:Broadsword *Per 1FP', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '*Per 1FP',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Broadsword *Per 1FP'><b>A:</b>Broadsword *Per 1FP</span>")
      )
    })

    test('#> A:Broadsword * Costs 1 HP', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '* Costs 1 HP',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Broadsword * Costs 1 HP'><b>A:</b>Broadsword * Costs 1 HP</span>")
      )
    })

    test('#> A:Broadsword * Per 1 tr0000', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '* Per 1 tr0000',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Broadsword * Per 1 tr0000'><b>A:</b>Broadsword * Per 1 tr0000</span>")
      )
    })

    test('#> A:Broadsword *Costs 1 tr(Mana)', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '*Costs 1 tr(Mana)',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='A:Broadsword *Costs 1 tr(Mana)'><b>A:</b>Broadsword *Costs 1 tr(Mana)</span>"
        )
      )
    })

    test('#> A:Broadsword *Costs 1 tr("Control Points")', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '*Costs 1 tr("Control Points")',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          'data-otf=\'A:Broadsword *Costs 1 tr("Control Points")\'><b>A:</b>Broadsword *Costs 1 tr("Control Points")</span> "Control Points")'
        )
      )
    })

    test('#> A:Broadsword *Costs 1 tr(Control Points)', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '*Costs 1 tr(Control Points)',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='A:Broadsword *Costs 1 tr(Control Points)'><b>A:</b>Broadsword *Costs 1 tr(Control Points)</span> Points)"
        )
      )
    })

    test('#> A:Broadsword *Costs 1 tr(Control*Points)', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        costs: '*Costs 1 tr(Control*Points)',
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='A:Broadsword *Costs 1 tr(Control*Points)'><b>A:</b>Broadsword *Costs 1 tr(Control*Points)</span> *Points)"
        )
      )
    })

    test('#> A:Broadsword-2 stunned', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'stunned',
        isMelee: true,
        isRanged: true,
        mod: '-2',
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Broadsword-2 stunned'><b>A:</b>Broadsword-2 stunned</span>")
      )
    })

    test('#> A:Broadsword -2 stunned', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'stunned',
        isMelee: true,
        isRanged: true,
        mod: '-2',
        name: 'Broadsword',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Broadsword -2 stunned'><b>A:</b>Broadsword-2 stunned</span>")
      )
    })

    test('#> A:Throwing*Axe -2 stunned', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'stunned',
        isMelee: true,
        isRanged: true,
        mod: '-2',
        name: 'Throwing*Axe',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Throwing*Axe -2 stunned'><b>A:</b>Throwing*Axe-2 stunned</span>")
      )
    })

    test('#> R:"Throwing Axe" -2 stunned', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'stunned',
        isMelee: false,
        isRanged: true,
        mod: '-2',
        name: 'Throwing Axe',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining('data-otf=\'R:"Throwing Axe" -2 stunned\'><b>R:</b>Throwing Axe-2 stunned</span>')
      )
    })

    test('#> R:"Throwing Axe" +@margin', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '+@margin ',
        isMelee: false,
        isRanged: true,
        mod: '+@margin',
        name: 'Throwing Axe',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining('data-otf=\'R:"Throwing Axe" +@margin\'><b>R:</b>Throwing Axe +@margin</span>')
      )
    })

    test('#> R:"Throwing Axe" +@margin Serendipity', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '+@margin Serendipity',
        isMelee: false,
        isRanged: true,
        mod: '+@margin',
        name: 'Throwing Axe',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          'data-otf=\'R:"Throwing Axe" +@margin Serendipity\'><b>R:</b>Throwing Axe +@margin Serendipity</span>'
        )
      )
    })

    // TODO I suggest we also have 'DM' for damage-melee and 'DR' for damage-ranged.
    // TODO Another suggestion for A, R, M, D, DM, DR: include usage such as 'A(Thrust)' or 'R(Thrown)'.
    test('#> D:"Throwing Axe"-2 stunned', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'stunned',
        isMelee: true,
        isRanged: true,
        mod: '-2',
        name: 'Throwing Axe',
        orig: input,
        type: 'attackdamage',
      })
      expect(result.text).toEqual(
        expect.stringContaining('data-otf=\'D:"Throwing Axe"-2 stunned\'><b>D:</b>Throwing Axe-2 stunned</span>')
      )
    })

    test('#> P:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isMelee: true,
        isRanged: false,
        name: 'Broadsword',
        orig: input,
        type: 'weapon-parry',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='P:Broadsword'><b>P:</b>Broadsword</span>"))
    })

    test('#> B:Shield', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isMelee: true,
        isRanged: false,
        name: 'Shield',
        orig: input,
        type: 'weapon-block',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='B:Shield'><b>B:</b>Shield</span>"))
    })

    // Degenerate case.
    test('#> A:Throwing Axe -2 stunned', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isMelee: true,
        isRanged: true,
        name: 'Throwing',
        orig: input,
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='A:Throwing Axe -2 stunned'><b>A:</b>Throwing</span> Axe -2 stunned")
      )
    })

    test('#> A:"Mage\\\'s Staff" +1 magic attack', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'magic attack',
        isMelee: true,
        isRanged: true,
        mod: '+1',
        name: "Mage's Staff",
        // prettier-ignore
        orig: "A:\"Mage's Staff\" +1 magic attack",
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          // prettier-ignore
          "data-otf='A:\"Mage's Staff\" +1 magic attack'><b>A:</b>Mage's Staff+1 magic attack</span>"
        )
      )
    })

    test('#> A:"Mage\\\'s Staff" +1 magic attack', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'magic attack',
        isMelee: true,
        isRanged: true,
        mod: '+1',
        name: "Mage's Staff",
        // prettier-ignore
        orig: "A:\"Mage's Staff\" +1 magic attack",
        type: 'attack',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          "data-otf='A:\"Mage's Staff\" +1 magic attack'><b>A:</b>Mage's Staff+1 magic attack</span>"
        )
      )
    })
  })

  describe('Check existence', () => {
    test('#> ?A:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'A',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?A:Broadsword'>?A:Broadsword</span>"))
    })

    test('#> ?M:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'M',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?M:Broadsword'>?M:Broadsword</span>"))
    })

    test('#> ?R:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'R',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?R:Broadsword'>?R:Broadsword</span>"))
    })

    test('#> ?S:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'S',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?S:Broadsword'>?S:Broadsword</span>"))
    })

    test('#> ?AD:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'AD',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?AD:Broadsword'>?AD:Broadsword</span>"))
    })

    test('#> ?AT:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'AT',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?AT:Broadsword'>?AT:Broadsword</span>"))
    })

    test('#> ?SK:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'SK',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?SK:Broadsword'>?SK:Broadsword</span>"))
    })

    test('#> ?SP:Broadsword', () => {
      const result = parselink(input)

      expect(result.action).toEqual({
        name: 'Broadsword',
        orig: input,
        prefix: 'SP',
        type: 'test-exists',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='?SP:Broadsword'>?SP:Broadsword</span>"))
    })

    test('#> ?AK:Broadsword', () => {
      const result = parselink(input)
      expect(result.action).toBeUndefined()
    })
  })

  test('#> https://www.google.com', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      label: 'https://www.google.com',
      orig: 'https://www.google.com',
      type: 'href',
    })
    expect(result.text).toEqual('<a href="https://www.google.com">https://www.google.com</a>')
  })

  test('#> http://www.google.com', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      label: 'http://www.google.com',
      orig: 'http://www.google.com',
      type: 'href',
    })
    expect(result.text).toEqual('<a href="http://www.google.com">http://www.google.com</a>')
  })

  test('#> "Google this" http://www.google.com', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      label: 'Google this',
      orig: 'http://www.google.com',
      type: 'href',
    })
    expect(result.text).toEqual('<a href="http://www.google.com">Google this</a>')
  })

  test('#> "Scrounging"Sk:"Scrounging" | Per-4', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      blindroll: false,
      desc: '',
      isSkillOnly: true,
      isSpellOnly: false,
      name: 'Scrounging',
      orig: 'Sk:"Scrounging" | Per-4',
      overridetxt: 'Scrounging',
      next: {
        attribute: 'Per',
        attrkey: 'PER',
        blindroll: false,
        mod: '-4',
        name: 'PER',
        orig: 'Per-4',
        path: 'attributes.PER.value',
        spantext: 'Per -4 ',
        type: 'attribute',
      },
      spantext: '<b>Sk:</b>Scrounging | Per -4 ',
      type: 'skill-spell',
    })
    expect(result.text).toEqual(expect.stringContaining('data-otf=\'Sk:\"Scrounging\" | Per-4\'>Scrounging</span>'))
  })

  test('#> Sk:Scrounging | Per-4', () => {
    const result = parselink(input)

    expect(result.action).toEqual({
      blindroll: false,
      desc: '',
      isSkillOnly: true,
      isSpellOnly: false,
      name: 'Scrounging',
      orig: 'Sk:Scrounging | Per-4',
      next: {
        attribute: 'Per',
        attrkey: 'PER',
        blindroll: false,
        mod: '-4',
        name: 'PER',
        orig: 'Per-4',
        path: 'attributes.PER.value',
        spantext: 'Per -4 ',
        type: 'attribute',
      },
      spantext: '<b>Sk:</b>Scrounging | Per -4 ',
      type: 'skill-spell',
    })
    expect(result.text).toEqual(
      expect.stringContaining("data-otf='Sk:Scrounging | Per-4'><b>Sk:</b>Scrounging | Per -4</span>")
    )
  })
})
