import {
  CombatOption,
  CombatOptionSection,
  CombatOptionSettings,
  defaultCombatOptionSettings,
  enabledOptions,
  isManeuverEnabled,
} from './combat-options.ts'
import {
  SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
  SETTING_COMBAT_OPTIONS,
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
    onChange: value => {
      console.log(`${SETTING_USE_ON_TARGET}: ${value}`)
      // On Target adds and removes maneuvers, so it has the same reach as the Combat Options dialog
      // it can also be changed from.
      refreshCombatOptionUI()
    },
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_COMBAT_OPTIONS, {
    name: 'GURPS.settingCombatOptions',
    hint: 'GURPS.settingHintCombatOptions',
    scope: 'world',
    config: false,
    type: Object as any,
    default: defaultCombatOptionSettings(),
    onChange: value => {
      console.log(`Combat options: ${JSON.stringify(value)}`)
      refreshCombatOptionUI()
    },
  })
}

/* ---------------------------------------- */
/*  Read-side API. Everything outside this module goes through these.                                */
/* ---------------------------------------- */

export function getCombatOptionSettings(): CombatOptionSettings {
  return (game.settings?.get(GURPS.SYSTEM_NAME, SETTING_COMBAT_OPTIONS) ?? {}) as CombatOptionSettings
}

export function isUsingOnTarget(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET)
}

/** The options the Modifier Bucket should show in one of its sections, in registry order. */
export function enabledCombatOptions(section: CombatOptionSection): CombatOption[] {
  return enabledOptions(section, getCombatOptionSettings(), { useOnTarget: isUsingOnTarget() })
}

/** Whether a maneuver is one the GM has left in play. */
export function isManeuverInPlay(maneuverName: string): boolean {
  return isManeuverEnabled(maneuverName, getCombatOptionSettings())
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

/**
 * The Modifier Bucket reads the combat options lazily, but it may already be open, and the combat
 * tracker menu, the token HUD palette and the sheet dropdowns are each built once per render -- so
 * anything already on screen has to be re-rendered when what is in play changes.
 */
function refreshCombatOptionUI(): void {
  GURPS.ModifierBucket?.refresh()
  ui.combat?.render()
  if (canvas?.tokens?.hud?.rendered) canvas.tokens.hud.render()
  for (const sheet of renderedActorSheets()) sheet.render()
}

/**
 * The actor sheets currently on screen.
 *
 * Reads `_sheet` rather than `sheet`, because `sheet` is a lazy getter that *constructs and caches*
 * an Application for any actor that hasn't got one -- asking every actor in the world whether its
 * sheet is open would be what opened them.
 */
export function renderedActorSheets(): any[] {
  // `game.actors` misses the synthetic actors behind unlinked tokens -- the usual case for mooks --
  // so an open mook sheet would keep offering maneuvers that are no longer in play.
  const actors = new Set([...(game.actors ?? []), ...(canvas?.tokens?.placeables ?? []).flatMap(t => t.actor ?? [])])
  return [...actors].map(actor => (actor as any)._sheet).filter(sheet => sheet?.rendered)
}

/* ---------------------------------------- */
