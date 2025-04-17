// Import Modules
import { ChangeLogWindow } from '../lib/change-log.js'
import { Migration } from '../lib/migration.js'
import { COSTS_REGEX, parseForRollOrDamage, parselink, PARSELINK_MAPPINGS } from '../lib/parselink.js'
import { SemanticVersion } from '../lib/semver.js'
import {
  arrayToObject,
  atou,
  d6ify,
  makeRegexPatternFrom,
  objectToArray,
  quotedAttackName,
  recurselist,
  sanitize,
  utoa,
  wait,
  zeroFill,
} from '../lib/utilities.js'
import RegisterChatProcessors from '../module/chat/chat-processors.js'
import {
  GurpsActorCombatSheet,
  GurpsActorEditorSheet,
  GurpsActorNpcSheet,
  GurpsActorSheet,
  GurpsActorSheetReduced,
  GurpsActorSimplifiedSheet,
  GurpsActorTabSheet,
  GurpsInventorySheet,
} from './actor/actor-sheet.js'
import { GurpsActor } from './actor/actor.js'
import ManeuverHUDButton from './actor/maneuver-button.js'
import { ResourceTrackerManager } from './actor/resource-tracker-manager.js'
import { DamageTable } from './damage/damage-tables.js'
import { addBucketToDamage, doRoll } from './dierolls/dieroll.js'
import TriggerHappySupport from './effects/triggerhappy.js'
import { AddImportEquipmentButton } from './item-import.js'
import { GurpsItemSheet } from './item-sheet.js'
import { GurpsItem } from './item.js'
import GurpsJournalEntry from './journal.js'
import { ModifierBucket } from './modifier-bucket/bucket-app.js'
import { handlePdf, SJGProductMappings } from './pdf-refs.js'
import GURPSTokenHUD from './token-hud.js'

/**
 * /dded to color the rollable parts of the character sheet.
 * Made this part eslint compatible...
 * ~Stevil
 */
import { registerColorPickerSettings } from '../module/color-character-sheet/color-character-sheet-settings.js'
import { colorGurpsActorSheet } from '../module/color-character-sheet/color-character-sheet.js'

import HitFatPoints from '../lib/hitpoints.js'
import Initiative from '../lib/initiative.js'
import { GURPSRange, RulerGURPS, setupRanges } from '../lib/ranges.js'
import DamageChat from './damage/damagechat.js'

import JQueryHelpers from '../lib/jquery-helper.js'
import * as Settings from '../lib/miscellaneous-settings.js'
import MoustacheWax, { findTracker } from '../lib/moustachewax.js'
import AddChatHooks from './chat.js'

import { initialize_i18nHelper, translate } from '../lib/i18n.js'
import { parseDecimalNumber } from '../lib/parse-decimal-number/parse-decimal-number.js'
import { GGADebugger } from '../utils/debugger.js'
import { EffectModifierControl } from './actor/effect-modifier-control.js'
import Maneuvers from './actor/maneuver.js'
import { AddMultipleImportButton } from './actor/multiple-import-app.js'
import { addManeuverListeners, addManeuverMenu } from './combat-tracker/maneuver-menu.js'
import { addQuickRollButton, addQuickRollListeners } from './combat-tracker/quick-roll-menu.js'
import ApplyDamageDialog from './damage/applydamage.js'
import GurpsActiveEffectConfig from './effects/active-effect-config.js'
import GurpsActiveEffect from './effects/active-effect.js'
import { StatusEffect } from './effects/effects.js'
import { GlobalActiveEffectDataControl } from './effects/global-active-effect-data-manager.js'
import GurpsWiring from './gurps-wiring.js'
import { HitLocation } from './hitlocation/hitlocation.js'
import GURPSConditionalInjury from './injury/foundry/conditional-injury.js'
import { PDFEditorSheet } from './pdf/edit.js'
import { JournalEntryPageGURPS } from './pdf/index.js'
import * as GURPSSpeedProvider from './speed-provider.js'
import { TokenActions } from './token-actions.js'
import GurpsToken from './token.js'
import { allowOtfExec } from './utilities/allow-otf-exec.js'
import { multiplyDice } from './utilities/damage-utils.js'
import { gurpslink } from './utilities/gurpslink.js'
import { ClearLastActor, SetLastActor } from './utilities/last-actor.js'

let GURPS = undefined

async function rollDamage(canRoll, token, actor, displayFormula, actionFormula, action, event, overrideText, targets) {
  const showRollDialog = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)
  if (showRollDialog && !canRoll.isSlam) {
    // Get Actor Info
    const gmUser = game.users.find(it => it.isGM && it.active)
    const tokenImg = token?.document.texture.src || actor?.img || gmUser.avatar
    const isVideo = tokenImg?.includes('webm') || tokenImg?.includes('mp4')
    const tokenName = token?.name || actor?.name || gmUser.name
    const damageRoll = displayFormula
    const damageType = GURPS.DamageTables.translate(action.damagetype)
    const damageTypeLabel = game.i18n.localize(
      `GURPS.damageTypes.${GURPS.DamageTables.woundModifiers[damageType]?.label}`,
      damageType
    )
    const damageTypeIcon = GURPS.DamageTables.woundModifiers[damageType]?.icon || '<i class="fas fa-dice-d6"></i>'
    const damageTypeColor = GURPS.DamageTables.woundModifiers[damageType]?.color || '#772e21'
    const targetRoll = action.orig
    const bucketTotal = GURPS.ModifierBucket.currentSum()
    const bucketRoll = bucketTotal !== 0 ? `(${bucketTotal > 0 ? '+' : ''}${bucketTotal})` : ''
    const bucketRollColor = bucketTotal > 0 ? 'darkgreen' : bucketTotal < 0 ? 'darkred' : '#a8a8a8'
    const isBlindRoll = action.blindroll
    const useMinDamage = displayFormula.includes('!') && !displayFormula.startsWith('!')
    // Armor divisor can be (0.5) or (2) - need to regex to get the number
    const armorDivisorRegex = /\((\d*\.?\d+)\)/
    const armorDivisorNumber = action.extdamagetype?.match(armorDivisorRegex)?.[1]
    // Multiplier damage is x2, X3 or *4 - need to regex to get the number
    const multiplierRegex = /(?<=[xX*])\d+(\.\d+)?/
    const multiplierNumber = displayFormula.match(multiplierRegex)?.[0]
    // Simple formula is dice+add, examples: 1d, 2d+3, 1d-1
    const simpleFormula = displayFormula.match(/\d+d[+-]?\d*/)?.[0]
    const originalFormula = action.formula.match(/\d+d[+-]?\d*/)?.[0]
    const damageCost = action.costs?.split(' ').pop() || ''
    //const otfDamageText = action.overridetxt || ''
    const otfDamageText = !!action.overridetxt && action.overridetxt !== action.formula ? action.overridetxt : ''
    const usingDiceAdd = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS)

    // Before open a new dialog, we need to make sure
    // all other dialogs are closed, because bucket must be reset
    // before we start a new roll

    // TODO The problem with this is that when we are opening one Confirmation Roll Dialog immediately after
    // another, the first one may still be open, and clicking the Cancel button sets stopActions to true, which
    // prevents the second dialog from opening.
    // await cancelButton.click().promise()

    // If there is a cancel button, a dialog is already open.
    if ($(document).find('.dialog-button.cancel').length > 0) {
      // Wait for the dialog to close.
      await new Promise(resolve => setTimeout(resolve, 500))
      // If there still is a cancel button, click it.
      for (const button of $(document).find('.dialog-button.cancel')) {
        console.log('clicking cancel button')
        await button.click()
      }
    }

    await new Promise(async resolve => {
      const dialog = await new foundry.applications.api.DialogV2({
        window: {
          title: game.i18n.localize('GURPS.confirmRoll'),
          resizable: true,
        },
        position: {
          height: 'auto',
        },
        content: await renderTemplate('systems/gurps/templates/confirmation-damage-roll.hbs', {
          tokenImg,
          tokenName,
          damageRoll: simpleFormula || damageRoll,
          damageType,
          targetRoll,
          bucketRoll,
          messages: canRoll.targetMessage ? [canRoll.targetMessage] : [],
          useMinDamage,
          armorDivisorNumber,
          multiplierNumber,
          damageTypeLabel,
          damageTypeIcon,
          damageTypeColor,
          simpleFormula,
          bucketRollColor,
          originalFormula,
          damageCost,
          isVideo,
          otfDamageText,
          usingDiceAdd,
        }),
        buttons: [
          {
            action: 'roll',
            icon: isBlindRoll ? 'fas fa-eye-slash' : 'fas fa-dice',
            label: isBlindRoll ? 'GURPS.blindRoll' : 'GURPS.roll',
            default: true,
            callback: async (event, button, dialog) => {
              await DamageChat.create(
                actor || game.user,
                actionFormula,
                action.damagetype,
                event,
                overrideText,
                targets,
                action.extdamagetype,
                action.hitlocation
              )
              if (action.next) {
                return resolve(await GURPS.performAction(action.next, actor, event, targets))
              }
              resolve(true)
            },
          },
          {
            action: 'cancel',
            icon: 'fas fa-times',
            label: 'GURPS.cancel',
            callback: async (event, button, dialog) => {
              await GURPS.ModifierBucket.clear()
              GURPS.stopActions = true
              resolve(false)
            },
          },
        ],
      }).render({ force: true })
    })
  } else {
    await DamageChat.create(
      actor || game.user,
      actionFormula,
      action.damagetype,
      event,
      overrideText,
      targets,
      action.extdamagetype,
      action.hitlocation
    )
    if (action.next) {
      return await GURPS.performAction(action.next, actor, event, targets)
    }
    return true
  }
}

