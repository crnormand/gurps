import { describe, expect, test } from '@jest/globals'
import { jest } from '@jest/globals'
import StatusChatProcessor from '../../module/chat/status.js'

class Token {}
global.Token = Token.constructor

const i18n = {
  'GURPS.Foo': 'Le Foo',
  'GURPS.Bar': 'Ein Bärren',
  'GURPS.ID': 'ID',
  'GURPS.name': 'Name',
  'GURPS.chatYouMustHaveACharacterSelected': 'You must have a character selected',
  'GURPS.chatToApplyEffects': 'to apply effects',
  'GURPS.chatNoTokens': 'Your character does not have any tokens. We require a token to set a status.',
  'GURPS.chatToggling': 'Toggling',
  'GURPS.chatClearing': 'Clearing',
  'GURPS.for': 'for',
  'GURPS.chatNoOwnedTokenFound': 'You do not own any tokens in this scene.',
  'GURPS.chatYouMustSelectTokens': 'You must select tokens (or use',
  'GURPS.chatNoStatusMatched': 'No status matched',
  'GURPS.chatSelectSelfOrNameTokens': `You must select tokens, use '@self', or use ':name' to apply effects.`,
}

const doofusToken = new Token()

doofusToken.name = 'Doofus'
doofusToken.id = 'doofus'

const doofusActor = {
  get name() {
    return 'Doofus'
  },
  token: doofusToken,
  effects: [],
  displayname: 'Doofus',
  id: 'doofusActor',
}
doofusActor.token.actor = doofusActor

