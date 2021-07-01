// Import Modules
import { parselink, parseForDamage } from '../lib/parselink.js'

import { GurpsActor } from './actor.js'
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
} from './actor-sheet.js'
import { ModifierBucket } from './modifier-bucket/bucket-app.js'
import { ChangeLogWindow } from '../lib/change-log.js'
import { SemanticVersion } from '../lib/semver.js'
import { d6ify, recurselist, atou, utoa, makeRegexPatternFrom, splitArgs } from '../lib/utilities.js'
import { ThreeD6 } from '../lib/threed6.js'
import { doRoll } from '../module/dierolls/dieroll.js'
import { ResourceTrackerManager } from './actor/resource-tracker-manager.js'
import { DamageTables, initializeDamageTables } from '../module/damage/damage-tables.js'
import RegisterChatProcessors from '../module/chat/chat-processors.js'
import { Migration } from '../lib/migration.js'
import ManeuverHUDButton from './actor/maneuver-button.js'
import { ItemImporter } from '../module/item-import.js'
import { GURPSTokenHUD } from '../module/actor/maneuver.js'

export const GURPS = {}
window.GURPS = GURPS // Make GURPS global!
GURPS.Migration = Migration

GURPS.DEBUG = false
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

import handlebarHelpers from '../lib/moustachewax.js'
import * as settings from '../lib/miscellaneous-settings.js'
import jqueryHelpers from '../lib/jquery-helper.js'
import addChatHooks from './chat.js'

import GURPSConditionalInjury from './injury/foundry/conditional-injury.js'
import { HitLocation } from './hitlocation/hitlocation.js'

addChatHooks()
jqueryHelpers()
handlebarHelpers()
settings.initializeSettings()

// Use the target d6 icon for rolltable entries
CONFIG.RollTable.resultIcon = 'systems/gurps/icons/single-die.webp'

// CONFIG.debug.hooks = true

// Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
GURPS.LastActor = null

GURPS.SetLastActor = function (actor) {
  GURPS.LastActor = actor
  console.log('Setting Last Actor:' + actor?.name)
  setTimeout(() => GURPS.ModifierBucket.refresh(), 100) // Need to make certain the mod bucket refresh occurs later
}
GURPS.ClearLastActor = function (actor) {
  if (GURPS.LastActor == actor) {
    console.log('Clearing Last Actor:' + GURPS.LastActor?.name)
    GURPS.LastActor = null
    GURPS.LastActorName = null
    GURPS.ModifierBucket.refresh()
    if (canvas.tokens.controlled.length > 0) {
      GURPS.SetLastActor(canvas.tokens.controlled[0].actor)
    } // There may still be tokens selected... if so, select one of them
  }
}

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

GURPS.SavedStatusEffects = CONFIG.statusEffects

CONFIG.statusEffects = [
  {
    icon: 'systems/gurps/icons/statuses/condition-shock1.webp',
    id: 'shock1',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock2.webp',
    id: 'shock2',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock3.webp',
    id: 'shock3',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock4.webp',
    id: 'shock4',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-stunned.webp',
    id: 'stun',
    label: 'EFFECT.StatusStunned',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-grappled.webp',
    id: 'grapple',
    label: 'GURPS.STATUSGrapple',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-prone.webp',
    id: 'prone',
    label: 'EFFECT.StatusProne',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-kneel.webp',
    id: 'kneel',
    label: 'GURPS.STATUSKneel',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-crouch.webp',
    id: 'crouch',
    label: 'GURPS.STATUSCrouch',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-sit.webp',
    id: 'sit',
    label: 'GURPS.STATUSSit',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-flying.webp',
    id: 'fly',
    label: 'GURPS.STATUSFly',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-fall.webp',
    id: 'fall',
    label: 'GURPS.STATUSFall',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-pinned.webp',
    id: 'pinned',
    label: 'GURPS.STATUSPin',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-nauseated.webp',
    id: 'nauseated',
    label: 'GURPS.STATUSNauseated',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-cough.webp',
    id: 'coughing',
    label: 'GURPS.STATUSCoughing',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-wretch.webp',
    id: 'retching',
    label: 'GURPS.STATUSRetching',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-drowsy.webp',
    id: 'drowsy',
    label: 'GURPS.STATUSDrowsy',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-asleep.webp',
    id: 'sleeping',
    label: 'GURPS.STATUSSleep',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-drunk1.webp',
    id: 'tipsy',
    label: 'GURPS.STATUSTipsy',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-drunk2.webp',
    id: 'drunk',
    label: 'GURPS.STATUSDrunk',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-fascinated.webp',
    id: 'euphoria',
    label: 'GURPS.STATUSEuphoria',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain1.webp',
    id: 'mild_pain',
    label: 'GURPS.STATUSMildPain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain2.webp',
    id: 'moderate_pain',
    label: 'GURPS.STATUSModeratePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain3.webp',
    id: 'moderate_pain2',
    label: 'GURPS.STATUSModeratePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain4.webp',
    id: 'severe_pain',
    label: 'GURPS.STATUSSeverePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain5.webp',
    id: 'severe_pain2',
    label: 'GURPS.STATUSSeverePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain6.webp',
    id: 'terrible_pain',
    label: 'GURPS.STATUSTerriblePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-helpless.webp',
    id: 'agony',
    label: 'GURPS.STATUSAgony',
  },
  {
    icon: 'systems/gurps/icons/statuses/cth-condition-major-wound.webp',
    id: 'reeling',
    label: 'GURPS.STATUSReeling',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-exhausted.webp',
    id: 'exhausted',
    label: 'GURPS.STATUSExhausted',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-bleeding.webp',
    id: 'bleed',
    label: 'GURPS.STATUSBleed',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-poisoned.webp',
    id: 'poison',
    label: 'GURPS.STATUSPoison',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-burning.webp',
    id: 'burn',
    label: 'GURPS.STATUSBurn',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-suffocate.webp',
    id: 'suffocate',
    label: 'GURPS.STATUSSuffocate',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-unconscious.webp',
    id: 'disabled',
    label: 'GURPS.STATUSDisable',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-blinded.webp',
    id: 'blind',
    label: 'GURPS.STATUSBlind',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-deafened.webp',
    id: 'deaf',
    label: 'GURPS.STATUSDeaf',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-silenced.webp',
    id: 'silence',
    label: 'GURPS.STATUSSilence',
  },
  // {
  //   icon: 'systems/gurps/icons/statuses/cth-condition-readied.webp',
  //   id: 'aim',
  //   label: 'GURPS.STATUSAim',
  // },
  {
    icon: 'systems/gurps/icons/statuses/x-stealth.webp',
    id: 'stealth',
    label: 'GURPS.STATUSStealth',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-low-light-vision.webp',
    id: 'waiting',
    label: 'GURPS.STATUSWait',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-haste.webp',
    id: 'sprint',
    label: 'GURPS.STATUSSprint',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-1.webp',
    id: 'num1',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-2.webp',
    id: 'num2',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-3.webp',
    id: 'num3',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-4.webp',
    id: 'num4',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-5.webp',
    id: 'num5',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-6.webp',
    id: 'num6',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-7.webp',
    id: 'num7',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-8.webp',
    id: 'num8',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-9.webp',
    id: 'num9',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-10.webp',
    id: 'num10',
    label: 'GURPS.STATUSCounter',
  },
]

