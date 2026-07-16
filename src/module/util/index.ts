import { GurpsModule } from '@gurps-types/gurps-module.js'

import { findAdDisad, findAttack, findSkill, findSkillSpell, findSpell } from './find-item.js'

function init() {
  console.log('GURPS | Initializing GURPS Util module.')

  GURPS.findAdDisad = findAdDisad
  GURPS.findAttack = findAttack
  GURPS.findSkillSpell = findSkillSpell
  GURPS.findSkill = findSkill
  GURPS.findSpell = findSpell
}

export const Util: GurpsModule = {
  init,
}
