import { migrateLegacySettings, SettingMigration } from '../migration/settings-migration.js'
import {
  SETTING_MANEUVER_VISIBILITY,
  SETTING_MANEUVER_DETAIL,
  SETTING_MANEUVER_UPDATES_MOVE,
  SETTING_USE_ON_TARGET,
  SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
  SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE,
  SETTING_RANGE_STRATEGY,
  SETTING_INITIATIVE_FORMULA,
  OLD_SETTING_MANEUVER_VISIBILITY,
  OLD_SETTING_MANEUVER_DETAIL,
  OLD_SETTING_MANEUVER_UPDATES_MOVE,
  OLD_SETTING_USE_ON_TARGET,
  OLD_SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
  OLD_SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE,
  OLD_SETTING_RANGE_STRATEGY,
  OLD_SETTING_INITIATIVE_FORMULA,
} from './types.ts'

export function migrate(): void {
  if (game.user?.isGM) {
    migrateManeuverSettings()
  }
}

function migrateManeuverSettings(): void {
  // Implement the migration logic for maneuver settings here
  const migrations: SettingMigration[] = []

  migrations.push({
    oldName: OLD_SETTING_INITIATIVE_FORMULA,
    newName: SETTING_INITIATIVE_FORMULA,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_RANGE_STRATEGY,
    newName: SETTING_RANGE_STRATEGY,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE,
    newName: SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_MANEUVER_VISIBILITY,
    newName: SETTING_MANEUVER_VISIBILITY,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_MANEUVER_DETAIL,
    newName: SETTING_MANEUVER_DETAIL,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_MANEUVER_UPDATES_MOVE,
    newName: SETTING_MANEUVER_UPDATES_MOVE,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
    newName: SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
    migrateValue: value => value,
  })

  migrations.push({
    oldName: OLD_SETTING_USE_ON_TARGET,
    newName: SETTING_USE_ON_TARGET,
    migrateValue: value => value,
  })

  migrateLegacySettings(GURPS.SYSTEM_NAME, migrations)
}