GURPS.SJGProductMappings = {
  ACT1: 'http://www.warehouse23.com/products/gurps-action-1-heroes',
  ACT3: 'http://www.warehouse23.com/products/gurps-action-3-furious-fists',
  B: 'http://www.warehouse23.com/products/gurps-basic-set-characters-and-campaigns',
  BS: 'http://www.warehouse23.com/products/gurps-banestorm',
  DF1: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-1-adventurers-1',
  DF3: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-3-the-next-level-1',
  DF4: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-4-sages-1',
  DF8: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-8-treasure-tables',
  DF11: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-11-power-ups',
  DF12: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-12-ninja',
  DF13: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-13-loadouts',
  DF14: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-14-psi',
  DFM1: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-monsters-1',
  DFA: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DFM: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DFS: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DFE: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DR: 'http://www.warehouse23.com/products/gurps-dragons-1',
  F: 'http://www.warehouse23.com/products/gurps-fantasy',
  FDG: 'https://gamingballistic.com/product/fantastic-dungeon-grappling-pdf-dfrpg/',
  GUL: 'https://www.gamesdiner.com/gulliver/',
  H: 'http://www.warehouse23.com/products/gurps-horror-1',
  HF: 'http://www.mygurps.com/historical_folks_4e.pdf',
  HT: 'http://www.warehouse23.com/products/gurps-high-tech-2',
  IW: 'http://www.warehouse23.com/products/gurps-infinite-worlds-1',
  LT: 'http://www.warehouse23.com/products/gurps-fourth-edition-low-tech',
  LTC1: 'http://www.warehouse23.com/products/gurps-low-tech-companion-1-philosophers-and-kings',
  LTIA: 'http://www.warehouse23.com/products/gurps-low-tech-instant-armor',
  LITE: 'http://www.warehouse23.com/products/SJG31-0004',
  M: 'http://www.warehouse23.com/products/gurps-magic-5',
  MPS: 'http://www.warehouse23.com/products/gurps-magic-plant-spells',
  MA: 'http://www.warehouse23.com/products/gurps-martial-arts',
  MAFCCS: 'http://www.warehouse23.com/products/gurps-martial-arts-fairbairn-close-combat-systems',
  MATG: 'http://www.warehouse23.com/products/gurps-martial-arts-technical-grappling',
  MH1: 'http://www.warehouse23.com/products/gurps-monster-hunters-1-champions',
  MYST: 'http://www.warehouse23.com/products/gurps-mysteries-1',
  MYTH: 'http://www.sjgames.com/gurps/books/myth/',
  P: 'http://www.warehouse23.com/products/gurps-powers',
  PDF: 'http://www.warehouse23.com/products/gurps-powers-divine-favor',
  PSI: 'http://www.warehouse23.com/products/gurps-psionic-powers',
  PU1: 'http://www.warehouse23.com/products/gurps-power-ups-1-imbuements-1',
  PU2: 'http://www.warehouse23.com/products/gurps-power-ups-2-perks',
  PU3: 'http://www.warehouse23.com/products/gurps-power-ups-3-talents',
  'PY#': 'http://www.warehouse23.com/products?utf8=%E2%9C%93&keywords=pyramid+magazine&x=0&y=0',
  RSWL: 'http://www.warehouse23.com/products/gurps-reign-of-steel-will-to-live',
  SU: 'http://www.warehouse23.com/products/gurps-supers-3',
  TMS: 'http://www.warehouse23.com/products/gurps-thaumatology-magical-styles',
  TRPM: 'http://www.warehouse23.com/products/gurps-thaumatology-ritual-path-magic',
  TS: 'http://www.warehouse23.com/products/gurps-tactical-shooting',
  TSOR: 'http://www.warehouse23.com/products/gurps-thaumatology-sorcery',
  UT: 'http://www.warehouse23.com/products/gurps-ultra-tech',
  VOR: 'http://www.warehouse23.com/products/vorkosigan-saga-sourcebook-and-roleplaying-game',
}

GURPS.USER_GUIDE_URL = 'https://bit.ly/2JaSlQd'

function escapeUnicode(str) {
  return str.replace(/[^\0-~]/g, function (ch) {
    return '&#x' + ('0000' + ch.charCodeAt().toString(16).toUpperCase()).slice(-4) + ';'
  })
}
GURPS.escapeUnicode = escapeUnicode

/**
 * Read text data from a user provided File object
 * Stolen from Foundry, and replaced 'readAsText' with 'readAsBinaryString' to save unicode characters.
 * @param {File} file           A File object
 * @return {Promise.<String>}   A Promise which resolves to the loaded text data
 */
function readTextFromFile(file) {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = ev => {
      resolve(reader.result)
    }
    reader.onerror = ev => {
      reader.abort()
      reject()
    }
    reader.readAsBinaryString(file)
  })
}
GURPS.readTextFromFile = readTextFromFile