describe('Status Processor', () => {
  const status = new StatusChatProcessor()
  const FooEffect = { label: 'GURPS.Foo', id: 'FOO', data: { label: 'Le Foo' } }
  const BarEffect = { label: 'GURPS.Bar', id: 'BAR', data: { label: 'Ein Bärren' } }

  describe('regex', () => {
    let regex = StatusChatProcessor.regex()

    test('test 1', () => {
      let match = '/st + foo @self'.match(regex)
      expect(match).toHaveLength(5)
      expect(match[1]).toBe('st')
      expect(match[2]).toBe('+')
      expect(match[3]).toBe('foo')
      expect(match[4]).toBe('@self')
    })

    test('test 2', () => {
      let match = '/st + foo'.match(regex)
      expect(match).toHaveLength(5)
      expect(match[1]).toBe('st')
      expect(match[2]).toBe('+')
      expect(match[3]).toBe('foo')
      expect(match[4]).toBeUndefined()
    })

    test('test 3', () => {
      let match = '/st + @self'.match(regex)
      expect(match).toHaveLength(5)
      expect(match[1]).toBe('st')
      expect(match[2]).toBe('+')
      expect(match[3]).toBeUndefined()
      expect(match[4]).toBe('@self')
    })

    test('test 4', () => {
      let match = '/st + :john'.match(regex)
      expect(match).toHaveLength(5)
      expect(match[1]).toBe('st')
      expect(match[2]).toBe('+')
      expect(match[3]).toBeUndefined()
      expect(match[4]).toBe(':john')
    })
  })

  test('help', () => {
    expect(status.help()).toBe('/status on|off|t|clear|list &lt;status&gt;')
  })

  test('matches', () => {
    expect(status.matches('/st on foo')).toBe(true)
    expect(status.matches('/status on bar')).toBe(true)
    expect(status.matches('/statuses on baz')).toBe(false)

    const commands = ['t', 'toggle', 'on', 'off', '+', '-', 'clear', 'set', 'unset']
    commands.forEach(c => expect(status.matches(`/st ${c}`)).toBe(true))

    expect(status.matches('/status bad')).toBe(false)

    expect(status.matches('/status list')).toBe(true)
  })

  describe('process line', () => {
    let mockLocalize = jest.fn()
    let mockPriv = jest.fn()
    let mockNotify = jest.fn()
    let mockPrnt = jest.fn()
    let mockGetFlagBar = jest.fn()
    let mockGetFlagFoo = jest.fn()

    let privList = []
    let prntList = []
    let notifications = []

    afterEach(() => {
      jest.resetAllMocks()
      privList = []
      prntList = []
      notifications = []
    })

    beforeEach(() => {
      mockPriv.mockImplementation(text => privList.push(text))
      mockPrnt.mockImplementation(text => prntList.push(text))
      mockLocalize.mockImplementation(key => i18n[key] || key)
      mockNotify.mockImplementation(text => notifications.push(text))
      mockGetFlagBar.mockImplementation((scope, element) => 'BAR')
      mockGetFlagFoo.mockImplementation((scope, element) => 'FOO')

      global.CONFIG = { statusEffects: [FooEffect, BarEffect] }
      global.game = { i18n: { localize: mockLocalize, has: () => true, format: mockLocalize } }
      global.ui = { notifications: { warn: mockNotify } }
      status.registry = { priv: mockPriv, prnt: mockPrnt }

      FooEffect.getFlag = mockGetFlagFoo
      BarEffect.getFlag = mockGetFlagBar

      global.canvas = {
        tokens: {
          placeables: [],
        },
      }
    })

    test('/st list', async () => {
      const input = '/st list'
      status.matches(input)
      await status.process(input)

      expect(privList.length).toBe(1)
      expect(privList[0]).toBe(
        `<table style='font-size: smaller;'><tr><th>ID</th><th>Name</th></tr><tr><td>BAR</td><td>'Ein Bärren'</td></tr><tr><td>FOO</td><td>'Le Foo'</td></tr></table>`
      )
    })

    test('/st + BAD', async () => {
      global.canvas.tokens.placeables = [doofusToken]

      const input = '/st + BAD :Doofus'
      status.matches(input)
      await status.process()
      expect(notifications[0]).toBe(`No status matched 'BAD'`)
    })

    test('/st + Le*Foo @self -- LastActor is null', async () => {
      const input = '/st + Le*Foo @self'
      status.matches(input)
      await status.process()
      expect(notifications[0]).toBe(`You do not own any tokens in this scene.`)
    })

    describe('happy paths', () => {
      const toggle = jest.fn()
      let boobToken = null

      describe('set status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          boobToken = new Token()
          boobToken.name = 'Boob'
          let boobActor = {
            get name() {
              return 'Boob'
            },
            token: boobToken,
            effects: [],
            displayname: 'Boob One',
          }
          boobActor.token.actor = boobActor

          global.canvas = {
            tokens: {
              placeables: [],
            },
          }
          global.Token = Token.constructor
          global.canvas.tokens.placeables = [boobToken]
          boobToken.owned = true
          boobToken.toggleEffect = toggle
        })

        test('/st + Le*Foo @self', async () => {
          const arg = '+ Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob One`)
        })

        test('/st on Le*Foo @self', async () => {
          const arg = 'on Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob One`)
        })

        test('/st set Le*Foo @self', async () => {
          const arg = 'set Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob One`)
        })
      })

      describe('set status :Doofus', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let doofusToken = new Token()
          doofusToken.toggleEffect = toggle
          doofusToken.name = 'Doofus'
          doofusToken.id = 'doofus'
          let doofusActor = {
            get name() {
              return 'Doofus'
            },
            token: doofusToken,
            effects: [],
            displayname: 'Doofus',
            id: 'doofusActor',
          }
          doofusActor.token.actor = doofusActor

          let boob1Token = new Token()
          boob1Token.toggleEffect = toggle
          boob1Token.name = 'Boob One'
          boob1Token.id = 'boob1'
          let boob1Actor = {
            get name() {
              return 'Boob One'
            },
            token: boob1Token,
            effects: [],
            displayname: 'Boob One',
            id: 'boob1Actor',
          }
          boob1Actor.token.actor = boob1Actor

          let boob2Token = new Token()
          boob2Token.toggleEffect = toggle
          boob2Token.name = 'Boob One'
          boob2Token.id = 'boob2'
          let boob2Actor = {
            get name() {
              return 'Boob Two'
            },
            token: boob2Token,
            effects: [],
            displayname: 'Boob Two',
            id: 'boob2Actor',
          }
          boob2Actor.token.actor = boob2Actor

          global.canvas = {
            tokens: {
              placeables: [boob2Token, doofusToken, boob1Token],
            },
          }
          global.Token = Token.constructor
        })

        test('/st + Le*Foo :Gallant -- no match', async () => {
          const arg = '+ Le*Foo :Gallant'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(2)
          expect(toggle.mock.calls.length).toBe(0)
          expect(notifications[0]).toBe(`No Actor/Token found matching {name}`)
          expect(notifications[1]).toBe(`You must select tokens, use '@self', or use ':name' to apply effects.`)
        })

        test('/st on Le*Foo :Doofus - single token match', async () => {
          const arg = 'on Le*Foo :Doofus'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Doofus`)
        })

        test('/st set Le*Foo :Boob* -- multiple token match, multiple actor match', async () => {
          const arg = 'set Le*Foo :Boob*'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(2)
          expect(notifications[0]).toBe('More than one Token/Actor found matching {name}')
          expect(notifications[1]).toBe(`You must select tokens, use '@self', or use ':name' to apply effects.`)
          expect(toggle.mock.calls.length).toBe(0)
        })

        test('/st set Le*Foo :Boob* -- multiple token match, single actor match', async () => {
          const arg = 'set Le*Foo :Boob*One'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob One`)
        })
      })

      describe('set status @self -- already on', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          boobToken = new Token()
          boobToken.name = 'Boob'
          let boobActor = {
            get name() {
              return 'Boob'
            },
            token: boobToken,
            effects: [FooEffect],
            displayname: 'Boob One',
          }
          boobActor.token.actor = boobActor

          global.canvas = {
            tokens: {
              placeables: [],
            },
          }
          global.Token = Token.constructor
          global.canvas.tokens.placeables = [boobToken]
          boobToken.owned = true
          boobToken.toggleEffect = toggle
        })

        test('/st set Le*Foo @self', async () => {
          const arg = 'set Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })
      })

      describe('unset status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          boobToken = new Token()
          boobToken.name = 'Boob'
          let boobActor = {
            get name() {
              return 'Boob'
            },
            token: boobToken,
            effects: [BarEffect],
            displayname: 'Boob One',
            id: 'boob1Actor',
          }
          boobActor.token.actor = boobActor

          global.canvas = {
            tokens: {
              placeables: [],
            },
          }
          global.Token = Token.constructor
          global.canvas.tokens.placeables = [boobToken]
          boobToken.owned = true
          boobToken.toggleEffect = toggle
        })

        test('/st unset Ein*Bärren -- not set', async () => {
          boobToken.actor.effects = []

          const arg = 'unset Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })

        test('/st unset Ein*Bärren', async () => {
          const arg = 'unset Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st - Ein*Bärren', async () => {
          const arg = '- Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st off Ein*Bärren', async () => {
          const arg = 'off Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })
      })

      describe('clear status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          boobToken = new Token()
          boobToken.name = 'Boob'
          let boobActor = {
            get name() {
              return 'Boob'
            },
            token: boobToken,
            effects: [BarEffect, FooEffect],
            displayname: 'Boob One',
          }
          boobActor.token.actor = boobActor

          global.canvas = {
            tokens: {
              placeables: [],
            },
          }
          global.Token = Token.constructor
          global.canvas.tokens.placeables = [boobToken]
          boobToken.owned = true
          boobToken.toggleEffect = toggle
        })

        test('/st clear @self -- not set', async () => {
          boobToken.actor.effects = [] // remove all

          const arg = 'clear @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })

        test('/st clear @self', async () => {
          const arg = 'clear @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(2)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(toggle.mock.calls[1][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(2)
          expect(prntList[0]).toBe(`Clearing [BAR:'Ein Bärren'] for Boob One`)
          expect(prntList[1]).toBe(`Clearing [FOO:'Le Foo'] for Boob One`)
        })
      })

      describe('toggle status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          boobToken = new Token()
          boobToken.name = 'Boob'
          let boobActor = {
            get name() {
              return 'Boob'
            },
            token: boobToken,
            effects: [BarEffect, FooEffect],
            displayname: 'Boob One',
          }
          boobActor.token.actor = boobActor

          global.canvas = {
            tokens: {
              placeables: [],
            },
          }
          global.Token = Token.constructor
          global.canvas.tokens.placeables = [boobToken]
          boobToken.owned = true
          boobToken.toggleEffect = toggle
        })

        test('/st toggle Le*Foo @self -- not set', async () => {
          boobToken.actor.effects = [] // remove all

          const arg = 'toggle Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob One`)
        })

        test('/st toggle Le*Foo @self', async () => {
          const arg = 'toggle Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob One`)
        })
      })

      describe('set status', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let controlledTokens = [
            {
              toggleEffect: toggle,
              actor: {
                effects: [FooEffect],
                displayname: 'Boob',
              },
            },
            {
              toggleEffect: toggle,
              actor: {
                effects: [BarEffect, FooEffect],
                displayname: 'Doofus',
              },
            },
          ]

          controlledTokens[0].actor.token = controlledTokens[0]
          controlledTokens[1].actor.token = controlledTokens[1]

          global.canvas = {
            tokens: {
              controlled: controlledTokens,
            },
          }
        })

        test('/st + Ein*Bärren', async () => {
          const arg = '+ Ein*Bärren'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList[0]).toBe(`Toggling [BAR:'Ein Bärren'] for Boob`)
        })
      })

      describe('clear status', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let controlledTokens = [
            {
              toggleEffect: toggle,
              actor: {
                effects: [FooEffect],
                displayname: 'Boob',
              },
            },
            {
              toggleEffect: toggle,
              actor: {
                effects: [BarEffect, FooEffect],
                displayname: 'Doofus',
              },
            },
          ]

          controlledTokens[0].actor.token = controlledTokens[0]
          controlledTokens[1].actor.token = controlledTokens[1]

          global.canvas = {
            tokens: {
              controlled: controlledTokens,
            },
          }
        })

        test('/st clear', async () => {
          const arg = 'clear'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(3)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(toggle.mock.calls[1][0]).toBe(BarEffect)
          expect(toggle.mock.calls[2][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(3)
          expect(prntList[0]).toBe(`Clearing [FOO:'Le Foo'] for Boob`)
          expect(prntList[1]).toBe(`Clearing [BAR:'Ein Bärren'] for Doofus`)
          expect(prntList[2]).toBe(`Clearing [FOO:'Le Foo'] for Doofus`)
        })
      })

      describe('toggle status', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let controlledTokens = [
            {
              toggleEffect: toggle,
              actor: {
                effects: [FooEffect],
                displayname: 'Boob',
              },
            },
            {
              toggleEffect: toggle,
              actor: {
                effects: [BarEffect, FooEffect],
                displayname: 'Doofus',
              },
            },
          ]
          global.canvas = {
            tokens: {
              controlled: controlledTokens,
            },
          }
        })

        test('/st toggle Le*Foo', async () => {
          const arg = 'toggle Le*Foo'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(2)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(toggle.mock.calls[1][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(2)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob`)
          expect(prntList[1]).toBe(`Toggling [FOO:'Le Foo'] for Doofus`)
        })
      })

      describe('unset status', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let controlledTokens = [
            {
              toggleEffect: toggle,
              actor: {
                effects: [FooEffect],
                displayname: 'Boob',
              },
            },
            {
              toggleEffect: toggle,
              actor: {
                effects: [BarEffect, FooEffect],
                displayname: 'Doofus',
              },
            },
          ]
          global.canvas = {
            tokens: {
              controlled: controlledTokens,
            },
          }
        })

        test('/st - Le*Foo', async () => {
          const arg = '- Ein*Bärren'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling [BAR:'Ein Bärren'] for Doofus`)
        })
      })
    })
  })
})
