import { MeleeAttackModel } from '@module/action/melee-attack.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import { ActionType } from '@module/action/types.js'
import { cleanTags } from '@module/actor/effect-modifier-popout.js'
import { ItemType } from '@module/item/types.js'
import { OtfActionType, OtfRollAction } from '@module/otf/types.js'

import { TaggedModifiersSettings } from './index.js'

export enum ROLL_TYPE {
  MELEE = 'm',
  RANGED = 'r',
  PARRY = 'p',
  BLOCK = 'b',
  DAMAGE = 'd',
  SKILL = 'sk',
  SPELL = 'sp',
  DODGE = 'dodge',
  ST = 'st',
  DX = 'dx',
  IQ = 'iq',
  HT = 'ht',
  WILL = 'will',
  PER = 'per',
  FRIGHT_CHECK = 'frightcheck',
  VISION = 'vision',
  HEARING = 'hearing',
  TASTE_SMELL = 'tastesmell',
  TOUCH = 'touch',
  CR = 'cr',
  UNKNOWN = 'unknown',
}

const rollTypeTagSettings: Record<ROLL_TYPE, (keyof TaggedModifiersSettings)[]> = {
  [ROLL_TYPE.MELEE]: ['allAttackRolls', 'allMeleeRolls', 'allRolls'],
  [ROLL_TYPE.RANGED]: ['allAttackRolls', 'allRangedRolls', 'allRolls'],
  [ROLL_TYPE.PARRY]: ['allDefenseRolls', 'allParryRolls', 'allRolls'],
  [ROLL_TYPE.BLOCK]: ['allDefenseRolls', 'allBlockRolls', 'allRolls'],
  [ROLL_TYPE.DAMAGE]: ['allDamageRolls', 'allRolls'],
  [ROLL_TYPE.SKILL]: ['allSkillRolls', 'allRolls'],
  [ROLL_TYPE.SPELL]: ['allSpellRolls', 'allRolls'],
  [ROLL_TYPE.DODGE]: ['allDefenseRolls', 'allDODGERolls', 'allRolls'],
  [ROLL_TYPE.ST]: ['allAttributesRolls', 'allSTRolls', 'allRolls'],
  [ROLL_TYPE.DX]: ['allAttributesRolls', 'allDXRolls', 'allRolls'],
  [ROLL_TYPE.IQ]: ['allAttributesRolls', 'allIQRolls', 'allRolls'],
  [ROLL_TYPE.HT]: ['allAttributesRolls', 'allHTRolls', 'allRolls'],
  [ROLL_TYPE.WILL]: ['allWILLRolls', 'allRolls'],
  [ROLL_TYPE.PER]: ['allPERRolls', 'allRolls'],
  [ROLL_TYPE.FRIGHT_CHECK]: ['allFRIGHTCHECKRolls', 'allRolls'],
  [ROLL_TYPE.VISION]: ['allVISIONRolls', 'allRolls'],
  [ROLL_TYPE.HEARING]: ['allHEARINGRolls', 'allRolls'],
  [ROLL_TYPE.TASTE_SMELL]: ['allTASTESMELLRolls', 'allRolls'],
  [ROLL_TYPE.TOUCH]: ['allTOUCHRolls', 'allRolls'],
  [ROLL_TYPE.CR]: ['allCRRolls', 'allRolls'],
  [ROLL_TYPE.UNKNOWN]: ['allRolls'],
}

function tagsForRollType(rollType: ROLL_TYPE, taggedSettings: TaggedModifiersSettings): string[] {
  return rollTypeTagSettings[rollType].flatMap(setting =>
    (taggedSettings[setting] as string).split(',').map(it => it.trim().toLowerCase())
  )
}

export function getRollTypeFromAction(action: OtfRollAction) {
  switch (action.type) {
    case OtfActionType.attack:
      if (action.isMelee) {
        return ROLL_TYPE.MELEE
      } else {
        return ROLL_TYPE.RANGED
      }

      break
    case OtfActionType.weaponParry:
      return ROLL_TYPE.PARRY
      break
    case OtfActionType.weaponBlock:
      return ROLL_TYPE.BLOCK
      break
    case OtfActionType.skillSpell:
      if (action.isSkillOnly) {
        return ROLL_TYPE.SKILL
      } else {
        return ROLL_TYPE.SPELL
      }

      break
    case OtfActionType.controlRoll:
      return ROLL_TYPE.CR
      break
    case OtfActionType.attribute:
      {
        switch (action.attribute) {
          case 'ST':
            return ROLL_TYPE.ST
            break
          case 'DX':
            return ROLL_TYPE.DX
            break
          case 'HT':
            return ROLL_TYPE.HT
            break
          case 'IQ':
            return ROLL_TYPE.IQ
            break
          case 'WILL':
            return ROLL_TYPE.WILL
            break
          case 'Vision':
            return ROLL_TYPE.VISION
            break
          case 'PER':
            return ROLL_TYPE.PER
            break
          case 'Fright Check':
            return ROLL_TYPE.FRIGHT_CHECK
            break
          case 'Hearing':
            return ROLL_TYPE.HEARING
            break
          case 'Taste Smell':
            return ROLL_TYPE.TASTE_SMELL
            break
          case 'Touch':
            return ROLL_TYPE.TOUCH
            break
          case 'Dodge':
            return ROLL_TYPE.DODGE
            break
          default:
            return ROLL_TYPE.UNKNOWN
        }
      }

      break
    case OtfActionType.roll:
    case OtfActionType.derivedRoll:
      return ROLL_TYPE.UNKNOWN
      break
    case OtfActionType.damage:
    case OtfActionType.derivedDamage:
      return ROLL_TYPE.DAMAGE
      break
    default:
      return ROLL_TYPE.UNKNOWN
  }
}