// This is an ugly hack to clean up the "formatted text" output from GCS FG XML.
// First we have to remove non-printing characters, and then we want to replace
// all <p>...</p> with .../n before we try to convert to JSON.   Also, for some reason,
// the DOMParser doesn't like some of the stuff in the formatted text sections, so
// we will base64 encode it, and the decode it in the Named subclass setNotes()
function cleanUpP(xml) {
  // First, remove non-ascii characters
  // xml = xml.replace(/[^ -~]+/g, '')
  xml = GURPS.escapeUnicode(xml)

  // Now try to remove any lone " & " in names, etc.  Will only occur in GCA output
  xml = xml.replace(/ & /g, ' &amp; ')
  let swap = (xml, tagin, tagout) => {
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

/*
  A utility function to "deep" print an object
*/
function objToString(obj, ndeep) {
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

function trim(s) {
  return s.replace(/^\s*$(?:\r\n?|\n)/gm, '').trim() // /^\s*[\r\n]/gm
}
GURPS.trim = trim

async function executeOTF(string, priv = false, event) {
  if (!string) return false
  string = string.trim()
  if (string[0] == '[' && string[string.length - 1] == ']') string = string.substring(1, string.length - 1)
  let action = parselink(string)
  let answer = false
  if (!!action.action) {
    if (!event) event = { shiftKey: priv, ctrlKey: false, data: {} }
    answer = await GURPS.performAction(action.action, GURPS.LastActor, event)
  } else ui.notifications.warn(`"${string}" did not parse into a valid On-the-Fly formula`)
  return answer
}
GURPS.executeOTF = executeOTF

//	"modifier", "attribute", "selfcontrol", "roll", "damage", "skill", "pdf"
async function performAction(action, actor, event, targets) {
  if (!action) return
  let actordata = actor?.data
  let prefix = ''
  let thing = ''
  let target = -1 // < 0 non-targeted roll, > 0 targeted roll
  let formula = ''
  let targetmods = [] // Should get this from the ModifierBucket someday
  let opt = {
    blind: action.blindroll,
    event: event,
  } // Ok, I am slowly learning this Javascrip thing ;-)
  let savedBucket = GURPS.ModifierBucket.modifierStack.modifierList.slice() // may need to reset the state of the MB

  if (action.type === 'pdf') {
    GURPS.handlePdf(action.link)
    return true
  }

  if (action.type === 'modifier') {
    while (!!action && action.type === 'modifier') {
      let mod = parseInt(action.mod)
      GURPS.addModifier(mod, action.desc)
      action = action.next
    }
    return true
  }

  if (action.type === 'chat') {
    let chat = action.orig
    //if (!!event?.shiftKey || game.keyboard.isCtrl(event))
    chat = `/setEventFlags ${!!action.quiet} ${!!event?.shiftKey} ${game.keyboard.isCtrl(event)}\n${chat}`

    return await GURPS.ChatProcessors.startProcessingLines(chat, event?.chatmsgData, event)
  }
  
  if (action.type === 'dragdrop') {
    if (action.link == 'JournalEntry') {
      game.journal.get(action.id).show()
    }
    if (action.link == 'Actor') {
      game.actors.get(action.id).sheet.render(true)
    }
    if (action.link == 'RollTable') {
      game.tables.get(action.id).sheet.render(true)
    }
    if (action.link == 'Item') {
      game.items.get(action.id).sheet.render(true)
    }
  }

  if (action.type === 'controlroll') {
    prefix = 'Control Roll, '
    thing = action.desc
    formula = '3d6'
    target = parseInt(action.target)
  }

  if (action.type === 'roll') {
    prefix = 'Rolling ' + (!!action.displayformula ? action.displayformula : action.formula) + ' ' + action.desc
    formula = action.formula
    if (!!action.costs) targetmods.push(GURPS.ModifierBucket.makeModifier(0, action.costs))
  }

  if (action.type === 'damage') {
    if (!!action.costs) GURPS.addModifier(0, action.costs)
    if (!!action.mod) GURPS.addModifier(action.mod, action.desc) // special case where Damage comes from [D:attack + mod]
    DamageChat.create(actor || game.user, action.formula, action.damagetype, event, null, targets, action.extdamagetype)
    return true
  }

  if (action.type === 'deriveddamage')
    if (!!actor) {
      let df = action.derivedformula.match(/sw/i) ? actordata.data.swing : actordata.data.thrust
      if (!df) {
        ui.notifications.warn(actor.name + ' does not have a ' + action.derivedformula.toUpperCase() + ' formula')
        return true
      }
      formula = df + action.formula
      if (!!action.costs) GURPS.addModifier(0, action.costs)
      DamageChat.create(
        actor || game.user,
        formula,
        action.damagetype,
        event,
        action.derivedformula + action.formula.replace(/([+-]\d+).*/g, '$1'), // Just keep the +/- mod
        targets
      )
      return true
    } else ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))

  if (action.type === 'derivedroll')
    if (!!actor) {
      let df = action.derivedformula.match(/[Ss][Ww]/) ? actordata.data.swing : actordata.data.thrust
      formula = d6ify(df + action.formula)
      prefix = 'Rolling ' + action.derivedformula + action.formula + ' ' + action.desc
      if (!!action.costs) targetmods.push(GURPS.ModifierBucket.makeModifier(0, action.costs))
    } else ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))

  let processLinked = tempAction => {
    let bestLvl = -99999
    var bestAction, besttrue
    let attempts = []
    var th
    while (!!tempAction) {
      if (!!tempAction.truetext && !besttrue) besttrue = tempAction
      if (tempAction.type == 'attribute') {
        th = this._mapAttributePath(tempAction.path)
        let t = parseInt(tempAction.target) // is it pre-targeted (ST12)
        if (!t && !!actor) {
          if (!!tempAction.melee) {
            // Is it trying to match to an attack name (should only occur with Parry: & Block:
            let m = GURPS.findAttack(actordata, tempAction.melee)
            if (!!m) {
              th += ' for ' + m.name
              if (!!m.mode && !tempAction.desc) tempAction.desc = '(' + m.mode + ')'
              t = parseInt(m[tempAction.attribute.toLowerCase()]) // should only occur with parry & block
            }
            if (!m || !t) attempts.push(tempAction.attribute + ':' + tempAction.melee)
          } else {
            t = parseInt(this.resolve(tempAction.path, actordata.data))
            if (!t) attempts.push(tempAction.attribute)
          }
        }
        let sl = t
        if (!!tempAction.mod) sl += parseInt(tempAction.mod)
        if (sl > bestLvl) {
          bestLvl = parseInt(sl)
          bestAction = tempAction
          prefix = 'Roll vs '
          target = t
          thing = th
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
            level: parseInt(tempAction.target),
          }
        } else
          skill = GURPS.findSkillSpell(actordata, tempAction.name, !!tempAction.isSkillOnly, !!tempAction.isSpellOnly)
        if (!skill) {
          attempts.push(tempAction.name)
        } else {
          tempAction.obj = skill
          // on a normal skill check, look for the skill with the highest level
          let getLevel = skill => parseInt(skill.level)

          let getSkillName = skill => skill.name

          // on a floating skill check, we want the skill with the highest relative skill level
          if (!!tempAction.floatingAttribute)
            if (!!actor) {
              getSkillName = skill => `${tempAction.floatingLabel}-based ${skill.name}`

              let value = this.resolve(tempAction.floatingAttribute, actordata.data)
              getLevel = skill => {
                let rsl = skill.relativelevel //  this is something like 'IQ-2' or 'Touch+3'
                console.log(rsl)
                let valueText = rsl.replace(/^.*([+-]\d+)$/g, '$1')
                console.log(valueText)
                return valueText === rsl ? parseInt(value) : parseInt(valueText) + parseInt(value)
              }
            } else ui.notifications.warn('You must have a character selected to use a "Based" Skill')

          let skillLevel = getLevel(skill)

          if (!!tempAction.mod) skillLevel += parseInt(tempAction.mod)

          if (skillLevel > bestLvl) {
            bestLvl = skillLevel
            bestAction = tempAction
            thing = getSkillName(skill)
            tempAction.thing = thing
            target = getLevel(skill) // target is without mods
            prefix = ''
            if (!!tempAction.truetext) besttrue = tempAction
          }
        }
      }
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
    const [bestAction, attempts] = processLinked(action)
    if (!actor && (!bestAction || !bestAction.target)) {
      ui.notifications.warn('You must have a character selected')
      return false
    }
    if (!bestAction) {
      if (!action.calcOnly)
        ui.notifications.warn("Unable to find '" + attempts.join("' or '").replace('<', '&lt;') + "' on " + actor.name)
      return false
    }
    formula = '3d6'
    opt.action = bestAction
    opt.obj = bestAction.obj
    if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event))) return false
    if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event)

    if (!!bestAction.costs) GURPS.addModifier(0, action.costs)
    if (!!bestAction.mod) GURPS.addModifier(bestAction.mod, bestAction.desc, targetmods)
    else if (!!bestAction.desc) opt.text = "<span style='font-size:85%'>" + bestAction.desc + '</span>'
  }

  if (action.type === 'attack')
    if (!!actor) {
      let att = null
      prefix = ''
      att = GURPS.findAttack(actordata, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards
      if (!att) {
        if (!action.calcOnly)
          ui.notifications.warn(
            "No melee or ranged attack named '" + action.name.replace('<', '&lt;') + "' found on " + actor.name
          )
        return false
      }
      thing = att.name // get real name of attack
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
          if (!!m) GURPS.addModifier(0, m) //  Level may have "*Costs xFP"
        }
      }
      opt.obj = att // save the attack in the optional parameters, in case it has rcl/rof
      if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event))) return false
      if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event)
      formula = '3d6'
      if (!!action.costs) GURPS.addModifier(0, action.costs)
      if (!!action.mod) GURPS.addModifier(action.mod, action.desc, targetmods)
      if (!!att.mode) opt.text = "<span style='font-size:85%'>(" + att.mode + ')</span>'
    } else ui.notifications.warn('You must have a character selected')

  if (action.type === 'attackdamage')
    if (!!actor) {
      let att = null
      att = GURPS.findAttack(actordata, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards
      if (!att) {
        ui.notifications.warn(
          "No melee or ranged attack named '" + action.name.replace('<', '&lt;') + "' found on " + actor.name
        )
        return false
      }
      let dam = parseForDamage(att.damage)
      if (!!dam.action) {
        dam.action.costs = action.costs
        dam.action.mod = action.mod
        dam.action.desc = action.desc
        await performAction(dam.action, actor, event, targets)
      }
    } else ui.notifications.warn('You must have a character selected')

  if (!formula || target == 0 || isNaN(target)) return false // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  if (!!action.calcOnly) {
    for (let m of targetmods) target += m.modint
    GURPS.ModifierBucket.modifierStack.modifierList = savedBucket
    return { target: target, thing: thing }
  }
  return await doRoll(actor, formula, targetmods, prefix, thing, target, opt)
}
GURPS.performAction = performAction

