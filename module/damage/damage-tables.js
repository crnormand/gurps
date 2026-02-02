'use strict'

const woundModifiers = {
  burn: { multiplier: 1, label: 'Burning', icon: '<i class="fa fa-fire"></i>', color: '#c5360b' },
  cor: { multiplier: 1, label: 'Corrosive', icon: '<i class="fa fa-flask"></i>', color: 'darkred' },
  cr: { multiplier: 1, label: 'Crushing', icon: '<i class="fa fa-hammer"></i>', color: 'purple' },
  cut: { multiplier: 1.5, label: 'Cutting', icon: '<i class="fa fa-cut"></i>', color: 'red' },
  fat: { multiplier: 1, label: 'Fatigue', icon: '<i class="fa fa-bed"></i>', color: 'darkblue' },
  imp: { multiplier: 2, label: 'Impaling', icon: '<i class="fa fa-bullseye"></i>', color: 'brown' },
  'pi-': { multiplier: 0.5, label: 'Small Piercing', icon: '<i class="fa fa-arrow-down"></i>', color: '#8a0000' },
  pi: { multiplier: 1, label: 'Piercing', icon: '<i class="fa fa-arrow-up"></i>', color: '#8a0000' },
  'pi+': {
    multiplier: 1.5,
    label: 'Large Piercing',
    icon: '<i class="fa fa-arrow-up"></i><i class="fa fa-arrow-up"></i>',
    color: '#8a0000',
  },
  'pi++': {
    multiplier: 2,
    label: 'Huge Piercing',
    icon: '<i class="fa fa-arrow-up"></i><i class="fa fa-arrow-up"></i><i class="fa fa-arrow-up"></i>',
    color: '#8a0000',
  },
  tox: { multiplier: 1, label: 'Toxic', icon: '<i class="fa fa-biohazard"></i>', color: 'darkgreen' },
  dmg: {
    multiplier: 1,
    label: 'Damage',
    nodisplay: false,
    icon: '<i class="fa fa-fist-raised"></i>',
    color: '#762f21',
  },
  injury: { multiplier: 1, label: 'Injury', icon: '<i class="fa fa-clinic-medical"></i>', color: '#762f21' },
  kb: { multiplier: 1, label: 'Knockback only', icon: '<i class="fa fa-arrow-right"></i>', color: '#6f63d9' },
  // This needs to be collected in the default list of hit locations... maybe remove "nodisplay"?
}

// Map possible damage types to the allowed GURPS dmage types (plus support for dmg)
const damageTypeMap = {
  dmg: 'dmg',
  injury: 'dmg',
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
  kb: 'kb',
}

export class DamageTable {
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
    translationTable[game.i18n.localize('GURPS.damageAbbrevinjury')] = 'injury'
    translationTable[game.i18n.localize('GURPS.damageAbbrevkb')] = 'kb'

    this.translationTable = translationTable
  }

  translate(alias) {
    let result = damageTypeMap[alias]

    if (result) return result

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
