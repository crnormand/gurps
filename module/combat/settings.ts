import {
  SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
  SETTING_MANEUVER_DETAIL,
  SETTING_MANEUVER_UPDATES_MOVE,
  SETTING_MANEUVER_VISIBILITY,
  SETTING_USE_ON_TARGET,
} from './types.ts'

export function registerCombatSettings(): void {
  if (!game.settings) throw new Error('GURPS | Combat module requires game.settings to be available!')

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY, {
    name: 'GURPS.settingManeuverVisibility',
    hint: 'GURPS.settingHintManeuverVisibility',
    scope: 'world',
    config: true,
    type: String as any,
    choices: {
      NoOne: 'GURPS.settingManeuverNoOne',
      GMAndOwner: 'GURPS.settingManeuverGMOnly',
      Everyone: 'GURPS.settingManeuverEveryone',
    },
    default: 'NoOne',
    onChange: value => {
      console.log(`${SETTING_MANEUVER_VISIBILITY}: ${value}`)
      // Re-draw token effects immediately
      game.scenes?.active?.tokens.forEach(token => token.object?.drawEffects())
    },
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_MANEUVER_DETAIL, {
    name: 'GURPS.settingManeuverDetail',
    hint: 'GURPS.settingHintManeuverDetail',
    scope: 'world',
    config: true,
    type: String as any,
    choices: {
      Full: 'GURPS.settingManeuverDetailFull',
      NoFeint: 'GURPS.settingManeuverDetailNoFeint',
      General: 'GURPS.settingManeuverDetailGeneral',
    },
    default: 'General',
    onChange: value => {
      console.log(`${SETTING_MANEUVER_DETAIL}: ${value}`)
      // Re-draw token effects immediately
      game.scenes?.active?.tokens.forEach(token => token.object?.drawEffects())
    },
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE, {
    name: 'GURPS.settingManeuverMove',
    hint: 'GURPS.settingHintManeuverMove',
    scope: 'world',
    config: true,
    type: Boolean as any,
    default: true,
    onChange: value => console.log(`${SETTING_MANEUVER_UPDATES_MOVE}: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER, {
    name: 'GURPS.settingAllowRollBasedOnManeuver',
    hint: 'GURPS.settingHintAllowRollBasedOnManeuver',
    scope: 'world',
    config: true,
    type: String as any,
    choices: {
      Allow: 'GURPS.allow',
      Warn: 'GURPS.warn',
      Forbid: 'GURPS.forbid',
    },
    default: 'Warn',
    onChange: value => console.log(`Allow Roll based on Maneuver : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET, {
    name: 'GURPS.settingOnTarget',
    hint: 'GURPS.settingHintOnTarget',
    scope: 'world',
    config: true,
    type: Boolean as any,
    default: false,
    onChange: value => console.log(`${SETTING_USE_ON_TARGET}: ${value}`),
  })
}

/* ---------------------------------------- */
/*  Read-side API. Everything outside this module goes through these.                                */
/* ---------------------------------------- */

export function isUsingOnTarget(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET)
}

export function getManeuverVisibility(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY) as string
}

export function getManeuverDetail(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_DETAIL) as string
}

export function maneuverUpdatesMove(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE)
}

export function getRollBasedOnManeuverPolicy(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER) as string
}