function addModifier(mod, desc, list) {
  GURPS.ModifierBucket.addModifier(mod, desc, list)
}
GURPS.addModifier = addModifier

// Find the skill or spell.   if isSkillOnly or isSpellOnly set, only check that list
function findSkillSpell(actor, sname, isSkillOnly = false, isSpellOnly = false) {
  var t
  if (!actor) return t
  if (!!actor.data?.data?.additionalresources) actor = actor.data
  sname = makeRegexPatternFrom(sname, false)
  sname = new RegExp(sname, 'i')
  let best = 0
  if (!isSpellOnly)
    recurselist(actor.data.skills, s => {
      if (s.name.match(sname) && s.level > best) {
        t = s
        best = parseInt(s.level)
      }
    })
  if (!t)
    if (!isSkillOnly)
      recurselist(actor.data.spells, s => {
        if (s.name.match(sname) && s.level > best) {
          t = s
          best = parseInt(s.level)
        }
      })
  return t
}
GURPS.findSkillSpell = findSkillSpell

function findAdDisad(actor, sname) {
  var t
  if (!actor) return t
  if (!!actor.data?.data?.additionalresources) actor = actor.data
  sname = makeRegexPatternFrom(sname, false)
  sname = new RegExp(sname, 'i')
  recurselist(actor.data.ads, s => {
    if (s.name.match(sname)) {
      t = s
    }
  })
  return t
}
GURPS.findAdDisad = findAdDisad

function findAttack(actor, sname, isMelee = true, isRanged = true) {
  var t
  if (!actor) return t
  if (!!actor.data?.data?.additionalresources) actor = actor.data
  sname = makeRegexPatternFrom(sname, false)
  sname = new RegExp(sname, 'i')
  if (isMelee)
    t = actor.data.melee?.findInProperties(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(sname))
  if (isRanged && !t)
    t = actor.data.ranged?.findInProperties(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(sname))
  return t
}
GURPS.findAttack = findAttack

