'use strict'

const woundModifiers = {
  burn: { multiplier: 1, label: 'Burning' },
  cor: { multiplier: 1, label: 'Corrosive' },
  cr: { multiplier: 1, label: 'Crushing' },
  cut: { multiplier: 1.5, label: 'Cutting' },
  fat: { multiplier: 1, label: 'Fatigue' },
  imp: { multiplier: 2, label: 'Impaling' },
  'pi-': { multiplier: 0.5, label: 'Small Piercing' },
  pi: { multiplier: 1, label: 'Piercing' },
  'pi+': { multiplier: 1.5, label: 'Large Piercing' },
  'pi++': { multiplier: 2, label: 'Huge Piercing' },
  tox: { multiplier: 1, label: 'Toxic' },
  dmg: { multiplier: 1, label: 'Damage', nodisplay: false }, // This needs to be collected in the default list of hit locations... maybe remove "nodisplay"?
}

// Map possible damage types to the allowed GURPS dmage types (plus support for dmg)
const damageTypeMap = {
  dmg: 'dmg',
  burn: 'burn',
  cor: 'cor',
  cr: 'cr',
  cut: 'cut',
  fat: 'fat',
  imp: 'imp',
  'pi-': 'pi-',
  pi: 'pi',
  'pi+': 'pi+',
  'pi++': 'pi++',
  tox: 'tox',
  burning: 'burn',
  corrosion: 'cor',
  corrosive: 'cor',
  crush: 'cr',
  crushing: 'cr',
  cutting: 'cut',
  fatigue: 'fat',
  impaling: 'imp',
  'small piercing': 'pi-',
  'piercing-': 'pi-',
  piercing: 'pi',
  'large piercing': 'pi+',
  'piercing+': 'pi+',
  'huge piercing': 'pi++',
  'piercing++': 'pi++',
  toxic: 'tox',
}

export let DamageTables = null
export function initializeDamageTables() {
  DamageTables = new DamageTable()
}

class DamageTable {
  constructor() {
    let translationTable = {}
    translationTable[game.i18n.localize('GURPS.damageAbbrevburn')] = 'burn'
    translationTable[game.i18n.localize('GURPS.damageAbbrevcor')] = 'cor'
    translationTable[game.i18n.localize('GURPS.damageAbbrevcr')] = 'cr'
    translationTable[game.i18n.localize('GURPS.damageAbbrevcut')] = 'cut'
    translationTable[game.i18n.localize('GURPS.damageAbbrevfat')] = 'fat'
    translationTable[game.i18n.localize('GURPS.damageAbbrevimp')] = 'imp'
    translationTable[game.i18n.localize('GURPS.damageAbbrevpi-')] = 'pi-'
    translationTable[game.i18n.localize('GURPS.damageAbbrevpi')] = 'pi'
    translationTable[game.i18n.localize('GURPS.damageAbbrevpi+')] = 'pi+'
    translationTable[game.i18n.localize('GURPS.damageAbbrevpi++')] = 'pi++'
    translationTable[game.i18n.localize('GURPS.damageAbbrevtox')] = 'tox'
    translationTable[game.i18n.localize('GURPS.damageAbbrevdmg')] = 'dmg'

    this.translationTable = translationTable
  }

  translate(alias) {
    let result = damageTypeMap[alias]
    if (!!result) return result

    // otherwise try a translation
    return this.translationTable[alias]
  }

  get damageTypeMap() {
    return damageTypeMap
  }

  get woundModifiers() {
    return woundModifiers
  }

  parseDmg(dmg) {
    return dmg.replace(/^(\d+)d6?([-+]\d+)?([xX\*]\d+)? ?(\([.\d]+\))?(!)? ?(.*)$/g, '$1~$2~$3~$4~$5~$6')
  }
}
