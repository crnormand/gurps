// Import Modules
import { parselink, parseForRollOrDamage } from '../lib/parselink.js'
import { handlePdf, SJGProductMappings } from './pdf-refs.js'
import { GurpsActor } from './actor/actor.js'
import { GurpsItem } from './item.js'
import { GurpsItemSheet } from './item-sheet.js'
import {
  GurpsActorCombatSheet,
  GurpsActorSheet,
  GurpsActorEditorSheet,
  GurpsActorSimplifiedSheet,
  GurpsActorNpcSheet,
  GurpsInventorySheet,
  GurpsActorTabSheet,
  GurpsActorNpcSheetCI,
} from './actor/actor-sheet.js'
import { ModifierBucket } from './modifier-bucket/bucket-app.js'
import { ChangeLogWindow } from '../lib/change-log.js'
import { SemanticVersion } from '../lib/semver.js'
import { d6ify, recurselist, atou, utoa, makeRegexPatternFrom, i18n } from '../lib/utilities.js'
import { ThreeD6 } from '../lib/threed6.js'
import { doRoll } from '../module/dierolls/dieroll.js'
import { ResourceTrackerManager } from './actor/resource-tracker-manager.js'
import { DamageTables, initializeDamageTables } from '../module/damage/damage-tables.js'
import RegisterChatProcessors from '../module/chat/chat-processors.js'
import { Migration } from '../lib/migration.js'
import ManeuverHUDButton from './actor/maneuver-button.js'
import { ItemImporter } from '../module/item-import.js'
import GURPSTokenHUD from './token-hud.js'
import GurpsJournalEntry from './journal.js'

export const GURPS = {}
window.GURPS = GURPS // Make GURPS global!
GURPS.DEBUG = true
GURPS.Migration = Migration
GURPS.BANNER = `
   __ ____ _____ _____ _____ _____ ____ __    
  / /_____|_____|_____|_____|_____|_____\\ \\   
 / /      ____ _   _ ____  ____  ____    \\ \\  
 | |     / ___| | | |  _ \\|  _ \\/ ___|    | | 
 | |    | |  _| | | | |_) | |_) \\___ \\    | | 
 | |    | |_| | |_| |  _ <|  __/ ___) |   | | 
 | |     \\____|\\___/|_| \\_\\_|   |____/    | | 
  \\ \\ _____ _____ _____ _____ _____ ____ / / 
   \\_|_____|_____|_____|_____|_____|____|_/  
`
GURPS.LEGAL = `GURPS is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. All rights are reserved by Steve Jackson Games. This game aid is the original creation of Chris Normand/Nose66 and is released for free distribution, and not for resale, under the permissions granted by http://www.sjgames.com/general/online_policy.html`

import GURPSRange from '../lib/ranges.js'
import Initiative from '../lib/initiative.js'
import HitFatPoints from '../lib/hitpoints.js'
import DamageChat from './damage/damagechat.js'

import MoustacheWax from '../lib/moustachewax.js'
import * as Settings from '../lib/miscellaneous-settings.js'
import JQueryHelpers from '../lib/jquery-helper.js'
import AddChatHooks from './chat.js'

import GURPSConditionalInjury from './injury/foundry/conditional-injury.js'
import { HitLocation } from './hitlocation/hitlocation.js'
import GurpsActiveEffect from './effects/active-effect.js'
import { StatusEffect } from './effects/effects.js'
import GurpsToken from './token.js'
import { parseDecimalNumber } from '../lib/parse-decimal-number/parse-decimal-number.js'
import Maneuvers from './actor/maneuver.js'

if (GURPS.DEBUG) {
  GURPS.parseDecimalNumber = parseDecimalNumber
}

AddChatHooks()
JQueryHelpers()
MoustacheWax()
Settings.initializeSettings()

// CONFIG.debug.hooks = true

// Expose Maneuvers to make them easier to use in modules
GURPS.Maneuvers = Maneuvers

// Use the target d6 icon for rolltable entries
CONFIG.RollTable.resultIcon = 'systems/gurps/icons/single-die.webp'
CONFIG.time.roundTime = 1

GURPS.SavedStatusEffects = CONFIG.statusEffects
CONFIG.statusEffects = StatusEffect.effects()

// Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
GURPS.LastActor = null
GURPS.SJGProductMappings = SJGProductMappings
GURPS.clearActiveEffects = GurpsActiveEffect.clearEffectsOnSelectedToken

GURPS.SetLastActor = function (actor) {
  if (actor != GURPS.LastActor) console.log('Setting Last Actor:' + actor?.name)
  GURPS.LastActor = actor
  setTimeout(() => GURPS.ModifierBucket.refresh(), 100) // Need to make certain the mod bucket refresh occurs later
}

GURPS.ClearLastActor = function (actor) {
  if (GURPS.LastActor == actor) {
    console.log('Clearing Last Actor:' + GURPS.LastActor?.name)
    GURPS.LastActor = null
    GURPS.LastActorName = null
    GURPS.ModifierBucket.refresh()
    const tokens = canvas.tokens
    if (tokens && tokens.controlled.length > 0) {
      GURPS.SetLastActor(tokens.controlled[0].actor)
    } // There may still be tokens selected... if so, select one of them
  }
}

/**
 * This object literal holds the results of the last targeted roll by an actor.
 * The property key is the actor's ID. The value is literally the chatdata from
 * the doRoll() function, which has close to anything anyone would want.
 */
GURPS.lastTargetedRoll = {}
GURPS.lastTargetedRolls = {} // mapped by both actor and token id

GURPS.setLastTargetedRoll = function (chatdata, actorid, tokenid, updateOtherClients) {
  let tmp = { ...chatdata }
  GURPS.lastTargetedRoll = tmp
  if (!!actorid) GURPS.lastTargetedRolls[actorid] = tmp
  if (!!tokenid) GURPS.lastTargetedRolls[tokenid] = tmp
  if (updateOtherClients)
    game.socket.emit('system.gurps', {
      type: 'setLastTargetedRoll',
      chatdata: tmp,
      actorid: actorid,
      tokenid: tokenid,
    })
}

// TODO Why are these global?
GURPS.ChatCommandsInProcess = [] // Taking advantage of synchronous nature of JS arrays
GURPS.PendingOTFs = []
GURPS.IgnoreTokenSelect = false

GURPS.attributepaths = {
  ST: 'attributes.ST.value',
  DX: 'attributes.DX.value',
  IQ: 'attributes.IQ.value',
  HT: 'attributes.HT.value',
  WILL: 'attributes.WILL.value',
  Will: 'attributes.WILL.value',
  PER: 'attributes.PER.value',
  Per: 'attributes.PER.value',
}

// Map stuff back to translation keys... don't know if useful yet
GURPS.attributes = {
  ST: 'GURPS.attributesST',
  DX: 'GURPS.attributesDX',
  IQ: 'GURPS.attributesIQ',
  HT: 'GURPS.attributesHT',
  Will: 'GURPS.attributesWILL',
  Per: 'GURPS.attributesPER',
}

GURPS.attributeNames = {
  ST: 'GURPS.attributesSTNAME',
  DX: 'GURPS.attributesDXNAME',
  IQ: 'GURPS.attributesIQNAME',
  HT: 'GURPS.attributesHTNAME',
  Will: 'GURPS.attributesWILLNAME',
  Per: 'GURPS.attributesPERNAME',
}

GURPS.skillTypes = {
  'DX/E': 'GURPS.SkillDXE',
  'DX/A': 'GURPS.SkillDXA',
  'DX/H': 'GURPS.SkillDXH',
  'DX/VH': 'GURPS.SkillDXVH',

  'IQ/E': 'GURPS.SkillIQE',
  'IQ/A': 'GURPS.SkillIQA',
  'IQ/H': 'GURPS.SkillIQH',
  'IQ/VH': 'GURPS.SkillIQVH',

  'HT/E': 'GURPS.SkillHTE',
  'HT/A': 'GURPS.SkillHTA',
  'HT/H': 'GURPS.SkillHTH',
  'HT/VH': 'GURPS.SkillHTVH',

  'Will/E': 'GURPS.SkillWillE',
  'Will/A': 'GURPS.SkillWillA',
  'Will/H': 'GURPS.SkillWillH',
  'Will/VH': 'GURPS.SkillWillVH',

  'Per/E': 'GURPS.SkillPerE',
  'Per/A': 'GURPS.SkillPerA',
  'Per/H': 'GURPS.SkillPerH',
  'Per/VH': 'GURPS.SkillPerVH',
}

GURPS.PARSELINK_MAPPINGS = {
  ST: 'attributes.ST.value',
  DX: 'attributes.DX.value',
  IQ: 'attributes.IQ.value',
  HT: 'attributes.HT.value',
  WILL: 'attributes.WILL.value',
  PER: 'attributes.PER.value',
  VISION: 'vision',
  FRIGHTCHECK: 'frightcheck',
  'FRIGHT CHECK': 'frightcheck',
  HEARING: 'hearing',
  TASTESMELL: 'tastesmell',
  'TASTE SMELL': 'tastesmell',
  TASTE: 'tastesmell',
  SMELL: 'tastesmell',
  TOUCH: 'touch',
  DODGE: 'currentdodge',
  Parry: 'equippedparry',
  PARRY: 'equippedparry',
  BLOCK: 'equippedblock',
}

