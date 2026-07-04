import { MeleeAttackModel } from "@module/action/melee-attack.js"
import { RangedAttackModel } from "@module/action/ranged-attack.js"
import { ActionType } from "@module/action/types.js"
import { cleanTags } from "@module/actor/effect-modifier-popout.js"
import { AnyObject } from "fvtt-types/utils"

import { TaggedModifiersSettings } from "./index.js"


enum ROLL_TYPE {
  MELEE = 'm',
  RANGED = 'r',
  PARRY = 'p',
  BLOCK = 'b',
  DAMAGE ='d',
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
  UNKNOWN ='unknown'
}

const rollTypeTagSettings : Record<ROLL_TYPE, (keyof TaggedModifiersSettings)[]> =
{
    [ROLL_TYPE.MELEE]: ['allAttackRolls', 'allMeleeRolls', 'allRolls' ],
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
    [ROLL_TYPE.UNKNOWN]: ['allRolls']
}

function toValidRoleType(value : string | undefined) : ROLL_TYPE {
    if (!value) return ROLL_TYPE.UNKNOWN

    const enumValues = Object.values(ROLL_TYPE) as string[];

    return enumValues.includes(value) ? value as ROLL_TYPE : ROLL_TYPE.UNKNOWN
}

function tagsForRollType(rollType: ROLL_TYPE, taggedSettings : TaggedModifiersSettings) : string[] {
    return rollTypeTagSettings[rollType]
        .flatMap( 
            (setting) => 
                (taggedSettings[setting] as string)
                    .split(',')
                    .map(it => it.trim().toLowerCase())
                )
}

  /**
 * Extract the roll/attribute reference code from a chat thing string with attribute format: `[ST]` or `dodge` or the roll format like `@R:attackname` or `@sk:skillname`
 * @param {string} chatThing - The chat thing string
 * @returns {ROLL_TYPE} The reference code (e.g., 'st', 'dodge')
 */
function extractRollTypeFromChatThing(chatThing: string) : ROLL_TYPE {
    const ref = chatThing
        .split('@')
        ?.pop()
        ?.toLowerCase()
        ?.replace(' ', '')
        ?.slice(0, -1)
        ?.split(':')[0]

    return toValidRoleType(ref)
}

function getRollTypeFromData(chatThing: string, attack: MeleeAttackModel | RangedAttackModel | undefined) {
    function defaultRef() {
        return attack ? attack.isOfType(ActionType.MeleeAttack) ? ROLL_TYPE.MELEE : ROLL_TYPE.RANGED : ROLL_TYPE.DAMAGE
    }

    const rollType = chatThing ? extractRollTypeFromChatThing(chatThing) : defaultRef()

    return rollType
}

/*
* Extracts the applicable tags from the roll data
*
* We get the roll type from the chat string and add the appropriate tags from the taggedSettings
* For some roll types the optionalArgs contain the item or element the roll origins from in the obj property. We also get the tags from the modifierTags property of this element.
* If chatThing is empty, we treat the roll as an attack roll if the attack parameter is provided or as a damage roll otherwise
* 
*/
export function getTagsForRoll(
    taggedSettings : TaggedModifiersSettings,
    rollType : ROLL_TYPE,
    optionalArgs: { obj?: {system?: AnyObject}}, 
): Set<string> {

    const rollTypeTags = tagsForRollType(rollType, taggedSettings)

    // the modifierTags should always be a set stored in obj.system in GGA 1.0.0 or higher
    const itemTags = (optionalArgs.obj?.system?.modifierTags instanceof Set) ? [...optionalArgs.obj.system.modifierTags] : [] 

    const spellTags = 
        (rollType === ROLL_TYPE.SPELL && taggedSettings.useSpellCollegeAsTag && optionalArgs.obj?.system?.colleges instanceof Set) 
        ? Array.from(optionalArgs.obj?.system?.colleges).map(college => cleanTags(college))
        : []

    return new Set([...rollTypeTags, ...itemTags, ...itemTags, ...spellTags])
}


function getItemRefFromChatThing(chatThing: string): string | undefined {
    const regex = /(?<="|:).+(?=\s\(|"|])/gm
    let itemRef = chatThing.match(regex)?.[0]

    if (itemRef) {
      itemRef = itemRef.replace(/"/g, '').split('(')[0].trim()
    }

    return itemRef
}

