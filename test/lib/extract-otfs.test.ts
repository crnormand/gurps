import { DamageTable } from '../../module/damage/damage-tables.js'
import { extractOtfs } from '../../module/utilities/otf.ts'

beforeAll(() => {
  globalThis.GURPS = {} as any
  // @ts-ignore
  globalThis.game = {
    i18n: {
      // @ts-ignore
      localize: str => str,
    },
  }
  GURPS.DamageTables = new DamageTable()
})

describe('extractOtfs', () => {
  describe('skill-spell type', () => {
    test('skill with quoted name and costs shows name', () => {
      const result = extractOtfs('["Shadow Step (Instant Teleport)" IQ-10 *Costs 1 FP]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Shadow Step (Instant Teleport)')
    })

    test('simple skill shows skill name', () => {
      const result = extractOtfs('[Sk:"Stealth"]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Stealth')
    })

    test('skill with modifier shows skill name', () => {
      const result = extractOtfs('[Sk:"Climbing"-2]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Climbing')
    })

    test('spell shows spell name', () => {
      const result = extractOtfs('[Sp:"Fireball"]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Fireball')
    })
  })

  describe('attribute type', () => {
    test('attribute with quoted override text shows it', () => {
      const result = extractOtfs('["Resist Poison" HT]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Resist Poison')
    })

    test('attribute without description shows attribute name', () => {
      const result = extractOtfs('[HT]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('HT')
    })

    test('Will with modifier and quoted text', () => {
      const result = extractOtfs('["Fear Check" Will-2]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Fear Check')
    })

    test('IQ roll shows IQ when no description', () => {
      const result = extractOtfs('[IQ]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('IQ')
    })
  })

  describe('filters non-rollable types', () => {
    test('iftest is filtered out', () => {
      const result = extractOtfs('[if something]')
      expect(result).toHaveLength(0)
    })

    test('pdf reference is filtered out', () => {
      const result = extractOtfs('[PDF:B100]')
      expect(result).toHaveLength(0)
    })
  })

  describe('multiple OTFs', () => {
    test('extracts multiple OTFs from text', () => {
      const result = extractOtfs('Use ["Resist" HT] or ["Notice" Will]')
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Resist')
      expect(result[1].text).toBe('Notice')
    })

    test('extracts multiple OTFs without override text', () => {
      const result = extractOtfs('Roll [HT] or [Will]')
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('HT')
      expect(result[1].text).toBe('Will')
    })
  })

  describe('tooltip shows formula', () => {
    test('formula contains original OTF', () => {
      const result = extractOtfs('[Sk:"Stealth"-2]')
      expect(result[0].formula).toBe('Sk:"Stealth"-2')
    })
  })

  describe('preserves full formula with override text', () => {
    test('attribute with override text includes both in formula', () => {
      const result = extractOtfs('["Shadow Step" IQ-10 *Costs 1 FP]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Shadow Step')
      expect(result[0].formula).toBe('"Shadow Step" IQ-10 *Costs 1 FP')
    })

    test('attribute with double space in override text', () => {
      const result = extractOtfs('["Shadow  Step (Instant Teleport)" IQ-10 *Costs 1 FP]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Shadow  Step (Instant Teleport)')
      expect(result[0].formula).toBe('"Shadow  Step (Instant Teleport)" IQ-10 *Costs 1 FP')
    })

    test('skill without override text keeps original formula', () => {
      const result = extractOtfs('[Sk:"Stealth"-2]')
      expect(result[0].formula).toBe('Sk:"Stealth"-2')
    })
  })

  describe('chat type OTFs', () => {
    test('/if conditional with override text shows the override text', () => {
      const result = extractOtfs(
        '["Shadow Strike (Skill 15)" /if [S:Innate*Attack=15] [3d cr *Costs 1 FP] /else "Miss!"]'
      )
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Shadow Strike (Skill 15)')
    })

    test('/if conditional has encodedAction for direct execution', () => {
      const result = extractOtfs('["Attack" /if [ST] [2d cut] /else "Miss"]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Attack')
      expect(result[0].encodedAction).toBeDefined()
      const decodedAction = JSON.parse(atob(result[0].encodedAction))
      expect(decodedAction.type).toBe('chat')
      expect(decodedAction.overridetxt).toBe('Attack')
    })

    test('simple /if without override text shows Action', () => {
      const result = extractOtfs('[/if [ST] [2d cut] /else "Miss"]')
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Action')
    })
  })
})
