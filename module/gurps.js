// Import Modules
import { parselink, parseForDamage } from '../lib/parselink.js';

import { GurpsActor } from './actor.js'
import { GurpsItem } from './item.js'
import { GurpsItemSheet } from './item-sheet.js'
import {
  GurpsActorCombatSheet,
  GurpsActorSheet,
  GurpsActorEditorSheet,
  GurpsActorSimplifiedSheet,
  GurpsActorNpcSheet
} from './actor-sheet.js'
import { ModifierBucket } from './modifiers.js'
import { ChangeLogWindow } from '../lib/change-log.js'
import { SemanticVersion } from '../lib/semver.js'
import { d6ify, recurselist, getAllActorsInActiveScene } from '../lib/utilities.js'
import { ThreeD6 } from '../lib/threed6.js'
import { doRoll } from '../module/dierolls/dieroll.js'

export const GURPS = {}
window.GURPS = GURPS // Make GURPS global!

GURPS.BANNER = `   __ ____ _____ _____ _____ _____ ____ __    
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
import { NpcInput } from '../lib/npc-input.js'
import addChatHooks from './chat.js'

import GURPSConditionalInjury from './injury/foundry/conditional-injury.js'

addChatHooks()
jqueryHelpers()
handlebarHelpers()
settings.initializeSettings()

// Use the target d6 icon for rolltable entries
CONFIG.RollTable.resultIcon = 'systems/gurps/icons/single-die.png'

//CONFIG.debug.hooks = true;

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
    GURPS.ModifierBucket.refresh()
    GURPS.LastActor = null
    if (canvas.tokens.controlled.length > 0) {
      GURPS.SetLastActor(canvas.tokens.controlled[0].actor)
    } // There may still be tokens selected... if so, select one of them
  }
}

GURPS.ChatCommandsInProcess = [] // Taking advantage of synchronous nature of JS arrays

GURPS.attributepaths = {
  ST: 'attributes.ST.value',
  DX: 'attributes.DX.value',
  IQ: 'attributes.IQ.value',
  HT: 'attributes.HT.value',
  WILL: 'attributes.WILL.value',
  Will: 'attributes.WILL.value',
  PER: 'attributes.PER.value',
  Per: 'attributes.PER.value'
}

// Map stuff back to translation keys... don't know if useful yet
GURPS.attributes = {
  ST: 'GURPS.attributesST',
  DX: 'GURPS.attributesDX',
  IQ: 'GURPS.attributesIQ',
  HT: 'GURPS.attributesHT',
  Will: 'GURPS.attributesWILL',
  Per: 'GURPS.attributesPER'
}

GURPS.attributeNames = {
  ST: 'GURPS.attributesSTNAME',
  DX: 'GURPS.attributesDXNAME',
  IQ: 'GURPS.attributesIQNAME',
  HT: 'GURPS.attributesHTNAME',
  Will: 'GURPS.attributesWILLNAME',
  Per: 'GURPS.attributesPERNAME'
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
  'Per/VH': 'GURPS.SkillPerVH'
}

GURPS.PARSELINK_MAPPINGS = {
  Vision: 'vision',
  VISION: 'vision',
  FRIGHTCHECK: 'frightcheck',
  Frightcheck: 'frightcheck',
  'Fright check': 'frightcheck',
  'Fright Check': 'frightcheck',
  Hearing: 'hearing',
  HEARING: 'hearing',
  TASTESMELL: 'tastesmell',
  'Taste Smell': 'tastesmell',
  'TASTE SMELL': 'tastesmell',
  TASTE: 'tastesmell',
  SMELL: 'tastesmell',
  Taste: 'tastesmell',
  Smell: 'tastesmell',
  TOUCH: 'touch',
  Touch: 'touch'
}

GURPS.SavedStatusEffects = CONFIG.statusEffects

CONFIG.statusEffects = [
  {
    icon: 'systems/gurps/icons/statuses/condition-shock1.png',
    id: 'shock1',
    label: 'EFFECT.StatusShocked'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock2.png',
    id: 'shock2',
    label: 'EFFECT.StatusShocked'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock3.png',
    id: 'shock3',
    label: 'EFFECT.StatusShocked'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock4.png',
    id: 'shock4',
    label: 'EFFECT.StatusShocked'
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-stunned.png',
    id: 'stun',
    label: 'EFFECT.StatusStunned'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-grappled.png',
    id: 'grapple',
    label: 'GURPS.STATUSGrapple'
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-prone.png',
    id: 'prone',
    label: 'EFFECT.StatusProne'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-kneel.png',
    id: 'kneel',
    label: 'GURPS.STATUSKneel'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-crouch.png',
    id: 'crouch',
    label: 'GURPS.STATUSCrouch'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-sit.png',
    id: 'sit',
    label: 'GURPS.STATUSSit'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-flying.png',
    id: 'fly',
    label: 'GURPS.STATUSFly'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-fall.png',
    id: 'fall',
    label: 'GURPS.STATUSFall'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-pinned.png',
    id: 'pinned',
    label: 'GURPS.STATUSPin'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-nauseated.png',
    id: 'nauseated',
    label: 'GURPS.STATUSNauseated'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-cough.png',
    id: 'coughing',
    label: 'GURPS.STATUSCoughing'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-wretch.png',
    id: 'retching',
    label: 'GURPS.STATUSRetching'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-drowsy.png',
    id: 'drowsy',
    label: 'GURPS.STATUSDrowsy'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-asleep.png',
    id: 'sleeping',
    label: 'GURPS.STATUSSleep'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-drunk1.png',
    id: 'tipsy',
    label: 'GURPS.STATUSTipsy'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-drunk2.png',
    id: 'drunk',
    label: 'GURPS.STATUSDrunk'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-fascinated.png',
    id: 'euphoria',
    label: 'GURPS.STATUSEuphoria'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain1.png',
    id: 'mild_pain',
    label: 'GURPS.STATUSMildPain'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain2.png',
    id: 'moderate_pain',
    label: 'GURPS.STATUSModeratePain'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain3.png',
    id: 'moderate_pain2',
    label: 'GURPS.STATUSModeratePain'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain4.png',
    id: 'severe_pain',
    label: 'GURPS.STATUSSeverePain'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain5.png',
    id: 'severe_pain2',
    label: 'GURPS.STATUSSeverePain'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain6.png',
    id: 'terrible_pain',
    label: 'GURPS.STATUSTerriblePain'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-helpless.png',
    id: 'agony',
    label: 'GURPS.STATUSAgony'
  },
  {
    icon: 'systems/gurps/icons/statuses/cth-condition-major-wound.png',
    id: 'reeling',
    label: 'GURPS.STATUSReeling'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-exhausted.png',
    id: 'exhausted',
    label: 'GURPS.STATUSExhausted'
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-bleeding.png',
    id: 'bleed',
    label: 'GURPS.STATUSBleed'
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-poisoned.png',
    id: 'poison',
    label: 'GURPS.STATUSPoison'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-burning.png',
    id: 'burn',
    label: 'GURPS.STATUSBurn'
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-suffocate.png',
    id: 'suffocate',
    label: 'GURPS.STATUSSuffocate'
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-unconscious.png',
    id: 'disbled',
    label: 'GURPS.STATUSDisable'
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-blinded.png',
    id: 'blind',
    label: 'GURPS.STATUSBlind'
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-deafened.png',
    id: 'deaf',
    label: 'GURPS.STATUSDeaf'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-silenced.png',
    id: 'silence',
    label: 'GURPS.STATUSSilence'
  },
  {
    icon: 'systems/gurps/icons/statuses/cth-condition-readied.png',
    id: 'aim',
    label: 'GURPS.STATUSAim'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-stealth.png',
    id: 'stealth',
    label: 'GURPS.STATUSStealth'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-low-light-vision.png',
    id: 'waiting',
    label: 'GURPS.STATUSWait'
  },
  {
    icon: 'systems/gurps/icons/statuses/x-haste.png',
    id: 'sprint',
    label: 'GURPS.STATUSSprint'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-1.png',
    id: 'num1',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-2.png',
    id: 'num2',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-3.png',
    id: 'num3',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-4.png',
    id: 'num4',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-5.png',
    id: 'num5',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-6.png',
    id: 'num6',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-7.png',
    id: 'num7',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-8.png',
    id: 'num8',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-9.png',
    id: 'num9',
    label: 'GURPS.STATUSCounter'
  },
  {
    icon: 'systems/gurps/icons/statuses/number-10.png',
    id: 'num10',
    label: 'GURPS.STATUSCounter'
  }
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
  VOR: 'http://www.warehouse23.com/products/vorkosigan-saga-sourcebook-and-roleplaying-game'
}

GURPS.USER_GUIDE_URL = 'https://bit.ly/2JaSlQd'

// This is an ugly hack to clean up the "formatted text" output from GCS FG XML.
// First we have to remove non-printing characters, and then we want to replace
// all <p>...</p> with .../n before we try to convert to JSON.   Also, for some reason,
// the DOMParser doesn't like some of the stuff in the formatted text sections, so
// we will base64 encode it, and the decode it in the Named subclass setNotes()
function cleanUpP(xml) {
  // First, remove non-ascii characters
  xml = xml.replace(/[^ -~]+/g, '')

  // Now try to remove any lone " & " in names, etc.  Will only occur in GCA output
  xml = xml.replace(/ & /g, ' &amp; ')
  let swap = (xml, tagin, tagout) => {
    let s = xml.indexOf(tagin)
    while (s > 0) {
      let e = xml.indexOf(tagout, s)
      if (e > s) {
        let t1 = xml.substring(0, s)
        let t2 = xml.substring(s + 3, e)
        t2 = '@@@@' + btoa(t2) + '\n'
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
    event: event
  } // Ok, I am slowly learning this Javascrip thing ;-)

  if (action.type === 'pdf') {
    GURPS.handlePdf(action.link)
    return true
  }

  if (action.type === 'modifier') {
    while (!!action && action.type === 'modifier') {
      let mod = parseInt(action.mod)
      GURPS.ModifierBucket.addModifier(mod, action.desc)
      action = action.next
    }
    return true
  }

  if (action.type === 'chat') {
    ui.chat.processMessage(action.orig)
    return true
  }

  if (action.type === 'controlroll') {
    prefix = 'Control Roll, '
    thing = action.desc
    formula = '3d6'
    target = parseInt(action.target)
  }

  if (action.type === 'roll') {
    prefix = 'Rolling ' + action.displayformula + ' ' + action.desc
    formula = action.rollformula
    if (!!action.costs) targetmods.push(GURPS.ModifierBucket.makeModifier(0, action.costs))
  }

  if (action.type === 'damage') {
    if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
    GURPS.damageChat.create(actor || game.user, action.formula, action.damagetype, event, null, targets)
    return true
  }

  if (action.type === 'deriveddamage')
    if (!!actor) {
      let df = action.derivedformula.match(/[Ss][Ww]/) ? actordata.data.swing : actordata.data.thrust
      formula = df + action.formula
      if (!!action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      GURPS.damageChat.create(
        actor || game.user,
        formula,
        action.damagetype,
        event,
        action.derivedformula + action.formula,
        targets
      )
      return true
    } else ui.notifications.warn('You must have a character selected')

  if (action.type === 'derivedroll')
    if (!!actor) {
      let df = action.derivedformula.match(/[Ss][Ww]/) ? actordata.data.swing : actordata.data.thrust
      formula = d6ify(df + action.formula)
      prefix = 'Rolling ' + action.derivedformula + action.formula + ' ' + action.desc
      if (!!action.costs) targetmods.push(GURPS.ModifierBucket.makeModifier(0, action.costs))
    } else ui.notifications.warn('You must have a character selected')

  let attr = action => {
    let target = action.target
    if (!target) target = this.resolve(action.path, actordata.data)
    target = parseInt(target)
    return {
      prefix: 'Roll vs ',
      thing: this.i18n(action.path),
      target: target
    }
  }

  let processLinked = tempAction => {
    let bestLvl = 0
    var bestAction
    let attempts = []
    while (!!tempAction) {
      if (tempAction.type == 'attribute') {
        let t = parseInt(action.target)
        if (!t) t = parseInt(this.resolve(tempAction.path, actordata.data))
        let sl = t
        if (!!tempAction.mod) sl += parseInt(tempAction.mod)
        if (sl > bestLvl) {
          bestLvl = parseInt(sl)
          bestAction = tempAction
          thing = this.i18n(tempAction.path)
          prefix = 'Roll vs '
          target = t
        }
      } else {
        // skill
        let skill = GURPS.findSkillSpell(actordata, tempAction.name)
        if (!skill) attempts.push(tempAction.name)
        else {
          let sl = parseInt(skill.level)
          if (!!tempAction.mod) sl += parseInt(tempAction.mod)
          if (sl > bestLvl) {
            bestLvl = parseInt(sl)
            bestAction = tempAction
            thing = skill.name
            target = parseInt(skill.level) // target is without mods
            prefix = ''
          }
        }
      }
      tempAction = tempAction.next
    }
    return [bestAction, attempts]
  }

  if (action.type === 'skill-spell' || action.type === 'attribute')
    if (!!actor) {
      const [bestAction, attempts] = processLinked(action)
      if (!bestAction) {
        ui.notifications.warn("No skill or spell named '" + attempts.join("' or '") + "' found on " + actor.name)
        return false
      }
      formula = '3d6'
      if (!!bestAction.mod) targetmods.push(GURPS.ModifierBucket.makeModifier(bestAction.mod, bestAction.desc))
      else if (!!bestAction.desc) opt.text = "<span style='font-size:85%'>(" + bestAction.desc + ')</span>'
    } else ui.notifications.warn('You must have a character selected')

  if (action.type === 'attack')
    if (!!actor) {
      let att = null
      prefix = ''
      thing = action.name
      att = GURPS.findAttack(actordata, thing)
      if (!att) {
        ui.notifications.warn("No melee or ranged attack named '" + action.name + "' found on " + actor.name)
        return false
      }
      thing = att.name
      target = parseInt(att.level)
      formula = '3d6'
      if (!!action.mod) targetmods.push(GURPS.ModifierBucket.makeModifier(action.mod, action.desc))
      if (!!att.mode) opt.text = "<span style='font-size:85%'>(" + att.mode + ')</span>'
    } else ui.notifications.warn('You must have a character selected')

  if (action.type === 'dodge')
    if (!!actor) {
      target = parseInt(actor.getCurrentDodge())
      formula = '3d6'
      thing = 'Dodge'
      if (!!action.mod) targetmods.push(GURPS.ModifierBucket.makeModifier(action.mod, action.desc))
    } else ui.notifications.warn('You must have a character selected')

  if (action.type === 'mapped')
    if (!!actor) {
      target = actordata.data[action.path]
      formula = '3d6'
      thing = action.thing
      if (!!action.mod) targetmods.push(GURPS.ModifierBucket.makeModifier(action.mod, action.desc))
    } else ui.notifications.warn('You must have a character selected')

  if (action.type === 'block-parry')
    if (!!actor) {
      thing = action.desc
      if (!action.melee) target = actordata.data['equipped' + action.path] // Is there a basic parry or block stored, and we didn't try to identify a melee
      Object.values(actordata.data.melee).forEach(e => {
        if (!target || target <= 0) {
          if (!!e[action.path]) {
            if (!!action.melee) {
              let n = '^' + action.melee.split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
              if ((e.name + (!!e.mode ? ' (' + e.mode + ')' : '')).match(n)) {
                target = parseInt(e[action.path])
              }
            } else {
              target = parseInt(e[action.path])
            }
            if (!!target && target > 0) {
              thing += ' for ' + e.name
              if (!!e.mode) opt.text = "<span style='font-size:85%'>(" + e.mode + ')</span>'
            }
          }
        }
      })
      if (!target) target = parseInt(actordata.data[action.path])
      if (target > 0) formula = '3d6'
      else ui.notifications.warn('Unable to find a ' + action.orig + ' to roll')
    } else ui.notifications.warn('You must have a character selected')

  if (!formula || target == 0 || isNaN(target)) return false // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  doRoll(actor, formula, targetmods, prefix, thing, target, opt)
  return true
}
GURPS.performAction = performAction

function findSkillSpell(actor, sname) {
  sname = '^' + sname.split('*').join('.*')
  let best = 0
  var t
  recurselist(actor.data.skills, s => {
    if (s.name.match(sname) && s.level > best) {
      t = s
      best = parseInt(s.level)
    }
  })
  if (!t)
    recurselist(actor.data.spells, s => {
      if (s.name.match(sname) && s.level > best) {
        t = s
        best = parseInt(s.level)
      }
    })
  return t
}
GURPS.findSkillSpell = findSkillSpell

function findAttack(actor, sname) {
  sname = '^' + sname.split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)') // Make string into a RegEx pattern
  let t = actor.data.melee?.findInProperties(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(sname))
  if (!t) t = actor.data.ranged?.findInProperties(a => (a.name + (!!a.mode ? ' (' + a.mode + ')' : '')).match(sname))
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

  if ('path' in element.dataset) {
    prefix = 'Roll vs '
    thing = this.i18n(element.dataset.path)
    formula = '3d6'
    target = parseInt(element.innerText)
  }
  if ('name' in element.dataset || 'otf' in element.dataset) {
    prefix = '' // "Attempting ";
    let text = element.dataset.name || element.dataset.otf
    text = text.replace(/ \(\)$/g, '') // sent as "name (mode)", and mode is empty
    thing = text.replace(/(.*?)\(.*\)/g, '$1')

    // opt.text = text.replace(/.*?\((.*)\)/g, "<br>&nbsp;<span style='font-size:85%'>($1)</span>");
    opt.text = text.replace(/.*?\((.*)\)/g, '$1')

    if (opt.text === text) opt.text = ''
    if (!!element.dataset.key) opt.obj = GURPS.decode(actor.data, element.dataset.key) // During the roll, we may want to extract something from the object
    formula = '3d6'
    let t = element.innerText
    if (!!t) {
      t = t.trim()
      if (!!t) target = parseInt(t)
      if (isNaN(target)) target = 0 // Can't roll against a non-integer
    }
  }
  if ('damage' in element.dataset) {
    // expect text like '2d+1 cut'
    let action = parseForDamage(element.innerText.trim())
    if (!!action.action) performAction(action.action, actor, event, targets) 
    return
  }
  if ('roll' in element.dataset) {
    target = -1 // Set flag to indicate a non-targeted roll
    formula = element.innerText
    prefix = 'Rolling ' + formula
    formula = d6ify(formula)
  }

  doRoll(actor, formula, targetmods, prefix, thing, target, opt)
}
GURPS.handleRoll = handleRoll

// If the desc contains *Cost ?FP or *Max:9 then perform action
function applyModifierDesc(actor, desc) {
  let parse = desc.replace(/.*\* ?[Cc]osts? (\d+) ?[Ff][Pp].*/g, '$1')
  if (parse != desc && !!actor && !actor.isSelf) {
    let fp = parseInt(parse)
    fp = actor.data.data.FP.value - fp
    actor.update({ 'data.FP.value': fp })
  }
  parse = desc.replace(/.*\*[Mm]ax: ?(\d+).*/g, '$1')
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
  let output = ''
  for (let i = 0; i < str.length; i++) {
    if (str[i] == '[') found = ++i
    if (str[i] == ']' && found >= 0) {
      output += str.substring(0, found - 1)
      let action = parselink(str.substring(found, i), '', clrdmods)
      if (!action.action) output += '['
      output += action.text
      if (!action.action) output += ']'
      str = str.substr(i + 1)
      i = 0
      found = -1
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
function i18n(path, suffix) {
  let i = path.indexOf('.value')
  if (i >= 0) {
    path = path.substr(0, i) + 'NAME' // used for the attributes
  }

  path = path.replace(/\./g, '') // remove periods
  return game.i18n.localize('GURPS.' + path)
}
GURPS.i18n = i18n

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
  if (!!action) action = JSON.parse(atob(action))
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

// Convolutions to remove a key from an object and fill in the gaps, necessary because the default add behavior just looks for the first open gap
async function removeKey(actor, path) {
  let i = path.lastIndexOf('.')
  let objpath = path.substring(0, i)
  let key = path.substr(i + 1)
  i = objpath.lastIndexOf('.')
  let parentpath = objpath.substring(0, i)
  let objkey = objpath.substr(i + 1)
  let object = GURPS.decode(actor.data, objpath)
  let t = parentpath + '.-=' + objkey
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
  await actor.update({ [objpath]: sorted })
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

GURPS.rangeObject = new GURPSRange()
GURPS.initiative = new Initiative()
GURPS.hitpoints = new HitFatPoints()
GURPS.damageChat = new DamageChat(GURPS)

// Modifier Bucket must be defined after hit locations
GURPS.ModifierBucket = new ModifierBucket({
  popOut: false,
  minimizable: false,
  resizable: false,
  id: 'ModifierBucket',
  template: 'systems/gurps/templates/modifier-bucket.html',
  classes: []
})

GURPS.ThreeD6 = new ThreeD6({
  popOut: false,
  minimizable: false,
  resizable: false,
  id: 'ThreeD6',
  template: 'systems/gurps/templates/threed6.html',
  classes: []
})

GURPS.ConditionalInjury = new GURPSConditionalInjury()

GURPS.onRightClickGurpslink = function (event) {
  event.preventDefault()
  let el = event.currentTarget
  let action = el.dataset.action
  if (!!action) {
    action = JSON.parse(window.atob(action))
    GURPS.whisperOtfToOwner(action.orig, event, action.hasOwnProperty('blindroll') && !action.blindroll) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
  }
}

GURPS.whisperOtfToOwner = function (otf, event, canblind, actor) {
  if (!game.user.isGM) return
  if (!!otf) {
    otf = otf.replace(/ \(\)/g, '') // sent as "name (mode)", and mode is empty (only necessary for attacks)
    let users = actor?.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true).filter(u => !u.isGM) || []
    let botf = '[!' + otf + ']'
    otf = '[' + otf + ']'
    let buttons = {}
    buttons.one = {
      icon: '<i class="fas fa-users"></i>',
      label: 'To Everyone',
      callback: () => GURPS.sendOtfMessage(otf, false)
    }
    if (canblind)
      buttons.two = {
        icon: '<i class="fas fa-users-slash"></i>',
        label: 'Blindroll to Everyone',
        callback: () => GURPS.sendOtfMessage(botf, true)
      }
    if (users.length > 0) {
      let nms = users.map(u => u.name).join(' ')
      buttons.three = {
        icon: '<i class="fas fa-user"></i>',
        label: 'Whisper to ' + nms,
        callback: () => GURPS.sendOtfMessage(otf, false, users)
      }
      if (canblind)
        buttons.four = {
          icon: '<i class="fas fa-user-slash"></i>',
          label: 'Whisper Blindroll to ' + nms,
          callback: () => GURPS.sendOtfMessage(botf, true, users)
        }
      if (canblind)
        buttons.four = {
          icon: '<i class="fas fa-user-slash"></i>',
          label: 'Whisper Blindroll to ' + nms,
          callback: () => GURPS.sendOtfMessage(botf, true, users)
        }
    }
    buttons.def = {
      icon: '<i class="far fa-copy"></i>',
      label: 'Copy to chat input',
      callback: () => {
        $(document).find('#chat-message').val(otf)
      }
    }

    let d = new Dialog(
      {
        title: "GM 'Send Formula'",
        content: `<div style='text-align:center'>How would you like to send the formula:<br><br><div style='font-weight:700'>${otf}<br>&nbsp;</div>`,
        buttons: buttons,
        default: 'def'
      },
      { width: 700 }
    )
    d.render(true)
  }
}

GURPS.sendOtfMessage = function (content, blindroll, users) {
  let msgData = {
    content: content,
    user: game.user._id,
    blind: blindroll
  }
  if (!!users) {
    msgData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
    msgData.whisper = users.map(it => it._id)
  } else {
    msgData.type = CONST.CHAT_MESSAGE_TYPES.OOC
  }
  ChatMessage.create(msgData)
}

/*********************  HACK WARNING!!!! *************************/
/* The following method has been secretly added to the Object class/prototype to
   make it work like an Array. 
*/
Object.defineProperty(Object.prototype, 'findInProperties', {
  value: function (expression) {
    return Object.values(this).find(expression)
  }
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
  let src = 'systems/gurps/icons/gurps4e.png'
  if (game.i18n.lang == 'pt_br') src = 'systems/gurps/icons/gurps4e-pt_br.png'
  $('#logo').attr('src', src)

  // Define custom Entity classes
  CONFIG.Actor.entityClass = GurpsActor
  CONFIG.Item.entityClass = GurpsItem

  // preload drag-and-drop image
  let img = new Image()
  img.src = 'systems/gurps/icons/blood-splatter-clipart-small.png'
  GURPS.damageDragImage = img

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet)
  Actors.registerSheet('gurps', GurpsActorSheet, {
    label: 'Full (GCS)',
    makeDefault: true
  })
  Actors.registerSheet('gurps', GurpsActorCombatSheet, {
    label: 'Combat',
    makeDefault: false
  })
  Actors.registerSheet('gurps', GurpsActorEditorSheet, {
    label: 'Editor',
    makeDefault: false
  })
  Actors.registerSheet('gurps', GurpsActorSimplifiedSheet, {
    label: 'Simple',
    makeDefault: false
  })
  Actors.registerSheet('gurps', GurpsActorNpcSheet, {
    label: 'NPC/mini',
    makeDefault: false
  })

  Items.unregisterSheet('core', ItemSheet)
  Items.registerSheet('gurps', GurpsItemSheet, { makeDefault: true })

  // Warning, the very first table will take a refresh before the dice to show up in the dialog.  Sorry, can't seem to get around that
  Hooks.on('createRollTable', async function (entity, options, userId) {
    await entity.update({ img: 'systems/gurps/icons/single-die.png' })
    entity.data.img = 'systems/gurps/icons/single-die.png'
  })

  ui.modifierbucket = GURPS.ModifierBucket
  ui.modifierbucket.render(true)
})

Hooks.once('ready', async function () {
  GURPS.ModifierBucket.clear()
  GURPS.ThreeD6.refresh()

  // Show changelog
  const v = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_CHANGELOG_VERSION) || '0.0.1'
  const changelogVersion = SemanticVersion.fromString(v)
  const curVersion = SemanticVersion.fromString(game.system.data.version)

  if (curVersion.isHigherThan(changelogVersion)) {
    if ($(ui.chat.element).find('#GURPS-LEGAL').length == 0)
      // If it isn't already in the chat log somewhere
      ChatMessage.create({
        content: `<div id="GURPS-LEGAL" style='font-size:85%'>${game.system.data.title}</div><hr><div style='font-size:70%'>${GURPS.LEGAL}</div>`,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        whisper: [game.user]
      })
    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_CHANGELOG)) {
      const app = new ChangeLogWindow(changelogVersion)
      app.render(true)
      game.settings.set(settings.SYSTEM_NAME, settings.SETTING_CHANGELOG_VERSION, curVersion.toString())
    }
  }

  Hooks.on('renderCombatTracker', function (a, html, c) {
    // use class 'bound' to know if the drop event is already bound
    if (!html.hasClass('bound')) {
      html.addClass('bound')
      html.on('drop', function (ev) {
        console.log('Haandle drop event on combatTracker')
        ev.preventDefault()
        ev.stopPropagation()
        let elementMouseIsOver = document.elementFromPoint(ev.clientX, ev.clientY)

        let combatant = $(elementMouseIsOver).parents('.combatant').attr('data-combatant-id')
        let target = game.combat.combatants.filter(c => c._id === combatant)[0]

        let event = ev.originalEvent
        let dropData = JSON.parse(event.dataTransfer.getData('text/plain'))
        if (dropData.type === 'damageItem') {
          target.actor.handleDamageDrop(dropData.payload)
        }
      })
    }
  })

  // This hook is currently only used for the GM Push feature of the Modifier Bucket.    Of course, we can add more later.
  Hooks.on('updateUser', (...args) => {
    if (!!args) {
      if (args.length >= 4) {
        let source = args[3]
        let target = args[1]._id
        //				console.log("Update for: " + game.users.get(target).name + " from: " + game.users.get(source).name);
        if (target == game.user.id) {
          if (source != target) {
            // Someone else (a GM) is updating your data.
            let date = args[1].flags?.gurps?.modifierchanged // Just look for the "modifierchanged" data (which will be a date in ms... something that won't be the same)
            if (!!date) game.GURPS.ModifierBucket.updateDisplay(date)
          }
        }
      }
    }
  })

  /*		// Should not need this hook, if we are watching controlToken
    Hooks.on('createActiveEffect', (...args) => {
      if (!!args && args.length >= 4)
        GURPS.SetLastActor(args[0]);
    });
  */

  // Keep track of which token has been activated, so we can determine the last actor for the Modifier Bucket
  Hooks.on('controlToken', (...args) => {
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
        GURPS.whisperOtfToOwner('PDF:' + el.innerText, event, false)
      })
    }
  })

  /**
   * Add a listener to handle damage being dropped on a token.
   */
  Hooks.on('dropCanvasData', function (canvas, dropData) {
    let grid_size = canvas.scene.data.grid

    let numberTargets = canvas.tokens.targetObjects({
      x: dropData.x - grid_size / 2,
      y: dropData.y - grid_size / 2,
      height: grid_size,
      width: grid_size,
      releaseOthers: true
    })

    // actual targets are stored in game.user.targets
    if (game.user.targets.size === 1) {
      let keys = game.user.targets.keys()
      let first = keys.next()
      if (dropData.type === 'damageItem') {
        first.value.actor.handleDamageDrop(dropData.payload)
      }
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
    __dirname + '/apply-damage/effect-shock.html'
  ])
})