GURPS.SJGProductMappings = SJGProductMappings
GURPS.USER_GUIDE_URL = 'https://bit.ly/2JaSlQd'

/**
 * @param {string} str
 */
function escapeUnicode(str) {
  return str.replace(/[^\0-~]/g, function (ch) {
    return '&#x' + ('0000' + ch.charCodeAt(0).toString(16).toUpperCase()).slice(-4) + ';'
  })
}
GURPS.escapeUnicode = escapeUnicode

/**
 * Read text data from a user provided File object
 * Stolen from Foundry, and replaced 'readAsText' with 'readAsBinaryString' to save unicode characters.
 * @param {File} file           A File object
 * @return {Promise.<string|ArrayBuffer|null>}   A Promise which resolves to the loaded text data
 */
async function readTextFromFile(file) {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    // @ts-ignore
    reader.onload = ev => {
      resolve(reader.result)
    }
    // @ts-ignore
    reader.onerror = ev => {
      reader.abort()
      reject()
    }
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_FILE_ENCODING) == 1)
      reader.readAsText(file, 'UTF-8')
    else reader.readAsText(file, 'ISO-8859-1')
  })
}
GURPS.readTextFromFile = readTextFromFile

// This is an ugly hack to clean up the "formatted text" output from GCS FG XML.
// First we have to remove non-printing characters, and then we want to replace
// all <p>...</p> with .../n before we try to convert to JSON. Also, for some reason,
// the DOMParser doesn't like some of the stuff in the formatted text sections, so
// we will base64 encode it, and the decode it in the Named subclass setNotes()
/**
 * @param {string} xml
 */
function cleanUpP(xml) {
  // First, remove non-ascii characters
  // xml = xml.replace(/[^ -~]+/g, '')
  xml = GURPS.escapeUnicode(xml)

  // Now try to remove any lone " & " in names, etc.  Will only occur in GCA output
  xml = xml.replace(/ & /g, ' &amp; ')
  let swap = function (/** @type {string} */ xml, /** @type {string} */ tagin, /** @type {string} */ tagout) {
    let s = xml.indexOf(tagin)
    while (s > 0) {
      let e = xml.indexOf(tagout, s)
      if (e > s) {
        let t1 = xml.substring(0, s)
        let t2 = xml.substring(s + 3, e)
        t2 = '@@@@' + utoa(t2) + '\n'
        let t3 = xml.substr(e + 4)
        xml = t1 + t2 + t3
        s = xml.indexOf(tagin, s + t2.length)
      }
    }
    return xml
  }
  xml = swap(xml, '&lt;p&gt;', '&lt;/p&gt;')
  xml = swap(xml, '<p>', '</p>')
  xml = xml.replace(/<br>/g, '\n')
  return xml
}
GURPS.cleanUpP = cleanUpP

/**
 * A utility function to "deep" print an object
 * @param {Object | null} obj
 * @param {number} ndeep
 * @returns {string}
 */
function objToString(obj, ndeep = 1) {
  if (obj == null) {
    return String(obj)
  }
  if (ndeep > 10) return '(stopping due to depth): ' + obj.toString()
  switch (typeof obj) {
    case 'string':
      return '"' + obj + '"'
    case 'function':
      return obj.name || obj.toString()
    case 'object':
      var indent = Array(ndeep || 1).join('\t'),
        isArray = Array.isArray(obj)
      return (
        '{['[+isArray] +
        Object.keys(obj)
          .map(function (key) {
            // @ts-ignore
            return '\n\t' + indent + key + ': ' + objToString(obj[key], (ndeep || 1) + 1)
          })
          .join(',') +
        '\n' +
        indent +
        '}]'[+isArray]
      )
    default:
      return obj.toString()
  }
}
GURPS.objToString = objToString

/**
 * @param {string} s
 */
function trim(s) {
  return s.replace(/^\s*$(?:\r\n?|\n)/gm, '').trim() // /^\s*[\r\n]/gm
}
GURPS.trim = trim

/**
 * @param {string} string
 * @param {boolean} priv
 * @param {JQuery.Event|null} event
 * @returns {Promise<boolean>}
 */
async function executeOTF(string, priv = false, event = null) {
  if (!string) return false
  string = string.trim()
  if (string[0] == '[' && string[string.length - 1] == ']') string = string.substring(1, string.length - 1)
  let action = parselink(string)
  let answer = false
  if (!!action.action) {
    if (!event) event = { shiftKey: priv, ctrlKey: false, data: {} }
    let result = await GURPS.performAction(action.action, GURPS.LastActor, event)
    answer = !!result
  } else ui.notifications.warn(`"${string}" did not parse into a valid On-the-Fly formula`)
  return answer
}
GURPS.executeOTF = executeOTF


const actionFuncs = {
  /**
   * @param {Object} data
   * @param {Object} data.action
   * @param {string} data.action.link
   */
  pdf({action}) {
    if (!action.link) {
      ui.notifications?.warn('no link was parsed for the pdf')
      return false; // if there's no link action fails
    }
    handlePdf(action.link)
    return true
  },
  /**
   * @param {Object} data
   * @param {Object} data.action
   * @param {string} data.action.mod
   * @param {string} data.action.desc
   * @param {Object} data.action.next
   */
  modifier({action}) {
    GURPS.ModifierBucket.addModifier(parseInt(action.mod), action.desc)
    if (action.next && action.next.type === 'modifier') {
      return this.modifier(action.next); // recursion
    }
    return true
  },
  /**
   * @param {Object} data
   * @param {Object} data.action
   * @param {string} data.action.orig
   * @param {boolean} data.action.quiet
   * @param {JQuery.Event|null} data.event
   */
  chat({action, event}) {
    // @ts-ignore
    chat = `/setEventFlags ${!!action.quiet} ${!!event?.shiftKey} ${game.keyboard?.isCtrl(event)}\n${action.orig}`

    // @ts-ignore - someone somewhere must have added chatmsgData to the MouseEvent.
    return GURPS.ChatProcessors.startProcessingLines(chat, event?.chatmsgData, event)
  },
  /**
   * @param {Object} data
   * @param {Object} data.action
   * @param {string} data.action.link
   * @param {string} data.action.id
   */
  dragdrop({action}) {
    if (action.link === 'JournalEntry') {
      game.journal?.get(action.id)?.show()
    }
    if (action.link === 'Actor') {
      game.actors?.get(action.id)?.sheet?.render(true)
    }
    if (action.link === 'RollTable') {
      game.tables?.get(action.id)?.sheet?.render(true)
    }
    if (action.link === 'Item') {
      game.items?.get(action.id)?.sheet?.render(true)
    }
    return true
  },
  /**
   * @param {Object} data
   * 
   * @param {Object} data.action
   * @param {string} data.action.costs
   * @param {string} data.action.mod
   * @param {string} data.action.desc
   * @param {string} data.action.formula
   * @param {string} data.action.damagetype
   * @param {string} data.action.extdamagetype
   * @param {string} data.action.hitlocation
   * 
   * @param {JQuery.Event|null} data.event
   * @param {GurpsActor|null} data.actor
   * @param {string[]} data.targets
   */
  damage({action, event, actor, targets}) {
    if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)

    if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc) // special case where Damage comes from [D:attack + mod]
    DamageChat.create(
      actor || game.user,
      action.formula,
      action.damagetype,
      event,
      null,
      targets,
      action.extdamagetype,
      action.hitlocation
    )
    return true
  },
  /**
   * @param {Object} data
   * 
   * @param {Object} data.action
   * @param {string} data.action.damagetype
   * @param {string} data.action.formula
   * @param {string} data.action.costs
   * @param {string} data.action.derivedformula
   * @param {string} data.action.extdamagetype
   * @param {string} data.action.hitlocation
   * 
   * @param {JQuery.Event|null} data.event
   * @param {GurpsActor|null} data.actor
   * @param {string[]} data.targets
   */
  deriveddamage({action, event, actor, targets}) {
     // action fails if there's no selected actor
    if (!actor) {
      ui.notifications?.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'));
      return false;
    }
    let df = action.derivedformula.match(/sw/i) ? actor.data.data.swing : actor.data.data.thrust
    // action fails if there's no formula
    if (!df) {
      ui.notifications?.warn(actor.name + ' does not have a ' + action.derivedformula.toUpperCase() + ' formula')
      return false
    }
    let formula = df + action.formula
    if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
    DamageChat.create(
      actor || game.user,
      formula,
      action.damagetype,
      event,
      action.derivedformula + action.formula.replace(/([+-]\d+).*/g, '$1'), // Just keep the +/- mod
      targets,
      action.extdamagetype,
      action.hitlocation
    )
    return true
  },
  /**
   * @param {Object} data
   * 
   * @param {Object} data.action
   * @param {string} data.action.name
   * @param {boolean} data.action.isMelee
   * @param {boolean} data.action.isRanged
   * @param {string} data.action.costs
   * @param {string} data.action.mod
   * @param {string} data.action.desc
   * 
   * @param {JQuery.Event|null} data.event
   * @param {GurpsActor|null} data.actor
   * @param {string[]} data.targets
   */
  attackdamage({action, event, actor, targets}) {
    // action fails if there's no selected actor
    if (!actor) {
      ui.notifications?.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'));
      return false;
    }
    if (!action.name) {
      ui.notifications?.warn('attack damage action has no name')
      return false;
    }
    let att = null
    att = GURPS.findAttack(actor.data.data, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards
    if (!att) {
      ui.notifications.warn(
        "No melee or ranged attack named '" + action.name.replace('<', '&lt;') + "' found on " + actor.name
      )
      return false
    }
    let dam = parseForRollOrDamage(att.damage)
    if (!dam.action) {
      ui.notifications?.warn('parsed damage has no action');
      return false;
    }
    dam.action.costs = action.costs
    dam.action.mod = action.mod
    dam.action.desc = action.desc
    return performAction(dam.action, actor, event, targets)
  },
  /**
   * @param {Object} data
   * 
   * @param {Object} data.action
   * @param {string} [data.action.displayformula]
   * @param {string} data.action.formula
   * @param {string} data.action.desc
   * @param {string} data.action.costs
   * @param {boolean} data.action.blindroll
   * 
   * @param {GurpsActor|null} data.actor
   * @param {JQuery.Event|null} data.event
   */
  roll({action, actor, event}) {
    const prefix = 'Rolling [' + (!!action.displayformula ? action.displayformula : action.formula) + ' ' + action.desc + ']';
    if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs);
    return doRoll({
      actor,
      formula: action.formula,
      prefix,
      optionalArgs: {blind: action.blindroll, event},
    });
  },
  /**
   * @param {Object} data
   * 
   * @param {Object} data.action
   * @param {string} data.action.target
   * @param {string} data.action.desc
   * @param {boolean} data.action.blindroll
   * 
   * @param {GurpsActor|null} data.actor
   * @param {JQuery.Event|null} data.event
   */
  controlroll({action, actor, event}) {
    const target = parseInt(action.target);
    let thing;
    let chatthing;
    if (!!action.desc) {
      thing = action.desc
      chatthing = '["Control Roll, ' + thing + '"CR:' + target + ' ' + thing + ']'
    } else {
      chatthing = '[CR:' + target + ']'
    }
    return doRoll({
      actor,
      formula: '3d6',
      thing,
      chatthing,
      origtarget: target,
      optionalArgs: {blind: action.blindroll, event},
    })
  },
  derivedroll({action, actor, event}) {
    if (!action.derivedformula) {
      ui.notifications.warn('derived roll with no derived formula');
      return false;
    }
    if (!actor) {
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'));
      return false;
    }
    let df = action.derivedformula.match(/[Ss][Ww]/) ? actor.data.data.swing : actor.data.data.thrust
    if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs);
    const originalFormula = action.derivedformula + action.formula;
    return doRoll({
      actor,
      formula: d6ify(df + action.formula),
      prefix: 'Rolling [' + originalFormula + '] ' + action.desc,
      optionalArgs: {blind: action.blindroll, event},
    });
  },
}
GURPS.actionFuncs = actionFuncs