function getItemRef(
    chatThing: string, 
    optionalArgs: { obj?: {name?: string, system?: AnyObject}}, 
    attack?: MeleeAttackModel | RangedAttackModel,
): string {
   return optionalArgs?.obj?.name as string ?? getItemRefFromChatThing(chatThing) ?? attack?.name ?? ''
}


/*
* tests if a mod should be applied
*/
function canModApply(
    taggedSettings : TaggedModifiersSettings, 
    itemRef : string,
    actorInCombat : boolean,
    allTags: Set<string>,
    mod : string, 
) : boolean {
    const userModsTags: string[] = (mod.match(/#(\S+)/g) ?? [])?.map((tag: string) => tag.slice(1).toLowerCase())
    
    //do any tags match
    const tagHit = userModsTags.some( tag => allTags.has(tag))
    
    //mods that include '#maneuver' are added by then TokenActions to the . If they include '@man:' they ar from the current manuever should be applied if a tag matches
    //otherwise they are from multiple parrys oder previous aim manuevers, exists per attack row and haf the system path of the attack as source. 
    // These should be applied only, if the attack of the roll matches the item reference.
    // ToDo: In V1.0.0 the item references from the roll don't match, because the rolls uses the names, and TockenActions use keys.
    // To fix this I have to fix the UserModifiers first.
    // This whole logic here is quite fragile, the item matching should use item IDs.  
    const tokenActionModsFits = !mod.includes('#maneuver') || mod.includes('@man:') || mod.includes(itemRef)

    //check for combat/noncombat
    const nonCombatModFits =  !actorInCombat || !taggedSettings.nonCombatOnlyTag || !allTags.has(taggedSettings.nonCombatOnlyTag)
    const combatModFits =  actorInCombat || !taggedSettings.combatOnlyTag || !allTags.has(taggedSettings.combatOnlyTag)
    
    //ToDo: the original code has the following code. I have no clear idea how this is supposed to work and I can find on documentation of such a feature
    /*
        // If the modifier should apply only to a specific item (e.g. specific usage of a weapon) account for this
        if ('itemPath' in optionalArgs && typeof optionalArgs.itemPath === 'string')
          canApply = canApply && (mod.includes(optionalArgs.itemPath) || !mod.includes('@system')
    */
   // It seem to assume that be the intention, if the optional args include a itemPath (but the code path that set this property seem never to be called in V1)
   // and the source of the mod dont't starts with @system (what his never then case in V1)  
   // then the mod should ony apply to rolls originating from this item. 

    return tagHit && tokenActionModsFits && nonCombatModFits && combatModFits
}
  
  /**
 * Finds all tagged modifiers that should be applied to a roll 
 * @param {string} chatThing - The chat thing string fro the roll
 * @param {MeleeAttackModel | RangedAttackModel | undefined} attack --attack from the roll
 * @param {{ obj?: AnyObject }} optionalArgs optional arguments from the roll
 * @param {TaggedModifiersSettings} taggedSettings - settings
 * @param {string[]} allMods - all mods of the actor
 * @param {boolean} actorInCombat - is the actor in combat
 * @returns {{ modsToApply: string[], isDamageRoll: boolean }} 
 */
export function taggedModToApply(
    chatThing: string, 
    attack: MeleeAttackModel | RangedAttackModel | undefined, 
    optionalArgs: { obj?: AnyObject },
    taggedSettings: TaggedModifiersSettings, 
    allMods: string[], 
    actorInCombat: boolean
): { modsToApply: string[], isDamageRoll: boolean } {

    const rollType = getRollTypeFromData(chatThing, attack)
    const allTags = getTagsForRoll(taggedSettings, rollType, optionalArgs)
    const itemRef = getItemRef(chatThing, optionalArgs, attack)
    const isDamageRoll = rollType === ROLL_TYPE.DAMAGE

    const modsToApply = allMods.filter(mod => canModApply(taggedSettings, itemRef, actorInCombat, allTags, mod))

    return { modsToApply, isDamageRoll }
}

