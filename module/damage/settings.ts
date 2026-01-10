import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'

import {
  APPLY_DIVISOR,
  BLUNT_TRAUMA,
  BODY_HITS,
  DEFAULT_ADD_ACTION,
  DEFAULT_LOCATION,
  LOCATION_MODIFIERS,
  MODULE_NAME,
  ONLY_GMS_OPEN_ADD,
  SHOW_THE_MATH,
  SIMPLE_DAMAGE,
} from './types.js'

const SETTING_DEFAULT_LOCATION = 'default-hitlocation'
const SETTING_SIMPLE_DAMAGE = 'combat-simple-damage'
const SETTING_APPLY_DIVISOR = 'combat-apply-divisor'
const SETTING_BLUNT_TRAUMA = 'combat-blunt-trauma'
const SETTING_BODY_HITS = 'combat-body-hits'
const SETTING_LOCATION_MODIFIERS = 'combat-location-modifiers'
const SETTING_ONLY_GMS_OPEN_ADD = 'only-gms-open-add'
const SETTING_SHOW_THE_MATH = 'show-the-math'
const SETTING_DEFAULT_ADD_ACTION = 'default-add-action'

const SETTINGS = 'GURPS.dmg.settings.title'

export default function initializeGameSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | Damage module requires game.settings and game.i18n to be available!')

  // Register the old settings for migration purposes.
  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_ONLY_GMS_OPEN_ADD, {
    name: 'GURPS.settingDamageRestrictADD',
    hint: 'GURPS.settingHintDamageRestrictADD',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Only GMs can open ADD : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_SIMPLE_DAMAGE, {
    name: 'GURPS.settingDamageSimpleADD',
    hint: 'GURPS.settingHintDamageSimpleADD',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Use simple Apply Damage Dialog : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_DEFAULT_LOCATION, {
    name: 'GURPS.settingDamageLocation',
    hint: 'GURPS.settingHintDamageLocation',
    scope: 'world',
    config: false,
    type: String,
    choices: {
      Torso: 'GURPS.settingDamageLocationTorso',
      Random: 'GURPS.settingDamageLocationRandom',
    },
    default: 'Torso',
    onChange: value => console.log(`Default hit location: ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_APPLY_DIVISOR, {
    name: 'GURPS.settingDamageAD',
    hint: 'GURPS.settingHintDamageAD',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Apply Armor Divisor : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BLUNT_TRAUMA, {
    name: 'GURPS.settingDamageBluntTrauma',
    hint: 'GURPS.settingHintDamageBluntTrauma',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Apply Blunt Trauma : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_LOCATION_MODIFIERS, {
    name: 'GURPS.settingDamageLocationMods',
    hint: 'GURPS.settingHintDamageLocationMods',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Apply Location Modifiers : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_SHOW_THE_MATH, {
    name: 'GURPS.settingDamageMath',
    hint: 'GURPS.settingHintDamageMath',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Always expand SHOW THE MATH : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BODY_HITS, {
    name: game.i18n.localize('Damage: Body Hits'),
    hint: game.i18n.localize(
      'From High Tech 162: Body Hits caps piercing, impaling, and tight-beam burning damage dealt to the torso at 2x max hp, and also adds a 1/6 chance of hitting vitals when targeting the torso.'
    ),
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Damage: Body Hits : ${value}`),
  })

  // @deprecated
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_DEFAULT_ADD_ACTION, {
    name: 'GURPS.settingDefaultADDAction',
    hint: 'GURPS.settingHintDefaultADDAction',
    scope: 'world',
    config: false,
    type: String,
    choices: {
      apply: 'GURPS.dmg.add.applyInjury',
      quiet: 'GURPS.dmg.add.applyInjuryQuietly',
      target: 'GURPS.settingApplyBasedOnTarget',
    },
    default: 'target',
    onChange: value => console.log(`ADD apply option: ${value}`),
  })

  // Register the new settings for the damage module.
  game.settings.register(GURPS.SYSTEM_NAME, ONLY_GMS_OPEN_ADD, {
    name: 'GURPS.dmg.settings.restrictADDToGM',
    hint: 'GURPS.dmg.settings.restrictADDToGMHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_ONLY_GMS_OPEN_ADD) as any) ?? true, // Migrate old setting if needed,
    onChange: value => console.log(`Only GMs can open ADD : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SIMPLE_DAMAGE, {
    name: 'GURPS.dmg.settings.useSimpleADD',
    hint: 'GURPS.dmg.settings.useSimpleADDHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_SIMPLE_DAMAGE) as any) ?? false, // Migrate old setting if needed,
    onChange: value => console.log(`Use simple Apply Damage Dialog : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, DEFAULT_LOCATION, {
    name: 'GURPS.dmg.settings.defaultLocation',
    hint: 'GURPS.dmg.settings.defaultLocationHint',
    scope: 'world',
    config: false,
    type: String,
    choices: {
      Torso: 'GURPS.torso',
      Random: 'GURPS.random',
    },
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_DEFAULT_LOCATION) as any) ?? 'Torso', // Migrate old setting if needed,
    onChange: value => console.log(`Default hit location: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, APPLY_DIVISOR, {
    name: 'GURPS.dmg.settings.armorDivisors',
    hint: 'GURPS.dmg.settings.armorDivisorsHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_APPLY_DIVISOR) as any) ?? true, // Migrate old setting if needed,
    onChange: value => console.log(`Apply Armor Divisor : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, BLUNT_TRAUMA, {
    name: 'GURPS.dmg.settings.bluntTrauma',
    hint: 'GURPS.dmg.settings.bluntTraumaHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_BLUNT_TRAUMA) as any) ?? true, // Migrate old setting if needed,
    onChange: value => console.log(`Apply Blunt Trauma : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, LOCATION_MODIFIERS, {
    name: 'GURPS.dmg.settings.locationMods',
    hint: 'GURPS.dmg.settings.locationModsHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_LOCATION_MODIFIERS) as any) ?? true, // Migrate old setting if needed,
    onChange: value => console.log(`Apply Location Modifiers : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SHOW_THE_MATH, {
    name: 'GURPS.dmg.settings.showTheMath',
    hint: 'GURPS.dmg.settings.showTheMathHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_SHOW_THE_MATH) as any) ?? false,
    onChange: value => console.log(`Always expand SHOW THE MATH : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, BODY_HITS, {
    name: 'GURPS.dmg.settings.htBodyHits',
    hint: 'GURPS.dmg.settings.htBodyHitsHint',
    scope: 'world',
    config: false,
    type: new foundry.data.fields.BooleanField(),
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_BODY_HITS) as any) ?? false, // Migrate old setting if needed,
    onChange: value => console.log(`Damage: Body Hits : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, DEFAULT_ADD_ACTION, {
    name: 'GURPS.dmg.settings.defaultADDAction',
    hint: 'GURPS.dmg.settings.defaultADDActionHint',
    scope: 'world',
    config: false,
    type: String,
    choices: {
      apply: 'GURPS.dmg.add.applyInjury',
      quiet: 'GURPS.dmg.add.applyInjuryQuietly',
      target: 'GURPS.dmg.settings.applyBasedOnTarget',
    },
    default: (game.settings.get(GURPS.SYSTEM_NAME, SETTING_DEFAULT_ADD_ACTION) as any) ?? 'target', // Migrate old setting if needed,
    onChange: value => console.log(`ADD apply option: ${value}`),
  })

  game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: game.i18n.localize(SETTINGS),
    label: game.i18n.localize(SETTINGS),
    hint: 'GURPS.dmg.settings.titleHint',
    icon: 'fa-solid fa-face-head-bandage',
    type: DamageSettingsApplication,
    restricted: false,
  })
}

export function isSimpleADD(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, SIMPLE_DAMAGE) ?? false
}

export function onlyGMsCanOpenADD(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, ONLY_GMS_OPEN_ADD) ?? true
}

export function defaultHitLocation(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, DEFAULT_LOCATION) ?? 'Torso'
}

export function useArmorDivisor(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, APPLY_DIVISOR) ?? true
}

export function useBluntTrauma(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, BLUNT_TRAUMA) ?? true
}

export function useLocationWoundMods(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, LOCATION_MODIFIERS) ?? true
}

export function showTheMath(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, SHOW_THE_MATH) ?? false
}

export function useHighTechBodyHits(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, BODY_HITS) ?? false
}

export function defaultADDAction(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, DEFAULT_ADD_ACTION) ?? DEFAULT_ADD_ACTION
}

class DamageSettingsApplication extends GurpsSettingsApplication {
  constructor(options?: any) {
    super({ title: game.i18n!.localize(SETTINGS), module: MODULE_NAME, icon: 'fa-solid fa-face-head-bandage' }, options)
  }
}
