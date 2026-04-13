import { jest } from '@jest/globals'
import { replaceValue, deleteKey, isAtLeastFoundryVersion, commitUpdate } from '../module/utilities/foundry-compat.js'

describe('foundry-compat', () => {
  afterEach(() => {
    // @ts-ignore
    delete game.release
  })

  describe('isAtLeastFoundryVersion', () => {
    it('returns true when game.release.generation >= requested version', () => {
      // @ts-ignore
      game.release = { generation: 14 }
      expect(isAtLeastFoundryVersion(14)).toBe(true)
    })

    it('returns true when game.release.generation > requested version', () => {
      // @ts-ignore
      game.release = { generation: 15 }
      expect(isAtLeastFoundryVersion(14)).toBe(true)
    })

    it('returns false when game.release.generation < requested version', () => {
      // @ts-ignore
      game.release = { generation: 13 }
      expect(isAtLeastFoundryVersion(14)).toBe(false)
    })

    it('returns false when game.release is undefined', () => {
      // @ts-ignore
      game.release = undefined
      expect(isAtLeastFoundryVersion(14)).toBe(false)
    })

    it('works with other version numbers', () => {
      // @ts-ignore
      game.release = { generation: 13 }
      expect(isAtLeastFoundryVersion(13)).toBe(true)
      expect(isAtLeastFoundryVersion(12)).toBe(true)
      expect(isAtLeastFoundryVersion(14)).toBe(false)
    })
  })

  describe('replaceValue', () => {
    describe('on Foundry v14+', () => {
      beforeEach(() => {
        // @ts-ignore
        game.release = { generation: 14 }
        // @ts-ignore -- Foundry v14 global
        globalThis._replace = (v: any) => ({ __replace: true, value: v })
      })
      afterEach(() => {
        // @ts-ignore
        delete globalThis._replace
      })

      it('returns a single-entry object with _replace(value)', () => {
        const data = { foo: 'bar' }
        const result = replaceValue('system.traits', data)
        expect(result).toEqual({
          'system.traits': { __replace: true, value: data },
        })
      })
    })

    describe('on Foundry v13 and below', () => {
      beforeEach(() => {
        // @ts-ignore
        game.release = { generation: 13 }
      })

      it('returns two entries: delete key then set value', () => {
        const data = { foo: 'bar' }
        const result = replaceValue('system.traits', data)
        expect(result).toEqual({
          'system.-=traits': null,
          'system.traits': data,
        })
      })

      it('handles nested paths correctly', () => {
        const data = { a: 1 }
        const result = replaceValue('system.additionalresources.tracker', data)
        expect(result).toEqual({
          'system.additionalresources.-=tracker': null,
          'system.additionalresources.tracker': data,
        })
      })

      it('handles single-segment paths', () => {
        const data = { a: 1 }
        const result = replaceValue('traits', data)
        expect(result).toEqual({
          '-=traits': null,
          traits: data,
        })
      })
    })
  })

  describe('deleteKey', () => {
    describe('on Foundry v14+', () => {
      beforeEach(() => {
        // @ts-ignore
        game.release = { generation: 14 }
        // @ts-ignore
        globalThis._del = Symbol('delete')
      })
      afterEach(() => {
        // @ts-ignore
        delete globalThis._del
      })

      it('returns an object with the key set to _del', () => {
        const result = deleteKey('system.equipment.carried')
        expect(result).toEqual({
          // @ts-ignore -- Foundry v14 global
          'system.equipment.carried': globalThis._del,
        })
      })
    })

    describe('on Foundry v13 and below', () => {
      beforeEach(() => {
        // @ts-ignore
        game.release = { generation: 13 }
      })

      it('returns an object with the -=key set to null', () => {
        const result = deleteKey('system.equipment.carried')
        expect(result).toEqual({
          'system.equipment.-=carried': null,
        })
      })

      it('handles single-segment paths', () => {
        const result = deleteKey('carried')
        expect(result).toEqual({
          '-=carried': null,
        })
      })
    })
  })

  describe('commitUpdate', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockActor: any

    beforeEach(() => {
      mockActor = {
        internalUpdate: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      }
    })

    describe('on Foundry v14+', () => {
      beforeEach(() => {
        // @ts-ignore
        game.release = { generation: 14 }
      })

      it('calls internalUpdate once with the full commit', async () => {
        const commit = { 'system.traits': 'data', 'system.skills': 'more' }
        await commitUpdate(mockActor, commit)
        expect(mockActor.internalUpdate).toHaveBeenCalledTimes(1)
        expect(mockActor.internalUpdate).toHaveBeenCalledWith(commit)
      })
    })

    describe('on Foundry v13 and below', () => {
      beforeEach(() => {
        // @ts-ignore
        game.release = { generation: 13 }
      })

      it('splits deletes and adds into two calls', async () => {
        const commit = {
          'system.-=traits': null,
          'system.traits': { name: 'test' },
          'system.-=skills': null,
          'system.skills': { list: [] },
          'system.currentmove': 5,
        }
        await commitUpdate(mockActor, commit)
        expect(mockActor.internalUpdate).toHaveBeenCalledTimes(2)
        expect(mockActor.internalUpdate).toHaveBeenNthCalledWith(
          1,
          { 'system.-=traits': null, 'system.-=skills': null },
          { diff: true }
        )
        expect(mockActor.internalUpdate).toHaveBeenNthCalledWith(
          2,
          { 'system.traits': { name: 'test' }, 'system.skills': { list: [] }, 'system.currentmove': 5 },
          { diff: false }
        )
      })
    })
  })
})