/**
 * The user clicked on a field that would allow a dice roll. Use the element
 * information to try to determine what type of roll.
 *
 * @param {*} event
 * @param {*} actor
 * @param {Array<String>} targets - labels for multiple Damage rolls
 */
async function handleRoll(event, actor, targets) {
  event.preventDefault()
  let formula = ''
  let targetmods = null
  let element = event.currentTarget
  let prefix = ''
  let thing = ''
  let opt = { event: event }
  let target = 0 // -1 == damage roll, target = 0 is NO ROLL.
  if (!!actor) GURPS.SetLastActor(actor)

  if ('damage' in element.dataset) {
    // expect text like '2d+1 cut'
    let f = !!element.dataset.otf ? element.dataset.otf : element.innerText.trim()
    let action = parseForDamage(f)
    if (!!action.action) performAction(action.action, actor, event, targets)
    return
  } else if ('path' in element.dataset) {
    prefix = 'Roll vs '
    thing = this._mapAttributePath(element.dataset.path)
    formula = '3d6'
    target = parseInt(element.innerText)
  } else if ('name' in element.dataset || 'otf' in element.dataset) {
    prefix = '' // "Attempting ";
    let text = element.dataset.name || element.dataset.otf
    text = text.replace(/ \(\)$/g, '') // sent as "name (mode)", and mode is empty
    thing = text.replace(/(.*?)\(.*\)/g, '$1')

    // opt.text = text.replace(/.*?\((.*)\)/g, "<br>&nbsp;<span style='font-size:85%'>($1)</span>");
    opt.text = text.replace(/.*?\((.*)\)/g, '$1')

    if (opt.text === text) opt.text = ''
    else opt.text = "<span style='font-size:85%'>(" + opt.text + ')</span>'
    let k = $(element).closest('[data-key]').attr('data-key')
    if (!k) k = element.dataset.key
    if (!!k) {
      opt.obj = getProperty(actor.data, k) // During the roll, we may want to extract something from the object
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
        if (!!m) ui.modifierbucket.addModifier(0, m)
      }
    }
  } else if ('roll' in element.dataset) {
    target = -1 // Set flag to indicate a non-targeted roll
    formula = element.innerText
    prefix = 'Rolling ' + formula
    formula = d6ify(formula)
  }

  doRoll(actor, formula, targetmods, prefix, thing, target, opt)
}
GURPS.handleRoll = handleRoll

// If the desc contains *Cost ?FP or *Max:9 then perform action
async function applyModifierDesc(actor, desc) {
  if (!desc) return null
  let m = desc.match(/.*\* ?Costs? (\d+) ?([ \w\(\)]+)/i)
  if (!!m && !!actor && !actor.isSelf) {
    let delta = parseInt(m[1])
    let target = m[2]
    if (target.match(/^[hf]p/i)) {
      let k = target.toUpperCase()
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

// Return html for text, parsing GURPS "links" into <span class="gurplink">XXX</span>
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
        if (!action.action) output += '['
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

// Convert GCS page refs into PDFoundry book & page.   Special handling for refs like "PU8:12"
function handleOnPdf(event) {
  event.preventDefault()
  GURPS.handlePdf(event.currentTarget.innerText)
}
GURPS.handleOnPdf = handleOnPdf

function handlePdf(links) {
  if (!ui.PDFoundry) {
    ui.notifications.warn('PDFoundry must be installed and configured to use links.')
    return
  }

  // Just in case we get sent multiple links separated by commas, we will open them all
  links.split(',').forEach(link => {
    let t = link.trim()
    let i = t.indexOf(':')
    let book = ''
    let page = 0
    if (i > 0) {
      book = t.substring(0, i).trim()
      page = parseInt(t.substr(i + 1))
    } else {
      book = t.replace(/[0-9]*/g, '').trim()
      page = parseInt(t.replace(/[a-zA-Z]*/g, ''))
    }
    // Special case for Separate Basic Set PDFs
    if (book === 'B') {
      let s = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BASICSET_PDF)
      if (page > 336)
        if (s === 'Separate') {
          book = 'BX'
          page = page - 335
        } else page += 2
    }
    const pdf = ui.PDFoundry.findPDFDataByCode(book)
    if (pdf === undefined) {
      let url = game.GURPS.SJGProductMappings[book]
      if (!url) url = 'http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb' // The main GURPS page
      window.open(url, '_blank')
    } else ui.PDFoundry.openPDF(pdf, { page })
  })
}
GURPS.handlePdf = handlePdf

// Return the i18n string for this data path (note en.json must match up to the data paths).
// special case, drop ".value" from end of path (and append "NAME"), usually used for attributes
function _mapAttributePath(path, suffix) {
  let i = path.indexOf('.value')
  if (i >= 0) {
    path = path.substr(0, i) + 'NAME' // used for the attributes
  }
  path = path.replace(/\./g, '') // remove periods
  return game.i18n.localize('GURPS.' + path)
}
GURPS._mapAttributePath = _mapAttributePath

// Given a string path "x.y.z", use it to resolve down an object heiracrhy
function resolve(path, obj = self, separator = '.') {
  var properties = Array.isArray(path) ? path : path.split(separator)
  return properties.reduce((prev, curr) => prev && prev[curr], obj)
}
GURPS.resolve = resolve

/*
  A user has clicked on a "gurpslink", so we can assume that it previously qualified as a "gurpslink"
  and followed the On-the-Fly formulas.   As such, we may already have an action block (base 64 encoded so we can handle
  any text).  If not, we will just re-parse the text looking for the action block.    
*/
function handleGurpslink(event, actor, desc, targets) {
  event.preventDefault()
  let element = event.currentTarget
  let action = element.dataset.action // If we have already parsed
  if (!!action) action = JSON.parse(atou(action))
  else action = parselink(element.innerText, desc).action
  this.performAction(action, actor, event, targets)
}
GURPS.handleGurpslink = handleGurpslink

/* You may be asking yourself, why the hell is he generating fake keys to fit in an object
  when he could have just used an array.   Well, I had TONs of problems with the handlebars and Foundry
  trying to deal with an array.   While is "should" be possible to use it, and some people claim
  that they could... everything I tried did something wonky.   So the 2am fix was just make everything an
  object with fake indexes.   Handlebars deals with this just fine using {{#each someobject}} 
  and if you really did just want to modify a single entry, you could use {{#each someobject as | obj key |}}
  which will give you the object, and also the key, such that you could execute someobject.key to get the 
  correct instance.   */
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
 * @param {*} obj
 * @param {*} value
 * @param {*} index
 */
function put(obj, value, index = -1) {
  if (index == -1) {
    index = 0
    while (obj.hasOwnProperty(this.genkey(index))) index++
  }
  let k = this.genkey(index)
  obj[k] = value
  return k
}
GURPS.put = put

// Convolutions to remove a key from an object and fill in the gaps, necessary
// because the default add behavior just looks for the first open gap
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
  await actor.update({ [t]: null }) // Delete the whole object
  delete object[key]
  i = parseInt(key)

  i = i + 1
  while (object.hasOwnProperty(this.genkey(i))) {
    let k = this.genkey(i)
    object[key] = object[k]
    delete object[k]
    key = k
    i++
  }
  let sorted = Object.keys(object)
    .sort()
    .reduce((a, v) => {
      a[v] = object[v]
      return a
    }, {}) // Enforced key order
  actor.ignoreRender = oldRender
  await actor.update({ [objpath]: sorted }, { diff: false })
}
GURPS.removeKey = removeKey

// Because the DB just merges keys, the best way to insert is to delete the whole colleciton object, fix it up, and then re-add it.
async function insertBeforeKey(actor, path, newobj) {
  let i = path.lastIndexOf('.')
  let objpath = path.substring(0, i)
  let key = path.substr(i + 1)
  i = objpath.lastIndexOf('.')
  let parentpath = objpath.substring(0, i)
  let objkey = objpath.substr(i + 1)
  let object = GURPS.decode(actor.data, objpath)
  let t = parentpath + '.-=' + objkey
  await actor.update({ [t]: null }) // Delete the whole object
  let start = parseInt(key)

  i = start + 1
  while (object.hasOwnProperty(this.genkey(i))) i++
  i = i - 1
  for (let z = i; z >= start; z--) {
    object[genkey(z + 1)] = object[genkey(z)]
  }
  object[key] = newobj
  let sorted = Object.keys(object)
    .sort()
    .reduce((a, v) => {
      a[v] = object[v]
      return a
    }, {}) // Enforced key order
  await actor.update({ [objpath]: sorted })
}
GURPS.insertBeforeKey = insertBeforeKey

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

/*  Funky helper function to be able to list hierarchical equipment in a linear list (with appropriate keys for editing)
 */
function listeqtrecurse(eqts, options, level, data, parentkey = '') {
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
    ret = ret + options.fn(eqt, { data: data })
    ret = ret + GURPS.listeqtrecurse(eqt.contains, options, level + 1, data, parentkey + key + '.contains.')
  }
  return ret
}
GURPS.listeqtrecurse = listeqtrecurse

