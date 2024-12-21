import { parseForRollOrDamage, parselink } from '../lib/parselink'
import { DamageTable } from '../module/damage/damage-tables'

globalThis.GURPS = {}
globalThis.game = {
  i18n: {
    localize: str => str,
  },
}

describe('parseForRollOrDamage', () => {
  beforeAll(() => {
    GURPS.DamageTables = new DamageTable()
  })

  test('1d6+2 cr', () => {
    const result = parseForRollOrDamage('1d6+2 cr')

    expect(result.action).toEqual({
      orig: '1d6+2 cr',
      type: 'damage',
      formula: '1d6+2',
      damagetype: 'cr',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('1d-2! cr', () => {
    const result = parseForRollOrDamage('1d-2! cr')

    expect(result.action).toEqual({
      orig: '1d-2! cr',
      type: 'damage',
      formula: '1d-2!',
      damagetype: 'cr',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('12 pi++', () => {
    const result = parseForRollOrDamage('12 pi++')

    expect(result.action).toEqual({
      orig: '12 pi++',
      type: 'damage',
      formula: '12',
      damagetype: 'pi++',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('1d ctrl', () => {
    const result = parseForRollOrDamage('1d ctrl')

    expect(result.action).toEqual({
      accumulate: false,
      costs: undefined,
      desc: 'ctrl',
      displayformula: '1d',
      formula: '1d6',
      hitlocation: undefined,
      next: undefined,
      orig: '1d ctrl',
      type: 'roll',
    })
  })

  test('2d-1x3 pi++ @torso', () => {
    const result = parseForRollOrDamage('2d-1x3 pi++ @torso')

    expect(result.action).toEqual({
      orig: '2d-1x3 pi++ @torso',
      type: 'damage',
      formula: '2d-1x3',
      damagetype: 'pi++',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: 'torso',
      accumulate: false,
      next: undefined,
    })
  })

  test('2d-1 imp *costs 1 FP', () => {
    const result = parseForRollOrDamage('2d-1 imp *costs 1 FP')

    expect(result.action).toEqual({
      orig: '2d-1 imp *costs 1 FP',
      type: 'damage',
      formula: '2d-1',
      damagetype: 'imp',
      extdamagetype: undefined,
      costs: '*costs 1 FP',
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('2d-1(2) burn ex', () => {
    const result = parseForRollOrDamage('2d-1(2) burn ex')

    expect(result.action).toEqual({
      orig: '2d-1(2) burn ex',
      type: 'damage',
      formula: '2d-1(2)',
      damagetype: 'burn',
      extdamagetype: 'ex',
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('8(0.5) burn ex', () => {
    const result = parseForRollOrDamage('8(0.5) burn ex')

    expect(result.action).toEqual({
      orig: '8(0.5) burn ex',
      type: 'damage',
      formula: '8(0.5)',
      damagetype: 'burn',
      extdamagetype: 'ex',
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('8', () => {
    expect(parseForRollOrDamage('8')).toBeUndefined()
  })

  test('2d burn, 1d tox', () => {
    const result = parseForRollOrDamage('2d burn, 1d tox')

    expect(result.action).toEqual({
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
    })
  })

  test('2d burn, foo', () => {
    const result = parseForRollOrDamage('2d burn, foo')

    expect(result.action).toEqual({
      orig: '2d burn, foo',
      type: 'damage',
      formula: '2d',
      damagetype: 'burn',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('2d charm fat', () => {
    const result = parseForRollOrDamage('2d charm fat')

    expect(result.action).toEqual({
      orig: '2d charm fat',
      type: 'damage',
      formula: '2d',
      damagetype: 'fat',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('sw+1 cut', () => {
    const result = parseForRollOrDamage('sw+1 cut')

    expect(result.action).toEqual({
      accumulate: false,
      costs: undefined,
      damagetype: 'cut',
      derivedformula: 'sw',
      extdamagetype: undefined,
      formula: '+1',
      hitlocation: undefined,
      orig: 'sw+1 cut',
      type: 'deriveddamage',
    })
  })

  test('sw+1 ctrl', () => {
    const result = parseForRollOrDamage('sw+1 ctrl')

    expect(result.action).toEqual({
      accumulate: false,
      costs: undefined,
      derivedformula: 'sw',
      desc: 'ctrl',
      formula: '+1',
      hitlocation: undefined,
      orig: 'sw+1 ctrl',
      type: 'derivedroll',
    })
  })
})

describe('parseLink', () => {
  test('A', () => {
    const result = parselink('A')

    expect(result).toEqual({
      text: 'A',
    })
  })

  describe('Common prefixes', () => {
    test('Overridetext: "Modifiers" +1 mod', () => {
      const result = parselink('"Modifiers" +1 mod')

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

    test("Overridetext: 'Modifiers' +1 mod", () => {
      const result = parselink("'Modifiers' +1 mod")

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

    test('Blind Roll: !HT-1', () => {
      const result = parselink('"text" !HT-1')

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: true,
        desc: '',
        melee: '',
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

    test('Actor ID: @actorid@ HT-1', () => {
      const result = parselink('"Hello" @actorid@ HT-1')

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        desc: '',
        melee: '',
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

    test('Actor ID + Blind Roll: !@actorid@ HT-1', () => {
      const result = parselink('!@actorid@ HT-1')

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: true,
        desc: '',
        melee: '',
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

  test('!@actorid@ 2d+2 cut', () => {
    const result = parselink('!@actorid@ 2d+2 cut')

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

  describe('Modifiers', () => {
    test('!@actorid@ -2 for Stun', () => {
      const result = parselink('!@actorid@ -2 for Stun')

      expect(result.action).toEqual({
        orig: '-2 for Stun',
        spantext: '-2 for Stun',
        type: 'modifier',
        mod: '-2',
        desc: 'for Stun',
      })
      expect(result.text).toEqual(expect.stringContaining("-2 for Stun'>&minus;2 for Stun</span>"))
    })

    test('!@actorid@ -2', () => {
      const result = parselink('!@actorid@ -2')

      expect(result.action).toEqual({
        orig: '-2',
        spantext: '-2 ',
        type: 'modifier',
        mod: '-2',
        desc: '',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='-2'>&minus;2 </span>"))
    })

    test('!@actorid@ -4 the GM hates me & IQ-2', () => {
      const result = parselink('!@actorid@ -4 the GM hates me & IQ-2')

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

    test('!@actorid@ -2 for Stun &+1 for Luck&-3 My GM hates me', () => {
      const result = parselink('!@actorid@ -2 for Stun &+1 for Luck&-3 My GM hates me')

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

    test('+@margin For some reason & -1 for stupidity', () => {
      const result = parselink('+@margin For some reason & -1 for stupidity')

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

    test('+@margin For some reason & ST12', () => {
      const result = parselink('+@margin For some reason & ST12')

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

    test('+@margin', () => {
      const result = parselink('+@margin')

      expect(result.action).toEqual({
        orig: '+@margin',
        spantext: '+@margin ',
        type: 'modifier',
        mod: '+@margin',
        desc: '+@margin',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='+@margin'>+@margin </span>"))
    })
  })

  test('/chat command', () => {
    const result = parselink('/chat command')

    expect(result.action).toEqual({
      quiet: false,
      orig: '/chat command',
      type: 'chat',
    })
    expect(result.text).toEqual(expect.stringContaining("data-otf='/chat command'>/chat command</span"))
  })

  describe('if test', () => {
    test('@margin > 1', () => {
      const result = parselink('@margin > 1')

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@margin > 1',
        name: 'margin',
        equation: '> 1',
      })
      expect(result.text).toEqual('@margin > 1')
    })

    test('@margin >= 1', () => {
      const result = parselink('@margin >= 1')

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@margin >= 1',
        name: 'margin',
        equation: '>= 1',
      })
      expect(result.text).toEqual('@margin >= 1')
    })

    test('@margin >= 1.5', () => {
      const result = parselink('@margin >= 1.5')

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@margin >= 1.5',
        name: 'margin',
        equation: '>= 1.5',
      })
      expect(result.text).toEqual('@margin >= 1.5')
    })

    test('@isCritSuccess', () => {
      const result = parselink('@isCritSuccess')

      expect(result.action).toEqual({
        type: 'iftest',
        orig: '@isCritSuccess',
        name: 'isCritSuccess',
      })
      expect(result.text).toEqual('@isCritSuccess')
    })

    test('@isCritFailure', () => {
      const result = parselink('@isCritFailure = 0')

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
    test('JournalEntry', () => {
      const result = parselink('JournalEntry[1234]{some text}')

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

    test('Actor -- dragdrop ignores quoted override text', () => {
      const result = parselink('"ActorName" Actor[1234]{some text}')

      expect(result.action).toEqual({
        type: 'dragdrop',
        orig: 'Actor[1234]{some text}',
        link: 'Actor',
        id: '1234',
        overridetxt: '{some text}',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Actor[1234]{some text}'>{some text}</span>"))
    })

    test('Actor -- dragdrop ignores quoted override text', () => {
      const result = parselink('"ActorName" Actor[1234]{}')

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
    test('ST', () => {
      const result = parselink('ST')

      expect(result.action).toEqual({
        orig: 'ST',
        spantext: 'ST ',
        type: 'attribute',
        attribute: 'ST',
        attrkey: 'ST',
        name: 'ST',
        path: 'attributes.ST.value',
        desc: '',
        blindroll: false,
        melee: '',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='ST'>ST</span>"))
    })

    test('Per12', () => {
      const result = parselink('Per12')

      expect(result.action).toEqual({
        orig: 'Per12',
        spantext: 'Per12 ',
        type: 'attribute',
        attribute: 'Per',
        attrkey: 'PER',
        name: 'PER',
        path: 'attributes.PER.value',
        desc: '',
        blindroll: false,
        melee: '',
        target: '12',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per12'>Per12</span>"))
    })

    test('Per 12', () => {
      const result = parselink('Per 12')
      expect(result.action).toEqual({
        orig: 'Per 12',
        spantext: 'Per12 ',
        type: 'attribute',
        attribute: 'Per',
        attrkey: 'PER',
        name: 'PER',
        path: 'attributes.PER.value',
        target: '12',
        desc: '',
        blindroll: false,
        melee: '',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per 12'>Per12</span>"))
    })

    test('Per: 12', () => {
      const result = parselink('Per: 12')
      expect(result.action).toEqual({
        orig: 'Per: 12',
        spantext: 'Per: 12',
        type: 'attribute',
        attribute: 'Per',
        attrkey: 'PER',
        name: 'PER',
        path: 'attributes.PER.value',
        desc: '12',
        blindroll: false,
        melee: '',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Per: 12'>Per: 12</span>"))
    })

    test('Fright Check12', () => {
      let result = parselink('Fright Check12')

      expect(result.action).toEqual({
        orig: 'Fright Check12',
        spantext: 'Fright Check12 ',
        type: 'attribute',
        attribute: 'Fright Check',
        attrkey: 'FRIGHT CHECK',
        name: 'FRIGHT CHECK',
        path: 'frightcheck',
        desc: '',
        blindroll: false,
        melee: '',
        target: '12',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Fright Check12'>Fright Check12</span>"))
    })

    test('ST12 +2 Some description', () => {
      let result = parselink('ST12 +2 Some description')

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
        melee: '',
        target: '12',
      })
      expect(result.text).toEqual(
        expect.stringContaining("data-otf='ST12 +2 Some description'>ST12 +2 Some description</span>")
      )
    })

    test('ЛВ (Russian DX)', () => {
      const result = parselink('ЛВ')

      // TODO code comments says it deals with non-English translations, but it doesn't
      // seem to do anything.
      expect(result).toEqual({ text: 'ЛВ' })
    })

    test('HT +@margin', () => {
      const result = parselink('HT +@margin')

      expect(result.action).toEqual({
        orig: 'HT +@margin',
        spantext: 'HT +@margin ',
        type: 'attribute',
        attribute: 'HT',
        attrkey: 'HT',
        name: 'HT',
        blindroll: false,
        desc: '+@margin ',
        melee: '',
        mod: '+@margin',
        path: 'attributes.HT.value',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT +@margin'>HT +@margin</span>"))
    })

    test('HT description', () => {
      const result = parselink('HT description')

      expect(result.action).toEqual({
        orig: 'HT description',
        spantext: 'HT description',
        type: 'attribute',
        attribute: 'HT',
        attrkey: 'HT',
        name: 'HT',
        blindroll: false,
        desc: 'description',
        melee: '',
        path: 'attributes.HT.value',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT description'>HT description</span>"))
    })

    test('Parry:Broadsword +2 Description', () => {
      const result = parselink('Parry:Broadsword +2 Description')

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
    test('Parry:Wizard*s*Staff +2 Description ', () => {
      const result = parselink('Parry:Wizard*s*Staff +2 Description')

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

    test('HT | DX', () => {
      const result = parselink('HT | DX')

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        desc: '',
        melee: '',
        next: {
          attribute: 'DX',
          attrkey: 'DX',
          blindroll: false,
          desc: '',
          melee: '',
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

    test('HT | Somthing else', () => {
      const result = parselink('HT | Somthing else')

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        desc: '',
        melee: '',
        orig: 'HT | Somthing else',
        path: 'attributes.HT.value',
        spantext: 'HT ',
        type: 'attribute',
        name: 'HT',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='HT | Somthing else'>HT</span>"))
    })

    test('IQ-2 ? "Idea!", "No Clue"', () => {
      const result = parselink('IQ-2 ? "Idea!", "No Clue"')

      expect(result.action).toEqual({
        attribute: 'IQ',
        attrkey: 'IQ',
        blindroll: false,
        desc: '',
        falsetext: 'No Clue',
        melee: '',
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
    test('HT ? "Awake" : "Fall asleep"', () => {
      const result = parselink('HT ? "Awake" : "Fall asleep"')

      expect(result.action).toEqual({
        attribute: 'HT',
        attrkey: 'HT',
        blindroll: false,
        desc: '',
        falsetext: 'Fall asleep',
        melee: '',
        orig: 'HT ? "Awake" : "Fall asleep"',
        path: 'attributes.HT.value',
        spantext: 'HT ',
        truetext: 'Awake',
        type: 'attribute',
        name: 'HT',
      })
      expect(result.text).toEqual(expect.stringContaining('data-otf=\'HT ? \"Awake\" : \"Fall asleep\"\'>HT</span>'))
    })

    test('IQ ? "Idea!"', () => {
      const result = parselink('IQ ? "Idea!"')

      expect(result.action).toEqual({
        attribute: 'IQ',
        attrkey: 'IQ',
        blindroll: false,
        desc: '',
        melee: '',
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

  test('CR: 9 to resist temptation', () => {
    const result = parselink('CR: 9 to resist temptation')

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

  test('CR: 15', () => {
    const result = parselink('CR: 15')

    expect(result.action).toEqual({
      blindroll: false,
      desc: '',
      orig: 'CR: 15',
      target: 15,
      type: 'controlroll',
    })
    expect(result.text).toEqual(expect.stringContaining("data-otf='CR: 15'>CR: 15</span>"))
  })

  test('PDF:B346', () => {
    const result = parselink('PDF:B345')

    expect(result.action).toEqual({
      link: 'B345',
      orig: 'PDF:B345',
      type: 'pdf',
    })
    expect(result.text).toEqual("<span class='pdflink' data-pdf='B345'>B345</span>")
  })

  test('"Basic" PDF:B345', () => {
    const result = parselink('"Basic" PDF:B345')

    expect(result.action).toEqual({
      link: 'B345',
      orig: 'PDF:B345',
      type: 'pdf',
    })
    expect(result.text).toEqual("<span class='pdflink' data-pdf='B345'>Basic</span>")
  })

  describe('Skill-Spell', () => {
    test('S:Stealth', () => {
      const result = parselink('S:Stealth')

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: '',
        name: 'Stealth',
        orig: 'S:Stealth',
        spantext: '<b>S:</b>Stealth',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='S:Stealth'><b>S:</b>Stealth</span>"))
    })

    test('Modifiers require a space: Sk:Stealth-1', () => {
      const result = parselink('Sk:Stealth-1')

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '',
        name: 'Stealth-1',
        orig: 'Sk:Stealth-1',
        spantext: '<b>Sk:</b>Stealth-1',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='Sk:Stealth-1'><b>Sk:</b>Stealth-1</span>"))
    })

    test('Modifiers require a space: Sk:Stealth -1', () => {
      const result = parselink('Sk:Stealth -1')

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

    test('SP:Stealth +3', () => {
      const result = parselink('SP:Stealth +3')

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

    test('Sk:Stealth +3 (Based: IQ) Comment this', () => {
      const result = parselink('Sk:Stealth +3 (Based: IQ) Comment this')

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

    test('Sk:Stealth +3 (Based: ZX) Comment this', () => {
      const result = parselink('Sk:Stealth +3 (Based: ZX) Comment this')

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

    test('Sk:Stealth +3 *Costs 2 HP', () => {
      const result = parselink('Sk:Stealth +3 *Costs 2 HP')

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

    test('Sk:Stealth +3 * Per 2HP', () => {
      const result = parselink('Sk:Stealth +3 * Per 2HP')

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

    test('Sk:Stealth -2 for armor ? "Sneaky" , "Alarm!"', () => {
      const result = parselink('Sk:Stealth -2 for armor ? "Sneaky", "Alarm!"')

      expect(result.action).toEqual({
        blindroll: false,
        desc: 'for armor',
        falsetext: 'Alarm!',
        isSkillOnly: true,
        isSpellOnly: false,
        mod: '-2',
        name: 'Stealth',
        orig: 'Sk:Stealth -2 for armor ? "Sneaky", "Alarm!"',
        spantext: '<b>Sk:</b>Stealth -2 for armor',
        truetext: 'Sneaky',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(
        expect.stringContaining(
          'data-otf=\'Sk:Stealth -2 for armor ? "Sneaky", "Alarm!"\'><b>Sk:</b>Stealth -2 for armor</span>'
        )
      )
    })

    test('Sk:Stealth -2 for armor ? "Sneaky" : "Alarm!"', () => {
      const result = parselink('Sk:Stealth -2 for armor ? "Sneaky" : "Alarm!"')

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

    test('S:Stealth +@margin for Spell', () => {
      // Is there a way to get the test name?
      
      const result = parselink('S:Stealth +@margin for Spell')

      expect(result.action).toEqual({
        blindroll: false,
        desc: '',
        isSkillOnly: false,
        isSpellOnly: false,
        mod: '+3',
        name: 'Stealth',
        orig: 'SP:Stealth +3',
        spantext: '<b>Sp:</b>Stealth +3',
        type: 'skill-spell',
      })
      expect(result.text).toEqual(expect.stringContaining("data-otf='SP:Stealth +3'><b>Sp:</b>Stealth +3</span>"))
    })

  })
})
