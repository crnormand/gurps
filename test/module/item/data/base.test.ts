import { BaseItemModel } from '@module/item/data/base.js'

class TestItemModel extends BaseItemModel {}

describe('BaseItemModel', () => {
  describe('getGlobalBonuses', () => {
    test.each([
      ['ST +5', 5],
      ['ST -5', -5],
    ])('parses %s as numeric modifier', (bonus, expectedModifier) => {
      const item = new TestItemModel({ bonuses: bonus })

      const [parsedBonus] = item.getGlobalBonuses()

      expect(parsedBonus.mod).toBe(expectedModifier)
    })

    it('adds a numeric bonus to a numeric base value', () => {
      const item = new TestItemModel({ bonuses: 'ST +5' })
      const [bonus] = item.getGlobalBonuses()

      expect(17 + (bonus.mod as number)).toBe(22)
    })
  })
})