/**
 * @param {Action} action
 * @param {GurpsActor|null} actor
 * @param {JQuery.Event|null} [event]
 * @param {string[] } [targets]
 * @returns {Promise<boolean | {target: any, thing: any} | undefined>}
 */
async function performAction(action, actor, event = null, targets = []) {
  if (!action) return false
  let actordata = actor?.data
  let prefix = ''
  let thing = ''
  let chatthing = ''
  let target = -1 // < 0 non-targeted roll, > 0 targeted roll
  let formula = ''

  /** @type {import('./modifier-bucket/bucket-app.js').Modifier[]} */
  let targetmods = [] // Should get this from the ModifierBucket someday

  /** @type {Record<string, any>} */
  let opt = {
    blind: action.blindroll,
    event: event,
  } // Ok, I am slowly learning this Javascrip thing ;-)

  let savedBucket = GURPS.ModifierBucket.modifierStack.modifierList.slice() // may need to reset the state of the MB

  if (action.type in actionFuncs) {
    return GURPS.actionFuncs[action.type]({action, event, actor, targets}) // get the processor and return result from it. await is unnecessary when returning from async function.
  }

  let processLinked = (/** @type {Action} */ tempAction) => {
    let bestLvl = -99999
    var bestAction, besttrue
    let attempts = []
    var th
    while (!!tempAction) {
      if (!!tempAction.truetext && !besttrue) besttrue = tempAction
      if (tempAction.type == 'attribute') {
        th = GURPS._mapAttributePath(tempAction.path)
        let t = parseInt(tempAction.target) // is it pre-targeted (ST12)
        if (!t && !!actor) {
          if (!!tempAction.melee) {
            // Is it trying to match to an attack name (should only occur with Parry: & Block:
            let m = GURPS.findAttack(actor.data.data, tempAction.melee)
            if (!!m) {
              th += ' for ' + m.name
              //              if (!!m.mode && !tempAction.desc) tempAction.desc = '(' + m.mode + ')'
              // @ts-ignore
              t = parseInt(m[tempAction.attribute.toLowerCase()]) // should only occur with parry & block
            }
            if (!m || !t) attempts.push(tempAction.attribute + ':' + tempAction.melee)
          } else {
            t = parseInt(GURPS.resolve(tempAction.path, actordata.data))
            if (!t) attempts.push(tempAction.attribute)
          }
        }
        let sl = t
        if (!!tempAction.mod) sl += parseInt(tempAction.mod)
        if (sl > bestLvl) {
          // @ts-ignore
          bestLvl = parseInt(sl)
          bestAction = tempAction
          prefix = 'Roll vs '
          target = t
          //thing = th
          thing = tempAction.orig
          // @ts-ignore
          tempAction.thing = thing
          if (!!tempAction.truetext) besttrue = tempAction
        }
      } else {
        // skill
        var skill
        if (!!tempAction.target) {
          // Skill-12
          skill = {
            name: tempAction.name,
            // @ts-ignore
            level: parseInt(tempAction.target),
          }
        }
        // @ts-ignore
        else
          skill = GURPS.findSkillSpell(
            actor?.data?.data,
            tempAction.name,
            !!tempAction.isSkillOnly,
            !!tempAction.isSpellOnly
          )
        if (!skill) {
          attempts.push(tempAction.name)
        } else {
          // @ts-ignore
          tempAction.obj = skill
          // on a normal skill check, look for the skill with the highest level
          let getLevel = (/** @type {{ name: string, level: string; relativelevel: string; }} */ skill) =>
            parseInt(skill.level)

          let getSkillName = (/** @type {{ name: string; }} */ skill) => skill.name

          // on a floating skill check, we want the skill with the highest relative skill level
          if (!!tempAction.floatingAttribute)
            if (!!actor) {
              getSkillName = skill => `${tempAction.floatingLabel}-based ${skill.name}`

              let value = GURPS.resolve(tempAction.floatingAttribute, actordata.data)
              getLevel = skill => {
                let rsl = skill.relativelevel //  this is something like 'IQ-2' or 'Touch+3'
                console.log(rsl)
                let valueText = rsl.replace(/^.*([+-]\d+)$/g, '$1')
                console.log(valueText)
                return valueText === rsl ? parseInt(value) : parseInt(valueText) + parseInt(value)
              }
            } else ui.notifications?.warn('You must have a character selected to use a "Based" Skill')

          let skillLevel = getLevel(skill)

          if (!!tempAction.mod) skillLevel += parseInt(tempAction.mod)

          if (skillLevel > bestLvl) {
            bestLvl = skillLevel
            bestAction = tempAction
            thing = getSkillName(skill)
            // @ts-ignore
            tempAction.thing = thing
            target = getLevel(skill) // target is without mods
            prefix = ''
            if (!!tempAction.truetext) besttrue = tempAction
          }
        }
      }
      // @ts-ignore
      tempAction = tempAction.next
    }
    if (!!bestAction && !!besttrue) {
      bestAction.truetext = besttrue.truetext
      bestAction.falsetext = besttrue.falsetext
    }

    return [bestAction, attempts]
  }

  // This can be complicated because Attributes (and Skills) can be pre-targeted (meaning we don't need an actor)
  if (action.type === 'skill-spell' || action.type === 'attribute') {
    const [_best, _atts] = processLinked(action)
    let bestAction = /** @type {Action | null} */ (_best)
    let attempts = /** @type {string[]} */ (_atts)

    if (!actor && (!bestAction || !bestAction.target)) {
      ui.notifications?.warn('You must have a character selected')
      return false
    }
    if (!bestAction) {
      if (!action.calcOnly)
        ui.notifications?.warn(
          "Unable to find '" + attempts?.join("' or '").replace('<', '&lt;') + "' on " + actor?.name
        )
      return false
    }
    formula = '3d6'
    if (bestAction.type === 'skill-spell') {
      //      chatthing = '[S:' + bestAction.thing + ']'

      thing = bestAction.thing
        .replace(/\[.*\]/, '')
        .replace(/ +/g, ' ')
        .trim()
      if (thing.length == 0) {
        chatthing = bestAction.thing
      } else chatthing = '[S:"' + thing + '"]'
    } else chatthing = '[' + bestAction.orig + ']'
    opt.action = bestAction
    opt.obj = bestAction.obj
    if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event))) return false
    if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event)

    if (!!bestAction.costs) GURPS.ModifierBucket.addModifier(0, bestAction.costs)
    if (!!bestAction.mod) GURPS.ModifierBucket.addModifier(bestAction.mod, bestAction.desc, targetmods)
    else if (!!bestAction.desc) opt.text = "<span style='font-size:85%'>" + bestAction.desc + '</span>'
  }

  if (action.type === 'attack' && action.name) {
    if (!!actor) {
      let att = null
      prefix = ''
      att = GURPS.findAttack(actor.data.data, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards
      if (!att) {
        if (!action.calcOnly)
          ui.notifications.warn(
            "No melee or ranged attack named '" + action.name.replace('<', '&lt;') + "' found on " + actor.name
          )
        return false
      }
      thing = att.name // get real name of attack
      let mode = ''
      if (!!att.mode) mode = ' (' + att.mode + ')'
      let p = 'A:'
      if (!!action.isMelee && !action.isRanged) p = 'M:'
      if (!action.isMelee && !!action.isRanged) p = 'R:'
      // Need to finagle chatthing to allow for attack names that include OtFs
      thing = thing
        .replace(/\[.*\]/, '')
        .replace(/ +/g, ' ')
        .trim()
      if (thing.length == 0) {
        chatthing = att.name + mode
      } else chatthing = '[' + p + '"' + thing + mode + '"]'
      let t = att.level
      if (!!t) {
        let a = (t + '').trim().split(' ')
        t = a[0]
        if (!!t) target = parseInt(t)
        if (isNaN(target)) target = 0
        // Can't roll against a non-integer
        else {
          a.shift()
          let m = a.join(' ')
          if (!!m) GURPS.ModifierBucket.addModifier(0, m) //  Level may have "*Costs xFP"
        }
      }
      opt.obj = att // save the attack in the optional parameters, in case it has rcl/rof
      if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event))) return false
      if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event)
      formula = '3d6'
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      //if (!!att.mode) opt.text = "<span style='font-size:85%'>(" + att.mode + ')</span>'
    } else ui.notifications?.warn('You must have a character selected')
  }

  if (action.type.startsWith('weapon-')) {   // weapon-parry or weapon-block
    if (!!actor) {
      let att = null
      att = GURPS.findAttack(actor.data.data, action.name, !!action.isMelee, false) // find attack possibly using wildcards
      if (!att) {
        ui.notifications.warn(
          "No melee attack named '" + action.name.replace('<', '&lt;') + "' found on " + actor.name
        )
        return false
      }
      formula = '3d6'
      let mode = ''
      if (!!att.mode) mode = ' (' + att.mode + ')'
      let p = 'P:'
      target = parseInt(att.parry)
      prefix = 'Parry'
      if (action.type == 'weapon-block') {
	      target = parseInt(att.block)
        p = 'B:'
        prefix = 'Block'
      }
      if (isNaN(target) || target == 0) {
        ui.notifications.warn(
          "No " + prefix + " for '" + action.name.replace('<', '&lt;') + "' found on " + actor.name
        )
        return false
      }
      prefix += ': '
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      thing = att.name.replace(/\[.*\]/, '').replace(/ +/g, " ").trim()
      if (thing.length == 0) {
        chatthing = att.name + mode
      } else
        chatthing = '[' + p + '"' + thing + mode + '"]'
    } else ui.notifications?.warn('You must have a character selected')
  }

  if (!formula || target == 0 || isNaN(target)) return false // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  if (!!action.calcOnly) {
    for (let m of targetmods) target += m.modint
    GURPS.ModifierBucket.modifierStack.modifierList = savedBucket
    return { target: target, thing: thing }
  }
  return doRoll({actor, formula, targetmods, prefix, thing, chatthing, origtarget: target, optionalArgs: opt})
}
GURPS.performAction = performAction

