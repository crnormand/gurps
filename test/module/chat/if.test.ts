import { IfChatProcessor } from '@module/chat/if.js'
import { parselink } from '@module/otf/parselink.js'
import { OtfActionType } from '@module/otf/types.js'
import { vi } from 'vitest'

vi.mock('@module/otf/parselink.js', () => ({
  parselink: vi.fn(),
}))

const mockParselink = vi.mocked(parselink)
const performAction = vi.fn()

type Registry = {
  msgs: {
    event: Record<string, unknown>
    data: Record<string, unknown>
  }
  priv: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  processLines: ReturnType<typeof vi.fn>
}

function createProcessor(): { processor: IfChatProcessor; registry: Registry } {
  const registry: Registry = {
    msgs: {
      event: {},
      data: { speaker: 'test' },
    },
    priv: vi.fn(),
    send: vi.fn(),
    processLines: vi.fn(),
  }
  const processor = new IfChatProcessor()

  processor.registry = registry as any

  return { processor, registry }
}

let input: string

beforeEach(() => {
  vi.clearAllMocks()

  globalThis.GURPS = {
    LastActor: { id: 'actor' },
    lastTargetedRoll: {},
    modules: {
      Otf: { performAction },
    },
    stopActions: false,
  } as any

  // @ts-expect-error: Assigning to globalThis.game for testing purposes
  globalThis.game = {
    i18n: {
      localize: (key: string) => key,
    },
  } as any

  input = expect.getState().currentTestName!.split('#> ')[1]
})

describe('IfChatProcessor', () => {
  test.each(['/if [Skill:Stealth] success', '/if ! [DX] success /else failure'])('matches %s', line => {
    const { processor } = createProcessor()

    expect(processor.matches(line)).toBeTruthy()
  })

  test('does not match other chat commands', () => {
    const { processor } = createProcessor()

    expect(processor.matches('/roll 3d6')).toBeNull()
  })

  test('runs the success result when the check passes', async () => {
    const { processor, registry } = createProcessor()
    const action = { type: OtfActionType.skillSpell }

    mockParselink.mockReturnValue({ action } as any)
    performAction.mockResolvedValue(true)

    await processor.process('/if [Skill:Stealth] /me hidden /else /me seen')

    expect(registry.priv).toHaveBeenCalledWith('/if [Skill:Stealth] /me hidden /else /me seen', undefined)
    expect(registry.send).toHaveBeenCalledOnce()
    expect(performAction).toHaveBeenCalledWith(action, GURPS.LastActor, registry.msgs.event)
    expect(registry.msgs.event.chatmsgData).toBe(registry.msgs.data)
    expect(registry.processLines).toHaveBeenCalledWith('/me hidden')
  })

  test('runs the failure result when the check fails', async () => {
    const { processor, registry } = createProcessor()

    mockParselink.mockReturnValue({ action: { type: OtfActionType.attribute } } as any)
    performAction.mockResolvedValue(false)

    await processor.process('/if [DX] success /else failure')

    expect(registry.processLines).toHaveBeenCalledWith('failure')
  })

  test('inverts the check result when requested', async () => {
    const { processor, registry } = createProcessor()

    mockParselink.mockReturnValue({ action: { type: OtfActionType.attribute } } as any)
    performAction.mockResolvedValue(true)

    await processor.process('/if ! [DX] success /else failure')

    expect(registry.processLines).toHaveBeenCalledWith('failure')
  })

  test('reports unsupported On-the-Fly actions privately', async () => {
    const { processor, registry } = createProcessor()

    mockParselink.mockReturnValue({ action: { type: OtfActionType.damage } } as any)

    await processor.process('/if [1d cr] success')

    expect(performAction).not.toHaveBeenCalled()
    expect(registry.priv).toHaveBeenCalledWith('GURPS.chatMustBeACheck: [1d cr]', undefined)
  })

  test('stops without running a branch when the action is cancelled', async () => {
    const { processor, registry } = createProcessor()

    mockParselink.mockReturnValue({ action: { type: OtfActionType.attribute } } as any)
    performAction.mockImplementation(async () => {
      GURPS.stopActions = true

      return false
    })

    await processor.process('/if [DX] success /else failure')

    expect(GURPS.stopActions).toBe(false)
    expect(registry.processLines).not.toHaveBeenCalled()
  })

  test('recursively processes nested /if commands', async () => {
    const { processor, registry } = createProcessor()

    mockParselink.mockReturnValue({ action: { type: OtfActionType.skillSpell } } as any)
    performAction.mockResolvedValue(true)

    await processor.process(
      '/if [ST] {/if [Sk:Tracking] {/if [IQ-2] {You found the Grail!} {Ah so close}} {Failed tracking}} {Failed ST}'
    )

    expect(registry.processLines).toHaveBeenCalledWith('success')
  })
})
