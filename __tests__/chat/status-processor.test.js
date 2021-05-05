import { describe, expect, test } from '@jest/globals'
import { jest } from '@jest/globals'
import StatusProcessor from '../../module/chat/status-processor.js'
import StatusChatProcessor from '../../module/chat/status.js'

describe('Status Processor', () => {
  const status2 = new StatusChatProcessor()
  const status = new StatusProcessor()
  const FooEffect = { label: 'GURPS.Foo', id: 'FOO', data: { label: 'Le Foo' } }
  const BarEffect = { label: 'GURPS.Bar', id: 'BAR', data: { label: 'Ein Bärren' } }

  test('help', () => {
    expect(status.help()).toBe('/status on|off|t|clear|list &lt;status&gt;')
    expect(status2.help()).toBe('/status2 on|off|t|clear|list &lt;status&gt;')
  })

  test('matches', () => {
    expect(status.matches('/st on foo')).toBe(true)
    expect(status.matches('/status on bar')).toBe(true)
    expect(status.matches('/foo on baz')).toBe(false)

    expect(status2.matches('/st2 on foo')).toBe(true)
    expect(status2.matches('/status2 on bar')).toBe(true)
    expect(status2.matches('/statuses on baz')).toBe(false)

    const commands = ['t', 'toggle', 'on', 'off', '+', '-', 'clear', 'set', 'unset']
    commands.forEach(c => expect(status.matches(`/st ${c}`)).toBe(true))
    commands.forEach(c => expect(status2.matches(`/st2 ${c}`)).toBe(true))

    expect(status.matches('/status boo')).toBe(false)
    expect(status2.matches('/status2 bad')).toBe(false)

    expect(status.matches('/status list')).toBe(true)
    expect(status2.matches('/status2 list')).toBe(true)
  })

  describe('process line', () => {
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
      'GURPS.chatYouMustSelectTokens': 'You must select tokens (or use',
      'GURPS.chatNoStatusMatched': 'No status matched',
    }
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

      global.GURPS = { LastActor: null }
      global.CONFIG = { statusEffects: [FooEffect, BarEffect] }
      global.canvas = { tokens: { controlled: [{}] } }
      global.game = { i18n: { localize: mockLocalize } }
      global.ui = { notifications: { warn: mockNotify } }
      status.registry = { priv: mockPriv, prnt: mockPrnt }
      status2.registry = { priv: mockPriv, prnt: mockPrnt }

      FooEffect.getFlag = mockGetFlagFoo
      BarEffect.getFlag = mockGetFlagBar
    })

    test('/st list', async () => {
      const input = '/st list'
      status.matches(input)
      await status.process(input)

      expect(privList.length).toBe(1)
      expect(privList[0]).toBe(
        `<table><tr><th>ID:</th><th>NAME:</th></tr><tr><th>FOO</th><th>'Le Foo'</th></tr><tr><th>BAR</th><th>'Ein Bärren'</th></tr></table>`
      )
    })

    test('/st2 list', async () => {
      const input = '/st list'
      status.matches(input)
      await status2.process(input)

      expect(privList.length).toBe(1)
      expect(privList[0]).toBe(
        `<table style='font-size: smaller;'><tr><th>ID</th><th>Name</th></tr><tr><td>BAR</td><td>'Ein Bärren'</td></tr><tr><td>FOO</td><td>'Le Foo'</td></tr></table>`
      )
    })

    test('/st + BAD', async () => {
      const input = '/st + BAD'
      status.matches(input)
      await status.process()
      expect(notifications[0]).toBe(`No status matched '/^BAD$/'`)
    })

    test('/st2 + BAD', async () => {
      const input = '/st2 + BAD'
      status2.matches(input)
      await status2.process()
      expect(notifications[0]).toBe(`No status matched 'BAD'`)
    })

    test('/st + Le*Foo @self -- LastActor is null', async () => {
      const input = '/st + Le*Foo @self'
      status.matches(input)
      await status.process()
      expect(notifications[0]).toBe(`You must have a character selected to apply effects`)
    })

    test('/st2 + Le*Foo @self -- LastActor is null', async () => {
      const input = '/st2 + Le*Foo @self'
      status2.matches(input)
      await status2.process()
      expect(notifications[0]).toBe(`You must select tokens (or use @self) to apply effects`)
    })

    test('/st + Le*Foo @self -- LastActor has no tokens', async () => {
      let actor = {
        getActiveTokens: function () {
          return []
        },
      }
      global.GURPS = { LastActor: actor }

      const arg = '+ Le*Foo @self'
      status.matches(`/st ${arg}`)
      await status.process()
      expect(notifications[0]).toBe(`Your character does not have any tokens. We require a token to set a status.`)
    })

    test('/st2 + Le*Foo @self -- LastActor has no tokens', async () => {
      let actor = {
        getActiveTokens: function () {
          return []
        },
      }
      global.GURPS = { LastActor: actor }

      const arg = '+ Le*Foo @self'
      status2.matches(`/st2 ${arg}`)
      await status2.process()
      expect(notifications[0]).toBe(`You must select tokens (or use @self) to apply effects`)
    })

    describe('happy paths', () => {
      const toggle = jest.fn()

      describe('set status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let actor = {
            token: {
              toggleEffect: toggle,
            },
            effects: [],
            displayname: 'Boob',
          }
          actor.token.actor = actor
          global.GURPS = { LastActor: actor }
        })

        test('/st + Le*Foo @self', async () => {
          const arg = '+ Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling FOO:'Le Foo' for Boob`)
        })

        test('/st on Le*Foo @self', async () => {
          const arg = 'on Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling FOO:'Le Foo' for Boob`)
        })

        test('/st set Le*Foo @self', async () => {
          const arg = 'set Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling FOO:'Le Foo' for Boob`)
        })

        test('/st2 + Le*Foo @self', async () => {
          const arg = '+ Le*Foo @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob`)
        })

        test('/st2 on Le*Foo @self', async () => {
          const arg = 'on Le*Foo @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob`)
        })

        test('/st2 set Le*Foo @self', async () => {
          const arg = 'set Le*Foo @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob`)
        })
      })

      describe('set status @self -- already on', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let actor = {
            token: {
              toggleEffect: toggle,
            },
            effects: [BarEffect, FooEffect],
            displayname: 'Boob',
          }
          actor.token.actor = actor

          global.GURPS = { LastActor: actor }
        })

        test('/st + Le*Foo @self', async () => {
          const arg = '+ Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })

        test('/st2 set Le*Foo @self', async () => {
          const arg = 'set Le*Foo @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })
      })

      describe('unset status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let actor = {
            token: {
              toggleEffect: toggle,
            },
            effects: [BarEffect, FooEffect],
            displayname: 'Boob',
          }
          actor.token.actor = actor

          global.GURPS = { LastActor: actor }
        })

        test('/st unset Ein*Bärren -- not set', async () => {
          global.GURPS.LastActor.effects = [FooEffect] // remove BAR

          const arg = 'unset Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })

        test('/st unset Ein*Bärren', async () => {
          const arg = 'unset Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st - Ein*Bärren', async () => {
          const arg = '- Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st off Ein*Bärren', async () => {
          const arg = 'off Ein*Bärren @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st2 unset Ein*Bärren -- not set', async () => {
          global.GURPS.LastActor.effects = [FooEffect] // remove BAR

          const arg = 'unset Ein*Bärren @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })

        test('/st2 unset Ein*Bärren', async () => {
          const arg = 'unset Ein*Bärren @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st2 - Ein*Bärren', async () => {
          const arg = '- Ein*Bärren @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
        })

        test('/st2 off Ein*Bärren', async () => {
          const arg = 'off Ein*Bärren @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

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
          let actor = {
            token: {
              toggleEffect: toggle,
            },
            effects: [BarEffect, FooEffect],
            displayname: 'Boob',
          }
          actor.token.actor = actor
          global.GURPS = { LastActor: actor }
        })

        test('/st clear @self -- not set', async () => {
          global.GURPS.LastActor.effects = [] // remove all

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

          expect(toggle.mock.calls.length).toBe(2)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(toggle.mock.calls[1][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(2)
          expect(prntList[0]).toBe(`Clearing BAR:'Ein Bärren' for Boob`)
          expect(prntList[1]).toBe(`Clearing FOO:'Le Foo' for Boob`)
        })

        test('/st2 clear @self -- not set', async () => {
          global.GURPS.LastActor.effects = [] // remove all

          const arg = 'clear @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(0)
          expect(prntList).toHaveLength(0)
        })

        test('/st2 clear @self', async () => {
          const arg = 'clear @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(toggle.mock.calls.length).toBe(2)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(toggle.mock.calls[1][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(2)
          expect(prntList[0]).toBe(`Clearing [BAR:'Ein Bärren'] for Boob`)
          expect(prntList[1]).toBe(`Clearing [FOO:'Le Foo'] for Boob`)
        })
      })

      describe('toggle status @self', () => {
        afterEach(() => {
          jest.resetAllMocks()
        })

        beforeEach(() => {
          let actor = {
            token: {
              toggleEffect: toggle,
            },
            effects: [BarEffect, FooEffect],
            displayname: 'Boob',
          }
          actor.token.actor = actor
          global.GURPS = { LastActor: actor }
        })

        test('/st toggle Le*Foo @self -- not set', async () => {
          global.GURPS.LastActor.effects = [] // remove all

          const arg = 't Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling FOO:'Le Foo' for Boob`)
        })

        test('/st toggle Le*Foo @self', async () => {
          const arg = 'toggle Le*Foo @self'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling FOO:'Le Foo' for Boob`)
        })

        test('/st2 toggle Le*Foo @self -- not set', async () => {
          global.GURPS.LastActor.effects = [] // remove all

          const arg = 'toggle Le*Foo @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob`)
        })

        test('/st2 toggle Le*Foo @self', async () => {
          const arg = 'toggle Le*Foo @self'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(FooEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling [FOO:'Le Foo'] for Boob`)
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
          expect(prntList[0]).toBe(`Toggling BAR:'Ein Bärren' for Boob`)
        })

        test('/st2 + Ein*Bärren', async () => {
          const arg = '+ Ein*Bärren'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

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
          expect(prntList[0]).toBe(`Clearing FOO: 'Le Foo' for Boob`)
          expect(prntList[1]).toBe(`Clearing BAR: 'Ein Bärren' for Doofus`)
          expect(prntList[2]).toBe(`Clearing FOO: 'Le Foo' for Doofus`)
        })

        test('/st2 clear', async () => {
          const arg = 'clear'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

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
          expect(prntList[0]).toBe(`Toggling FOO:'Le Foo' for Boob`)
          expect(prntList[1]).toBe(`Toggling FOO:'Le Foo' for Doofus`)
        })

        test('/st toggle Ein*Bärren', async () => {
          const arg = 'toggle Ein*Bärren'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(2)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(toggle.mock.calls[1][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(2)
          expect(prntList[0]).toBe(`Toggling BAR:'Ein Bärren' for Boob`)
          expect(prntList[1]).toBe(`Toggling BAR:'Ein Bärren' for Doofus`)
        })

        test('/st2 toggle Le*Foo', async () => {
          const arg = 'toggle Le*Foo'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

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

        test('/st - Ein*Bärren', async () => {
          const arg = '- Ein*Bärren'
          status.matches(`/st ${arg}`)

          await status.process()

          expect(notifications).toHaveLength(0)
          expect(toggle.mock.calls.length).toBe(1)
          expect(toggle.mock.calls[0][0]).toBe(BarEffect)
          expect(prntList).toHaveLength(1)
          expect(prntList[0]).toBe(`Toggling BAR:'Ein Bärren' for Doofus`)
        })

        test('/st2 - Le*Foo', async () => {
          const arg = '- Ein*Bärren'
          status2.matches(`/st2 ${arg}`)

          await status2.process()

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