/**
 * Find the skill or spell. if isSkillOnly or isSpellOnly set, only check that list.
 * @param {GurpsActor|GurpsActorData} actor
 * @param {string} sname
 */
function findSkillSpell(actor, sname, isSkillOnly = false, isSpellOnly = false) {
  const removeOtf = '^ *(\\[ ?["\'])?' // pattern to remove some of the OtF syntax from search name so attacks start start with an OtF can be matched
  var t
  if (!actor) return t
  if (actor instanceof GurpsActor) actor = actor.getGurpsActorData()
  // if (!!actor.data?.data?.additionalresources) actor = actor.data
  let skillRegExp = new RegExp(removeOtf + makeRegexPatternFrom(sname, false, false), 'i')
  let best = 0
  if (!isSpellOnly)
    recurselist(actor.skills, s => {
      if (s.name.match(skillRegExp) && s.level > best) {
        t = s
        best = parseInt(s.level)
      }
    })
  if (!t)
    if (!isSkillOnly)
      recurselist(actor.spells, s => {
        if (s.name.match(skillRegExp) && s.level > best) {
          t = s
          best = parseInt(s.level)
        }
      })
  return t
}
GURPS.findSkillSpell = findSkillSpell

/**
 * @param {GurpsActor | GurpsActorData} actor
 * @param {string} sname
 * @returns {any}
 */
function findAdDisad(actor, sname) {
  var t
  if (!actor) return t
  if (actor instanceof GurpsActor) actor = actor.getGurpsActorData()
  sname = makeRegexPatternFrom(sname, false)
  let regex = new RegExp(sname, 'i')
  recurselist(actor.ads, s => {
    if (s.name.match(regex)) {
      t = s
    }
  })
  return t
}
GURPS.findAdDisad = findAdDisad

/**
 * @param {GurpsActor | GurpsActorData} actor
 * @param {string} sname
 */
function findAttack(actor, sname, isMelee = true, isRanged = true) {
  const removeOtf = '^ *(\\[ ?["\'])?' // pattern to remove some of the OtF syntax from search name so attacks start start with an OtF can be matched
  var t
  if (!actor) return t
  if (actor instanceof GurpsActor) actor = actor.getGurpsActorData()
  //  if (!!actor.data?.data?.additionalresources) actor = actor.data
  let fullregex = new RegExp(removeOtf + makeRegexPatternFrom(sname, false, false), 'i')
  let smode = ''
  let m = sname.match(/(.*?)\(([^\)]*)\)$/)
  if (!!m) {
    // Found a mode "(xxx)" in the search name
    sname = m[1].trim()
    smode = m[2].trim().toLowerCase()
  }
  let nameregex = new RegExp(removeOtf + makeRegexPatternFrom(sname, false, false), 'i')
  if (isMelee)
    // @ts-ignore
    recurselist(actor.melee, (e, k, d) => {
      if (!t) {
        let em = !!e.mode ? e.mode.toLowerCase() : ''
        if (e.name.match(nameregex) && (smode == '' || em == smode)) t = e
        else if (e.name.match(fullregex)) t = e
      }
    })
  //    t = Object.values(actor.melee).find(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(nameregex))
  if (isRanged && !t)
    // @ts-ignore
    recurselist(actor.ranged, (e, k, d) => {
      if (!t) {
        let em = !!e.mode ? e.mode.toLowerCase() : ''
        if (e.name.match(nameregex) && (smode == '' || em == smode)) t = e
        else if (e.name.match(fullregex)) t = e
      }
    })
  //    t = Object.values(actor.ranged).find(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(nameregex))
  return t
}
GURPS.findAttack = findAttack

/**
 * The user clicked on a field that would allow a dice roll. Use the element
 * information to try to determine what type of roll.
 * @param {JQuery.MouseEventBase} event
 * @param {GurpsActor | null} actor
 * @param {string[]} targets - labels for multiple Damage rolls
 */
