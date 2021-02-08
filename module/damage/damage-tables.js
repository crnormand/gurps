'use strict'

export const parseDmg = (dmg) => {
  return dmg.replace(/^(\d+)d6?([-+]\d+)?([xX\*]\d+)? ?(\([.\d]+\))?(!)? ?(.*)$/g, '$1~$2~$3~$4~$5~$6')
} // Allow opt '6' after 1d

export const woundModifiers = {
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
  dmg: { multiplier: 1, label: 'Damage', nodisplay: true },
}

export const damageTypeMap = {
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
  toxic: 'tox',
  burning: 'burn',
  corrosion: 'cor',
  corrosive: 'cor',
  crush: 'cr',
  crushing: 'cr',
  cutting: 'cut',
  fatigue: 'fat',
  impaling: 'imp',
  'small piercing': 'pi-',
  piercing: 'pi',
  'large piercing': 'pi+',
  'huge piercing': 'pi++',
  toxic: 'tox',
}
