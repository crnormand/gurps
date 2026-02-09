import { getGame } from '@module/util/guards.js'

import { Advantage, Melee, Ranged, Skill, Spell } from '../actor-components.js'

export const entityConfigurations: EntityConfiguration[] = [
  {
    entityName: 'Skill',
    path: 'system.skills',
    EntityClass: Skill,
    editMethod: 'editSkills',
    localeKey: 'GURPS.skill',
    createArgs: () => [getGame().i18n.localize('GURPS.skill'), '10'],
  },
  {
    entityName: 'Trait',
    path: 'system.ads',
    EntityClass: Advantage,
    editMethod: 'editAds',
    localeKey: 'GURPS.advantage',
  },
  {
    entityName: 'Spell',
    path: 'system.spells',
    EntityClass: Spell,
    editMethod: 'editSpells',
    localeKey: 'GURPS.spell',
    createArgs: () => [getGame().i18n.localize('GURPS.spell'), '10'],
  },
  {
    entityName: 'Melee',
    path: 'system.melee',
    EntityClass: Melee,
    editMethod: 'editMelee',
    localeKey: 'GURPS.melee',
    createArgs: () => [getGame().i18n.localize('GURPS.melee'), '10', '1d'],
  },
  {
    entityName: 'Ranged',
    path: 'system.ranged',
    EntityClass: Ranged,
    editMethod: 'editRanged',
    localeKey: 'GURPS.ranged',
    createArgs: () => [getGame().i18n.localize('GURPS.ranged'), '10', '1d'],
  },
]

export const modifierConfigurations: ModifierConfiguration[] = [{ isReaction: true }, { isReaction: false }]