async function handleRoll(event, actor, targets) {
  event.preventDefault()
  let formula = ''
  let targetmods = null
  let element = event.currentTarget
  let prefix = ''
  let thing = ''
  var chatthing
  /** @type {Record<string, any>} */
  let opt = { event: event }
  let target = 0 // -1 == damage roll, target = 0 is NO ROLL.
  if (!!actor) GURPS.SetLastActor(actor)

  if ('damage' in element.dataset) {
    // expect text like '2d+1 cut'
    let f = !!element.dataset.otf ? element.dataset.otf : element.innerText.trim()
    let result = parseForRollOrDamage(f)
    if (result?.action) performAction(result.action, actor, event, targets)
    return
  } else if ('path' in element.dataset) {
    prefix = 'Roll vs '
    thing = GURPS._mapAttributePath(element.dataset.path)
    formula = '3d6'
    target = parseInt(element.innerText)
    if ('otf' in element.dataset)
      if (thing.toUpperCase() != element.dataset.otf.toUpperCase()) chatthing = thing + '/[' + element.dataset.otf + ']'
      else chatthing = '[' + element.dataset.otf + ']'
  } else if ('otf' in element.dataset) {
    // strip out any inner OtFs when coming from the UI.   Mainly attack names
    let otf = element.dataset.otf.trim()
    // But there is a special case where the OtF is the first thing
    // "M:"["Quarterstaff"A:"Quarterstaff (Thrust)"] (Thrust)""
    let m = otf.match(/^([sSmMrRaA]):"\["([^"]+)([^\]]+)]( *\(\w*\))?/)
    if (!!m) otf = m[1] + ':' + m[2] + (!!m[4] ? m[4] : '')
    otf = otf.replace(/\[.*\]/, '')
    otf = otf.replace(/ +/g, ' ') // remove duplicate blanks
    return GURPS.executeOTF(otf)
  } else if ('name' in element.dataset) {
    prefix = '' // "Attempting ";
    let text = /** @type {string} */ (element.dataset.name || element.dataset.otf)
    text = text.replace(/ \(\)$/g, '') // sent as "name (mode)", and mode is empty
    thing = text.replace(/(.*?)\(.*\)/g, '$1')

    // opt.text = text.replace(/.*?\((.*)\)/g, "<br>&nbsp;<span style='font-size:85%'>($1)</span>");
    opt.text = text.replace(/.*?\((.*)\)/g, '$1')

    if (opt.text === text) opt.text = ''
    else opt.text = "<span style='font-size:85%'>(" + opt.text + ')</span>'
    let k = $(element).closest('[data-key]').attr('data-key')
    if (!k) k = element.dataset.key
    if (!!k) {
      if (actor) opt.obj = getProperty(actor.data, k) // During the roll, we may want to extract something from the object
      if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event))) return
      if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event)
    }
    formula = '3d6'
    let t = element.innerText
    if (!!t) {
      let a = t.trim().split(' ')
      t = a[0]
      if (!!t) target = parseInt(t)
      if (isNaN(target)) target = 0
      // Can't roll against a non-integer
      else {
        a.shift()
        let m = a.join(' ')
        // TODO Why is modifierbucket on the ui object?
        if (!!m) GURPS.ModifierBucket.addModifier(0, m)
      }
    }
  } else if ('roll' in element.dataset) {
    target = -1 // Set flag to indicate a non-targeted roll
    formula = element.innerText
    prefix = 'Rolling ' + formula
    formula = d6ify(formula)
  }

  doRoll({actor, formula, targetmods, prefix, thing, chatthing, origtarget: target, optionalArgs: opt})
}
GURPS.handleRoll = handleRoll

/**
 * If the desc contains *Cost ?FP or *Max:9 then perform action
 * @param {GurpsActor|User} actor
 * @param {string} desc
 */
async function applyModifierDesc(actor, desc) {
  if (!desc) return null
  let m = desc.match(/.*\* ?Costs? (\d+) ?([ \w\(\)]+)/i)

  if (!!m && !!actor && !actor.isSelf) {
    let delta = parseInt(m[1])
    let target = m[2]
    if (target.match(/^[hf]p/i)) {
      let k = target.toUpperCase()
      // @ts-ignore
      delta = actor.data.data[k].value - delta
      await actor.update({ ['data.' + k + '.value']: delta })
    }
    if (target.match(/^tr/i)) {
      await GURPS.ChatProcessors.startProcessingLines('/setEventFlags true false false\\\\/' + target + ' -' + delta) // Make the tracker command quiet
      return null
    }
  }

  let parse = desc.replace(/.*\*[Mm]ax: ?(\d+).*/g, '$1')
  if (parse != desc) {
    return parseInt(parse)
  }
  return null // indicating no overriding MAX value
}
GURPS.applyModifierDesc = applyModifierDesc

/**
 * Return html for text, parsing GURPS "links" into <span class="gurplink">XXX</span>.
 * @param {string | null | undefined} str
 * @param {boolean} [clrdmods=true]
 */
function gurpslink(str, clrdmods = true) {
  if (str === undefined || str == null) return '!!UNDEFINED'
  let found = -1
  let depth = 0
  let output = ''
  for (let i = 0; i < str.length; i++) {
    if (str[i] == '[') {
      if (depth == 0) found = ++i
      depth++
    }
    if (str[i] == ']') {
      depth--
      if (depth == 0 && found >= 0) {
        output += str.substring(0, found - 1)
        let action = parselink(str.substring(found, i), '', clrdmods)

        if (
          action.action?.type &&
          !['pdf', 'controlroll', 'attribute', 'modifier', 'chat', 'damage', 'roll', 'skill-spell'].includes(
            action.action.type
          )
        )
          if (!action.action)
            // console.log(action.action)

            output += '['
        output += action.text
        if (!action.action) output += ']'
        str = str.substr(i + 1)
        i = -1
        found = -1
      }
    }
  }
  output += str
  return output
}
GURPS.gurpslink = gurpslink

/**
 * Return the i18n string for this data path (note en.json must match up to the data paths).
 * special case, drop ".value" from end of path (and append "NAME"), usually used for attributes.
 * @param {string} path
 * @param {any} _suffix
 */
function _mapAttributePath(path, suffix) {
  let i = path.indexOf('.value')
  if (i >= 0) {
    path = path.substr(0, i) + 'NAME' // used for the attributes
  }
  path = path.replace(/\./g, '') // remove periods
  return game.i18n.localize('GURPS.' + path)
}
GURPS._mapAttributePath = _mapAttributePath

/**
 * Given a string path "x.y.z", use it to resolve down an object heiracrhy
 * @param {string | string[]} path
 * @param {any} obj
 */
function resolve(path, obj = self, separator = '.') {
  var properties = Array.isArray(path) ? path : path.split(separator)
  return properties.reduce((prev, curr) => prev && prev[curr], obj)
}
GURPS.resolve = resolve

/**
 *   A user has clicked on a "gurpslink", so we can assume that it previously qualified as a "gurpslink"
 *  and followed the On-the-Fly formulas. As such, we may already have an action block (base 64 encoded so we can handle
 *  any text).  If not, we will just re-parse the text looking for the action block.
 *
 * @param {JQuery.MouseEventBase} event
 * @param {GurpsActor | null} actor
 * @param {string | null} desc
 * @param {string[] | undefined} targets
 */
function handleGurpslink(event, actor, desc, targets) {
  event.preventDefault()
  let element = event.currentTarget
  let action = element.dataset.action // If we have already parsed
  if (!!action) action = JSON.parse(atou(action))
  else action = parselink(element.innerText, desc).action
  GURPS.performAction(action, actor, event, targets)
}
GURPS.handleGurpslink = handleGurpslink

/* You may be asking yourself, why the hell is he generating fake keys to fit in an object
  when he could have just used an array. Well, I had TONs of problems with the handlebars and Foundry
  trying to deal with an array. While is "should" be possible to use it, and some people claim
  that they could... everything I tried did something wonky. So the 2am fix was just make everything an
  object with fake indexes. Handlebars deals with this just fine using {{#each someobject}} 
  and if you really did just want to modify a single entry, you could use {{#each someobject as | obj key |}}
  which will give you the object, and also the key, such that you could execute someobject.key to get the 
  correct instance.   */
/**
 * @param {number} index
 */
function genkey(index) {
  let k = ''
  if (index < 10) k += '0'
  if (index < 100) k += '0'
  if (index < 1000) k += '0'
  if (index < 10000) k += '0'
  return k + index
}
GURPS.genkey = genkey

/**
 * Add the value as a property to obj. The key will be a generated value equal
 * to a five-digit string equal to the index, padded to the left with zeros; e.g:
 * if index is 12, the property key will be "00012".
 *
 * If index is equal to -1, then the existing properties of the object are examined
 * and the index set to the next available (i.e, no property exists) key of the same
 * form.
 *
 * TODO should be moved to lib/utilities.js and removed from the GURPS object.
 *
 * @param {Record<string, any>} obj
 * @param {any} value
 * @param {number} index
 */
function put(obj, value, index = -1) {
  if (index == -1) {
    index = 0
    while (obj.hasOwnProperty(GURPS.genkey(index))) index++
  }
  let k = GURPS.genkey(index)
  obj[k] = value
  return k
}
GURPS.put = put

/**
 * Convolutions to remove a key from an object and fill in the gaps, necessary
 * because the default add behavior just looks for the first open gap
 * @param {GurpsActor} actor
 * @param {string} path
 */
async function removeKey(actor, path) {
  let i = path.lastIndexOf('.')
  let objpath = path.substring(0, i)
  let key = path.substr(i + 1)
  i = objpath.lastIndexOf('.')
  let parentpath = objpath.substring(0, i)
  let objkey = objpath.substr(i + 1)
  let object = GURPS.decode(actor.data, objpath)
  let t = parentpath + '.-=' + objkey
  let oldRender = actor.ignoreRender
  actor.ignoreRender = true
  await actor.internalUpdate({ [t]: null }) // Delete the whole object
  delete object[key]
  i = parseInt(key)

  i = i + 1
  while (object.hasOwnProperty(GURPS.genkey(i))) {
    let k = GURPS.genkey(i)
    object[key] = object[k]
    delete object[k]
    key = k
    i++
  }
  let sorted = Object.keys(object)
    .sort()
    .reduce((a, v) => {
      // @ts-ignore
      a[v] = object[v]
      return a
    }, {}) // Enforced key order
  actor.ignoreRender = oldRender
  await actor.internalUpdate({ [objpath]: sorted }, { diff: false })
}
GURPS.removeKey = removeKey

/**
 * Because the DB just merges keys, the best way to insert is to delete the whole colleciton object, fix it up, and then re-add it.
 * @param {Actor} actor
 * @param {string} path
 * @param {any} newobj
 */
