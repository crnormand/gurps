import { migrateLegacySettings, SettingMigration } from '@module/migration/settings-migration.js'
import { vi, Mock } from 'vitest'

const globalMock = globalThis as typeof globalThis & {
  game: {
    settings?: {
      storage: Map<string, any>
      set: Mock<(...args: [string, string, unknown]) => Promise<void>>
    }
  }
  GURPS: any
}

describe('migrateLegacySettings', () => {
  let mockStorage: any
  let mockSettings: Map<string, any>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Initialize globals
    globalMock.game = globalMock.game || ({} as any)
    globalMock.GURPS = globalMock.GURPS || { SYSTEM_NAME: 'gurps' }

    // Setup console spies
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

    // Create mock storage
    mockSettings = new Map()
    mockStorage = {
      contents: [],
      get: (id: string) => mockSettings.get(id),
      set: vi.fn((id: string, data: any) => mockSettings.set(id, data)),
    }

    // Mock game.settings
    globalMock.game.settings = {
      storage: new Map([['world', mockStorage]]),
      set: vi.fn<(namespace: string, key: string, value: unknown) => Promise<void>>().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleDebugSpy.mockRestore()
  })

  const createMockSetting = (key: string, value: any, id: string = key): foundry.documents.Setting => {
    const setting = {
      key,
      value,
      id,
      delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as foundry.documents.Setting

    mockSettings.set(id, setting)

    return setting
  }

  describe('successful migrations', () => {
    test.each([
      ['synchronous transform', (value: number) => value * 2, 10, 20],
      ['async transform', async (value: number) => value * 2, 10, 20],
      ['string transform', (value: string) => value.toUpperCase(), 'test', 'TEST'],
    ])('handles %s', async (scenario, transform, oldValue, expectedValue) => {
      // Setup legacy setting
      const legacySetting = createMockSetting('gurps.oldSetting', oldValue, 'setting-id-1')

      mockStorage.contents = [legacySetting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting',
          newName: 'newSetting',
          migrateValue: transform as any,
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      // Verify game.settings.set was called with transformed value
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting', expectedValue)

      // Verify old setting was deleted
      expect(legacySetting.delete).toHaveBeenCalled()

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Starting migration of 1 legacy setting(s) (namespace: gurps)')
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Successfully migrated 1 legacy setting(s)')
      expect(consoleDebugSpy).toHaveBeenCalledWith('GURPS | Deleted migrated legacy setting: gurps.oldSetting')
    })

    it('migrates multiple settings', async () => {
      const setting1 = createMockSetting('gurps.oldSetting1', 'value1', 'id-1')
      const setting2 = createMockSetting('gurps.oldSetting2', 'value2', 'id-2')

      mockStorage.contents = [setting1, setting2]

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting1',
          newName: 'newSetting1',
          migrateValue: (value: unknown) => (value as string).toUpperCase(),
        },
        {
          oldName: 'oldSetting2',
          newName: 'newSetting2',
          migrateValue: (value: unknown) => (value as string) + '-migrated',
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting1', 'VALUE1')
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting2', 'value2-migrated')
      expect(setting1.delete).toHaveBeenCalled()
      expect(setting2.delete).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Starting migration of 2 legacy setting(s) (namespace: gurps)')
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Successfully migrated 2 legacy setting(s)')
    })

    it('ignores settings not in migration map', async () => {
      const legacySetting = createMockSetting('gurps.oldSetting', 'value', 'id-1')
      const unmappedSetting = createMockSetting('gurps.otherSetting', 'other', 'id-2')

      mockStorage.contents = [legacySetting, unmappedSetting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting',
          newName: 'newSetting',
          migrateValue: (value: unknown) => (value as string).toUpperCase(),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(globalMock.game.settings!.set).toHaveBeenCalledTimes(1)
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting', 'VALUE')
      expect(legacySetting.delete).toHaveBeenCalled()
      expect(unmappedSetting.delete).not.toHaveBeenCalled()
    })

    it('only migrates settings with correct namespace', async () => {
      const gurpsSetting = createMockSetting('gurps.oldSetting', 'value', 'id-1')
      const otherSetting = createMockSetting('other.oldSetting', 'other', 'id-2')

      mockStorage.contents = [gurpsSetting, otherSetting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting',
          newName: 'newSetting',
          migrateValue: (value: unknown) => (value as string).toUpperCase(),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(globalMock.game.settings!.set).toHaveBeenCalledTimes(1)
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting', 'VALUE')
      expect(gurpsSetting.delete).toHaveBeenCalled()
      expect(otherSetting.delete).not.toHaveBeenCalled()
    })

    it('logs successful per-setting migration details', async () => {
      const setting1 = createMockSetting('gurps.oldSetting1', 'value1', 'id-1')
      const setting2 = createMockSetting('gurps.oldSetting2', 'value2', 'id-2')

      mockStorage.contents = [setting1, setting2]

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting1',
          newName: 'newSetting1',
          migrateValue: value => (value as string).toUpperCase(),
        },
        {
          oldName: 'oldSetting2',
          newName: 'newSetting2',
          migrateValue: value => (value as string).toUpperCase(),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Migrated setting: gurps.oldSetting1 → gurps.newSetting1')
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Migrated setting: gurps.oldSetting2 → gurps.newSetting2')
    })

    it('uses the first matching migration when oldName is duplicated', async () => {
      const setting = createMockSetting('gurps.duplicateSetting', 'value', 'id-1')

      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'duplicateSetting',
          newName: 'firstNewSetting',
          migrateValue: value => (value as string) + '-first',
        },
        {
          oldName: 'duplicateSetting',
          newName: 'secondNewSetting',
          migrateValue: value => (value as string) + '-second',
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(globalMock.game.settings!.set).toHaveBeenCalledTimes(1)
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'firstNewSetting', 'value-first')
      expect(globalMock.game.settings!.set).not.toHaveBeenCalledWith('gurps', 'secondNewSetting', 'value-second')
    })
  })

  describe('error handling', () => {
    it('continues migrating after one migrateValue failure', async () => {
      const setting1 = createMockSetting('gurps.setting1', 'value1', 'id-1')
      const setting2 = createMockSetting('gurps.setting2', 'value2', 'id-2')
      const setting3 = createMockSetting('gurps.setting3', 'value3', 'id-3')

      mockStorage.contents = [setting1, setting2, setting3]

      const migrations: SettingMigration[] = [
        {
          oldName: 'setting1',
          newName: 'newSetting1',
          migrateValue: (value: unknown) => (value as string).toUpperCase(),
        },
        {
          oldName: 'setting2',
          newName: 'newSetting2',
          migrateValue: () => {
            throw new Error('Migration failed')
          },
        },
        {
          oldName: 'setting3',
          newName: 'newSetting3',
          migrateValue: (value: unknown) => (value as string).toLowerCase(),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      // Verify successful migrations were saved
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting1', 'VALUE1')
      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting3', 'value3')

      // Verify successful settings were deleted
      expect(setting1.delete).toHaveBeenCalled()
      expect(setting3.delete).toHaveBeenCalled()

      // Verify failed setting was NOT deleted
      expect(setting2.delete).not.toHaveBeenCalled()

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GURPS | Migration failed for setting: gurps.setting2',
        expect.any(Error)
      )

      // Verify summary shows mixed results
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Starting migration of 3 legacy setting(s) (namespace: gurps)')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'GURPS | Settings migration completed with 1 failure(s) and 2 success(es)'
      )
    })

    it('continues migrating after game.settings.set failure', async () => {
      const setting1 = createMockSetting('gurps.setting1', 'value1', 'id-1')
      const setting2 = createMockSetting('gurps.setting2', 'value2', 'id-2')

      mockStorage.contents = [setting1, setting2]

      // Mock game.settings.set to fail on second call
      globalMock.game.settings!.set = vi
        .fn<(namespace: string, key: string, value: unknown) => Promise<void>>()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Settings write failed'))

      const migrations: SettingMigration[] = [
        {
          oldName: 'setting1',
          newName: 'newSetting1',
          migrateValue: (value: unknown) => (value as string).toUpperCase(),
        },
        {
          oldName: 'setting2',
          newName: 'newSetting2',
          migrateValue: (value: unknown) => (value as string).toLowerCase(),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      // Verify only successful migration was deleted
      expect(setting1.delete).toHaveBeenCalled()
      expect(setting2.delete).not.toHaveBeenCalled()

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GURPS | Migration failed for setting: gurps.setting2',
        expect.any(Error)
      )
    })

    it('handles async migrateValue rejection', async () => {
      const setting = createMockSetting('gurps.badSetting', 'value', 'id-1')

      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'badSetting',
          newName: 'newSetting',
          migrateValue: async () => {
            throw new Error('Async migration failed')
          },
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      // Verify setting was NOT deleted
      expect(setting.delete).not.toHaveBeenCalled()

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GURPS | Migration failed for setting: gurps.badSetting',
        expect.any(Error)
      )

      // Verify summary shows failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'GURPS | Settings migration completed with 1 failure(s) and 0 success(es)'
      )
    })

    it('rejects when deleting a migrated legacy setting fails', async () => {
      const setting = createMockSetting('gurps.settingToDelete', 'value', 'id-1')

      ;(setting as unknown as { delete: Mock<() => Promise<void>> }).delete.mockRejectedValueOnce(
        new Error('Delete failed')
      )
      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'settingToDelete',
          newName: 'newSetting',
          migrateValue: value => (value as string).toUpperCase(),
        },
      ]

      await expect(migrateLegacySettings('gurps', migrations)).rejects.toThrow('Delete failed')

      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newSetting', 'VALUE')
      expect(consoleDebugSpy).not.toHaveBeenCalledWith('GURPS | Deleted migrated legacy setting: gurps.settingToDelete')
    })
  })

  describe('in-place migrations (newName === oldName)', () => {
    it('transforms the value without deleting the old setting', async () => {
      const setting = createMockSetting('gurps.mySetting', 'old value', 'id-1')

      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'mySetting',
          newName: 'mySetting', // same key — in-place
          migrateValue: (value: unknown) => (value as string).toUpperCase(),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'mySetting', 'OLD VALUE')
      expect(setting.delete).not.toHaveBeenCalled()
    })

    it('counts in-place successes in the summary log', async () => {
      const setting = createMockSetting('gurps.mySetting', 'value', 'id-1')

      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'mySetting',
          newName: 'mySetting',
          migrateValue: (value: unknown) => value,
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      // In-place success must be reflected in successCount, not silently dropped.
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Successfully migrated 1 legacy setting(s)')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('does not delete the setting and logs oldKey as the error label when migration fails', async () => {
      const setting = createMockSetting('gurps.mySetting', 'value', 'id-1')

      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'mySetting',
          newName: 'mySetting',
          migrateValue: () => {
            throw new Error('Transform error')
          },
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(setting.delete).not.toHaveBeenCalled()
      // Error label must be the full setting key, not undefined (there is no deleteId to look up).
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GURPS | Migration failed for setting: gurps.mySetting',
        expect.any(Error)
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'GURPS | Settings migration completed with 1 failure(s) and 0 success(es)'
      )
    })

    it('counts mixed in-place and renamed successes together', async () => {
      const inPlace = createMockSetting('gurps.inPlace', 'value1', 'id-1')
      const renamed = createMockSetting('gurps.oldName', 'value2', 'id-2')

      mockStorage.contents = [inPlace, renamed]

      const migrations: SettingMigration[] = [
        { oldName: 'inPlace', newName: 'inPlace', migrateValue: (value: unknown) => value },
        { oldName: 'oldName', newName: 'newName', migrateValue: (value: unknown) => value },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(inPlace.delete).not.toHaveBeenCalled()
      expect(renamed.delete).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('GURPS | Successfully migrated 2 legacy setting(s)')
    })
  })

  describe('index alignment with mixed in-place and renamed entries', () => {
    it('correctly maps results to entries when an in-place entry precedes a failing renamed entry', async () => {
      // Arrange: [in-place success, renamed fail, renamed success]
      // Old bug: deletionIds only held renamed ids, so results[0] (in-place) mapped to
      // deletionIds[0] which was setting2's id — causing the wrong entry to be deleted/skipped.
      const inPlace = createMockSetting('gurps.setting1', 'v1', 'id-1')
      const renamedFail = createMockSetting('gurps.setting2', 'v2', 'id-2')
      const renamedSuccess = createMockSetting('gurps.setting3', 'v3', 'id-3')

      mockStorage.contents = [inPlace, renamedFail, renamedSuccess]

      const migrations: SettingMigration[] = [
        { oldName: 'setting1', newName: 'setting1', migrateValue: (value: unknown) => value },
        {
          oldName: 'setting2',
          newName: 'newSetting2',
          migrateValue: () => {
            throw new Error('fail')
          },
        },
        { oldName: 'setting3', newName: 'newSetting3', migrateValue: (value: unknown) => value },
      ]

      await migrateLegacySettings('gurps', migrations)

      // in-place: never deleted (no deleteId)
      expect(inPlace.delete).not.toHaveBeenCalled()
      // failed renamed: must NOT be deleted so it can be retried
      expect(renamedFail.delete).not.toHaveBeenCalled()
      // successful renamed: must be deleted
      expect(renamedSuccess.delete).toHaveBeenCalled()

      // 2 succeeded (in-place + renamed), 1 failed
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'GURPS | Settings migration completed with 1 failure(s) and 2 success(es)'
      )
      // Error must point at the setting that actually failed, not the succeeding one
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GURPS | Migration failed for setting: gurps.setting2',
        expect.any(Error)
      )
    })

    it('correctly handles a failing in-place entry followed by a succeeding renamed entry', async () => {
      const inPlaceFail = createMockSetting('gurps.setting1', 'v1', 'id-1')
      const renamedSuccess = createMockSetting('gurps.setting2', 'v2', 'id-2')

      mockStorage.contents = [inPlaceFail, renamedSuccess]

      const migrations: SettingMigration[] = [
        {
          oldName: 'setting1',
          newName: 'setting1',
          migrateValue: () => {
            throw new Error('fail')
          },
        },
        { oldName: 'setting2', newName: 'newSetting2', migrateValue: (value: unknown) => value },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(inPlaceFail.delete).not.toHaveBeenCalled()
      expect(renamedSuccess.delete).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'GURPS | Settings migration completed with 1 failure(s) and 1 success(es)'
      )
    })
  })

  describe('edge cases', () => {
    it('returns early when storage is unavailable', async () => {
      globalMock.game.settings = {
        storage: new Map(), // No 'world' storage
        set: vi.fn<(namespace: string, key: string, value: unknown) => Promise<void>>(),
      }

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting',
          newName: 'newSetting',
          migrateValue: (value: unknown) => value,
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(consoleWarnSpy).toHaveBeenCalledWith('GURPS | Settings migration skipped: world storage not available')
    })

    it('returns early when game.settings is undefined', async () => {
      globalMock.game = {} as any

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting',
          newName: 'newSetting',
          migrateValue: (value: unknown) => value,
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(consoleWarnSpy).toHaveBeenCalledWith('GURPS | Settings migration skipped: world storage not available')
    })

    it('returns silently when no legacy settings are found', async () => {
      mockStorage.contents = []

      const migrations: SettingMigration[] = [
        {
          oldName: 'oldSetting',
          newName: 'newSetting',
          migrateValue: (value: unknown) => value,
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      // No warnings or logs should be produced
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('returns silently when migration array is empty', async () => {
      const setting = createMockSetting('gurps.oldSetting', 'value', 'id-1')

      mockStorage.contents = [setting]

      await migrateLegacySettings('gurps', [])

      // No migrations should occur
      expect(globalMock.game.settings!.set).not.toHaveBeenCalled()
      expect(setting.delete).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('handles settings with complex object values', async () => {
      const complexValue = {
        nested: {
          property: 'value',

          array: [1, 2, 3],
        },
      }
      const setting = createMockSetting('gurps.complexSetting', complexValue, 'id-1')

      mockStorage.contents = [setting]

      const migrations: SettingMigration[] = [
        {
          oldName: 'complexSetting',
          newName: 'newComplexSetting',
          migrateValue: (value: any) => ({
            ...value,
            migrated: true,
          }),
        },
      ]

      await migrateLegacySettings('gurps', migrations)

      expect(globalMock.game.settings!.set).toHaveBeenCalledWith('gurps', 'newComplexSetting', {
        nested: {
          property: 'value',
          array: [1, 2, 3],
        },
        migrated: true,
      })
      expect(setting.delete).toHaveBeenCalled()
    })
  })
})