// Given a jquery html, attach all of our listeners to it.  No need to call bind(), since they don't use "this"
function hookupGurps(html) {
  html.find('.gurpslink').click(GURPS.chatClickGurpslink)
  html.find('.gmod').click(GURPS.chatClickGmod)
  html.find('.glinkmod').click(GURPS.chatClickGmod)
  html.find('.glinkmodplus').click(GURPS.chatClickGmod)
  html.find('.glinkmodminus').click(GURPS.chatClickGmod)
  html.find('.pdflink').click(GURPS.handleOnPdf)
}
GURPS.hookupGurps = hookupGurps

function chatClickGurpslink(event) {
  game.GURPS.handleGurpslink(event, game.GURPS.LastActor)
}
GURPS.chatClickGurpslink = chatClickGurpslink

function chatClickGmod(event) {
  let element = event.currentTarget
  let desc = element.dataset.name
  game.GURPS.handleGurpslink(event, game.GURPS.LastActor, desc)
}
GURPS.chatClickGmod = chatClickGmod

GURPS.onRightClickGurpslink = function (event) {
  event.preventDefault()
  event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
  let el = event.currentTarget
  let action = el.dataset.action
  if (!!action) {
    action = JSON.parse(atou(action))
    if (action.type === 'damage' || action.type === 'deriveddamage')
      GURPS.resolveDamageRoll(event, GURPS.LastActor, action.orig, action.overridetxt, game.user.isGM, true)
    else GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, GURPS.LastActor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
  }
}

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
    if (canblind && blindcheck.blindroll) {
      otf = '!' + otf
      canblind = false
    }
  }
  if (!!overridetxt) {
    if (overridetxt.includes('"')) overridetxt = "'" + overridetxt + "'"
    else overridetxt = '"' + overridetxt + '"'
  } else overridetxt = ''
  let users = actor?.getOwners().filter(u => !u.isGM) || []
  let botf = '[' + overridetxt + '!' + otf + ']'
  otf = '[' + overridetxt + otf + ']'
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

