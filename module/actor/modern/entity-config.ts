import { Advantage, Melee, Ranged, Skill, Spell } from '../actor-components.js'

export const entityConfigurations: EntityConfiguration[] = [
  {
    entityName: 'skill',
    path: 'system.skills',
    EntityClass: Skill,
    editMethod: 'editSkills',
    localeKey: 'GURPS.skill',
    createArgs: () => [game.i18n!.localize('GURPS.skill'), '10']
  },
  {
    entityName: 'trait',
    path: 'system.ads',
    EntityClass: Advantage,
    editMethod: 'editAds',
    localeKey: 'GURPS.advantage'
  },
  {
    entityName: 'spell',
    path: 'system.spells',
    EntityClass: Spell,
    editMethod: 'editSpells',
    localeKey: 'GURPS.spell',
    createArgs: () => [game.i18n!.localize('GURPS.spell'), '10']
  },
  {
    entityName: 'melee',
    path: 'system.melee',
    EntityClass: Melee,
    editMethod: 'editMelee',
    localeKey: 'GURPS.melee',
    createArgs: () => [game.i18n!.localize('GURPS.melee'), '10', '1d']
  },
  {
    entityName: 'ranged',
    path: 'system.ranged',
    EntityClass: Ranged,
    editMethod: 'editRanged',
    localeKey: 'GURPS.ranged',
    createArgs: () => [game.i18n!.localize('GURPS.ranged'), '10', '1d']
  }
]

export const modifierConfigurations: ModifierConfiguration[] = [
  { isReaction: true },
  { isReaction: false }
]