if (!globalThis.GURPS) {
  GURPS = {}
  globalThis.GURPS = GURPS // Make GURPS global!
  GURPS.DEBUG = true
  GURPS.stopActions = false
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

  if (GURPS.DEBUG) {
    GURPS.parseDecimalNumber = parseDecimalNumber
  }

  AddChatHooks()
  JQueryHelpers()
  MoustacheWax()
  Settings.initializeSettings()
  GURPS.EffectModifierControl = new EffectModifierControl()
  GURPS.GlobalActiveEffectDataControl = new GlobalActiveEffectDataControl()

  //CONFIG.debug.hooks = true;

  // Expose Maneuvers to make them easier to use in modules
  GURPS.Maneuvers = Maneuvers

  // Use the target d6 icon for rolltable entries
  //CONFIG.RollTable.resultIcon = 'systems/gurps/icons/single-die.webp'
  CONFIG.time.roundTime = 1

  GURPS.StatusEffect = new StatusEffect()

  // Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
  GURPS.LastActor = null
  GURPS.SJGProductMappings = SJGProductMappings
  GURPS.clearActiveEffects = GurpsActiveEffect.clearEffectsOnSelectedToken

  // TODO Any functions that do not directly access Foundry code or other modules should be moved to separate file(s) to allow testing.

  GURPS.SetLastActor = SetLastActor
  GURPS.ClearLastActor = ClearLastActor

  /**
   * This object literal holds the results of the last targeted roll by an actor.
   * The property key is the actor's ID. The value is literally the chatdata from
   * the doRoll() function, which has close to anything anyone would want.
   * The same logic applies to actor injuries, but using the Actor Id and Message Id
   */
  GURPS.lastTargetedRoll = {}
  GURPS.lastTargetedRolls = {} // mapped by both actor and token id
  GURPS.lastInjuryRoll = {}
  GURPS.lastInjuryRolls = {} // mapped by actor and message id

  GURPS.setLastTargetedRoll = function (chatdata, actorid, tokenid, updateOtherClients = false) {
    let tmp = { ...chatdata, actorid, tokenid }
    if (!!actorid) GURPS.lastTargetedRolls[actorid] = tmp
    if (!!tokenid) GURPS.lastTargetedRolls[tokenid] = tmp
    GURPS.lastTargetedRoll = tmp // keep the local copy
    // Interesting fields: GURPS.lastTargetedRoll.margin .isCritSuccess .IsCritFailure .thing

    if (updateOtherClients)
      game.socket.emit('system.gurps', {
        type: 'setLastTargetedRoll',
        chatdata: tmp,
        actorid: actorid,
        tokenid: tokenid,
      })
  }

  // TODO Why are these global?  Because they are used as semaphores for certain multithreaded processes
  GURPS.ChatCommandsInProcess = [] // Taking advantage of synchronous nature of JS arrays
  GURPS.PendingOTFs = []
  GURPS.IgnoreTokenSelect = false

  GURPS.wait = wait

  GURPS.attributepaths = {
    ST: 'attributes.ST.value',
    DX: 'attributes.DX.value',
    IQ: 'attributes.IQ.value',
    HT: 'attributes.HT.value',
    QN: 'attributes.QN.value',
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
    QN: 'GURPS.attributesQN',
    Will: 'GURPS.attributesWILL',
    Per: 'GURPS.attributesPER',
  }

  GURPS.attributeNames = {
    ST: 'GURPS.attributesSTNAME',
    DX: 'GURPS.attributesDXNAME',
    IQ: 'GURPS.attributesIQNAME',
    HT: 'GURPS.attributesHTNAME',
    QN: 'GURPS.attributesQNNAME',
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

    'QN/E': 'GURPS.SkillQNE',
    'QN/A': 'GURPS.SkillQNA',
    'QN/H': 'GURPS.SkillQNH',
    'QN/VH': 'GURPS.SkillQNVH',

    'Will/E': 'GURPS.SkillWillE',
    'Will/A': 'GURPS.SkillWillA',
    'Will/H': 'GURPS.SkillWillH',
    'Will/VH': 'GURPS.SkillWillVH',

    'Per/E': 'GURPS.SkillPerE',
    'Per/A': 'GURPS.SkillPerA',
    'Per/H': 'GURPS.SkillPerH',
    'Per/VH': 'GURPS.SkillPerVH',
  }

  GURPS.PARSELINK_MAPPINGS = PARSELINK_MAPPINGS
  GURPS.SJGProductMappings = SJGProductMappings
  GURPS.USER_GUIDE_URL = 'https://bit.ly/2JaSlQd'
  GURPS.findTracker = findTracker

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
      reader.onload = _ev => {
        resolve(reader.result)
      }
      // @ts-ignore
      reader.onerror = _ev => {
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
          let t3 = xml.substring(e + 4)
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

  // Needed for external modules like Token Action HUD and Nordlond Bestiary
  GURPS.gurpslink = gurpslink

  /**
   * @param {string} string
   * @param {boolean} priv
   * @param {JQuery.Event|null} event
   * @returns {Promise<boolean>}
   */
  async function executeOTF(inputstring, priv = false, event = null, actor = null) {
    if (!inputstring) return false
    inputstring = inputstring.trim()
    if (inputstring[0] == '[' && inputstring[inputstring.length - 1] == ']')
      inputstring = inputstring.substring(1, inputstring.length - 1)

    // Stop splitting on double backslashes. This breaks when you have nested /chat commands, the inner ones with double backslashes.
    // Example: /if [ST] s:{/r [+@margin Successful ST roll]\\/r [Sk:"Forced Entry"]} cs:{...}]}
    // let strings = inputstring.split('\\\\')
    let strings = [inputstring]
    let answer = false
    for (let string of strings) {
      string = string.trim()
      let action = parselink(string)
      answer = false
      if (!!action.action) {
        if (!event) event = { shiftKey: priv, ctrlKey: false, data: {} }
        let result = await GURPS.performAction(action.action, actor || GURPS.LastActor, event)
        answer = !!result
      } else ui.notifications.warn(`"${string}" did not parse into a valid On-the-Fly formula`)
    }
    return answer
  }
  GURPS.executeOTF = executeOTF

  function processSkillSpell({ action, actor }) {
    let actordata = actor?.system

    // skill
    var skill
    if (!!action.target) {
      // Skill-12
      skill = {
        name: action.name,
        // @ts-ignore
        level: parseInt(action.target),
      }
    }
    // @ts-ignore
    else skill = GURPS.findSkillSpell(actor?.system, action.name, !!action.isSkillOnly, !!action.isSpellOnly)
    if (!skill) {
      return 0
    }
    let skillLevel = skill.level
    // @ts-ignore
    action.obj = skill

    // on a floating skill check, we want the skill with the highest relative skill level
    if (!!action.floatingAttribute) {
      if (!!actor) {
        let value = foundry.utils.getProperty(actordata, action.floatingAttribute)
        let rsl = skill.relativelevel //  this is something like 'IQ-2' or 'Touch+3'
        let valueText = rsl.replace(/^.*([+-]\d+)$/g, '$1')
        skillLevel = valueText === rsl ? parseInt(value) : parseInt(valueText) + parseInt(value)
      } else {
        ui.notifications?.warn('You must have a character selected to use a "Based" Skill')
      }
    }

    //if (!!action.mod) skillLevel += parseInt(action.mod)

    return skillLevel
  }

  const actionFuncs = {
    /**
     * @param {Object} data
     * @param {Object} data.action
     * @param {string} data.action.link
     */
    pdf({ action }) {
      if (!action.link) {
        ui.notifications?.warn('no link was parsed for the pdf')
        return false // if there's no link action fails
      }
      handlePdf(action.link)
      return true
    },

    //
    iftest({ action }) {
      if (!GURPS.lastTargetedRoll) return false
      if (action.name == 'isCritSuccess') return !!GURPS.lastTargetedRoll.isCritSuccess
      if (action.name == 'isCritFailure') return !!GURPS.lastTargetedRoll.isCritFailure
      if (!action.equation)
        // if [@margin] tests for >=0
        return GURPS.lastTargetedRoll.margin >= 0
      else {
        let m = action.equation.match(/ *([=<>]+) *([+-]?[\d\.]+)/)
        let value = Number(m[2])
        switch (m[1]) {
          case '=':
          case '==':
            return GURPS.lastTargetedRoll.margin == value
          case '>':
            return GURPS.lastTargetedRoll.margin > value
          case '>=':
            return GURPS.lastTargetedRoll.margin >= value
          case '<':
            return GURPS.lastTargetedRoll.margin < value
          case '<=':
            return GURPS.lastTargetedRoll.margin <= value
          default:
            return false
        }
      }
    },

    /**
     * @param {Object} data
     * @param {Object} data.action
     * @param {string} data.action.mod
     * @param {string} data.action.desc
     * @param {Object} data.action.next
     */
    modifier({ action }) {
      GURPS.ModifierBucket.addModifier(action.mod, action.desc)
      if (action.next && action.next.type === 'modifier') {
        return this.modifier({ action: action.next }) // recursion, but you need to wrap the next action in an object using the 'action' attribute
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
    async chat({ action, actor, event }) {
      // @ts-ignore
      const chat = `/setEventFlags ${!!action.quiet} ${!!event?.shiftKey} ${game.keyboard.isModifierActive(
        KeyboardManager.MODIFIER_KEYS.CONTROL
      )}\n${action.orig}`

      if (!!action.overridetxt) {
        if (!event.data) event.data = {}
        event.data.overridetxt = action.overridetxt
      }
      let savedActor = GURPS.LastActor
      if (actor) GURPS.SetLastActor(actor) // try to ensure the correct last actor.
      // @ts-ignore - someone somewhere must have added chatmsgData to the MouseEvent.
      let ret = await GURPS.ChatProcessors.startProcessingLines(chat, event?.chatmsgData, event)
      if (savedActor) GURPS.SetLastActor(savedActor)
      return ret
    },
    /**
     * @param {Object} data
     * @param {Object} data.action
     * @param {string} data.action.link
     * @param {string} data.action.id
     */
    dragdrop({ action }) {
      switch (action.link) {
        case 'JournalEntry':
          let j = game.journal?.get(action.id)
          if (j) j.sheet?.render(true)
          return true
        case 'JournalEntryPage':
          Journal._showEntry(action.id)
          return true
        case 'Actor':
          game.actors?.get(action.id)?.sheet?.render(true)
          return true
        case 'RollTable':
          game.tables?.get(action.id)?.sheet?.render(true)
          return true
        case 'Item':
          game.items?.get(action.id)?.sheet?.render(true)
          return true
        default:
          ui.notifications.warn(`unknown entity type: ${action.link}`)
          return false
      }
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.mod
     * @param {string} data.action.desc
     * @param {string} data.action.formula
     * @param {string} data.action.damagetype
     * @param {string} data.action.extdamagetype
     * @param {string} data.action.hitlocation
     * @param {string} data.action.costs
     * @param {boolean} data.action.accumulate
     *
     * @param {JQuery.Event|null} data.event
     * @param {GurpsActor|null} data.actor
     * @param {string[]} data.targets
     */
    async damage({ action, event, actor, targets }) {
      // accumulate action fails if there's no selected actor
      if (action.accumulate && !actor) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }

      let canRoll = { result: true }
      const token = actor?.getActiveTokens()?.[0] || canvas.tokens.controlled[0]
      if (actor) canRoll = await actor.canRoll(action, token)
      if (!canRoll.canRoll) {
        if (canRoll.targetMessage) {
          ui.notifications?.warn(canRoll.targetMessage)
          return false
        }
      }

      if (action.accumulate) {
        // store/increment value on GurpsActor
        await actor.accumulateDamageRoll(action)
        return true
      }

      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)

      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc) // special case where Damage comes from [D:attack + mod]

      const taggedSettings = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      let displayFormula = action.formula
      if (actor && taggedSettings.autoAdd) {
        await actor.addTaggedRollModifiers('', {}, action.att)
        displayFormula = addBucketToDamage(displayFormula, false)
      }
      return await rollDamage(canRoll, token, actor, displayFormula, action.formula, action, event, null, targets)
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
     * @param {boolean} data.action.accumulate
     *
     * @param {JQuery.Event|null} data.event
     * @param {GurpsActor|null} data.actor
     * @param {string[]} data.targets
     */
    async deriveddamage({ action, event, actor, targets }) {
      // action fails if there's no selected actor
      if (!actor) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      let df = action.derivedformula.match(/sw/i) ? actor.system.swing : actor.system.thrust
      // action fails if there's no formula
      if (!df) {
        ui.notifications?.warn(`${actor.name} does not have a ${action.derivedformula.toUpperCase()} formula`)
        return false
      }
      // Here we need to check if both formula and df contains +add (like +1)
      // If so, we need to sum the adds
      const dice = df.match(/(\d+d).*/)?.[1]
      const dfAdd = df.match(/([+-]\d+).*/)?.[1]
      const formulaAdd = action.formula.match(/([+-]\d+).*/)?.[1]
      // Need to find everything else in action.formula which is not the formulaAdd. Example +2x3 -> x3
      const formulaOther = action.formula.replace(/([+-]\d+).*/g, '')
      let finalAdd
      let formula
      if (dfAdd && formulaAdd) {
        finalAdd = parseInt(dfAdd) + parseInt(formulaAdd)
        const signal = finalAdd === 0 ? '' : finalAdd > 0 ? '+' : '-'
        formula = `${dice}${signal}${finalAdd !== 0 ? Math.abs(finalAdd) : ''}${formulaOther}`
      } else {
        formula = df + action.formula
      }

      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)

      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc) // special case where Damage comes from [D:attack + mod]

      const taggedSettings = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      let displayFormula = formula
      if (actor && taggedSettings.autoAdd) {
        await actor.addTaggedRollModifiers('', {}, action.att)
        displayFormula = addBucketToDamage(displayFormula, false)
      }

      let canRoll = { result: true }
      const token = actor?.getActiveTokens()?.[0] || canvas.tokens.controlled[0]
      if (actor) canRoll = await actor.canRoll(action, token)
      if (!canRoll.canRoll) {
        if (canRoll.targetMessage) {
          ui.notifications?.warn(canRoll.targetMessage)
          return false
        }
      }
      const overrideText = action.derivedformula + action.formula.replace(/([+-]\d+).*/g, '$1')
      await rollDamage(canRoll, token, actor, displayFormula, formula, action, event, overrideText, targets)
      if (action.next) {
        return GURPS.performAction(action.next, actor, event, targets)
      }
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
    attackdamage({ action, event, actor, targets }) {
      // action fails if there's no selected actor
      if (!actor) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      if (!action.name) {
        ui.notifications?.warn('attack damage action has no name')
        return false
      }
      let att = null
      att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards
      if (!att) {
        ui.notifications.warn(
          `No melee or ranged attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`
        )
        return false
      }
      if (action.calcOnly) return att.damage

      let dam = parseForRollOrDamage(att.damage)
      if (!dam) {
        ui.notifications?.warn('Damage is not rollable')
        return false
      }
      dam.action.costs = action.costs
      dam.action.mod = action.mod
      dam.action.desc = action.desc
      dam.action.att = att
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
    roll({ action, actor, event }) {
      let canRoll = true
      if (!!actor) {
        if (actor instanceof User) {
          canRoll = true
        } else {
          const token = actor.getActiveTokens()[0]
          actor.canRoll(action, token).then(r => (canRoll = r.canRoll))
        }
      }
      if (!canRoll) return false

      const prefix = game.i18n.format('GURPS.chatRolling', {
        dice: !!action.displayformula ? action.displayformula : action.formula,
        desc: !!action.desc ? ' ' + action.desc : '',
      })
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      return doRoll({
        actor,
        formula: action.formula,
        prefix,
        optionalArgs: { blind: action.blindroll, event },
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)
          return false
        })
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
    controlroll({ action, actor, event }) {
      const target = parseInt(action.target)
      let aid = actor ? `@${actor.id}@` : ''
      let thing
      let chatthing
      if (!!action.desc) {
        thing = action.desc
        chatthing = `["${game.i18n.localize('GURPS.chatRollingCR')}, ${thing}"${aid}CR:${target} ${thing}]`
      } else {
        chatthing = `[${aid}CR:${target}]`
      }
      return doRoll({
        actor,
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: { blind: action.blindroll, event },
        action,
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)
          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.derivedformula
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.formula
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActor|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    derivedroll({ action, actor, event }) {
      if (!action.derivedformula) {
        ui.notifications.warn('derived roll with no derived formula')
        return false
      }
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      let df = action.derivedformula.match(/[Ss][Ww]/) ? actor.system.swing : actor.system.thrust
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      // const originalFormula = action.derivedformula + action.formula
      return doRoll({
        actor,
        formula: d6ify(df + action.formula),
        prefix: game.i18n.format('GURPS.chatRolling', {
          dice: action.derivedformula,
          desc: action.desc,
        }),
        optionalArgs: { blind: action.blindroll, event },
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)
          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.isRanged
     * @param {boolean} data.action.calcOnly
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActor|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    async attack({ action, actor, event }) {
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      if (!action.name) {
        ui.notifications.warn('attack action without name')
        return false
      }
      let att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards
      if (!att) {
        if (!action.calcOnly) {
          ui.notifications.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
        }
        return false
      }
      let p = 'A:'
      if (!!action.isMelee && !action.isRanged) p = 'M:'
      if (!action.isMelee && !!action.isRanged) p = 'R:'
      // Need to finagle chatthing to allow for attack names that include OtFs
      let thing = att.name
        .replace(/\[.*\]/, '')
        .replace(/ +/g, ' ')
        .trim()
      let qn = quotedAttackName({ name: thing, mode: att.mode })
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = `[${aid}${p}${qn}]`
      const followon = `[${aid}D:${qn}]`
      let target = att.level
      if (!target) {
        ui.notifications.warn(`attack named ${thing} has level of 0 or NaN`)
        return false
      }
      if (action.calcOnly) {
        let modifier = parseInt(action.mod) ?? 0
        if (isNaN(modifier)) modifier = 0
        return { target: target + modifier, thing: thing }
      }
      const opt = {
        blind: action.blindroll,
        event,
        obj: att, // save the attack in the optional parameters, in case it has rcl/rof
        followon: followon,
        text: '',
      }
      let targetmods = []
      if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
      if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      return await doRoll({
        actor,
        targetmods,
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: opt,
        action,
      })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.calcOnly
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActor|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    ['weapon-block']({ action, actor, event }) {
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      let att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, false) // find attack possibly using wildcards
      if (!att) {
        ui.notifications.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
        return false
      }
      let mode = att.mode ? ` (${att.mode})` : ''
      const target = parseInt(att.block)
      if (isNaN(target) || target == 0) {
        ui.notifications.warn(`No Block for '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
        return false
      }
      const thing = att.name
        .replace(/\[.*\]/, '')
        .replace(/ +/g, ' ')
        .trim()
      if (action.calcOnly) {
        let modifier = parseInt(action.mod) ?? 0
        if (isNaN(modifier)) modifier = 0
        return { target: target + modifier, thing: thing }
      }
      let targetmods = []
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = thing === '' ? att.name + mode : `[${aid}B:"${thing}${mode}"]`

      return doRoll({
        actor,
        targetmods,
        prefix: 'Block: ',
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: { blind: action.blindroll, event },
        action,
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)
          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.calcOnly
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActor|null} data.actor
     * @param {JQuery.Event|null} data.event
     * @param {boolean} data.calcOnly
     */
    // ['weapon-parry']({ action, actor, event, _calcOnly }) {
    ['weapon-parry']({ action, actor, event }) {
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      let att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, false) // find attack possibly using wildcards
      if (!att) {
        ui.notifications.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
        return false
      }
      let mode = att.mode ? ` (${att.mode})` : ''
      const target = parseInt(att.parry)
      if (isNaN(target) || target == 0) {
        ui.notifications.warn(`No Parry for '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
        return false
      }
      const thing = att.name
        .replace(/\[.*\]/, '')
        .replace(/ +/g, ' ')
        .trim()
      if (action.calcOnly) {
        let modifier = parseInt(action.mod) ?? 0
        if (isNaN(modifier)) modifier = 0
        return { target: target + modifier, thing: thing }
      }
      let targetmods = []
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = thing === '' ? att.name + mode : `[${aid}P:"${thing}${mode}"]`

      return doRoll({
        actor,
        targetmods,
        prefix: 'Parry: ',
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: { blind: action.blindroll, event },
        action,
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)
          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.blindroll
     * @param {string} [data.action.target]
     *
     * @param {GurpsActor|null} data.actor
     * @param {JQuery.Event|null} data.event
     * @param {string} data.originalOtf
     * @param {boolean} data.calcOnly
     */
    async attribute({ action, actor, event, originalOtf, calcOnly }) {
      // This can be complicated because Attributes (and Skills) can be pre-targeted (meaning we don't need an actor)
      if (!actor && (!action || !action.target)) {
        ui.notifications?.warn('You must have a character selected')
        return false
      }
      let target = parseInt(action.target) // is it pre-targeted (ST12)
      if (!target && !!actor) {
        if (!!action.melee) {
          // Is it trying to match to an attack name (should only occur with Parry: & Block:
          let meleeAttack = GURPS.findAttack(actor.system, action.melee)
          if (!!meleeAttack) {
            target = parseInt(meleeAttack[action.attribute.toLowerCase()]) // should only occur with parry & block
          }
        } else {
          target = parseInt(foundry.utils.getProperty(actor.system, action.path))
        }
      }
      const thing = action.name
      if (!target) {
        return false
      }
      if (calcOnly) {
        let modifier = parseInt(action.mod) ?? 0
        if (isNaN(modifier)) modifier = 0
        return { target: target + modifier, thing: thing }
      }
      let targetmods = []
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = originalOtf ? `[${aid}${originalOtf}]` : `[${aid}${thing}]`
      let opt = {
        blind: action.blindroll,
        event: event,
        action: action,
        obj: action.obj,
        text: '',
      }
      if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
      if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)
      opt.text = ''
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      else if (!!action.desc) opt.text = "<span style='font-size:85%'>" + action.desc + '</span>'
      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      return doRoll({
        actor,
        targetmods,
        prefix: game.i18n.localize('GURPS.rollVs'),
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: opt,
        action,
      })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.blindroll
     * @param {string} [data.action.target]
     *
     * @param {GurpsActor|null} data.actor
     * @param {JQuery.Event|null} data.event
     * @param {string} data.originalOtf
     * @param {boolean} data.calcOnly
     */
    async ['skill-spell']({ action, actor, event, originalOtf, calcOnly }) {
      if (!actor && (!action || !action.target)) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
        return false
      }
      const target = processSkillSpell({ action, actor })
      if (!action) {
        return false
      }
      let thing = action.name
        .replace(/\[.*\]/, '')
        .replace(/ +/g, ' ')
        .trim()
      if (calcOnly) {
        let modifier = parseInt(action.mod) ?? 0
        if (isNaN(modifier)) modifier = 0
        return { target: target + modifier, thing: thing }
      }
      let targetmods = []
      let aid = actor ? `@${actor.id}@` : ''
      let chatthing = originalOtf ? `[${aid}${originalOtf}]` : `[${aid}S:"${thing}"]`
      let opt = {
        blind: action.blindroll,
        event,
        action,
        obj: action.obj,
        text: '',
      }
      if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
      if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)

      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (!!action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      else if (!!action.desc) opt.text = "<span style='font-size:85%'>" + action.desc + '</span>'
      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      return await doRoll({ actor, targetmods, thing, chatthing, origtarget: target, optionalArgs: opt, action })
    },

    /*
                  [AMRS][DPK]
                  A: ads & attack (melee & range)
                  AD: ads
                  AT: attack
                  M: melee
                  R: ranged
                  S: skills & spells 
                  SK: skills
                  SP: spells
                  */
    // ['test-exists']({ action, actor, _event, originalOtf, calcOnly }) {
    ['test-exists']({ action, actor }) {
      switch (action.prefix) {
        case 'A':
          if (!!findAdDisad(actor, action.name)) return true
          if (!!findAttack(actor, action.name, true, true)) return true
          return false
        case 'AD':
          if (!!findAdDisad(actor, action.name)) return true
          return false
        case 'AT':
          if (!!findAttack(actor, action.name, true, true)) return true
          return false
        case 'M':
          if (!!findAttack(actor, action.name, true, false)) return true
          return false
        case 'R':
          if (!!findAttack(actor, action.name, false, true)) return true
          return false
        case 'S':
          if (!!findSkillSpell(actor, action.name, false, false)) return true
          return false
        case 'SK':
          if (!!findSkillSpell(actor, action.name, true, false)) return true
          return false
        case 'SP':
          if (!!findSkillSpell(actor, action.name, false, true)) return true
          return false
      }
      return false
    },
    // href({ action, actor, event, originalOtf, calcOnly }) {
    href({ action }) {
      window.open(action.orig, action.label)
    },
  }
  GURPS.actionFuncs = actionFuncs

  async function findBestActionInChain({ action, actor, event, targets, originalOtf }) {
    const actions = []
    let overridetxt = action.overridetxt
    while (action) {
      action.overridetxt = overridetxt
      actions.push(action)
      action = action.next
    }
    const calculations = []
    for (const a of actions) {
      const func = GURPS.actionFuncs[a.type]
      if (func.constructor.name === 'AsyncFunction') {
        calculations.push(await func({ action: a, actor, event, targets, originalOtf, calcOnly: true }))
      } else {
        calculations.push(func({ action: a, actor, event, targets, originalOtf, calcOnly: true }))
      }
    }
    const levels = calculations.map(result => (result ? result.target : 0))
    if (!levels.some(level => level > 0)) {
      ui.notifications.warn(game.i18n.localize('GURPS.noViableSkill'))
      return null // actor does not have any of these skills
    }
    const bestLevel = Math.max(...levels)
    return actions[levels.indexOf(bestLevel)]
  }

  /**
   * @param {Action} action
   * @param {GurpsActor|null} actor
   * @param {JQuery.Event|null} [event]
   * @param {string[] } [targets]
   * @returns {Promise<boolean | {target: any, thing: any} | undefined>}
   */
  async function performAction(action, actor, event = null, targets = []) {
    if (!action || !(action.type in actionFuncs)) return false
    if (action.sourceId) actor = game.actors.get(action.sourceId)
    // const origAction = action
    const originalOtf = action.orig
    const calcOnly = action.calcOnly
    if (['attribute', 'skill-spell'].includes(action.type)) {
      action = await findBestActionInChain({ action, event, actor, targets, originalOtf })
    }
    return !action
      ? false
      : await GURPS.actionFuncs[action.type]({ action, actor, event, targets, originalOtf, calcOnly })
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
    if (actor instanceof GurpsActor) actor = actor.system
    let skillRegExp = new RegExp(removeOtf + makeRegexPatternFrom(sname, false, false), 'i')
    let best = 0
    if (!isSpellOnly)
      recurselist(actor.skills, s => {
        if (s.name?.match(skillRegExp) && s.level > best) {
          t = s
          best = parseInt(s.level)
        }
      })
    if (!t)
      if (!isSkillOnly)
        recurselist(actor.spells, s => {
          if (s.name?.match(skillRegExp) && s.level > best) {
            t = s
            best = parseInt(s.level)
          }
        })
    return t
  }
  GURPS.findSkillSpell = findSkillSpell

  GURPS.arrayToObject = arrayToObject
  GURPS.objectToArray = objectToArray

  /**
   * @param {GurpsActor | GurpsActorData} actor
   * @param {string} sname
   * @returns {any}
   */
  function findAdDisad(actor, sname) {
    var t
    if (!actor) return t
    if (actor instanceof GurpsActor) actor = actor.system
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
    if (actor instanceof GurpsActor) actor = actor.system
    let s = sanitize(sname)
    let fullregex = new RegExp(removeOtf + makeRegexPatternFrom(s, false, false), 'i')
    let smode = ''
    let m = XRegExp.matchRecursive(sname, '\\(', '\\)', 'g', {
      unbalanced: 'skip-lazy',
      valueNames: ['between', null, 'match', null],
    })
    if (m.length == 2) {
      // Found a mode "(xxx)" in the search name
      sname = m[0].value.trim()
      smode = m[1].value.trim().toLowerCase()
    }
    let nameregex = new RegExp(removeOtf + makeRegexPatternFrom(s, false, false), 'i')
    if (isMelee)
      // @ts-ignore
      recurselist(actor.melee, (e, _k, _d) => {
        if (!t) {
          let full = e.name
          if (!!e.mode) full += ' (' + e.mode + ')'
          let em = !!e.mode ? e.mode.toLowerCase() : ''
          if (e.name.match(nameregex) && (smode == '' || em == smode)) t = e
          else if (e.name.match(fullregex)) t = e
          else if (full.match(fullregex)) t = e
        }
      })
    //    t = Object.values(actor.melee).find(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(nameregex))
    if (isRanged && !t)
      // @ts-ignore
      recurselist(actor.ranged, (e, _k, _d) => {
        if (!t) {
          let full = e.name
          if (!!e.mode) full += ' (' + e.mode + ')'
          let em = !!e.mode ? e.mode.toLowerCase() : ''
          if (e.name.match(nameregex) && (smode == '' || em == smode)) t = e
          else if (e.name.match(fullregex)) t = e
          else if (full.match(fullregex)) t = e
        }
      })
    //    t = Object.values(actor.ranged).find(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(nameregex))
    return t
  }
  GURPS.findAttack = findAttack

  /**
   * Find lastTargetedRoll using MessageId.
   *
   * This is intended to use in external modules outside GGA
   * using Foundry's Message Hooks.
   *
   * Example in external module using dice so nice:
   *  Hooks.on("diceSoNiceRollComplete", (msgId) => {
   *    if (game.system === 'gurps') {
   *      const lastTargetedRoll = GURPS.findTargetedRoll(msdId)
   *      if lastTargetedRoll?.failure console.log('roll fail!')
   *    }
   *  })
   */
  function findTargetedRoll(messageId) {
    const rolls = Object.values(GURPS.lastTargetedRolls).filter(roll => roll.msgId === messageId)
    return !!rolls ? rolls[0] : null
  }
  GURPS.findTargetedRoll = findTargetedRoll

  /**
   * The user clicked on a field that would allow a dice roll. Use the element
   * information to try to determine what type of roll.
   * @param {JQuery.MouseEventBase} event
   * @param {GurpsActor | null} actor
   * @param {string[]} targets - labels for multiple Damage rolls
   */
  async function handleRoll(event, actor, options) {
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
      // expect text like '2d+1 cut' or '1d+1 cut,1d-1 ctrl' (linked damage)
      let f = !!element.dataset.otf ? element.dataset.otf : element.innerText.trim()

      let parts = f.includes(',') ? f.split(',') : [f]
      for (let part of parts) {
        //let result = parseForRollOrDamage(part.trim())
        let result = parselink(part.trim())
        if (result?.action) {
          if (options?.combined && result.action.type == 'damage')
            result.action.formula = multiplyDice(result.action.formula, options.combined)
          performAction(result.action, actor, event, options?.targets)
        }
      }
      return
    } else if ('path' in element.dataset) {
      let srcid = !!actor ? '@' + actor.id + '@' : ''
      prefix = game.i18n.localize('GURPS.rollVs')
      thing = GURPS._mapAttributePath(element.dataset.path)
      formula = '3d6'
      target = parseInt(element.innerText)
      if ('otf' in element.dataset)
        if (thing.toUpperCase() != element.dataset.otf.toUpperCase())
          chatthing = thing + '/[' + srcid + element.dataset.otf + ']'
        else chatthing = '[' + srcid + element.dataset.otf + ']'
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
        if (actor) opt.obj = foundry.utils.getProperty(actor, k) // During the roll, we may want to extract something from the object
        if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return
        if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)
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
          if (!!m) GURPS.ModifierBucket.addModifier(0, m)
        }
      }
    } else if ('roll' in element.dataset) {
      target = -1 // Set flag to indicate a non-targeted roll
      formula = element.innerText
      prefix = 'Rolling ' + formula
      formula = d6ify(formula)
    }

    await doRoll({ actor, formula, targetmods, prefix, thing, chatthing, origtarget: target, optionalArgs: opt })
  }
  GURPS.handleRoll = handleRoll

  /**
   * If the desc contains *Cost ?FP or *Max:9 then perform action
   * @param {GurpsActor|User} actor
   * @param {string} desc
   */
  async function applyModifierDesc(actor, desc) {
    if (!desc) return null
    let m = desc.match(COSTS_REGEX)

    if (!!m && !!actor && !actor.isSelf) {
      let delta = parseInt(m.groups.cost)
      let target = m.groups.type
      if (target.match(/^[hf]p/i)) {
        let k = target.toUpperCase()
        // @ts-ignore
        delta = actor.system[k].value - delta
        await actor.update({ ['system.' + k + '.value']: delta })
      }
      if (target.match(/^tr/i)) {
        await GURPS.ChatProcessors.startProcessingLines('/setEventFlags true false false\\\\/' + target + ' -' + delta) // Make the tracker command quiet
        return null
      }
    }

    let parse = desc.replace(/.*\*max: ?(\d+).*/gi, '$1')
    if (parse != desc) {
      return parseInt(parse)
    }
    return null // indicating no overriding MAX value
  }
  GURPS.applyModifierDesc = applyModifierDesc

  /**
   * TODO Move to i18n.js.
   * Return the localized string for this data path (note en.json must match up to the data paths).
   * special case, drop ".value" from end of path (and append "NAME"), usually used for attributes.
   * @param {string} path
   * @param {any} _suffix
   */
  function _mapAttributePath(path, _suffix) {
    let i = path.indexOf('.value')
    if (i >= 0) {
      path = path.substring(0, i) + 'NAME' // used for the attributes
    }
    path = path.replace(/\./g, '') // remove periods
    return game.i18n.localize('GURPS.' + path)
  }
  GURPS._mapAttributePath = _mapAttributePath

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
  // function handleGurpslink(event, actor, desc, targets) {
  //   event.preventDefault()
  //   let element = event.currentTarget
  //   let action = element.dataset.action // If we have already parsed
  //   if (!!action) action = JSON.parse(atou(action))
  //   else action = parselink(element.innerText, desc).action
  //   GURPS.performAction(action, actor, event, targets)
  // }
  // GURPS.handleGurpslink = handleGurpslink

  // So it can be called from a script macro
  GURPS.genkey = zeroFill

  /**
   * Add the value as a property to obj. The key will be a generated value equal
   * to a five-digit string equal to the index, padded to the left with zeros; e.g:
   * if index is 12, the property key will be "00012".
   *
   * If index is equal to -1, then the existing properties of the object are examined
   * and the index set to the next available (i.e, no property exists) key of the same
   * form.
   *
   * TODO should be moved to lib/utilities.js.
   *
   * @param {Record<string, any>} obj
   * @param {any} value
   * @param {number} index
   */
  function put(obj, value, index = -1) {
    if (index == -1) {
      index = 0
      while (obj.hasOwnProperty(zeroFill(index))) index++
    }
    let k = zeroFill(index)
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
    let oldversion = true
    let oldRender = actor.ignoreRender
    actor.ignoreRender = true

    if (oldversion) {
      let i = path.lastIndexOf('.')
      let objpath = path.substring(0, i)
      let key = path.substring(i + 1)
      i = objpath.lastIndexOf('.')
      let parentpath = objpath.substring(0, i)
      let objkey = objpath.substring(i + 1)
      // Create shallow copy of object
      let object = foundry.utils.duplicate(GURPS.decode(actor, objpath))
      let t = parentpath + '.-=' + objkey
      await actor.internalUpdate({ [t]: null }) // Delete the whole object from the parent

      // Delete the key, ex: '00001'
      delete object[key]
      i = parseInt(key)

      // Since keys are serial index, move up any items after the current index
      i = i + 1
      while (object.hasOwnProperty(zeroFill(i))) {
        let k = zeroFill(i)
        object[key] = object[k]
        delete object[k]
        key = k
        i++
      }
      /*    Since object is duplicated, no longer need to create a sorted copy
      let sorted = Object.keys(object)
        .sort()
        .reduce((a, v) => {
          // @ts-ignore
          a[v] = object[v]
          return a
        }, {}) // Enforced key order
*/
      actor.ignoreRender = oldRender
      await actor.internalUpdate({ [objpath]: object }, { diff: false })
      // Sad hack to ensure that an empty object exists on the client side (the DB is correct)
      if (Object.keys(object).length === 0) GURPS.decode(actor, parentpath)[objkey] = {}
    } else {
      let i = path.lastIndexOf('.')
      let objpath = path.substring(0, i)
      let key = path.substring(i + 1)
      let object = GURPS.decode(actor, objpath)
      delete object[key]

      await actor.internalUpdate({ [objpath]: null }) // instead of using "x.y.-=z" to remove the key 'z' and all its data, just remove x.y.z's data.

      let sorted = Object.keys(object)
        .sort()
        .reduce((_, value, index) => {
          let key = zeroFill(index)

          if (key != value) {
            object[key] = object[value]
            delete object[value]
          }
          return object
        }, {})

      actor.ignoreRender = oldRender
      await actor.internalUpdate({ [objpath]: sorted }, { diff: false })
    }
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
    let key = path.substring(i + 1)
    i = objpath.lastIndexOf('.')
    let parentpath = objpath.substring(0, i)
    let objkey = objpath.substring(i + 1)
    let object = GURPS.decode(actor, objpath)
    let t = parentpath + '.-=' + objkey
    await actor.internalUpdate({ [t]: null }) // Delete the whole object
    let start = parseInt(key)

    i = start + 1
    while (object.hasOwnProperty(zeroFill(i))) i++
    i = i - 1
    for (let z = i; z >= start; z--) {
      object[zeroFill(z + 1)] = object[zeroFill(z)]
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
    // let i = 0

    for (let key in eqts) {
      let eqt = eqts[key]
      if (data) {
        data.indent = level
        data.key = parentkey + key
        data.count = eqt.count
      }
      let display = true
      if (!!src && game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_REMOVE_UNEQUIPPED)) {
        // if an optional src is provided (which == actor.system) assume we are checking attacks to see if they are equipped
        recurselist(src.equipment.carried, e => {
          if (eqt.name.startsWith(e.name) && !e.equipped) display = false
        })
      }
      if (display) {
        let fragment = options.fn(eqt, { data: data })
        ret = ret + fragment
      }
      ret = ret + listeqtrecurse(eqt.contains, options, level + 1, data, parentkey + key + '.contains.')
    }
    return ret
  }
  GURPS.listeqtrecurse = listeqtrecurse

  GURPS.whisperOtfToOwner = function (otf, overridetxt, _event, blindcheck, actor) {
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

    let buttons = []
    buttons.push({
      action: 'everyone',
      icon: 'fas fa-users',
      label: translate('To Everyone'),
      callback: () => GURPS.sendOtfMessage(otf, false),
    })

    if (canblind)
      buttons.push({
        action: 'blind-everyone',
        icon: 'fas fa-users-slash',
        label: translate('Blindroll to Everyone'),
        callback: () => GURPS.sendOtfMessage(botf, true),
      })

    if (users.length > 0) {
      buttons.push({
        action: 'whisper',
        icon: 'fas fa-user',
        label: 'Whisper to ' + users.map(u => u.name).join(' '),
        callback: () => GURPS.sendOtfMessage(otf, false, users),
      })

      if (canblind)
        buttons.push({
          action: 'blind-whisper',
          icon: 'fas fa-user-slash',
          label: 'Whisper Blindroll to ' + users.map(u => u.name).join(' '),
          callback: () => GURPS.sendOtfMessage(botf, true, users),
        })
    }
    buttons.push({
      action: 'chat',
      icon: 'far fa-copy',
      label: 'Copy to chat input',
      default: true,
      callback: () => {
        $(document).find('#chat-message').val(otf)
      },
    })

    let d = new foundry.applications.api.DialogV2({
      window: { title: 'GM Send Formula' },
      content: `<div style='text-align:center'>How would you like to send the formula:<div><strong>${otf}</strong></div>`,
      position: { height: 'auto', width: 'auto' },
      buttons: buttons,
      default: 'def',
    }).render({ force: true })
  }

  GURPS.sendOtfMessage = function (content, blindroll, users = null) {
    /** @type {import('@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData').ChatMessageDataConstructorData} */
    let msgData = {
      content: content,
      user: game.user.id,
      blind: blindroll,
    }
    if (!!users) {
      msgData.whisper = users.map(it => it.id || '')
    } else {
      msgData.type = CONST.CHAT_MESSAGE_STYLES.OOC
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
        if (isOtf) GurpsWiring.handleGurpslink(event, actor, null, { targets: targets })
        else GURPS.handleRoll(event, actor, { targets: targets })
      },
    }

    buttons.combined = {
      icon: '<i class="fas fa-plus"></i>',
      label: game.i18n.localize('GURPS.RESOLVEDAMAGEAdd', 'Combine'),
      callback: html => {
        let text = /** @type {string} */ (html.find('#number-rolls').val())
        let number = parseInt(text)

        if (isOtf) otf = multiplyDice(otf, number)

        if (isOtf) GurpsWiring.handleGurpslink(event, actor, null, { combined: number })
        else GURPS.handleRoll(event, actor, { combined: number })
      },
    }
    let def = GURPS.lastTargetedRoll?.rofrcl || 2
    let dlg = new Dialog({
      title: `${title}`,
      content: `
        <div style='display: flex; flex-flow: column nowrap; place-items: center;'>
          <p style='font-size: large;'><strong>${otf}</strong></p>
          <p>${prompt}</p>
          <div style='display: inline-grid; grid-template-columns: auto 1fr; place-items: center; gap: 4px'>
            <label>${quantity}</label>
            <input type='text' id='number-rolls' class='digits-only' style='text-align: center;' value='${def}'>
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
  GURPS.parselink = parselink

  /* -------------------------------------------- */
  /*  Foundry VTT Initialization                  */
  /* -------------------------------------------- */
  Hooks.once('init', async function () {
    console.log(GURPS.BANNER)
    console.log(`Initializing GURPS 4e Game Aid`)
    console.log(GURPS.LEGAL)

    let src = game.i18n.lang == 'pt_br' ? 'systems/gurps/icons/gurps4e-pt_br.webp' : 'systems/gurps/icons/gurps4e.webp'

    $('#logo').attr('src', src)
    $('#logo').attr('height', '32px')

    // set up all hitlocation tables (must be done before MB)
    HitLocation.init()
    DamageChat.init()
    RegisterChatProcessors()
    GurpsActiveEffect.init()
    GURPSSpeedProvider.init()

    // Add Debugger info
    GGADebugger.init()

    // Modifier Bucket must be defined after hit locations
    GURPS.ModifierBucket = new ModifierBucket()
    GURPS.ModifierBucket.render(true)

    GURPS.initiative = new Initiative()
    GURPS.hitpoints = new HitFatPoints()
    GURPS.ConditionalInjury = new GURPSConditionalInjury()

    // do this only after we've initialized localize
    GURPS.Maneuvers = Maneuvers

    // Define custom Entity classes
    // @ts-ignore
    CONFIG.Actor.documentClass = GurpsActor
    CONFIG.Item.documentClass = GurpsItem
    CONFIG.JournalEntryPage.documentClass = JournalEntryPageGURPS
    CONFIG.Canvas.rulerClass = RulerGURPS

    // add custom ActiveEffectConfig sheet class
    DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', ActiveEffectConfig)
    DocumentSheetConfig.registerSheet(ActiveEffect, 'gurps', GurpsActiveEffectConfig, { makeDefault: true })

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
    Actors.registerSheet('gurps', GurpsActorSheetReduced, {
      label: 'Reduced Mode',
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

    DocumentSheetConfig.unregisterSheet(JournalEntryPage, 'core', JournalPDFPageSheet)

    DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', PDFEditorSheet, {
      types: ['pdf'],
      makeDefault: true,
      label: 'GURPS PDF Editor Sheet',
    })

    // Warning, the very first table will take a refresh before the dice to show up in the dialog.  Sorry, can't seem to get around that
    // @ts-ignore
    Hooks.on('createRollTable', async function (entity, _options, _userId) {
      await entity.update({ img: 'systems/gurps/icons/single-die.webp' })
      entity.img = 'systems/gurps/icons/single-die.webp'
    })

    // @ts-ignore
    Hooks.on('renderTokenHUD', (...args) => ManeuverHUDButton.prepTokenHUD(...args))

    // @ts-ignore
    Hooks.on('renderSidebarTab', async (app, html) => {
      // Add the Import Multiple Actors button to the Actors tab.
      if (app.id === 'actors') AddMultipleImportButton(html)
      // Add the import equipment button to the Compendiums tab.
      if (app.id === 'compendium') AddImportEquipmentButton(html)
      // if (app.options.id === 'compendium') {
      //   let button = $(
      //     '<button class="import-items"><i class="fas fa-file-import"></i>' +
      //       game.i18n.localize('GURPS.itemImport') +
      //       '</button>'
      //   )

      //   button.click(function () {
      //     setTimeout(async () => {
      //       new Dialog(
      //         {
      //           title: 'Import Item Compendium',
      //           // @ts-ignore
      //           content: await renderTemplate('systems/gurps/templates/item-import.html'),
      //           buttons: {
      //             import: {
      //               icon: '<i class="fas fa-file-import"></i>',
      //               label: 'Import',
      //               callback: html => {
      //                 // @ts-ignore
      //                 const form = html.find('form')[0]
      //                 let files = form.data.files
      //                 // @ts-ignore
      //                 let file = null
      //                 if (!files.length) {
      //                   // @ts-ignore
      //                   return ui.notifications.error('You did not upload a data file!')
      //                 } else {
      //                   file = files[0]
      //                   console.log(file)
      //                   GURPS.readTextFromFile(file).then(text =>
      //                     ItemImporter.importItems(text, file.name.split('.').slice(0, -1).join('.'), file.path)
      //                   )
      //                 }
      //               },
      //             },
      //             no: {
      //               icon: '<i class="fas fa-times"></i>',
      //               label: 'Cancel',
      //             },
      //           },
      //           default: 'import',
      //         },
      //         {
      //           width: 400,
      //         }
      //       ).render(true)
      //     }, 200)
      //   })

      //   html.find('.directory-footer').append(button)

      // we need a special case to handle the markdown editor module because it changes the chat textarea with an EasyMDEContainer
      const hasMeme = game.modules.get('markdown-editor')?.active
      const chat = html[0]?.querySelector(hasMeme ? '.EasyMDEContainer' : '#chat-message')

      const dropHandler = function (event, inLog) {
        event.preventDefault()
        if (event.originalEvent) event = event.originalEvent
        const data = JSON.parse(event.dataTransfer.getData('text/plain'))
        if (!!data && (!!data.otf || !!data.bucket)) {
          let cmd = ''
          if (!!data.encodedAction) {
            let action = JSON.parse(atou(data.encodedAction))
            if (action.quiet) cmd += '!'
          }
          if (data.otf) cmd += data.otf
          else {
            let sep = ''
            data.bucket.forEach(otf => {
              cmd += sep + otf
              sep = ' & '
            })
          }
          if (!!data.displayname) {
            let q = '"'
            if (data.displayname.includes('"')) q = "'"
            cmd = q + data.displayname + q + cmd
          }
          cmd = '[' + cmd + ']'
          if (inLog) {
            let messageData = {
              user: game.user.id,
              //speaker: ChatMessage.getSpeaker({ actor: game.user }),
              type: CONST.CHAT_MESSAGE_STYLES.OOC,
              content: cmd,
            }
            ChatMessage.create(messageData, {})
          } else
            $(document)
              .find('#chat-message')
              .val($(document).find('#chat-message').val() + cmd)
        }
      }
      if (!!chat) chat.addEventListener('drop', event => dropHandler(event, false))
      html.find('#chat-log').on('drop', event => dropHandler(event, true))
    })

    /**
     * Added to color the rollable parts of the character sheet.
     * Made this part eslint compatible...
     * ~Stevil
     */
    registerColorPickerSettings()
    // eslint-disable-next-line no-undef
    Hooks.on('renderActorSheet', () => {
      colorGurpsActorSheet()
    })

    // Listen for the Ctrl key and toggle the roll mode (to show the behaviour we currently do anyway)
    game.keybindings.register('gurps', 'toggleDiceDisplay', {
      name: 'Toggle dice display',
      uneditable: [{ key: 'ControlLeft' }, { key: 'ControlRight' }],
      onDown: () => {
        if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_CTRL_KEY)) {
          GURPS.savedRollMode = game.settings.get('core', 'rollMode')
          game.settings.set('core', 'rollMode', game.user?.isGM ? 'gmroll' : 'blindroll')
        }
      },
      onUp: () => {
        if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_CTRL_KEY))
          game.settings.set('core', 'rollMode', GURPS.savedRollMode)
      },
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
      // "ControlLeft", "ControlRight"
    })

    GURPS.ActorSheets = { character: GurpsActorSheet }
    GURPS.handlePdf = handlePdf
    GURPS.ApplyDamageDialog = ApplyDamageDialog
    Hooks.call('gurpsinit', GURPS)
  })

  Hooks.once('ready', async function () {
    // Set up SSRT
    GURPS.SSRT = setupRanges()
    GURPS.rangeObject = new GURPSRange()

    // reset the TokenHUD to our version
    // @ts-ignore
    canvas.hud.token = new GURPSTokenHUD()

    // This reads the en.json file into memory. It is used by the "i18n_English" function to do reverse lookups on
    initialize_i18nHelper()

    GURPS.DamageTables = new DamageTable()

    ResourceTrackerManager.initSettings()
    HitLocation.ready()

    // if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_3D6))
    //   new ThreeD6({
    //     popOut: false,
    //     minimizable: false,
    //     resizable: false,
    //     id: 'ThreeD6',
    //     template: 'systems/gurps/templates/threed6.html',
    //     classes: [],
    //   }).render(true)

    // @ts-ignore
    GURPS.currentVersion = SemanticVersion.fromString(game.system.version)
    // Test for migration
    let mv = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION)
    // let quiet = false
    if (!mv) {
      mv = '0.0.1'
      // quiet = true
    }
    // @ts-ignore
    console.log('Current Version: ' + GURPS.currentVersion + ', Migration version: ' + mv)
    const migrationVersion = SemanticVersion.fromString(mv)
    // @ts-ignore
    if (migrationVersion.isLowerThan(GURPS.currentVersion)) {
      // check which migrations are needed
      // @ts-ignore
      // if (migrationVersion.isLowerThan(Settings.VERSION_096)) await Migration.migrateTo096(quiet)
      await Migration.showConfirmationDialogIfAutoAddIsTrue()
      game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION, game.system.version)
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
<div id="GURPS-LEGAL" style='font-size:85%'>${game.system.title}</div>
<hr>
<div style='font-size:70%'>
  <div>${game.i18n.localize('GURPS.copyright')}</div>
  <hr/>
  <div style='text-align: center;'>
    <div style="margin-bottom: 5px;">Like our work? Consider supporting us:</div>
    <div><a href="https://github.com/sponsors/crnormand?o=esb"><img height="24" src="systems/gurps/icons/sponsor.png"> Github Sponsor</a></div><br>
    <div><a href="https://ko-fi.com/crnormand"><img height="24" src="systems/gurps/icons/SupportMe_stroke@2x.webp"></a></div>
  </div>
</div>`,
          // @ts-ignore
          whisper: [game.user],
        })
      if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CHANGELOG)) {
        const app = new ChangeLogWindow(changelogVersion)
        app.render(true)
        // @ts-ignore
      }
      GURPS.executeOTF('/help')
    }

    game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_CHANGELOG_VERSION, GURPS.currentVersion.toString())

    // get all aliases defined in the resource tracker templates and register them as damage types
    let resourceTrackers = ResourceTrackerManager.getAllTemplates()
      .filter(it => !!it.tracker.isDamageType)
      .filter(it => !!it.tracker.alias)
      .map(it => it.tracker)
    resourceTrackers.forEach(it => (GURPS.DamageTables.damageTypeMap[it.alias] = it.alias))
    resourceTrackers.forEach(
      it =>
        (GURPS.DamageTables.woundModifiers[it.alias] = {
          multiplier: 1,
          label: it.name,
          resource: true,
        })
    )

    Hooks.on('hotbarDrop', async (_bar, data, slot) => {
      if (!data.otf && !data.bucket) return
      let name = data.otf || data.bucket.join(' & ')
      if (!!data.displayname) name = data.displayname
      let cmd = ''

      if (!!data.actor) {
        let a = game.actors.get(data.actor)
        if (!!a) cmd = `!/select ${a.name}\n` + cmd
        name = game.actors.get(data.actor).name + ': ' + name
      }

      let otfs = data.bucket || [data.otf]
      otfs.forEach(otf => {
        if (otf.startsWith('/')) {
          if (!!data.encodedAction) {
            let action = JSON.parse(atou(data.encodedAction))
            if (action.quiet) cmd += '!'
          }
          cmd += otf
        } else cmd += '/r [' + otf + ']'
        cmd += '\n'
      })
      let setmacro = async function (name, cmd) {
        let macro = await Macro.create({
          name: name,
          type: 'chat',
          command: cmd,
        })
        macro.setFlag('gurps', 'drag-drop-otf', true)
        game.user.assignHotbarMacro(macro, slot)
      }

      let oldmacro = game.macros.get(game.user.hotbar[slot])
      if (!!oldmacro && !!oldmacro.getFlag('gurps', 'drag-drop-otf')) {
        let c = (!!data.bucket ? '/clearmb\n' : '') + cmd
        new Dialog({
          title: 'Merge or Replace On-the-Fly macro',
          content: `Merge both macros into this:<br><br><mark>${oldmacro.command.split('\n').join('<br>')}<br>${cmd
            .split('\n')
            .join('<br>')}</mark><br><br>Or just replace current macro with:<br><br><mark>${c
            .split('\n')
            .join('<br>')}</mark><br>&nbsp;<br>`,
          buttons: {
            one: {
              icon: '<i class="fas fa-angle-double-down"></i>',
              label: 'Merge',
              callback: () => {
                setmacro(oldmacro.name, oldmacro.command + '\n' + cmd)
              },
            },
            two: {
              icon: '<i class="fas fa-angle-down"></i>',
              label: 'Replace',
              callback: () => setmacro(name, (!!data.bucket ? '/clearmb\n' : '') + cmd),
            },
          },
          default: 'one',
        }).render(true)
      } else setmacro(name, (!!data.bucket ? '/clearmb\n' : '') + cmd)
      return false
    })

    Hooks.on('renderCombatTracker', async function (_a, html, _c) {
      // use class 'bound' to know if the drop event is already bound
      if (!html.hasClass('bound')) {
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
          if (dropData.type === 'initiative') {
            let target = game.combat.combatants.get(combatant)
            let src = game.combat.combatants.get(dropData.combatant)
            let updates = []
            if (!!target && !!src) {
              if (target.initiative < src.initiative) {
                updates.push({
                  _id: dropData.combatant,
                  initiative: target.initiative - 0.00001,
                })
                console.log('Moving ' + src.name + ' below ' + target.name)
              } else {
                updates.push({
                  _id: dropData.combatant,
                  initiative: target.initiative + 0.00001,
                })
                console.log('Moving ' + src.name + ' above ' + target.name)
              }
              game.combat.updateEmbeddedDocuments('Combatant', updates)
            }
          }
        })
      }

      if (game.user.isGM) {
        html.find('.combatant').each((_, li) => {
          li.setAttribute('draggable', true)
          li.addEventListener('dragstart', ev => {
            // let display = ''
            if (!!ev.currentTarget.dataset.action) display = ev.currentTarget.innerText
            let dragIcon = $(event.currentTarget).find('.token-image')[0]
            ev.dataTransfer.setDragImage(dragIcon, 25, 25)
            return ev.dataTransfer.setData(
              'text/plain',
              JSON.stringify({
                type: 'initiative',
                combatant: li.getAttribute('data-combatant-id'),
              })
            )
          })
        })
      }

      // Resolve Quick Roll and Maneuver buttons
      const combatants = html.find('.combatant')
      for (let combatantElement of combatants) {
        const combatant = await game.combat.combatants.get(combatantElement.dataset.combatantId)
        const token = canvas.tokens.get(combatant.token.id)

        // Get Combat Initiative
        const combatantInitiative = $(combatantElement).find('.token-initiative .initiative').text()

        // Add Quick Roll Menu
        combatantElement = await addQuickRollButton(combatantElement, combatant, token)

        // Add Maneuver Menu
        combatantElement = await addManeuverMenu(combatantElement, combatant, token)

        // Add Tooltip to Token Image
        const tokenImage = $(combatantElement).find('.token-image')
        tokenImage.attr('title', `${game.i18n.localize('GURPS.combatInitiative')}: ${combatantInitiative}`)
      }
      // Add Quick Roll and Maneuvers Menu Listeners
      addQuickRollListeners()
      addManeuverListeners()
    })

    game.socket.on('system.gurps', async resp => {
      if (resp.type == 'updatebucket') {
        if (resp.users.includes(game.user.id)) {
          if (resp.add) {
            resp.bucket.modifierList.forEach(e => GURPS.ModifierBucket.addModifier(e.mod, e.desc))
          } else GURPS.ModifierBucket.updateModifierBucket(resp.bucket)
        }
      }
      if (resp.type == 'initiativeChanged') {
        CONFIG.Combat.initiative = {
          formula: resp.formula,
          decimals: resp.decimals,
        }
      }
      if (resp.type == 'allowOtFExec') {
        allowOtfExec(resp)
      }

      if (resp.type == 'executeOtF') {
        if (game.users.isGM || (resp.users.length > 0 && !resp.users.includes(game.user.name))) return
        GURPS.performAction(resp.action, GURPS.LastActor)
      }
      if (resp.type == 'setLastTargetedRoll') {
        GURPS.setLastTargetedRoll(resp.chatdata, resp.actorid, resp.tokenid, false)
      }
      if (resp.type == 'dragEquipment1') {
        if (resp.destuserid != game.user.id) return
        let destactor = game.actors.get(resp.destactorid)
        let srcActor = game.actors.get(resp.srcactorid)
        Dialog.confirm({
          title: `Gift for ${destactor.name}!`,
          content: `<p>${srcActor.name} wants to give you ${resp.itemData.name} (${resp.count}),</p><br>Ok?`,
          yes: () => {
            let destKey = destactor._findEqtkeyForId('name', resp.itemData.name)
            if (!!destKey) {
              // already have some
              let destEqt = foundry.utils.getProperty(destactor, destKey)
              destactor.updateEqtCount(destKey, +destEqt.count + resp.count)
            } else {
              resp.itemData.system.equipped = true
              destactor.addNewItemData(resp.itemData)
            }
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
        let srcActor = game.actors.get(resp.srcactorid)
        let eqt = foundry.utils.getProperty(srcActor, resp.srckey)
        if (resp.count >= eqt.count) {
          srcActor.deleteEquipment(resp.srckey)
        } else {
          srcActor.updateEqtCount(resp.srckey, +eqt.count - resp.count)
        }
        let destActor = game.actors.get(resp.destactorid)
        ui.notifications.info(`${destActor.name} accepted ${resp.itemname}`)
      }
      if (resp.type == 'dragEquipment3') {
        if (resp.srcuserid != game.user.id) return
        let destActor = game.actors.get(resp.destactorid)
        ui.notifications.info(`${destActor.name} did not want ${resp.itemname}`)
      }
    })

    // Keep track of which token has been activated, so we can determine the last actor for the Modifier Bucket
    Hooks.on('controlToken', (...args) => {
      if (GURPS.IgnoreTokenSelect) return
      if (args.length > 1) {
        let a = args[0]?.actor
        if (!!a) {
          if (args[1]) GURPS.SetLastActor(a, args[0].document)
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

    GURPS.setInitiativeFormula()

    // Translate attribute mappings if not in English
    if (game.i18n.lang != 'en') {
      console.log('Mapping ' + game.i18n.lang + ' translations into PARSELINK_MAPPINGS')
      let mappings = /** @type {Record<String, string>} */ ({})
      for (let k in GURPS.PARSELINK_MAPPINGS) {
        let v = GURPS.PARSELINK_MAPPINGS[k]
        let i = v.indexOf('.value')
        let nk = v
        if (i >= 0) {
          nk = nk.substring(0, i)
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
      if (e.id.toString().startsWith(Settings.SYSTEM_NAME) && e.id != 'GURPS.GurpsActorSheet') sheets[e.label] = e.label
    })
    game.settings.register(Settings.SYSTEM_NAME, Settings.SETTING_ALT_SHEET, {
      name: game.i18n.localize('GURPS.settingSheetDetail'),
      hint: game.i18n.localize('GURPS.settingHintSheetDetail'),
      scope: 'world',
      config: true,
      type: String,
      choices: sheets,
      default: 'Tabbed Sheet',
      onChange: value => console.log(`${Settings.SETTING_ALT_SHEET}: ${value}`),
    })

    GurpsToken.ready()
    TriggerHappySupport.init()

    CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
      {
        pattern: /\[.*\]/gm,
        enricher: async (match, _options) => {
          let s = gurpslink(match[0])
          const doc = document.createElement('span')
          doc.innerHTML = s
          return doc
        },
      },
    ])

    Hooks.on('renderGMNote', (_app, html, _options) => {
      let h = html.find('[data-edit')
      h[0].innerHTML = gurpslink(h[0].innerHTML)
      GurpsWiring.hookupAllEvents(html)
    })

    Hooks.on('combatStart', async combat => {
      console.log(`Combat started: ${combat.id} - resetting token actions`)
      await resetTokenActions(combat)
    })

    Hooks.on('combatRound', async (combat, round) => {
      await handleCombatTurn(combat, round)
    })

    Hooks.on('combatTurn', async (combat, turn, combatant) => {
      await handleCombatTurn(combat, turn)
    })

    Hooks.on('deleteCombat', async combat => {
      console.log(`Combat ended: ${combat.id} - restarting token actions`)
      await resetTokenActions(combat)
    })

    Hooks.on('deleteCombatant', async (combatant, combat) => {
      console.log(`Combatant removed: ${combatant.token.name} - resetting token actions`)
      await resetTokenActionsForCombatant(combatant)
    })

    // End of system "READY" hook.
    Hooks.call('gurpsready')
  })
}

const handleCombatTurn = async (combat, round) => {
  const nextCombatant = combat.nextCombatant
  console.info(`New combat round started: ${round.round}/${round.turn} - combatant: ${nextCombatant.name}`)
  const token = canvas.tokens.get(nextCombatant.token.id)
  const actions = await TokenActions.fromToken(token)
  await actions.newTurn(round.round)
}

const resetTokenActions = async combat => {
  for (const combatant of combat.combatants) {
    await resetTokenActionsForCombatant(combatant)
  }
}

const resetTokenActionsForCombatant = async combatant => {
  const token = canvas.tokens.get(combatant.token.id)
  const actions = await TokenActions.fromToken(token)
  await actions.clear()
}