async function insertBeforeKey(actor, path, newobj) {
  let i = path.lastIndexOf('.')
  let objpath = path.substring(0, i)
  let key = path.substr(i + 1)
  i = objpath.lastIndexOf('.')
  let parentpath = objpath.substring(0, i)
  let objkey = objpath.substr(i + 1)
  let object = GURPS.decode(actor.data, objpath)
  let t = parentpath + '.-=' + objkey
  await actor.internalUpdate({ [t]: null }) // Delete the whole object
  let start = parseInt(key)

  i = start + 1
  while (object.hasOwnProperty(GURPS.genkey(i))) i++
  i = i - 1
  for (let z = i; z >= start; z--) {
    object[genkey(z + 1)] = object[genkey(z)]
  }
  object[key] = newobj
  let sorted = Object.keys(object)
    .sort()
    .reduce((a, v) => {
      // @ts-ignore
      a[v] = object[v]
      return a
    }, {}) // Enforced key order
  await actor.internalUpdate({ [objpath]: sorted }, { diff: false })
}
GURPS.insertBeforeKey = insertBeforeKey

// TODO replace Record<string, any> with { [key: string]: any }
/**
 * @param {Record<String,any>} obj
 * @param {string} path
 */
function decode(obj, path, all = true) {
  let p = path.split('.')
  let end = p.length
  if (!all) end = end - 1
  for (let i = 0; i < end; i++) {
    let q = p[i]
    obj = obj[q]
  }
  return obj
}
GURPS.decode = decode

/**
 *  Funky helper function to be able to list hierarchical equipment in a linear list (with appropriate keys for editing)
 * @param {Record<string, any>} eqts
 * @param {{ fn: (arg0: any, arg1: { data: any; }) => string; }} options
 * @param {number} level
 * @param {{ indent: any; key: string; count: any; }} data
 * @param {string=} parentkey
 * @param {{ equipment: { carried: Object; }; }|null} src
 */
function listeqtrecurse(eqts, options, level, data, parentkey = '', src = null) {
  if (!eqts) return ''
  let ret = ''
  let i = 0
  for (let key in eqts) {
    let eqt = eqts[key]
    if (data) {
      data.indent = level
      data.key = parentkey + key
      data.count = eqt.count
    }
    let display = true
    if (!!src && game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_REMOVE_UNEQUIPPED)) {
      // if an optional src is provided (which == actor.data.data) assume we are checking attacks to see if they are equipped
      recurselist(src.equipment.carried, e => {
        if (eqt.name.startsWith(e.name) && !e.equipped) display = false
      })
    }
    if (display) {
      let fragment = options.fn(eqt, { data: data })
      // if (!!eqt?.equipped) console.log(fragment)
      ret = ret + fragment
    }
    ret = ret + listeqtrecurse(eqt.contains, options, level + 1, data, parentkey + key + '.contains.')
  }
  return ret
}
GURPS.listeqtrecurse = listeqtrecurse

GURPS.whisperOtfToOwner = function (otf, overridetxt, event, blindcheck, actor) {
  if (!otf) return
  if (!game.user.isGM) {
    // If not the GM, just send the text to the chat input window (so the user can copy it)
    $(document)
      .find('#chat-message')
      .val('[' + otf + ']')
    return
  }
  otf = otf.replace(/ \(\)/g, '') // sent as "name (mode)", and mode is empty (only necessary for attacks)
  let canblind = false
  if (!!blindcheck) {
    canblind = blindcheck == true || blindcheck.hasOwnProperty('blindroll')
    // @ts-ignore - blindcheck is either boolean or an object with a blindroll property
    if (canblind && blindcheck.blindroll) {
      otf = '!' + otf
      canblind = false
    }
  }
  if (!!overridetxt) {
    if (overridetxt.includes('"')) overridetxt = "'" + overridetxt + "'"
    else overridetxt = '"' + overridetxt + '"'
  } else overridetxt = ''
  let users = actor?.getOwners()?.filter(u => !u.isGM) || []
  let botf = '[' + overridetxt + '!' + otf + ']'
  otf = '[' + overridetxt + otf + ']'

  /** @type Record<string, Dialog.Button> */
  let buttons = {}
  buttons.one = {
    icon: '<i class="fas fa-users"></i>',
    label: 'To Everyone',
    callback: () => GURPS.sendOtfMessage(otf, false),
  }
  if (canblind)
    buttons.two = {
      icon: '<i class="fas fa-users-slash"></i>',
      label: 'Blindroll to Everyone',
      callback: () => GURPS.sendOtfMessage(botf, true),
    }
  if (users.length > 0) {
    let nms = users.map(u => u.name).join(' ')
    buttons.three = {
      icon: '<i class="fas fa-user"></i>',
      label: 'Whisper to ' + nms,
      callback: () => GURPS.sendOtfMessage(otf, false, users),
    }
    if (canblind)
      buttons.four = {
        icon: '<i class="fas fa-user-slash"></i>',
        label: 'Whisper Blindroll to ' + nms,
        callback: () => GURPS.sendOtfMessage(botf, true, users),
      }
  }
  buttons.def = {
    icon: '<i class="far fa-copy"></i>',
    label: 'Copy to chat input',
    callback: () => {
      $(document).find('#chat-message').val(otf)
    },
  }

  let d = new Dialog(
    {
      title: "GM 'Send Formula'",
      content: `<div style='text-align:center'>How would you like to send the formula:<br><br><div style='font-weight:700'>${otf}<br>&nbsp;</div>`,
      buttons: buttons,
      default: 'def',
    },
    { width: 700 }
  )
  d.render(true)
}

GURPS.sendOtfMessage = function (content, blindroll, users = null) {
  /** @type {import('@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData').ChatMessageDataConstructorData} */
  let msgData = {
    content: content,
    user: game.user.id,
    blind: blindroll,
  }
  if (!!users) {
    msgData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
    msgData.whisper = users.map(it => it.id || '')
  } else {
    msgData.type = CONST.CHAT_MESSAGE_TYPES.OOC
  }
  ChatMessage.create(msgData)
}

GURPS.resolveDamageRoll = function (event, actor, otf, overridetxt, isGM, isOtf = false) {
  let title = game.i18n.localize('GURPS.RESOLVEDAMAGETitle')
  let prompt = game.i18n.localize('GURPS.RESOLVEDAMAGEPrompt')
  let quantity = game.i18n.localize('GURPS.RESOLVEDAMAGEQuantity')
  let sendTo = game.i18n.localize('GURPS.RESOLVEDAMAGESendTo')
  let multiple = game.i18n.localize('GURPS.RESOLVEDAMAGEMultiple')

  /** @type {Record<string,Dialog.Button>} */
  let buttons = {}

  if (isGM) {
    buttons.send = {
      icon: '<i class="fas fa-paper-plane"></i>',
      label: `${sendTo}`,
      callback: () => GURPS.whisperOtfToOwner(otf, overridetxt, event, false, actor), // Can't blind roll damages (yet)
    }
  }

  buttons.multiple = {
    icon: '<i class="fas fa-clone"></i>',
    label: `${multiple}`,
    callback: html => {
      // @ts-ignore
      let text = /** @type {string} */ (html.find('#number-rolls').val())
      let number = parseInt(text)
      let targets = []
      for (let index = 0; index < number; index++) {
        targets[index] = `${index + 1}`
      }
      if (isOtf) GURPS.handleGurpslink(event, actor, null, targets)
      else GURPS.handleRoll(event, actor, targets)
    },
  }

  let dlg = new Dialog({
    title: `${title}`,
    content: `
        <div style='display: flex; flex-flow: column nowrap; place-items: center;'>
          <p style='font-size: large;'><strong>${otf}</strong></p>
          <p>${prompt}</p>
          <div style='display: inline-grid; grid-template-columns: auto 1fr; place-items: center; gap: 4px'>
            <label>${quantity}</label>
            <input type='text' id='number-rolls' class='digits-only' style='text-align: center;' value='2'>
          </div>
          <p/>
        </div>
        `,
    buttons: buttons,
    default: 'send',
  })
  dlg.render(true)
}

GURPS.setInitiativeFormula = function (/** @type {boolean} */ broadcast) {
  let formula = /** @type {string} */ (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_INITIATIVE_FORMULA))
  if (!formula) {
    formula = Initiative.defaultFormula()
    if (game.user.isGM) game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_INITIATIVE_FORMULA, formula)
  }
  let m = formula.match(/([^:]*):?(\d)?/)
  let d = m && !!m[2] ? parseInt(m[2]) : 5
  CONFIG.Combat.initiative = {
    // @ts-ignore - technically, m could be null
    formula: m[1],
    decimals: d, // Important to be able to maintain resolution
  }
  if (broadcast && m)
    game.socket?.emit('system.gurps', {
      type: 'initiativeChanged',
      formula: m[1],
      decimals: d,
    })
}