export function getTagsForRoll(
  taggedSettings: TaggedModifiersSettings,
  rollType: ROLL_TYPE,
  item?: Item.Implementation,
  attack?: MeleeAttackModel | RangedAttackModel
): Set<string> {
  const rollTypeTags = tagsForRollType(rollType, taggedSettings)

  const itemTags = item?.system?.modifierTags instanceof Set ? [...item.system.modifierTags] : []
  const attackTags = attack?.modifierTags instanceof Set ? [...attack.modifierTags] : []

  const spellTags =
    rollType === ROLL_TYPE.SPELL && taggedSettings.useSpellCollegeAsTag && item?.isOfType(ItemType.Spell)
      ? Array.from(item?.system?.college).flatMap(college => cleanTags(college))
      : []

  return new Set([...rollTypeTags, ...itemTags, ...attackTags, ...spellTags])
}

function getItemRef(obj: Item.Implementation | MeleeAttackModel | RangedAttackModel | undefined): string {
  return obj?.uuid as string
}

/*
 * tests if a mod should be applied
 */
function canModApply(
  taggedSettings: TaggedModifiersSettings,
  itemRef: string,
  actorInCombat: boolean,
  allTags: Set<string>,
  mod: string
): boolean {
  const userModsTags: string[] = (mod.match(/#(\S+)/g) ?? [])?.map((tag: string) => tag.slice(1).toLowerCase())

  //do any tags match
  const tagHit = userModsTags.some(tag => allTags.has(tag))

  //mods that include '#maneuver' are added by then TokenActions to the . If they include '@man:' they are from the current manuever should be applied if a tag matches
  //otherwise they are from multiple parrys oder previous aim manuevers, exists per attack row and has the UUID of the attack as source.
  // These should be applied only, if the attack of the roll matches the item reference.
  const tokenActionModsFits = !mod.includes('#maneuver') || mod.includes('@man:') || mod.includes(itemRef)

  //check for combat/noncombat
  const nonCombatModFits =
    !actorInCombat || !taggedSettings.nonCombatOnlyTag || !userModsTags.includes(taggedSettings.nonCombatOnlyTag)
  const combatModFits =
    actorInCombat || !taggedSettings.combatOnlyTag || !userModsTags.includes(taggedSettings.combatOnlyTag)

  //ToDo: the original code has the following code. I have no clear idea how this is supposed to work and I can find on documentation of such a feature
  /*
        // If the modifier should apply only to a specific item (e.g. specific usage of a weapon) account for this
        if ('itemPath' in optionalArgs && typeof optionalArgs.itemPath === 'string')
          canApply = canApply && (mod.includes(optionalArgs.itemPath) || !mod.includes('@system')
    */
  // It seem to assume that be the intention, if the optional args include a itemPath (but the code path that set this property seem never to be called in V1)
  // and the source of the mod dont't starts with @system (what is never then case in V1)
  // then the mod should ony apply to rolls originating from this item.

  return tagHit && tokenActionModsFits && nonCombatModFits && combatModFits
}

export function taggedModToApply(
  action: OtfRollAction,
  item: Item.Implementation | undefined,
  attack: MeleeAttackModel | RangedAttackModel | undefined,
  taggedSettings: TaggedModifiersSettings,
  allMods: string[],
  actorInCombat: boolean
): { modsToApply: string[]; isDamageRoll: boolean } {
  const rollType = getRollTypeFromAction(action)
  const allTags = getTagsForRoll(taggedSettings, rollType, item, attack)
  const itemRef = getItemRef(attack ?? item)
  const isDamageRoll = rollType === ROLL_TYPE.DAMAGE

  let modsToApply = allMods.filter(mod => canModApply(taggedSettings, itemRef, actorInCombat, allTags, mod))

  if (rollType === ROLL_TYPE.RANGED) {
    const bulkMod = modsToApply.find(mod => mod.includes('#maneuver') && mod.includes('@man:move_and_attack'))

    if (bulkMod && attack?.isOfType(ActionType.RangedAttack)) {
      const parsedBulk = attack.bulk.normal <= 0 ? attack.bulk.normal : 0
      const bulkPenalty = Number.isNaN(parsedBulk) ? 0 : parsedBulk
      const DEFAULT_PENALTY = -2

      const maneuverMod = bulkPenalty < DEFAULT_PENALTY ? bulkPenalty : DEFAULT_PENALTY
      const rangedBulkLabel = game.i18n?.localize('GURPS.modifiers_.moveAndAttackRangedBulk')
      const mod = `${maneuverMod} ${rangedBulkLabel} #ranged #maneuver @man:move_and_attack`

      modsToApply = [...modsToApply.filter(it => it !== bulkMod), mod]
    }
  }

  return { modsToApply, isDamageRoll }
}