GURPS.sendOtfMessage = function (content, blindroll, users) {
  let msgData = {
    content: content,
    user: game.user.id,
    blind: blindroll,
  }
  if (!!users) {
    msgData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
    msgData.whisper = users.map(it => it.id)
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
      let text = html.find('#number-rolls').val()
      let number = parseInt(text)
      let targets = []
      for (let index = 0; index < number; index++) {
        targets[index] = `${index + 1}`
      }
      if (isOtf) game.GURPS.handleGurpslink(event, actor, null, targets)
      else game.GURPS.handleRoll(event, actor, targets)
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

GURPS.setInitiativeFormula = function (broadcast) {
  let formula = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_INITIATIVE_FORMULA)
  if (!formula) {
    formula = Initiative.defaultFormula()
    if (game.user.isGM) game.settings.set(settings.SYSTEM_NAME, settings.SETTING_INITIATIVE_FORMULA, formula)
  }
  let m = formula.match(/([^:]*):?(\d)?/)
  let d = !!m[2] ? parseInt(m[2]) : 5
  CONFIG.Combat.initiative = {
    formula: m[1],
    decimals: d, // Important to be able to maintain resolution
  }
  if (broadcast)
    game.socket.emit('system.gurps', {
      type: 'initiativeChanged',
      formula: m[1],
      decimals: d,
    })
}

/*********************  HACK WARNING!!!! *************************/
/* The following method has been secretly added to the Object class/prototype to
   make it work like an Array. 
*/
Object.defineProperty(Object.prototype, 'findInProperties', {
  value: function (expression) {
    return Object.values(this).find(expression)
  },
})

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once('init', async function () {
  console.log(GURPS.BANNER)
  console.log(`Initializing GURPS 4e Game Aid`)
  console.log(GURPS.LEGAL)

  game.GURPS = GURPS
  CONFIG.GURPS = GURPS

  let src = game.i18n.lang == 'pt_br' ? 'systems/gurps/icons/gurps4e-pt_br.webp' : 'systems/gurps/icons/gurps4e.webp'

  $('#logo').attr('src', src)

  // set up all hitlocation tables (must be done before MB)
  HitLocation.init()
  DamageChat.initSettings()
  RegisterChatProcessors()

  // Modifier Bucket must be defined after hit locations
  GURPS.ModifierBucket = new ModifierBucket()
  ui.modifierbucket = GURPS.ModifierBucket
  ui.modifierbucket.render(true)

  GURPS.rangeObject = new GURPSRange()
  GURPS.initiative = new Initiative()
  GURPS.hitpoints = new HitFatPoints()
  GURPS.ConditionalInjury = new GURPSConditionalInjury()

  // Define custom Entity classes
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
  Actors.registerSheet('gurps', GurpsActorCombatSheet, {
    label: 'Combat',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsActorEditorSheet, {
    label: 'Editor',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsActorSimplifiedSheet, {
    label: 'Simple',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsActorNpcSheet, {
    label: 'NPC/mini',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsActorNpcSheetCI, {
    label: 'NPC/mini Conditional Injury',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsInventorySheet, {
    label: 'Inventory Only',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsActorTabSheet, {
    label: 'Tabbed Sheet',
    makeDefault: false,
  })
  Actors.registerSheet('gurps', GurpsActorSheet, {    // Add this sheet last 
    label: 'Full (GCS)',
    makeDefault: true,
  })

  Items.unregisterSheet('core', ItemSheet)
  Items.registerSheet('gurps', GurpsItemSheet, { makeDefault: true })

  // Warning, the very first table will take a refresh before the dice to show up in the dialog.  Sorry, can't seem to get around that
  Hooks.on('createRollTable', async function (entity, options, userId) {
    await entity.update({ img: 'systems/gurps/icons/single-die.webp' })
    entity.data.img = 'systems/gurps/icons/single-die.webp'
  })

  Hooks.on('renderTokenHUD', (...args) => ManeuverHUDButton.prepTokenHUD(...args))

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
              content: await renderTemplate('systems/gurps/templates/item-import.html'),
              buttons: {
                import: {
                  icon: '<i class="fas fa-file-import"></i>',
                  label: 'Import',
                  callback: html => {
                    const form = html.find('form')[0]
                    let files = form.data.files
                    let file = null
                    if (!files.length) {
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
  canvas.hud.token = new GURPSTokenHUD()

  initializeDamageTables()
  ResourceTrackerManager.initSettings()

  if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_3D6))
    new ThreeD6({
      popOut: false,
      minimizable: false,
      resizable: false,
      id: 'ThreeD6',
      template: 'systems/gurps/templates/threed6.html',
      classes: [],
    }).render(true)

  GURPS.currentVersion = SemanticVersion.fromString(game.system.data.version)
  // Test for migration
  let mv = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_MIGRATION_VERSION)
  let quiet = false
  if (!mv) {
    mv = '0.0.1'
    quiet = true
  }
  console.log('Current Version: ' + GURPS.currentVersion + ', Migration version: ' + mv)
  const migrationVersion = SemanticVersion.fromString(mv)
  if (migrationVersion.isLowerThan(GURPS.currentVersion)) {
    // check which migrations are needed
    if (migrationVersion.isLowerThan(settings.VERSION_096)) await Migration.migrateTo096(quiet)
    if (migrationVersion.isLowerThan(settings.VERSION_097)) await Migration.migrateTo097(quiet)
    if (migrationVersion.isLowerThan(settings.VERSION_0104)) await Migration.migrateTo0104(quiet)

    game.settings.set(settings.SYSTEM_NAME, settings.SETTING_MIGRATION_VERSION, game.system.data.version)
  }

  // Show changelog
  const v = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_CHANGELOG_VERSION) || '0.0.1'
  const changelogVersion = SemanticVersion.fromString(v)

  if (GURPS.currentVersion.isHigherThan(changelogVersion)) {
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
    <div><a href="https://ko-fi.com/crnormand"><img height="24" src="systems/gurps/icons/SupportMe_stroke@2x.webp"></a></div>
  </div>
</div>`,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        whisper: [game.user],
      })
    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_CHANGELOG)) {
      const app = new ChangeLogWindow(changelogVersion)
      app.render(true)
      game.settings.set(settings.SYSTEM_NAME, settings.SETTING_CHANGELOG_VERSION, GURPS.currentVersion.toString())
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

  Hooks.on('hotbarDrop', async (bar, data, slot) => {
    console.log(data)
    if (!data.otf && !data.bucket) return
    let otf = data.otf || data.bucket
    otf = otf.split('\\').join('\\\\') // must double backslashes since this is a 'script' macro
    let cmd = ''
    if (!!data.bucket)
      cmd += `GURPS.ModifierBucket.clear()
`
    cmd += 'GURPS.executeOTF(`' + otf + '`)' // Surround OTF in backticks... to allow single and double quotes in OtF
    let name = otf
    if (!!data.displayname) name = data.displayname
    if (!!data.actor) {
      cmd =
        `GURPS.SetLastActor(game.actors.get('${data.actor}'))
` + cmd
      name = game.actors.get(data.actor).name + ': ' + name
    }
    let macro = await Macro.create({
      name: name,
      type: 'script',
      command: cmd,
    })
    game.user.assignHotbarMacro(macro, slot)
    return false
  })

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
          let target = game.combat.combatants.filter(c => c.id === combatant)[0]
          if (!!target.actor?.data.data.additionalresources[$(el).attr('data-onethird')]) $(el).addClass('active')
        }

        html.find('[data-onethird]').click(ev => {
          let el = ev.currentTarget
          let flag = false
          if ($(el).hasClass('active')) $(el).removeClass('active')
          else {
            $(el).addClass('active')
            flag = true
          }
          let combatant = $(el).parents('.combatant').attr('data-combatant-id')
          let target = game.combat.combatants.filter(c => c.id === combatant)[0]
          target.actor.changeOneThirdStatus($(el).attr('data-onethird'), flag)
        })
      }
      html.addClass('bound')
      html.on('drop', function (ev) {
        console.log('Handle drop event on combatTracker')
        ev.preventDefault()
        ev.stopPropagation()
        let elementMouseIsOver = document.elementFromPoint(ev.clientX, ev.clientY)

        let combatant = $(elementMouseIsOver).parents('.combatant').attr('data-combatant-id')
        let target = game.combat.combatants.filter(c => c.id === combatant)[0]

        let event = ev.originalEvent
        let dropData = JSON.parse(event.dataTransfer.getData('text/plain'))
        if (dropData.type === 'damageItem') {
          target.actor.handleDamageDrop(dropData.payload)
        }
      })
    }
  })

  game.socket.on('system.gurps', resp => {
    if (resp.type == 'updatebucket') {
      if (resp.users.includes(game.user.id)) game.GURPS.ModifierBucket.updateModifierBucket(resp.bucket)
    }
    if (resp.type == 'initiativeChanged') {
      CONFIG.Combat.initiative = {
        formula: resp.formula,
        decimals: resp.decimals,
      }
    }
    if (resp.type == 'executeOtF') {
      if (game.users.isGM || (resp.users.length > 0 && !resp.users.includes(game.user.name))) return
      GURPS.performAction(resp.action, GURPS.LastActor)
    }
    if (resp.type == 'dragEquipment1') {
      if (resp.destuserid != game.user.id) return
      let destactor = game.actors.get(resp.destactorid)
      let srcActor = game.actors.get(resp.srcactorid)
      Dialog.confirm({
        title: `Gift for ${destactor.name}!`,
        content: `<p>${srcActor.name} wants to give you ${resp.itemData.name} (${resp.count}),</p><br>Ok?`,
        yes: () => {
          let destKey = destactor._findEqtkeyForId('globalid', resp.itemData.data.globalid)
          if (!!destKey) {
            // already have some
            let destEqt = getProperty(destactor.data, destKey)
            destactor.updateEqtCount(destKey, destEqt.count + resp.count)
          } else {
            resp.itemData.data.equipped = true
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
      let eqt = getProperty(srcActor.data, resp.srckey)
      if (resp.count >= eqt.count) {
        srcActor.deleteEquipment(resp.srckey)
      } else {
        srcActor.updateEqtCount(resp.srckey, eqt.count - resp.count)
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
        if (args[1]) game.GURPS.SetLastActor(a)
        else game.GURPS.ClearLastActor(a)
      }
    }
  })

  Hooks.on('renderJournalSheet', (app, html, opts) => {
    let h = html.find('.editor-content')
    if (!!h) {
      h.html(GURPS.gurpslink(h[0].innerHTML))
      GURPS.hookupGurps(html)
      html.find('.gurpslink').contextmenu(GURPS.onRightClickGurpslink)
      html.find('.glinkmod').contextmenu(GURPS.onRightClickGurpslink)
      html.find('.glinkmodplus').contextmenu(GURPS.onRightClickGurpslink)
      html.find('.glinkmodminus').contextmenu(GURPS.onRightClickGurpslink)
      html.find('.pdflink').contextmenu(event => {
        event.preventDefault()
        let el = event.currentTarget
        GURPS.whisperOtfToOwner('PDF:' + el.innerText, null, event, false, GURPS.LastActor)
      })
    }
    html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', true)
      li.addEventListener('dragstart', ev => {
        let display = ''
        if (!!ev.currentTarget.dataset.action) display = ev.currentTarget.innerText
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf'),
            displayname: display,
          })
        )
      })
    })
  })

  /**
   * Add a listener to handle damage being dropped on a token.
   */
  Hooks.on('dropCanvasData', async function (canvas, dropData) {
    if (dropData.type === 'damageItem' || dropData.type === 'Item' || dropData.type === 'equipment') {
      let oldselection = new Set(game.user.targets) // remember current targets (so we can reselect them afterwards)
      let grid_size = canvas.scene.data.grid
      canvas.tokens.targetObjects({
        x: dropData.x - grid_size / 2,
        y: dropData.y - grid_size / 2,
        height: grid_size,
        width: grid_size,
        releaseOthers: true,
      })
      let targets = [...game.user.targets]

      // Now that we have the list of targets, reset the target selection back to whatever the user had
      for (let t of game.user.targets) {
        t.setTarget(false, { releaseOthers: false, groupSelection: true })
      }
      oldselection.forEach(t => {
        t.setTarget(true, { releaseOthers: false, groupSelection: true })
      })

      let handle = actor => actor.handleDamageDrop(dropData.payload)
      if (dropData.type === 'Item') handle = actor => actor.handleItemDrop(dropData)
      if (dropData.type === 'equipment') handle = actor => actor.handleEquipmentDrop(dropData)

      // actual targets are stored in game.user.targets
      if (targets.length === 0) return false
      if (targets.length === 1) {
        handle(targets[0].actor)
        return false
      }

      let buttons = {
        apply: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('GURPS.addApply'),
          callback: html => {
            let name = html.find('select option:selected').text().trim()
            let target = targets.find(token => token.name === name)
            handle(target.actor)
          },
        },
      }

      let d = new Dialog(
        {
          title: game.i18n.localize('GURPS.selectToken'),
          content: await renderTemplate('systems/gurps/templates/apply-damage/select-token.html', {
            tokens: targets,
          }),
          buttons: buttons,
          default: 'apply',
          tokens: targets,
        },
        { width: 300 }
      )
      await d.render(true)

      return false
    }
  })

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
    let mappings = {}
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

  Hooks.on('createToken', async function (token, d, options, userId) {
    console.log(`create Token`)
    let actor = token.actor
    // data protect against bad tokens
    if (!!actor) {
      let maneuverText = actor.data.data.conditions.maneuver
      actor.updateManeuver(maneuverText, token._id)
    }
  })

  // End of system "READY" hook.
})
