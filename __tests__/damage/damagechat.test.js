import DamageChat from '../../module/damage/damagechat.js'

describe('DamageChat', () => {
  test('has constructor', () => {
    let chat = new DamageChat()
    expect(chat).not.toBeNull()
  })
})