GURPS.recurselist = recurselist

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once('init', async function () {
  console.log(GURPS.BANNER)
  console.log(`Initializing GURPS 4e Game Aid`)
  console.log(GURPS.LEGAL)

  let src = game.i18n.lang == 'pt_br' ? 'systems/gurps/icons/gurps4e-pt_br.webp' : 'systems/gurps/icons/gurps4e.webp'

  $('#logo').attr('src', src)

  // set up all hitlocation tables (must be done before MB)
  HitLocation.init()
  DamageChat.init()
  RegisterChatProcessors()
  GurpsActiveEffect.init()

  // Modifier Bucket must be defined after hit locations
  GURPS.ModifierBucket = new ModifierBucket()
  GURPS.ModifierBucket.render(true)

  GURPS.rangeObject = new GURPSRange()
  GURPS.initiative = new Initiative()
  GURPS.hitpoints = new HitFatPoints()
  GURPS.ConditionalInjury = new GURPSConditionalInjury()

  // Define custom Entity classes
  // @ts-ignore
  CONFIG.Actor.documentClass = GurpsActor
  CONFIG.Item.documentClass = GurpsItem

  // preload drag-and-drop image
  {
    let img = new Image()
    img.src = 'systems/gurps/icons/blood-splatter-clipart-small.webp'
    GURPS.damageDragImage = img
  }

  // LOAD ALL THE THINGS!!!
  {
    let img = new Image()
    img.src = 'systems/gurps/icons/all-the-things-transparent.webp'
    GURPS.allTheThingsImage = img
  }

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet)
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorCombatSheet, {
    label: 'Combat',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorEditorSheet, {
    label: 'Editor',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorSimplifiedSheet, {
    label: 'Simple',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorNpcSheet, {
    label: 'NPC/mini',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorNpcSheetCI, {
    label: 'NPC/mini Conditional Injury',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsInventorySheet, {
    label: 'Inventory Only',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorTabSheet, {
    label: 'Tabbed Sheet',
    makeDefault: false,
  })
  // @ts-ignore
  Actors.registerSheet('gurps', GurpsActorSheet, {
    // Add this sheet last
    label: 'Full (GCS)',
    makeDefault: true,
  })

  Items.unregisterSheet('core', ItemSheet)
  // @ts-ignore
  Items.registerSheet('gurps', GurpsItemSheet, { makeDefault: true })

  // Warning, the very first table will take a refresh before the dice to show up in the dialog.  Sorry, can't seem to get around that
  // @ts-ignore
  Hooks.on('createRollTable', async function (entity, options, userId) {
    await entity.update({ img: 'systems/gurps/icons/single-die.webp' })
    entity.data.img = 'systems/gurps/icons/single-die.webp'
  })

  // @ts-ignore
  Hooks.on('renderTokenHUD', (...args) => ManeuverHUDButton.prepTokenHUD(...args))

  // @ts-ignore
  Hooks.on('renderSidebarTab', async (app, html) => {
    if (app.options.id === 'compendium') {
      let button = $(
        '<button class="import-items"><i class="fas fa-file-import"></i>' +
          game.i18n.localize('GURPS.itemImport') +
          '</button>'
      )

      button.click(function () {
        setTimeout(async () => {
          new Dialog(
            {
              title: 'Import Item Compendium',
              // @ts-ignore
              content: await renderTemplate('systems/gurps/templates/item-import.html'),
              buttons: {
                import: {
                  icon: '<i class="fas fa-file-import"></i>',
                  label: 'Import',
                  callback: html => {
                    // @ts-ignore
                    const form = html.find('form')[0]
                    let files = form.data.files
                    // @ts-ignore
                    let file = null
                    if (!files.length) {
                      // @ts-ignore
                      return ui.notifications.error('You did not upload a data file!')
                    } else {
                      file = files[0]
                      console.log(file)
                      GURPS.readTextFromFile(file).then(text =>
                        ItemImporter.importItems(text, file.name.split('.').slice(0, -1).join('.'), file.path)
                      )
                    }
                  },
                },
                no: {
                  icon: '<i class="fas fa-times"></i>',
                  label: 'Cancel',
                },
              },
              default: 'import',
            },
            {
              width: 400,
            }
          ).render(true)
        }, 200)
      })

      html.find('.directory-footer').append(button)
    }
  })
})

Hooks.once('ready', async function () {
  // reset the TokenHUD to our version
  // @ts-ignore
  canvas.hud.token = new GURPSTokenHUD()

  initializeDamageTables()
  ResourceTrackerManager.initSettings()
  HitLocation.ready()

  if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_3D6))
    new ThreeD6({
      popOut: false,
      minimizable: false,
      resizable: false,
      id: 'ThreeD6',
      template: 'systems/gurps/templates/threed6.html',
      classes: [],
    }).render(true)

  // @ts-ignore
  GURPS.currentVersion = SemanticVersion.fromString(game.system.data.version)
  // Test for migration
  let mv = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION)
  let quiet = false
  if (!mv) {
    mv = '0.0.1'
    quiet = true
  }
  // @ts-ignore
  console.log('Current Version: ' + GURPS.currentVersion + ', Migration version: ' + mv)
  const migrationVersion = SemanticVersion.fromString(mv)
  // @ts-ignore
  if (migrationVersion.isLowerThan(GURPS.currentVersion)) {
    // check which migrations are needed
    // @ts-ignore
    if (migrationVersion.isLowerThan(Settings.VERSION_096)) await Migration.migrateTo096(quiet)
    // @ts-ignore
    if (migrationVersion.isLowerThan(Settings.VERSION_097)) await Migration.migrateTo097(quiet)
    // @ts-ignore
    if (migrationVersion.isLowerThan(Settings.VERSION_0104)) await Migration.migrateTo0104(quiet)

    game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION, game.system.data.version)
  }

  // Show changelog
  const v = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_CHANGELOG_VERSION) || '0.0.1'
  const changelogVersion = SemanticVersion.fromString(v)

  // @ts-ignore
  if (GURPS.currentVersion.isHigherThan(changelogVersion)) {
    // @ts-ignore
    if ($(ui.chat.element).find('#GURPS-LEGAL').length == 0)
      // If it isn't already in the chat log somewhere
      ChatMessage.create({
        content: `
<div id="GURPS-LEGAL" style='font-size:85%'>${game.system.data.title}</div>
<hr>
<div style='font-size:70%'>
  <div>${game.i18n.localize('GURPS.copyrightGURPS')}</div>
  <hr/>
  <div style='text-align: center;'>
    <div style="margin-bottom: 5px;">Like our work? Consider supporting us:</div>
    <iframe src="https://github.com/sponsors/crnormand/button" title="Sponsor crnormand" height="35" width="116" style="border: 0;"></iframe>
    <div><a href="https://ko-fi.com/crnormand"><img height="24" src="systems/gurps/icons/SupportMe_stroke@2x.webp"></a></div>
  </div>
</div>`,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        // @ts-ignore
        whisper: [game.user],
      })
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CHANGELOG)) {
      const app = new ChangeLogWindow(changelogVersion)
      app.render(true)
      // @ts-ignore
      game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_CHANGELOG_VERSION, GURPS.currentVersion.toString())
    }
  }

  // get all aliases defined in the resource tracker templates and register them as damage types
  let resourceTrackers = ResourceTrackerManager.getAllTemplates()
    .filter(it => !!it.tracker.isDamageType)
    .filter(it => !!it.tracker.alias)
    .map(it => it.tracker)
  resourceTrackers.forEach(it => (DamageTables.damageTypeMap[it.alias] = it.alias))
  resourceTrackers.forEach(
    it =>
      (DamageTables.woundModifiers[it.alias] = {
        multiplier: 1,
        label: it.name,
        resource: true,
      })
  )

  // @ts-ignore
  Hooks.on('hotbarDrop', async (bar, data, slot) => {
    console.log(data)
    // @ts-ignore
    if (!data.otf && !data.bucket) return
    // @ts-ignore
    let otf = data.otf || data.bucket
    otf = otf.split('\\').join('\\\\') // must double backslashes since this is a 'script' macro
    let cmd = ''
    // @ts-ignore
    if (!!data.bucket)
      cmd += `GURPS.ModifierBucket.clear()
`
    cmd += 'GURPS.executeOTF(`' + otf + '`)' // Surround OTF in backticks... to allow single and double quotes in OtF
    let name = otf
    // @ts-ignore
    if (!!data.displayname) name = data.displayname
    // @ts-ignore
    if (!!data.actor) {
      cmd =
        // @ts-ignore
        `GURPS.SetLastActor(game.actors.get('${data.actor}'))
` + cmd
      // @ts-ignore
      name = game.actors.get(data.actor).name + ': ' + name
    }
    let macro = await Macro.create({
      name: name,
      type: 'script',
      command: cmd,
    })
    // @ts-ignore
    game.user.assignHotbarMacro(macro, slot)
    return false
  })

  // @ts-ignore
  Hooks.on('renderCombatTracker', function (a, html, c) {
    // use class 'bound' to know if the drop event is already bound
    if (!html.hasClass('bound')) {
      if (game.user.isGM) {
        let cc = html.find('.combatant-controls')
        cc.prepend(
          '<a class="combatant-control" title="<1/3 FP" data-onethird="isTired"><i class="fas fa-heartbeat"></i></a>'
        )
        cc.prepend(
          '<a class="combatant-control" title="<1/3 HP" data-onethird="isReeling"><i class="fas fa-heart-broken"></i></a>'
        )

        let t = html.find('[data-onethird]')
        for (let i = 0; i < t.length; i++) {
          let el = t[i]
          let combatant = $(el).parents('.combatant').attr('data-combatant-id')
          // @ts-ignore
          let target = game.combat.combatants.filter(c => c.id === combatant)[0]
          // @ts-ignore
          if (!!target.actor?.data.data.additionalresources[$(el).attr('data-onethird')]) $(el).addClass('active')
        }

        // @ts-ignore
        html.find('[data-onethird]').on('click', ev => {
          let el = ev.currentTarget
          let flag = false
          if ($(el).hasClass('active')) $(el).removeClass('active')
          else {
            $(el).addClass('active')
            flag = true
          }
          let combatant = $(el).parents('.combatant').attr('data-combatant-id')
          // @ts-ignore
          let target = game.combat.combatants.filter(c => c.id === combatant)[0]
          // @ts-ignore
          target.actor.changeOneThirdStatus($(el).attr('data-onethird'), flag)
        })
      }
      html.addClass('bound')
      // @ts-ignore
      html.on('drop', function (ev) {
        console.log('Handle drop event on combatTracker')
        ev.preventDefault()
        ev.stopPropagation()
        let elementMouseIsOver = document.elementFromPoint(ev.clientX, ev.clientY)

        // @ts-ignore
        let combatant = $(elementMouseIsOver).parents('.combatant').attr('data-combatant-id')
        // @ts-ignore
        let target = game.combat.combatants.filter(c => c.id === combatant)[0]

        let event = ev.originalEvent
        let dropData = JSON.parse(event.dataTransfer.getData('text/plain'))
        if (dropData.type === 'damageItem') {
          // @ts-ignore
          target.actor.handleDamageDrop(dropData.payload)
        }
      })
    }
  })

  // @ts-ignore
  game.socket.on('system.gurps', resp => {
    if (resp.type == 'updatebucket') {
      if (resp.users.includes(game.user.id)) GURPS.ModifierBucket.updateModifierBucket(resp.bucket)
    }
    if (resp.type == 'initiativeChanged') {
      CONFIG.Combat.initiative = {
        formula: resp.formula,
        decimals: resp.decimals,
      }
    }
    if (resp.type == 'executeOtF') {
      // @ts-ignore
      if (game.users.isGM || (resp.users.length > 0 && !resp.users.includes(game.user.name))) return
      // @ts-ignore
      GURPS.performAction(resp.action, GURPS.LastActor)
    }
    if (resp.type == 'setLastTargetedRoll') {
      GURPS.setLastTargetedRoll(resp.chatdata, resp.actorid, resp.tokenid, false)
    }
    if (resp.type == 'dragEquipment1') {
      if (resp.destuserid != game.user.id) return
      // @ts-ignore
      let destactor = game.actors.get(resp.destactorid)
      // @ts-ignore
      let srcActor = game.actors.get(resp.srcactorid)
      Dialog.confirm({
        // @ts-ignore
        title: `Gift for ${destactor.name}!`,
        // @ts-ignore
        content: `<p>${srcActor.name} wants to give you ${resp.itemData.name} (${resp.count}),</p><br>Ok?`,
        yes: () => {
          // @ts-ignore
          let destKey = destactor._findEqtkeyForId('globalid', resp.itemData.data.globalid)
          if (!!destKey) {
            // already have some
            // @ts-ignore
            let destEqt = getProperty(destactor.data, destKey)
            // @ts-ignore
            destactor.updateEqtCount(destKey, destEqt.count + resp.count)
          } else {
            resp.itemData.data.equipped = true
            // @ts-ignore
            destactor.addNewItemData(resp.itemData)
          }
          // @ts-ignore
          game.socket.emit('system.gurps', {
            type: 'dragEquipment2',
            srckey: resp.srckey,
            srcuserid: resp.srcuserid,
            srcactorid: resp.srcactorid,
            destactorid: resp.destactorid,
            itemname: resp.itemData.name,
            count: resp.count,
          })
        },
        no: () => {
          // @ts-ignore
          game.socket.emit('system.gurps', {
            type: 'dragEquipment3',
            srcuserid: resp.srcuserid,
            destactorid: resp.destactorid,
            itemname: resp.itemData.name,
          })
        },
      })
    }
    if (resp.type == 'dragEquipment2') {
      if (resp.srcuserid != game.user.id) return
      // @ts-ignore
      let srcActor = game.actors.get(resp.srcactorid)
      // @ts-ignore
      let eqt = getProperty(srcActor.data, resp.srckey)
      if (resp.count >= eqt.count) {
        // @ts-ignore
        srcActor.deleteEquipment(resp.srckey)
      } else {
        // @ts-ignore
        srcActor.updateEqtCount(resp.srckey, eqt.count - resp.count)
      }
      // @ts-ignore
      let destActor = game.actors.get(resp.destactorid)
      // @ts-ignore
      ui.notifications.info(`${destActor.name} accepted ${resp.itemname}`)
    }
    if (resp.type == 'dragEquipment3') {
      if (resp.srcuserid != game.user.id) return
      // @ts-ignore
      let destActor = game.actors.get(resp.destactorid)
      // @ts-ignore
      ui.notifications.info(`${destActor.name} did not want ${resp.itemname}`)
    }
  })

  // Keep track of which token has been activated, so we can determine the last actor for the Modifier Bucket
  // @ts-ignore
  Hooks.on('controlToken', (...args) => {
    if (GURPS.IgnoreTokenSelect) return
    if (args.length > 1) {
      let a = args[0]?.actor
      if (!!a) {
        if (args[1]) GURPS.SetLastActor(a)
        else GURPS.ClearLastActor(a)
      }
    }
  })

  GurpsJournalEntry.ready()

  // define Handlebars partials for ADD:
  const __dirname = 'systems/gurps/templates'
  loadTemplates([
    __dirname + '/apply-damage/effect-blunttrauma.html',
    __dirname + '/apply-damage/effect-crippling.html',
    __dirname + '/apply-damage/effect-headvitalshit.html',
    __dirname + '/apply-damage/effect-knockback.html',
    __dirname + '/apply-damage/effect-majorwound.html',
    __dirname + '/apply-damage/effect-shock.html',
  ])
  // @ts-ignore
  GURPS.setInitiativeFormula()

  //Add support for the Drag Ruler module: https://foundryvtt.com/packages/drag-ruler
  Hooks.once('dragRuler.ready', SpeedProvider => {
    class GURPSSpeedProvider extends SpeedProvider {
      get colors() {
        return [
          { id: 'walk', default: 0x00ff00, name: 'GURPS.dragrulerWalk' },
          { id: 'sprint', default: 0xffff00, name: 'GURPS.dragrulerSprint' },
          { id: 'fly', default: 0xff8000, name: 'GURPS.dragrulerFly' },
        ]
      }

      /**
       * @param {GurpsToken} token
       */
      getRanges(token) {
        const baseMove = token.actor.data.data.currentmove

        // A character can always walk it's base speed and sprint at 1.2X
        const ranges = [
          { range: baseMove, color: 'walk' },
          { range: Math.floor(baseMove * 1.2), color: 'sprint' },
        ]

        // Character is showing flight move
        if (!!token.actor.data.data.additionalresources.showflightmove)
          ranges.push({ range: token.actor.data.data.currentflight, color: 'fly' })
        return ranges
      }
    }

    dragRuler.registerSystem('gurps', GURPSSpeedProvider)
  })

  // Translate attribute mappings if not in English
  if (game.i18n.lang != 'en') {
    console.log('Mapping ' + game.i18n.lang + ' translations into PARSELINK_MAPPINGS')
    let mappings = /** @type {Record<String, string>} */ ({})
    for (let k in GURPS.PARSELINK_MAPPINGS) {
      let v = GURPS.PARSELINK_MAPPINGS[k]
      let i = v.indexOf('.value')
      let nk = v
      if (i >= 0) {
        nk = nk.substr(0, i)
      }
      nk = nk.replace(/\./g, '') // remove periods
      nk = game.i18n.localize('GURPS.' + nk).toUpperCase()
      if (!GURPS.PARSELINK_MAPPINGS[nk]) {
        console.log(`Mapping '${k}' -> '${nk}'`)
        mappings[nk] = GURPS.PARSELINK_MAPPINGS[k]
      }
    }
    mappings = { ...mappings, ...GURPS.PARSELINK_MAPPINGS }
    GURPS.PARSELINK_MAPPINGS = mappings
  }

  // This system setting must be built AFTER all of the character sheets have been registered
  let sheets = /** @type {Record<string,string>} */ ({})
  Object.values(CONFIG.Actor.sheetClasses['character']).forEach(e => {
    if (e.id.toString().startsWith(Settings.SYSTEM_NAME) && e.id != 'gurps.GurpsActorSheet') sheets[e.label] = e.label
  })
  game.settings.register(Settings.SYSTEM_NAME, Settings.SETTING_ALT_SHEET, {
    name: i18n('GURPS.settingSheetDetail'),
    hint: i18n('GURPS.settingHintSheetDetail'),
    scope: 'world',
    config: true,
    type: String,
    choices: sheets,
    default: 'Tabbed Sheet',
    onChange: value => console.log(`${Settings.SETTING_ALT_SHEET}: ${value}`),
  })

  GurpsToken.ready()
  // End of system "READY" hook.
})
