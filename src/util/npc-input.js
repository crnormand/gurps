'use strict'

import { Advantage, Encumbrance, Equipment, Melee, Note, Ranged, Skill } from '../module/actor/actor-components.js'
import { GurpsActorV2 } from '../module/actor/gurps-actor.js'
import * as HitLocations from '../module/hitlocation/hitlocation.js'

import getUserInput from './get-user-input.js'
import { translate } from './i18n.js'
import { digitsAndDecimalOnly, digitsOnly } from './jquery-helper.js'
import * as Settings from './miscellaneous-settings.js'
import { sanitize } from './utilities.js'

Hooks.once('init', async function () {
  game.settings.registerMenu(GURPS.SYSTEM_NAME, Settings.SETTING_MOOK_DEFAULT_EDITOR, {
    name: game.i18n.localize('GURPS.settingMookGenerator'),
    label: game.i18n.localize('GURPS.settingLabelMookGenerator'),
    hint: game.i18n.localize('GURPS.settingHintMookGenerator'),
    type: NpcInputDefaultEditor,
    restricted: true,
  })

  game.settings.register(GURPS.SYSTEM_NAME, Settings.SETTING_MOOK_DEFAULT, {
    name: 'Mook Default',
    scope: 'world',
    config: false,
    type: Object,
    default: new Mook(),
    onChange: value => console.log(`Updated Mook Default: ${value}`),
  })
})

Hooks.on(`renderNpcInput`, (app, html, _data) => {
  $(html).find('#npc-input-name').focus()
})

// Hooks.once("ready", () => { new NpcInput().render(true) });

const COMMENT_CHAR = '#'
const ERR = `???:`

// Keys we might see during attribute parsing, and whether we should skip them when looking for data
const POSSIBLE_ATTRIBUTE_KEYS = {
  basic: true, // This is the prefix to "basic speed", "basic move"
  speed: false,
  move: false,
  dodge: false,
  sm: false,
  parry: false,
  block: false,
  dr: false,
  damage: false,
  bl: false,
  fright: true, // prefix to "fright check"
  check: false,
  height: false,
  weight: false,
  age: false,
  dmg: false,
  hp: false,
  fp: false,
  skills: true,
  attributes: true,
  secondary: true,
  characteristics: true,
  advantages: true,
}

export class NpcInput extends FormApplication {
  constructor(actor, options = {}) {
    super(options)
    let savedMookDefault = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_MOOK_DEFAULT)

    this.mook = savedMookDefault || new Mook()
    this.testing = true
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['ms-mook-generator-app', 'sheet', 'form'],
      id: 'npc-input',
      template: 'systems/gurps/templates/actor/npc-input.hbs',
      resizable: true,
      minimizable: false,
      width: 800,
      height: 700,
      title: 'Mook Generator',
    })
  }
  getData(options) {
    let data = super.getData(options)

    data.mook = this.mook
    data.mode = this.testing ? 'Test Mook' : 'Create Mook'
    data.displaybuttons = true

    return data
  }

  setTesting(isTesting = true) {
    this.testing = isTesting
    this.createButton.innerText = this.testing ? 'Test Mook' : 'Create Mook'
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.ms-attr-pair input[data-key="speed"]').inputFilter(value => digitsAndDecimalOnly.test(value))
    html.find('.ms-attr-pair input:not([data-key="speed"])').inputFilter(value => digitsOnly.test(value))
    html.find('input[type=text]').on('change paste keyup', event => {
      const element = event.currentTarget
      const key = element.dataset.key

      if (key) {
        this.mook[key] = element.value
        this.setTesting()
      }
    })

    html.find('textarea').on('change', event => {
      const element = event.currentTarget
      const key = element.dataset.key

      if (key) {
        this.mook[key] = element.value
        this.setTesting()
      }
    })

    html.find('#npc-input-create').on('click keydown focusout', event => {
      if (event.type == 'click' || (event.type == 'keydown' && event.which == 13)) this.createMook(event)
      else {
        event.preventDefault()
        $(html).find('#npc-input-name').focus()
      }
    })
    html.find('#npc-input-import').on('click keydown', event => {
      if (event.type == 'click' || (event.type == 'keydown' && event.which == 13)) this.importStatBlock(event)
    })
    this.createButton = html.find('#npc-input-create')[0]

    const frame = html[0]?.querySelector('.ms-mook-generator')

    if (frame)
      frame.addEventListener('drop', event => {
        event.preventDefault()
        if (event.originalEvent) event = event.originalEvent
        this.applyDrop(JSON.parse(event.dataTransfer.getData('text/plain')))
      })
  }

  applyDrop(data) {
    if (data.actorid) {
      const actorData = game.actors.get(data.actorid).system
      let element = foundry.utils.getProperty(actorData, data.key)
      let key = data.key.match(/^[^.]+\.([^.]+)/)[1]
      let tmp = ''
      let tmp2 = ''
      let notes = element.notes || ''

      switch (key) {
        case 'skills':
        case 'spells': {
          tmp += element.name + '-' + element.level
          break
        }
        case 'melee':
        case 'ranged': {
          if (element.acc) tmp2 += ' acc ' + element.acc
          if (element.range) tmp2 += ' range ' + element.range
          if (element.rcl) tmp2 += ' rcl ' + element.rcl
          if (element.rof) tmp2 += ' rof ' + element.rof
          if (element.shots) tmp2 += ' shots ' + element.shots
          if (element.st) tmp2 += ' st ' + element.st
          if (element.usage) tmp2 += ' usage' + element.usage
          if (element.bulk) tmp2 += ' bulk ' + element.bulk
          if (element.halfd) tmp2 += ' halfd ' + element.halfd
          if (element.max) tmp2 += ' max ' + element.max
          if (element.parry) tmp2 += ' parry ' + element.parry
          if (element.reach) tmp2 += ' reach ' + element.reach
          if (element.block) tmp2 += ' block ' + element.block
          tmp += element.name + ' (' + element.level + ') ' + element.damage
          break
        }
        case 'ads': {
          key = 'traits'
          tmp += element.name
          if (element.pageref) tmp += ' Page Ref: ' + element.pageref
          break
        }
        case 'notes': {
          tmp += element.notes
          notes = ''
          break
        }
        case 'equipment': {
          tmp += `${element.name}; ${element.count}; $${element.cost}; ${element.weight} lb`
          break
        }
      }

      let orig = this.mook[key]

      tmp = orig + (orig ? '\n' : '') + tmp
      tmp += tmp2
      if (notes) tmp += '\n# ' + notes.split('\n').join('\n# ').replaceAll(';', ',')
      this.mook[key] = tmp
    } else {
      if (data.otf) {
        this.mook.notes += ' [' + data.otf + ']'
      }
    }

    this.setTesting()
    this.render(true)
  }

  async importStatBlock(ev) {
    ev.preventDefault()

    let statblock = await getUserInput({
      title: translate('Import Stat Block'),
      label: translate('Import'),
      placeholder: translate('Paste your stat block here'),
      content: this.savedStatBlock || '',
      submitButton: true,
    })

    if (statblock.length < 3) statblock = EX[parseInt(statblock)]
    if (statblock) this.parseStatBlock(statblock)
    this.render(true)
  }

  async createMook(ev) {
    ev.preventDefault()

    if (this.testing) {
      let err = this.check()

      if (err) ui.notifications.warn('Unable to create Mook: ' + err)
      else this.setTesting(false)
    } else {
      let data = { name: this.mook.name, type: 'character' }
      let createdActor = await GurpsActorV2.create(data, { renderSheet: false })

      await this.populate(createdActor)
      await createdActor.setFlag('core', 'sheetClass', 'gurps.GurpsActorNpcModernSheet')
      createdActor.sheet.render(true)
    }

    this.render(true)
  }

  async populate(actor) {
    let mook = this.mook
    let data = actor.system
    let attributes = data.attributes

    // + is a trick to force strings to ints
    attributes.ST.import = +mook.st
    attributes.DX.import = +mook.dx
    attributes.IQ.import = +mook.iq
    attributes.HT.import = +mook.ht
    attributes.WILL.import = +mook.will
    attributes.PER.import = +mook.per

    data.HP.max = +mook.hp
    data.HP.value = +mook.hp
    data.FP.max = +mook.fp
    data.FP.value = +mook.fp

    data.basicmove.value = parseInt(mook.move)
    data.basicspeed.value = mook.speed
    data.frightcheck = mook.will
    if (mook.check) data.frightcheck = mook.check // Imported "fright check"

    data.hearing = mook.per
    data.tastesmell = mook.per
    data.touch = mook.per
    data.vision = mook.per
    if (mook.parry) data.parry = parseInt(mook.parry)
    if (mook.block) data.block = parseInt(mook.block)

    let notes = {}
    let note = new Note(mook.notes.trim())

    GURPS.put(notes, note)

    // Since we removed the default hitlocations from template.json, we need to create at least one entry for the mook
    // But to maintain a similar look, we will just recreate the humanoid locations.
    let hitLocations = {}

    for (const [key, value] of Object.entries(HitLocations.hitlocationDictionary.humanoid)) {
      let loc = { ...value, ...{ where: key } }

      if (key == HitLocations.HitLocation.TORSO) loc.import = mook.dr
      GURPS.put(hitLocations, loc)
    }

    let encumbranceMap = {}
    let encumbrance = new Encumbrance()

    encumbrance.level = 0
    encumbrance.current = true
    encumbrance.key = 'enc0'
    encumbrance.weight = 0
    encumbrance.move = parseInt(mook.move)
    encumbrance.dodge = parseInt(mook.dodge)
    GURPS.put(encumbranceMap, encumbrance)

    let meleeMap = {}

    mook.a_melee.forEach(meleeAttack => GURPS.put(meleeMap, meleeAttack))

    let rangedMap = {}

    mook.a_ranged.forEach(rangedAttack => GURPS.put(rangedMap, rangedAttack))

    let traitSheet = {}

    traitSheet.title = mook.title
    let createdOn = new Date().toString().split(' ').splice(1, 3).join(' ')

    traitSheet.createdon = createdOn
    if (mook.sm) traitSheet.sizemod = mook.sm[0] == '-' ? mook.sm : mook.sm[0] == '+' ? '' : '+' + mook.sm
    traitSheet.appearance = mook.desc
    traitSheet.height = mook.height
    traitSheet.weight = mook.weight
    traitSheet.age = mook.age

    let skillsMap = {}

    mook.a_skills.forEach(skill => GURPS.put(skillsMap, skill))

    let spellsMap = {}

    mook.a_spells.forEach(spell => GURPS.put(spellsMap, spell))

    let advantages = {}

    mook.a_traits.forEach(advantage => GURPS.put(advantages, advantage))

    let equipmentMap = {}

    mook.a_equipment.forEach(equipmentItem => GURPS.put(equipmentMap, equipmentItem))

    let damageString = mook.damage || mook.dmg || ''
    let thrustDamage = damageString.split('/')[0]
    let swingDamage = damageString.split('/')[1]

    if (!swingDamage && !!thrustDamage) {
      swingDamage = thrustDamage
      thrustDamage = ''
    }

    let commit = {
      'system.attributes': attributes,
      'system.HP': data.HP,
      'system.FP': data.FP,
      'system.basicmove': data.basicmove,
      'system.basicspeed': data.basicspeed,
      'system.currentmove': parseInt(mook.move),
      'system.currentdodge': parseInt(mook.dodge),
      'system.frightcheck': data.frightcheck,
      'system.hearing': data.hearing,
      'system.tastesmell': data.tastesmell,
      'system.touch': data.touch,
      'system.vision': data.vision,
      'system.equippedparry': data.parry,
      'system.parry': data.parry,
      'system.equippedblock': data.block,
      'system.block': data.block,
      'system.notes': notes,
      'system.hitlocations': hitLocations,
      'system.encumbrance': encumbranceMap,
      'system.melee': meleeMap,
      'system.ranged': rangedMap,
      'system.traits': traitSheet,
      'system.skills': skillsMap,
      'system.spells': spellsMap,
      'system.ads': advantages,
      'system.swing': swingDamage,
      'system.thrust': thrustDamage,
      'system.equipment.carried': equipmentMap,
    }

    await actor.update(commit)
    await actor.postImport()
    console.log('Created Mook:')
    console.log(actor)
  }

  sanit(key) {
    this.mook[key] = sanitize(this.mook[key])
  }

  check() {
    let errors = ''

    if (!this.mook.name) errors = ', No Name'
    this.sanit('melee')
    this.sanit('ranged')
    this.sanit('traits')
    this.sanit('skills')
    this.sanit('spells')
    this.sanit('equipment')

    if (this.checkTraits()) errors += ', Error in Traits'
    if (this.checkSkills()) errors += ', Error in Skills'
    if (this.checkMelee()) errors += ', Error in Melee'
    if (this.checkRanged()) errors += ', Error in Ranged'
    if (this.checkSpells()) errors += ', Error in Spells'
    if (this.checkEquipment()) errors += ', Error in Equipment'

    return errors.substr(2)
  }

  // return an array of string representing each line
  prep(text, delim) {
    var ans

    if (delim) ans = this.parseDelimLines(text, delim)
    else ans = text.split('\n')

    return ans.map(lineText => this.cleanLine(lineText)).filter(lineText => lineText.length > 0)
  }

  // Allow () to include delims without breaking line
  parseDelimLines(str, delim) {
    let arr = []
    let index = 0
    let line = ''
    let nestingLevel = 0

    while (index < str.length) {
      let currentChar = str[index++]

      if ((currentChar == delim && nestingLevel == 0) || currentChar == '\n') {
        arr.push(line)
        line = ''
      } else {
        line += currentChar
        if (currentChar == '(') nestingLevel++
        if (currentChar == ')') nestingLevel--
      }
    }

    if (line) arr.push(line)

    return arr
  }

  checkSkills() {
    const mook = this.mook
    let txt = ''
    let arr = []

    this.prep(mook.skills, ';').forEach(skillLine => {
      if (skillLine.includes(ERR)) return
      txt += '\n' + skillLine

      if (skillLine.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, skillLine.substr(1), ' ')

        return
      }

      const dashIndex = skillLine.lastIndexOf('-')

      if (dashIndex < 1) return (txt += `\n${ERR} missing '-'`)
      const skillName = skillLine.substring(0, dashIndex).trim()
      const skillLevel = skillLine.substr(dashIndex + 1).trim()

      if (!skillLevel) return (txt += `\n${ERR} missing skill level`)
      if (isNaN(skillLevel)) return (txt += `\n${ERR} "${skillLevel}" is not a number`)
      arr.push(new Skill(skillName, skillLevel))
    })
    mook.skills = txt.substr(1)
    mook.a_skills = arr

    return txt.includes(ERR)
  }

  checkSpells() {
    const mook = this.mook
    let txt = ''
    let arr = []

    this.prep(mook.spells, ';').forEach(spellLine => {
      if (spellLine.includes(ERR)) return
      txt += '\n' + spellLine

      if (spellLine.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, spellLine.substr(1), ' ')

        return
      }

      const dashIndex = spellLine.lastIndexOf('-')

      if (dashIndex < 1) return (txt += `\n${ERR} missing '-'`)
      const spellName = spellLine.substring(0, dashIndex).trim()
      const spellLevel = spellLine.substr(dashIndex + 1).trim()

      if (!spellLevel) return (txt += `\n${ERR} missing spell level`)
      if (isNaN(spellLevel)) return (txt += `\n${ERR} "${spellLevel}" is not a number`)
      arr.push(new Skill(spellName, spellLevel))
    })
    mook.spell = txt.substr(1)
    mook.a_spells = arr

    return txt.includes(ERR)
  }

  checkMelee() {
    const pats = [
      { regex: '(^usage|^Usage|^mode|^Mode)\\w+', var: 'mode' },
      { regex: '(^parry|^Parry)\\d+', var: 'parry' },
      { regex: '(^reach|^Reach)[\\w,]+', var: 'reach' },
      { regex: '(^st|^ST|^St)\\d+', var: 'st' },
      { regex: '(^block|^Block)\\d+', var: 'block' },
    ]
    const mook = this.mook
    let txt = ''
    let arr = []

    this.prep(mook.melee).forEach(meleeLine => {
      if (meleeLine.includes(ERR)) return
      txt += '\n' + meleeLine

      if (meleeLine.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, meleeLine.substr(1), ' ')

        return
      }

      var me, remain
      let parse = meleeLine.replace(
        /(.*) ?\((\d+)\) (\d+)d(\d*)([-+]\d+)?([xX*]\d+)?(\([.\d]+\))?(!)? ?(\w+\+?\+?)(.*)$/g,
        '$1~$2~$3~$4~$5~$6~$7~$8~$9~$10'
      )

      if (meleeLine != parse) {
        parse = parse.split('~')
        me = new Melee(
          parse[0].trim(),
          parse[1],
          parse[2] + 'd' + parse[3] + parse[4] + parse[5] + parse[6] + parse[7] + ' ' + parse[8]
        )
        remain = parse[9].trim()
      } else {
        parse = meleeLine.replace(/(.*) ?\(([ \w]+)\) "([^"]+)" ?(.*)$/g, '$1~$2~$3~$4')
        if (meleeLine == parse) return (txt += `\n${ERR} unable to find (level) and damage`)
        parse = parse.split('~')
        me = new Melee(parse[0].trim(), parse[1], parse[2])
        remain = parse[3].trim()
      }

      if (remain) {
        let ext = remain.replace(/ +/g, ' ').split(' ')

        if (ext.length % 2 != 0) return (txt += `\n${ERR} unable to parse "${remain}"`)

        for (let i = 0; i < ext.length; i += 2) {
          let combinedToken = ext[i] + ext[i + 1]
          let found = false

          pats.forEach(pattern => {
            if (combinedToken.match(new RegExp(pattern.regex))) {
              me[pattern.var] = ext[i + 1]
              found = true
            }
          })
          if (!found) return (txt += `\n${ERR} unknown pattern "${ext[i]} ${ext[i + 1]}"`)
        }
      }

      arr.push(me)
    })
    mook.melee = txt.substr(1)
    mook.a_melee = arr

    return txt.includes(ERR)
  }

  checkRanged() {
    const pats = [
      { regex: '(^acc|^Acc)\\d+', var: 'acc' },
      { regex: '(^rof|^RoF|^Rof)\\d+', var: 'rof' },
      { regex: '(^rcl|^Rcl)\\d+', var: 'rcl' },
      { regex: '(^usage|^Usage|^mode|^Mode)\\w+', var: 'mode' },
      { regex: '(^range|^Range)[xX\\d+.](\\/[xX\\d.]+)?', var: 'range' },
      { regex: '(^shots|^Shots)[\\w\\)\\(]+', var: 'shots' },
      { regex: '(^bulk|^Bulk)[\\w-]+', var: 'bulk' },
      { regex: '(^st|^ST|^St)\\d+', var: 'st' },
      { regex: '^halfd\\d+', var: 'halfd' },
      { regex: '^max\\d+', var: 'max' },
    ]
    const mook = this.mook
    let txt = ''
    let arr = []

    this.prep(mook.ranged).forEach(rangedLine => {
      if (rangedLine.includes(ERR)) return
      txt += '\n' + rangedLine

      if (rangedLine.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, rangedLine.substr(1), ' ')

        return
      }

      let parse = rangedLine.replace(
        /(.*) ?\((\d+)\) (\d+)d(\d*)([-+]\d+)?([xX*]\d+)?(\([.\d]+\))?(!)?:? ?([\w-+]+)(.*)/g,
        '$1~$2~$3~$4~$5~$6~$7~$8~$9~$10'
      )

      var rangedAttack, remain

      if (rangedLine != parse) {
        parse = parse.split('~')
        rangedAttack = new Ranged(
          parse[0].trim(),
          parse[1],
          parse[2] + 'd' + parse[3] + parse[4] + parse[5] + parse[6] + parse[7] + ' ' + parse[8]
        )
        remain = parse[9].trim()
      } else {
        parse = rangedLine.replace(/(.*) ?\(([ \w]+)\):? "([^"]+)" ?(.*)$/g, '$1~$2~$3~$4')
        if (rangedLine == parse) return (txt += `\n${ERR} unable to find (level) and damage`)
        parse = parse.split('~')
        rangedAttack = new Ranged(parse[0].trim(), parse[1], parse[2])
        remain = parse[3].trim()
      }

      if (remain) {
        let ext = remain.trim().replace(/ +/g, ' ').split(' ')

        if (ext.length % 2 != 0) return (txt += `\n${ERR} unable to parse for `)

        for (let i = 0; i < ext.length; i += 2) {
          let combinedToken = ext[i] + ext[i + 1]
          let found = false

          pats.forEach(pattern => {
            if (combinedToken.match(new RegExp(pattern.regex))) {
              rangedAttack[pattern.var] = ext[i + 1]
              found = true
            }
          })
          if (!found) return (txt += `\n${ERR} unknown pattern "${ext[i]} ${ext[i + 1]}"`)
        }
      }

      rangedAttack.checkRange()
      arr.push(rangedAttack)
    })
    mook.ranged = txt.substr(1)
    mook.a_ranged = arr

    return txt.includes(ERR)
  }

  addToNotes(arr, note, delim) {
    if (arr.length == 0) return
    let existingNotes = arr[arr.length - 1].notes

    if (existingNotes) existingNotes += delim + note
    else existingNotes = note
    arr[arr.length - 1].notes = existingNotes
  }

  checkTraits() {
    const mook = this.mook
    let txt = ''
    let arr = []

    this.prep(mook.traits, ';').forEach(traitLine => {
      txt += '\n' + traitLine

      if (traitLine.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, traitLine.substr(1), '\n')

        return
      }

      arr.push(new Advantage(traitLine))
    })
    mook.traits = txt.substr(1)
    mook.a_traits = arr

    return false
  }

  checkEquipment() {
    const mook = this.mook
    let txt = ''
    let arr = []

    this.prep(mook.equipment).forEach(equipmentLine => {
      if (equipmentLine.includes(ERR)) return
      txt += '\n' + equipmentLine

      if (equipmentLine.startsWith(COMMENT_CHAR)) {
        this.addToNotes(arr, equipmentLine.substr(1), '\n')

        return
      }

      let fields = equipmentLine.split(';')

      if (fields.length != 4) {
        return (txt += `\n${ERR} Expecting <name>; <qty>; $<cost>; <weight> lb\n`)
      } else {
        let equipmentItem = new Equipment(fields[0])

        equipmentItem.count = parseInt(fields[1])
        equipmentItem.equipped = true
        equipmentItem.carried = true
        let costMatch = fields[2].match(/ *\$ *([?\d]+)/)

        if (costMatch) equipmentItem.cost = costMatch[1]
        else {
          return (txt += `\n${ERR} Unable to find '$ <cost>'\n`)
        }

        let weightMatch = fields[3].match(/ *([?\d.]+) * lbs?/)

        if (weightMatch) equipmentItem.weight = weightMatch[1]
        else {
          return (txt += `\n${ERR} Unable to find '<weight> lb'\n`)
        }

        Equipment.calc(equipmentItem)
        arr.push(equipmentItem)
      }
    })
    mook.equipment = txt.substr(1)
    mook.a_equipment = arr

    return txt.includes(ERR)
  }

  preparePastedText(txt) {
    txt = sanitize(txt)
    txt = txt.replace(/\t/g, '; ') // replace tabs with '; '
    txt = txt.replace(/ +/g, ' ') // remove multiple spaces in a row
    txt = txt.replace(/[^ -~\n]+/g, '') // remove remaining non-ascii

    return this.cleanLine(txt) // trim and remove leading and trailing periods.
  }

  parseStatBlock(txt) {
    this.setTesting()
    this.statblk = this.preparePastedText(txt)
    this.savedStatBlock = this.statblk
    console.log(this.statblk)

    try {
      this.resetMook()
      this.checkForNameNotes()
      this.parseAttrs()
      this.parseAttacks()
      this.parseTraits()
      this.parseS('Skills', 'Spells', 'skills')
      this.parseS('Spells', 'Equipment', 'spells')
      this.parseEquipment()
      this.parseFinalNotes()
      this.parseAttacks(true)
    } catch (error) {
      console.log(error)
      ui.notifications.warn(error)
    }
  }

  resetMook() {
    this.mook = new Mook()
    this.mook.name = ''
    this.mook.notes = ''
    this.mook.melee = ''
    this.mook.ranged = ''
    this.mook.traits = ''
    this.mook.skills = ''
    this.mook.spells = ''
    this.mook.equipment = ''
  }

  gatherAttackLines(attblk, currentline, oldformat) {
    // read lines looking for (\d+) and any lines following that do NOT have (\d+)
    if (oldformat) return [attblk, currentline, this.nextToken()]
    var nextline

      // Get next output
    ;[attblk, nextline] = this.nextTokenPrim(attblk, '\n', false, true)

    while (!!nextline && (nextline.match(/[Ss]hots.*\(\d+\)/) || !nextline.match(/\(\d+\)/))) {
      // If the new line doesn't contain a skill level "(\d+)" that isn't part of [Ss]hots assume it is still from the previous attack
      currentline += ' ' + nextline
      ;[attblk, nextline] = this.nextTokenPrim(attblk, '\n', false, true)
    }

    return [attblk, currentline, nextline]
  }

  findInLine(line, regex) {
    let re = new RegExp(regex)
    let match = line.match(re)

    if (match) line = line.replace(re, '')

    return [line, match]
  }

  parseEquipment() {
    if (!this.peek('Equipment')) return
    let line = this.nextline() // Skip equipment line

    line = this.nextline()

    while (line) {
      var match
      let cost = '?'
      let weight = '?'
      let qty = 1
      let name = ''

      ;[line, match] = this.findInLine(line, /\$([.\d]+)[ ,.]*/)
      if (match) cost = match[1]
      ;[line, match] = this.findInLine(line, /([.\d]+) ?lbs?[ ,.]*/)
      if (match) weight = match[1]
      ;[line, match] = this.findInLine(line, /^ *(\d+)/)
      if (match) qty = match[1]
      ;[line, match] = this.findInLine(line, /^([^(.])+\((\d+)\)/)

      if (match) {
        qty = match[2]
        name = match[1]
      }

      line = line.replace(/\[[ \W]+/g, '') //clean up runs of non-word chars in brackets
      name += this.cleanLine(line)
      name = name.replace(';', ',')
      this.mook.equipment += name + '; ' + qty + '; $' + cost + '; ' + weight + ' lb\n'
      line = this.nextline()
      while (line === '') line = this.nextline()
    }
  }

  parseS(start, end, path) {
    this.trim()
    if (this.peek(start)) this.nextToken(start)
    // NOTE: historically this function supported consuming until `end`.
    // Current implementation stops when a line starts with `end`.
    let line = this.nextline()

    if (!line) return
    line = this.cleanLine(line)
    let entriesText = ''

    //    while (!!line && (line.match(/[^-]+-\d+/) || (!!goUntil && !line.startsWith(end)))) {
    while (!!line && line.match(/[^-]+-\d+/) && !line.startsWith(end)) {
      entriesText += '\n' + this.cleanLine(line)
      line = this.nextToken('\n', false, true)
    }

    //if (!entriesText) this.appendToNotes(`?? No ${start} matching pattern '${path}-lvl' found`);
    entriesText = this.cleanLine(entriesText)
    let delim = ';'

    if (entriesText.includes(delim)) entriesText = entriesText.replace(/\n/g, ' ')
    // If has delims, then remove newlines
    else delim = '\n' // No ";", so assume one per line
    var entryLine

    while (entriesText) {
      ;[entriesText, entryLine] = this.nextTokenPrim(entriesText, delim, false, true) // Start it off reading the first line

      // Remove skill type, rsl and points  Broadsword (A) DX+2 [8]-16
      entryLine = this.cleanLine(entryLine).replace(/ ?\([a-zA-Z]+\) [a-zA-Z]+([-+][0-9]+)? \[ *-?\d+ *] */g, '')
      entryLine = entryLine.replace(/ [SDIH][TXQ][-+]?[0-9]* ?/, ' ')
      entryLine = entryLine.replace(/ ?\[ *-?\d+ *\],?\.? ?/g, ' ')
      entryLine = this.cleanLine(entryLine)
      let lineMatch = entryLine.match(/([^-]+ *- *\d+)(.*)/)

      if (lineMatch) {
        this.mook[path] += '\n' + lineMatch[1]
        if (lineMatch[2]) this.mook[path] += '\n' + COMMENT_CHAR + lineMatch[2]
      } else if (entryLine) this.mook[path] += '\n' + COMMENT_CHAR + `Unknown ${start} pattern ${entryLine}`
    }

    if (line) this.pushToken(line)
  }

  parseTraits() {
    let skippedText = this.peekskipto('Advantages/Disadvantages')

    skippedText += this.peekskipto('Advantages')
    skippedText += this.peekskipto('Traits')
    if (skippedText) this.appendToNotes(ERR + ' Skipped before Traits: ' + skippedText, '\n')
    this.trim()
    let trblk = this.nextToken('Skills', 'Spells', true)

    if (!trblk) return this.appendToNotes(ERR + " Looking for Traits block, unable to find 'Skills'") // Basically always need "Skills" or "Spells"
    let traits = ''

    if (trblk.includes(';')) trblk = trblk.replace(/\n/g, ' ')
    // if it contains ";", then remove newlines
    else {
      // no ";", maybe using commas?
      if (trblk.split(',').length > 2) trblk = trblk.replace(/,/g, ';') // Assume comma separated
    }

    trblk = trblk.replace(/disadvantages/gi, ';')
    trblk = trblk.replace(/perks/gi, ';')
    trblk = trblk.replace(/quirks/gi, ';')
    trblk = trblk.replace(/ ?\[-?\d+\*?\],?.? ?/g, ' ')
    this.prep(trblk, ';').forEach(traitText => {
      traitText = traitText.replace(/\( *(\d+) *or less *\)/g, '($1)') // Compress some forms of CR rolls
      let crMatch = traitText.match(/(.*)\((\d+)\)/)

      if (crMatch) traits += `\n[CR: ${crMatch[2]} ${crMatch[1].trim()}]`
      // Convert CR roll into OtF
      else {
        if (traitText != 'and') traits += '\n' + traitText
      }
    })
    this.mook.traits = traits
  }

  parseAttacks(oldformat = false) {
    const rpats = [
      { regex: ' [Aa]cc *(\\d+) ?,?', var: 'acc' },
      { regex: ' [Rr]o[Ff] *(\\d+) ?,?', var: 'rof' },
      { regex: ' [Rr]cl *(\\d+) ?,?', var: 'rcl' },
      { regex: ' 1\\/2[Dd] *(\\d+) ?,?', var: 'halfd' },
      { regex: ' [Mm]ax *(\\d+) ?,?', var: 'max' },
      { regex: ' [Ss]hots *([\\w\\)\\(]+) ?,?', var: 'shots' },
      { regex: ' [Bb]ulk *([\\w-]+) ?,?', var: 'bulk' },
      { regex: ' [Ss][Tt] *(\\d+) ?,?', var: 'st' },
      { regex: ' ?[Rr]anged,? *with ?', var: '' },
      { regex: ' ?[Rr]anged,?', var: '' },
      { regex: ' ?[Rr]ange ([0-9/]+) *,?', var: 'range' },
    ]

    var attblk

    if (oldformat) {
      attblk = this.statblk
      if (!attblk) return
    } else {
      attblk = this.nextToken('Traits:', 'Advantages/Disadvantages:') // Look for either as start of ads/disads

      if (!attblk) {
        if (this.peek('Skills:')) attblk = this.nextToken('Skills:', 'junk')
        else if (!this.peek('\nWeapons:')) this.mook.melee = COMMENT_CHAR + 'No attacks found' // If Weapons aren't listedt later, show error.
      }
    }

    if (!attblk) return
    attblk = this.cleanLine(attblk)
    // assume a line is an attack if it contains '(n)'
    let line,
      nextline

      // Get next output
    ;[attblk, line] = this.nextTokenPrim(attblk, '\n', false, true) // Start it off reading the first line
    ;[attblk, line, nextline] = this.gatherAttackLines(attblk, line, oldformat) // collect up any more lines.

    while (line) {
      save = line
      line = this.cleanLine(line)
      var name,
        lvl,
        dmg,
        save

        // Get next output
      ;[line, name] = this.nextTokenPrim(line, '(', false)

      if (!name) {
        this.mook.melee += `${COMMENT_CHAR}Unrecognized attack: "${save}" `
        ;[attblk, line, nextline] = this.gatherAttackLines(attblk, nextline, oldformat) // collect up any more lines.
        continue
      }

      name = name.trim()
      ;[line, lvl] = this.nextTokenPrim(line, ')', '):')

      if (!lvl || isNaN(lvl)) {
        this.mook.melee += `${COMMENT_CHAR}No level or level is not a number "${save}"`
        ;[attblk, line, nextline] = this.gatherAttackLines(attblk, nextline, oldformat) // collect up any more lines.
        continue
      }

      //[line, dmg] = this.nextTokenPrim(line, ".", ",", true);		// find up to . or , or end of string
      ;[line, dmg] = this.nextTokenV2Prim(line, ['.', ',', ';'], true)
      let savedmg1 = dmg
      let note = ''

      ;[dmg, note] = this.mapDmg(line, dmg)
      if (!!dmg && !!note) note = '\n' + COMMENT_CHAR + this.cleanLine(note)

      if (!dmg) {
        // If not dmg formula, try one more time.
        ;[line, dmg] = this.nextTokenPrim(line, '.', ',', true) // find up to . or , or end of string
        let savedmg2 = dmg

        ;[dmg, note] = this.mapDmg(line, dmg)
        if (!dmg) {
          line = savedmg1 + ' ' + savedmg2 + ' ' + note // Nope, couldn't find anything, so reset the line
          note = ''
        } else if (note) note = '\n' + COMMENT_CHAR + this.cleanLine(note)
      }

      let reachMatch = /.*[Rr]each (?<reach>[^.]+)/.exec(line)
      let extra = ''
      let final = ''

      if (reachMatch?.groups?.reach) {
        // If it has Reach, it is definitely melee
        extra = ' reach ' + reachMatch.groups.reach.replace(/ /g, '')
        line = this.cleanLine(line.replace(/[Rr]each [^.]+/, ''))
        if (line) note += '\n' + COMMENT_CHAR + line
        final = '\n' + name + ' (' + lvl + ') ' + dmg + extra
        this.mook.melee += final + note
      } else {
        let ranged = []

        rpats.forEach(pattern => {
          let re = new RegExp(pattern.regex)
          let match = line.match(re)

          if (match) {
            line = line.replace(re, '').trim()
            if (match[1]) ranged.push(pattern.var + ' ' + match[1])
          }
        })

        if (ranged.length > 0) {
          extra = ranged.join(' ')
          final = '\n' + name + ' (' + lvl + ') ' + dmg + ' ' + extra
          if (line) note += '\n' + COMMENT_CHAR + line
          this.mook.ranged += final + note
        } else {
          // but it may not have either, in which case we treat as melee
          final = '\n' + name + ' (' + lvl + ') ' + dmg + extra
          if (line) note += '\n' + COMMENT_CHAR + line
          this.mook.melee += final + note
        }
      }

      ;[attblk, line, nextline] = this.gatherAttackLines(attblk, nextline, oldformat) // collect up any more lines.
    }
  }

  mapDmg(line, dmg) {
    if (!dmg) return ['', '']
    dmg = dmg.trim().toLowerCase()
    let parsedDamage = GURPS.DamageTables.parseDmg(dmg)

    if (parsedDamage == dmg) return ['', line]
    let parts = parsedDamage.split('~')
    let roll = parts[0] + 'd' + parts[1] + parts[2] + parts[3] + parts[4]
    let types = parts[5].trim().split(' ')
    let mappedDamageType = GURPS.DamageTables.translate(types[0])

    if (!mappedDamageType) return ['', `Unrecognized damage type "${types[0]}" for "${line}"`]

    return [roll + ' ' + mappedDamageType, types.slice(1).join(' ')]
  }

  appendToNotes(noteText, suffix = ' ') {
    this.mook.notes += noteText + suffix
  }

  // If the first line does not contain a ":" (or "ST "), then it probably is not the start of the stat block
  checkForNameNotes() {
    this.trim()
    let line = this.nextline()

    if (!line) return
    let curregex = /ST.*\d+.*HP.*\d+/
    let oldregex = /ST.*\d+.*DX.*\d+/
    let forumregex = /^ST:? +\d?\d/

    let first = true

    while (!!line && !line.match(curregex) && !line.match(oldregex) && !line.match(forumregex)) {
      // Assume we haven't started the stat block yet
      // if the first line has 2 or fewer spaces, assume that it is a name.   Just guessing here
      if (first && (line.match(/ /g) || []).length < 3) this.mook.name = line
      else this.appendToNotes(line)
      line = this.nextline()
      first = false
    }

    if (this.mook.notes) this.mook.notes += '\n\n'
    this.pushToken(line)
  }

  parseFinalNotes() {
    let postProcessWeapons = this.stealahead('\nWeapons:')

    this.trim()
    let token = this.nextToken()

    if (token) {
      if (token == 'Class:') {
        this.appendToNotes(token + ' ' + this.nextline(), '\n')

        return this.parseFinalNotes()
      }

      if (token == 'Notes:') this.appendToNotes(this.statblk)
      else this.appendToNotes(token + ' ' + this.statblk)
    }

    this.mook.notes = this.mook.notes.trim()
    this.statblk = postProcessWeapons
  }

  pushToken(tokenText) {
    this.statblk = tokenText + '\n' + this.statblk
  }

  // This is the exhaustive test to see if we want to parse it as an attribute.
  // Note: we may want to parse some things just so we can safely skip over them
  isAttribute(token) {
    if (!token) return false
    if (token == 'Traits:' || token == 'Advantages/Disadvantages:') return false
    if (token.match(/\w+:/) || !!GURPS.attributepaths[token]) return true
    if (token.match(/\[\d+\],?/)) return true // points costs [20]     accept this to parse, to skip over it

    return Object.prototype.hasOwnProperty.call(POSSIBLE_ATTRIBUTE_KEYS, token.toLowerCase())
  }

  // We know we accept it, however, it may be 'junk' that we are just trying to skip over.
  getAttrib(token) {
    if (token.match(/\[\d+\],?/)) return false // points costs [20]			// Don't count this as "any"
    let lettersOnlyKey = token.replace(/[^A-Za-z]/g, '') // remove anything but letters

    // Special case is attributes are listed as "basic speed" or "fright check"
    if (POSSIBLE_ATTRIBUTE_KEYS[lettersOnlyKey.toLowerCase()]) return ''

    return lettersOnlyKey
  }

  storeAttrib(attrib, value) {
    let val = value.replace(/[,;.]$/g, '') // try to clean up the value by stripping crap off the end

    attrib
      .toLowerCase()
      .split('/')
      .forEach(attributeKey => (this.mook[attributeKey] = val)) // handles cases like "Parry/Block: 9"
    console.log('Storing attribute: ' + attrib + '=' + val)
  }

  parseAttrs() {
    var attr, val, saved

    this.trim()
    let unknowns = []

    unknowns.push([]) // Each line will have its own array of unparsed keys
    let line = this.nextline()

    saved = line
    let any = false

    while (true) {
      ;[line, attr] = this.nextPrim(line)

      if (!line && !attr) {
        if (!any) break
        line = this.nextline()
        saved = line
        ;[line, attr] = this.nextPrim(line)
        any = false
        unknowns.push([])
      }

      while (this.isAttribute(attr)) {
        // Something we recognize
        let goodattr = this.getAttrib(attr) // An actual attribute

        if (goodattr !== false) any = true // Anything except "false" means "keep looking"

        if (goodattr) {
          ;[line, val] = this.nextPrim(line)

          if (!line && !val) {
            line = this.nextline()
            ;[line, val] = this.nextPrim(line)
          }

          this.storeAttrib(goodattr, val)
        }

        ;[line, attr] = this.nextPrim(line)

        if (!line && !attr) {
          if (!any) break
          line = this.nextline()
          saved = line
          ;[line, attr] = this.nextPrim(line)
          any = false
          unknowns.push([])
        }
      }

      if ('Traits:' == attr) break
      if (attr) unknowns.slice(-1)[0].push(attr)
    }

    unknowns.pop() // The last line didn't have any attributes, so not really errors.
    this.pushToken(saved) // We didn't use this line, so put it back
    let unknownAttributeText = unknowns
      .map(unknownAttributeList => unknownAttributeList.join(' '))
      .join(' ')
      .trim() // collapse all unknowns into a string

    if (unknownAttributeText) {
      // we parsed some things that did not work.
      this.appendToNotes(ERR + ' ' + unknownAttributeText, '\n')
    }
  }

  stealahead(str) {
    let i = this.statblk.indexOf(str)

    if (i < 0) return ''
    let stolenText = this.statblk.substr(i + str.length + 1)

    this.statblk = this.statblk.substring(0, 1)

    return stolenText
  }

  peek(str) {
    return this.statblk.includes(str)
  }

  peekskipto(str) {
    return this.peek(str) ? this.nextToken(str, false) : ''
  }

  trim() {
    this.statblk = this.cleanLine(this.statblk)
  }

  nextToken(d1 = ' ', d2 = '\n', all = false) {
    let [remainingText, token] = this.nextTokenPrim(this.statblk, d1, d2, all)

    this.statblk = remainingText

    return token
  }

  nextline() {
    let [remainingText, lineText] = this.nextlinePrim(this.statblk)

    this.statblk = remainingText

    return lineText
  }

  next(delim = ' ') {
    let [remainingText, token] = this.nextPrim(this.statblk, delim)

    this.statblk = remainingText

    return token
  }

  nextlinePrim(txt) {
    return this.nextPrim(txt, '\n')
  }

  nextPrim(txt, delim = ' ') {
    return this.nextTokenPrim(txt, delim, false, true)
  }

  nextTokenPrim(str, d1 = ' ', d2 = '\n', all = false) {
    // d2 must be equal or longer in length than d1  ")" and "):"
    if (!str) return [str, undefined]
    let firstDelimiterIndex = str.indexOf(d1)
    let secondDelimiterIndex = str.indexOf(d2)

    if (firstDelimiterIndex >= 0 && secondDelimiterIndex >= 0) {
      if (secondDelimiterIndex <= firstDelimiterIndex) {
        d1 = d2 //
        firstDelimiterIndex = secondDelimiterIndex // Crappy hack to be able to search for 2 delims
      }

      let token = str.substring(0, firstDelimiterIndex)

      return [str.substr(firstDelimiterIndex + d1.length).trim(), token]
    }

    if (firstDelimiterIndex >= 0) {
      let token = str.substring(0, firstDelimiterIndex)

      return [str.substr(firstDelimiterIndex + d1.length).trim(), token]
    }

    if (secondDelimiterIndex >= 0) {
      let token = str.substring(0, secondDelimiterIndex)

      return [str.substr(secondDelimiterIndex + d2.length).trim(), token]
    }

    return all ? ['', str] : [str, undefined]
  }

  nextTokenV2Prim(str, arr, all = false) {
    if (!str) return [str, undefined]
    let best = Number.MAX_SAFE_INTEGER
    let bestIndex = -1

    for (let index = 0; index < arr.length; index++) {
      let delimiter = arr[index]
      let cur = str.indexOf(delimiter)

      if (cur >= 0 && cur < best) {
        best = cur
        bestIndex = index
      }
    }

    if (bestIndex >= 0) {
      let token = str.substring(0, best)

      return [str.substr(best + arr[bestIndex].length).trim(), token]
    } else {
      return all ? ['', str] : [str, undefined]
    }
  }

  cleanLine(line) {
    let start = line

    if (!line) return line
    let pat = '*,.:' // things that just clutter up the line

    if (pat.includes(line[0])) line = line.substr(1)
    if (pat.includes(line[line.length - 1])) line = line.substring(0, line.length - 1)
    line = line.trim()

    return start == line ? line : this.cleanLine(line)
  }
}

export class NpcInputDefaultEditor extends NpcInput {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['ms-mook-generator-app', 'sheet', 'form'],
      id: 'npc-input',
      template: 'systems/gurps/templates/actor/npc-input.hbs',
      resizable: true,
      minimizable: false,
      width: 800,
      height: 650,
      title: 'Mook Generator Defaults Editor',
      closeOnSubmit: true,
    })
  }

  getData(options) {
    let data = super.getData(options)

    data.displaybuttons = false

    return data
  }

  close(options) {
    super.close(options)
    game.settings.set(GURPS.SYSTEM_NAME, Settings.SETTING_MOOK_DEFAULT, this.mook)
  }

  setTesting(_isTesting = true) {
    // Do nothing in the Defaults Editor
  }
}

class Mook {
  constructor() {
    this.name = ''
    this.title = 'bad guy'
    this.desc = 'appearence'
    this.st = 10
    this.dx = 10
    this.iq = 10
    this.ht = 10
    this.dodge = 0
    this.parry = 0
    this.hp = 10
    this.will = 10
    this.per = 10
    this.fp = 10
    this.speed = 0
    this.move = 0
    this.sm = '+0'
    this.dr = 0
    this.damage = '1d/2d'
    this.notes = `Notes.   May include On-the-Fly formulas
[IQ to remember something] [Dodge] [+2 Blessed]`
    this.traits = `Ugly [-4 from everyone]
High Pain Threshold; [CR: 12 Gambling]`
    this.skills = `Barter-14
Search-13;Lockpicking-11`
    this.melee = `Punch (12) 1d-2 cr
Kick (11) 1d cr`
    this.ranged = `Slingshot (9) 1d-3 imp acc 2`
    this.spells = 'Create Water-11'
    this.equipment = 'Item; 1; $15; 0.5 lbs'
  }
}

let EX = [
  // 0

  `Goblin
Goblins are the smallest of the goblin-kin, and therefore
spend their days being bullied by orcs and tossed around by
angry hobgoblins. This has led to a cowardly disposition,
yet they�fre survivors, and deadlier in a fight than the typical
human. In combat, they prefer stealthy ambushes involving
ranged (and preferably poisoned) weapons, followed by running
away.
Goblins stand 2�h shorter than humans on average, but
like all goblin-kin are densely built and thus no lighter. They
resemble nothing so much as misshapen, hunchbacked elves
with pointy ears and needle-like teeth. Skin tones vary greatly,
but tend toward the greenish.
ST: 11 HP: 12 Speed: 6.00
DX: 11 Will: 10 Move: 4
IQ: 9 Per: 10
HT: 11 FP: 11 SM: 0
Dodge: 8 Parry/Block: 9 DR: 2
Bite (13): 1d-1 cutting. Reach C.
Kick (11): 1d+1 crushing (includes +1 for heavy boots).
Reach C, 1.
Long Knife (13): 1d cutting or 1d-1 impaling. Reach C, 1.
Punch (13): 1d-1 crushing. Reach C.
Shield Bash (12): 1d-1 crushing. Reach 1.
Short Bow (13): 1d-1(2) piercing + follow-up 2 points toxic
(HT to resist). Ranged, with Acc 1, 1/2D 110, Max 165,
Shots 1(2), Bulk -6.
Traits: Appearance (Ugly); Cowardice (12); Infravision;
Rapid Healing; Resistant to Disease 5; Resistant to Poison
5; Social Stigma (Savage).
Skills: Bow-13; Brawling-13; Knife-13; Shield-12; Stealth-12.
Class: Mundane.
Notes: Equipped with heavy leather armor (DR included
above; thoroughly lice-ridden, stinking, and unsalable),
small shield (DB 1), long knife, short bow, and 10 bodkin
arrows poisoned with monster drool. This puts the goblin
at Light encumbrance, as reflected in the stats. A nonwarrior
would have ST 10 (and lower damage), DX 10, HP
11, Speed 5.25, and reduced combat skills. Leaders have
IQ 10+ and higher skills, and often trade bow and arrows
for a saber (1d cutting or impaling) to wave around while
giving orders. Shamans have IQ 10+ and Power Investiture
1-3 . and goblin gods grant their clerics nasty wizardly
spells such as Deathtouch! Goblins are easily intimidated,
so they�fll negotiate if cornered . . . and backstab as soon as
they aren�ft.`,
  // 1
  `ST: 13 HP: 13 Speed: 5.00
DX: 11 Will: 9 Move: 5
IQ: 9 Per: 12
HT: 11 FP: 11 SM: 0
Dodge: 8 Parry: 9 DR: 1
Kick (11): 1d+1 crushing. Reach C, 1.
Punch (13): 1d crushing. Reach C.
Stone-Headed Club (12): 2d+3 crushing. Reach 1.
Traits: Animal Empathy; Appearance (Unattractive); Arm ST
1; Brachiator (Move 3); Social Stigma (Savage); Temperature
Tolerance 2 (Cold).
Skills: Axe/Mace-12; Brawling-13; Camouflage-12; Climbing-
13; Stealth-12; Tracking-12; Wrestling-12.
Class: Mundane.
Notes: Effective ST 15 when grappling, thanks to Arm ST
and Wrestling. These stats represent a wildman; females
are'nt often warriors, and have ST 12 (and lower damage),
DX 10, HP 12, and reduced combat skills, but superior
Camouflage and Stealth, and a tendency to climb up high
and pelt foes with large stones (Throwing-12, 1d-2 crushing)
to support their males and guard beasts. A wildman
generally carries a stone-tipped club (treat as a mace)
and wears hides (DR 1, included above); more advanced
gear is extremely unlikely, and wildman conscripts given
such equipment never get used to it: .2 to combat skills.
Spellcasters are always shamans with IQ 10+, Power Investiture
1-3, and druidic spells. Wildmen will negotiate with
anyone who hasn't violated one of their taboos.
`,
  // 2
  `STEALTH GOLEM
ST 21; DX 16*; IQ 11; HT 14.
Will 13; Per 16*; Speed 9.00; Dodge 12*; Move 9*.
SM 0; 300 lbs.
Traits: Absolute Direction; Automaton; Cannot Float; Danger
Sense*; Doesn't Breathe; DR 4; Fragile (Unnatural);
Indomitable; Machine; Night Vision 9*; Nocturnal (Can
function weakly out of direct sunlight); Payload 1; Perfect
Balance*; Reduced Consumption (Based on Powerstone);
Reprogrammable; Single-Minded; Unaging; Unfazeable;
Vacuum Support.
Skills: Acrobatics-15; Brawling-18; Climbing-18; Cloak-15;
Escape-16; Filch-16; Forced Entry-17; Garrote-18; Holdout-
15; Knife-18; Lockpicking-16; Observation-16; Pickpocket-
16; Search-17; Shadowing-14; Shortsword-16; Staff-16;
Stealth-18; Tactics-12; Traps-14.
* During daylight hours, the stealth golem has DX 10, Per
10, Dodge 8, Move 5, and loses these specific advantages.
Modify all skills accordingly.`,
  // 3

  `ST: 11 HP: 11 Speed: 8.00
DX: 13 Will: 8 Move: 8
IQ: 8 Per: 8
HT: 12 FP: N/A SM: 0
Dodge: 11 Parry/Block: 10 DR: 2
Bony Claw (14): 1d-1 crushing. Reach C.
Longbow (14): 1d+1 impaling. Ranged, with Acc 3, 1/2D 165,
Max 220, Shots 1(2), Bulk -8.
Shield Bash (14): 1d-1 crushing. Reach 1.
Weapon (14): Axe (1d+3 cutting), shortsword (1d+1 cutting
or 1d impaling), small mace (1d+3 crushing), spear (1d+1
impaling), etc. Reach 1.
Traits: Appearance (Monstrous); Automaton; Brittle; Cannot
Float; Cannot Learn; Dependency (Loses 1 HP per minute
in no-mana areas); Doesn�ft Breathe; Doesn�ft Eat or Drink;
Doesn�ft Sleep; High Pain Threshold; Immunity to Disease;
Immunity to Mind Control; Immunity to Poison; Indomitable;
Mute; No Blood; No Brain; No Eyes; No Sense of
Smell/Taste; No Vitals; Reprogrammable; Single-Minded;
Skinny; Temperature Tolerance 5 (Cold); Temperature
Tolerance 5 (Heat); Unfazeable; Unhealing (Total); Unliving;
Unnatural; Vulnerability (Crushing).
Skills: Bow-14; Brawling-14; Climbing-13; Knife-13; Shield-14;
Stealth-13; one of Axe/Mace-14, Shortsword-14, or
Spear-14.
Class: Undead.
Notes: Skull DR is still only 2. Unaffected by Death Vision or
Sense Life, but susceptible to Pentagram, Sense Spirit, and
Turn Zombie. This skeleton is made from a bandit, castle
guard, militiaman, or other low-end warrior, and equipped
as a skirmisher and archer: one-handed melee weapon,
small shield (DB 1), longbow, and 10-20 arrows. More
impressive fighters can have better combat stats and gear .
maybe even armor fit for a skeleton! Though not truly evil,
the magic animating it usually is. No undead servitor will
negotiate or reveal useful information.
`,
  // 4
  `Fire Elemental
A mobile flame with a roughly humanoid shape. In the
wild, these beings lurk in or near volcanoes and lava, but they
sometimes come out to play in (or set) wildfires. A fire elemental
is hard to harm: it has DR 6, is Diffuse, cannot be harmed
in any way by heat or fire, and tends to destroy wooden weapons
used to strike it!
ST: 15 HP: 17 Speed: 6.00
DX: 12 Will: 10 Move: 6/12
IQ: 8 Per: 8
HT: 12 FP: 12 SM: +1
Dodge: 9 Parry: N/A DR: 6
Fiery Blow (12): 1d burning + halo of flame, below. Reach
C, 1.
26 The Be stia ry
Firebolt (15): Costs 1 FP per use. 2d burning. Ranged, with
Acc 3, 1/2D 10, Max 100.
Halo of Flame: 2d burning to anyone touched by elemental
or touching it in close combat. This can destroy wooden
weapons (Damage to Objects, Exploits, pp. 55-56), though
the danger should be obvious beforehand.
Traits: Bad Temper (12); Diffuse; Doesn ft Breathe (but
see notes); Doesn ft Eat or Drink; Doesn ft Sleep;
Enhanced Move (Ground); Immunity to Disease;
Immunity to Heat/Fire; Immunity to Poison;
No Fine Manipulators; No Neck; Pyromania (9);
Weakness (1d HP if immersed in water, repeating
every minute).
Skills: Innate Attack (Projectile)-15.
Class: Elemental.
Notes: Fire elementals don ft breathe and can ft be
gassed or strangled, but require air in order to
burn, experiencing Suffocation (Exploits, p. 70)
without it: FP loss, and then HP loss until death. Summoned
elementals add Reprogrammable and Unnatural;
they vanish instantly if wounded to -1HP, and can also be
dismissed by the Banish spell (Spells, pp. 59-60).

`,
  // 5
  `ST: 23 HP: 23 Speed: 6.50
DX: 14 Will: 13 Move: 10 (Air Move 13)
IQ: 5 Per: 12
HT: 12 FP: 12 SM: +1
Dodge: 10 Parry: 12 (�2) DR: 2
Dragon's Head (16): Bite or horns, 2d+2 cutting. Horns count
as weapon, not as body part, both to attack and parry!
Reach C, 1.
Fire Breath (16): 2d+1 burning in a 1-yard-wide � 10-yardlong
cone that inflicts large-area injury (Exploits, p. 53);
see Area and Spreading Attacks (Exploits, pp. 45-46). Costs
2 FP per use, with no recharge time or limit on uses/day.
Front Claw (16): 2d+2 cutting. Reach C, 1.
Goat's Head (16): Horns, 2d+2 impaling. Treat as weapon,
not as body part, both to attack and parry! Reach C, 1.
Hind Claw (14): 2d+3 cutting. Reach C, 1.
Lion's Head (16): Bite, 2d+2 cutting. Reach C, 1.
Serpent's Head (16): Bite (at only ST 18), 1d+2 impaling +
follow-up 2d toxic, or 1d with a successful HT roll. Reach
C, 1.
Traits: 360� Vision; Bad Temper (9); Combat Reflexes; DR
2 vs. heat/fire only; Extra Attack 3; Extra-Flexible; Extra
Heads 3; Flight (Winged); Night Vision 5; Penetrating
Voice; Quadruped; Temperature Tolerance 2 (Heat); Wild
Animal.
Skills: Brawling-16; Innate Attack (Breath)-16.
`,
  // 6
  `Zombie
Rotting corpses reanimated by dark necromancy . not by
strange contagion or other  gnatural h causes . are by far the
most common undead servitors. There isn ft a lich (p. 40) out
there without a small army of these, and vampires (pp. 58-59)
employ them as well. Zombies cannot be bribed or corrupted,
but their mental faculties are so limited that they fre useful
only as fodder in a fight, or for menial tasks such as turning
winches and carrying palanquins.
Truly evil monsters turn cadavers into zombies by binding
evil spirits within or using mass possession. Turning
(Adventurers, p. 21) affects such undead. However, possession
lets the reanimator share up to its own level of Resist Good
(p. 11) with its servants . maybe even borrow their senses!
Zombies are Unliving and slightly harder to injure, but also
Unnatural and thus dispelled at -1 HP.
ST: 13 HP: 17 Speed: 6.00
DX: 12 Will: 8 Move: 4
IQ: 8 Per: 8
HT: 12 FP: N/A SM: 0
Dodge: 8 Parry/Block: 9 DR: 2
Punch (13): 1d-1 crushing. Reach C.
Shield Bash (13): 1d crushing. Reach 1.
Weapon (12 or 13): Axe (2d+1 cutting), broadsword (2d cutting
or 1d+2 impaling), mace (2d+2 crushing), morningstar
(2d+2 crushing), etc. Reach 1.
Traits: Appearance (Monstrous); Automaton; Bad Smell;
Cannot Learn; Dependency (Loses 1 HP per minute in
no-mana areas); Disturbing Voice; Doesn ft Breathe;
Doesn ft Eat or Drink; Doesn ft Sleep; High Pain Threshold;
Immunity to Disease; Immunity to Mind Control;
Immunity to Poison; Indomitable; No Blood; No Sense of
Smell/Taste; Reprogrammable; Single-Minded; Temperature
Tolerance 5 (Cold); Temperature Tolerance 5 (Heat);
Unfazeable; Unhealing (Total); Unliving; Unnatural.
Skills: Brawling-13; Shield-13; Wrestling-13; one of
Axe/Mace-13, Broadsword-13, or Flail-12.
Class: Undead.
Notes: Unaffected by Death Vision or Sense Life, but susceptible
to Pentagram, Sense Spirit, and Turn Zombie. Effective
grappling ST is 14, thanks to Wrestling. This zombie is
made from a beefy gang enforcer, foot soldier, or similar
melee fighter, and equipped as a bargain-basement shock
trooper: one-handed melee weapon, medium shield (DB
2), and heavy leather armor (DR 2, included above). This
results in Light encumbrance, which is already figured into
the stats. Zombies will rot, eventually becoming skeletons
(pp. 47-48) if they last long enough . though some are preserved
as mummies with IQ 10, No Brain, and No Vitals,
but which catch fire and burn for 1d-1 injury per second if
they receive a major wound from fire. Not truly evil, though
the magic animating it usually is. No undead servitor will
negotiate or reveal useful information.
`,
  // 7
  `ST: 18 HP: 18 Speed: 6.00
DX: 12 Will: 10 Move: 9
IQ: 10 Per: 11
HT: 12 FP: 12 SM: 0
Dodge: 10 Parry: 11 (unarmed) DR: 15 (not vs. silver)
Bite or Claw (14): 2d+1 cutting. Reach C.
Traits: Acute Hearing 3; Acute Taste and Smell 3; Alternate
Form (Human); Appearance (Hideous); Bloodlust
(12); Combat Reflexes; Discriminatory Smell; Disturbing
Voice; Dread (Wolfsbane; 1 yard); Gluttony (12); High
Pain Threshold; Immunity to Disease; Immunity to Poison;
Night Vision 2; No Fine Manipulators; Odious Racial
Habit (Eats other sapient beings, .3 reactions); Penetrating
Voice; Recovery; Regeneration (1 HP/second, but not vs.
damage from silver); Silence 1; Striking ST 4; Temperature
Tolerance 5 (Cold); Vulnerability (Silver).
Skills: Brawling-14; Stealth-12 (13 vs. Hearing if moving, 14 if
motionless); Tracking-15.
Class: Mundane.
Notes: Hearing roll is 14 and Smell roll is 18 for detecting
delvers! Individuals may be bigger (more ST, HP, and
Striking ST), sneakier (higher Night Vision and Silence), or
more skilled. Clawed hands prevent weapon use. Against a
group carrying wolfsbane and bristling with silver weapons,
werewolves will stay hidden or pretend to be human .
but if they can�ft, they�fll negotiate. Truly evil.


`,
  // 8
  `ST: 15 HP: 15 Speed: 8.00
DX: 18 Will: 15 Move: 8
IQ: 12 Per: 15 Weight: 100.150 lbs.
HT: 13 FP: 13 SM: 0
Dodge: 12 Parry: 14 DR: 2 (Tough Skin)
Fright Check: -4 (once maw is open)
Bite (20): 3d+1 cutting. Often aimed at the neck; see text. May
bite and use webbing on the same turn. Reach C.
Punch (20): 1d+1 crushing. Reach C.
Webbing (20): Binding ST 25 (p. B40) with Engulfing and
Sticky. Range 50, Acc 3, RoF 10, Rcl 1. The rate of fire may
be split up among multiple foes; e.g., three strands at the
commando, three at the sage, and four
at the warrior, resolved as three separate
attacks.
Traits: Ambidexterity; Appearance
(Beautiful); Clinging;
Combat Reflexes; Danger
Sense; Extra Attack (see Webbing,
above); Honest Face;
Infravision; Injury Tolerance
(No Brain; No Vitals; Unliving;
see notes); Restricted Diet
(People); Striking ST 12 (Bite
Only; Nuisance Effect, Hideous
Appearance); Subsonic
Hearing; Super Jump 2.
Skills: Acrobatics-18; Acting-14;
Brawling-20; Innate Attack
(Projectile)-20; Musical Instrument
(varies)-12; Jumping-20;
Sex Appeal-15; Singing-14;
Stealth-20.
Notes: Living being!  gUnliving h
simply reflects its odd physiology.
As well, it has a brain
and vitals, but not where
you fd expect; knowing where
to stab requires a successful
roll against Biology at -4,
Hidden Lore (Cryptozoology),
Theology (Shamanic) at -2, or
Veterinary. In combat, can
leap 11 yards forward or three
yards straight up; double this
out of combat, double it with
a running start, quadruple it
for both.
`,
  // 9
  `Guards
ST 10; DX 10; IQ 9; HT 11.
Damage 1d-2/1d; BL 20 lbs.; HP 10; Will 9; Per 10; FP 11.
Basic Speed 5.25; Basic Move 5; Dodge 8; Parry 9 (Brawling).
5�6�-6�; 150-170 lbs.
Advantages/Disadvantages: Cantonese (Native).
Skills: Brawling-13; Guns/TL8 (Pistol)-12; Guns/TL8
(SMG)-12; Knife-14.
`,
  // 10
  `The Mate
ST 11; DX 12; IQ 10; HT 11.
Damage 1d-1/1d+1; BL 24 lbs.; HP 11; Will 10; Per 12; FP 11.
Basic Speed 5.75; Basic Move 5; Dodge 9; Parry 10 (Knife).
5�8�; 155 lbs.
Advantages/Disadvantages: Acute Hearing 2; Cantonese
(Native); Combat Reflexes.
Skills: Brawling-14; Guns/TL8 (Pistol)-14; Guns/TL8
(SMG)-14; Knife-15.
`,
  // 11
  `Notwithstanding the page name, this guy is not a Nazi party member. He's just a German soldier in 1939. His main motivation is the same as that of many young men like him in his day, patriotism.
This is a very generic German infantryman, with no special personal Traits, save the most common ones.
His Attributes and Skills reflect the fact that in 1939, the average soldier was pretty thoroughly trained and physically conditioned; also, he belongs to a first-class division, in which most privates would be young, healthy and bright for their age.
Height: 5'11", weight: 155 lbs., age: 21.
ST: 11 	HP: 11 	Speed: 5.5
DX: 11 	Will: 11 	Move: 4
IQ: 11 	Per: 11
HT: 11 	FP: 11 	SM: 0
Dodge: 7 	Parry: 8 	DR: 4,0,2

Mauser Karabiner 98K 7.92mm Mauser (13): 7d pi
Bayonet, Fine (7): 1d cut, Reach C,1; 1d imp, Reach C
Rifle-fixed bayonet thrust (10): 1d+3 imp, Reach 1,2*
Straight rifle-butt thrust (8): 1d+1 cr, Reach 1
Punch (12): 1d-2 cr, Reach C
Kick (10): 1d cr, Reach C,1

Traits: Addiction (Tobacco); Duty (Heer; 15 or less; Extremely Hazardous); Fanaticism (Patriotism); Fit.
Skills: Armoury/TL6 (Small Arms)-10; Brawling-12; Camouflage-11; Climibing-10; Explosives/TL6 (Demolition)-10; First Aid/TL6-11; Gambling-10; Gunner/TL6 (Machine Gun)-11; Guns/TL6 (Light Machine Gun)-12; Guns/TL6 (Rifle)-13; Hiking-10; Jumping-11; Navigation/TL6 (Land)-10; Savoir-Faire (Military)-11; Scrounging-11; Soldier/TL6-12; Spear-10; Stealth-10; Survival (Woodlands)-10; Swimming-11; Teamster (Equines)-10; Throwing-10; Traps/TL6-10.
`,
  // 12
  `Crystal Rat-Men
The process which changes giant rats into rat-men imbues
some with strange abilities. Crystal rat-men have long crystalline
claws which cut through armor easily, and their skin
is studded with lumps of translucent stone which provide a
modicum of protection. They can even hurl needle-like crystal
spines (which shatter into uselessness after impact) at enemies
with a flick of the hand.
ST: 11 HP: 11 Speed: 6.50
DX: 13 Will: 10 Move: 6
IQ: 7 Per: 10
HT: 13 FP: 13 SM: 0
Dodge: 9 Parry: 10 (unarmed) DR: 2
Bite (15): 1d-(2) cutting. Reach C.
Kick (13): 1d(2) cutting. Reach C, 1.
Punch (15): 1d-1(2) cutting. Reach C.
Thrown Spine (15): 1d-2(2) impaling. Ranged, with Acc 0,
1/2D 5, Max 11.
Traits: Appearance (Ugly); Berserk (12); Fanaticism; High
Pain Threshold; Night Vision 5; Resistant to Disease 5;
Resistant to Poison 5; Spider Climb (Move 4).
Skills: Brawling-15; Innate Attack (Projectile)-15; Stealth-12.
Class: Mundane.
Notes: Unlike regular rat-men, crystal rat-men attack barehanded
but are capable of innate ranged attacks. However,
crystal rat-men are liable to be overtaken by rage when
they fight, so their battles tend to end spectacularly, one
way or another.`,
  // 13
  `Tsorvano
273 points
Tsorvano is an ex-brigand who met Halmaro years
ago at sword�s point, while Halmaro was an aggressive
young caravan-master. Neither one will say who won
that first encounter, but soon afterward Tsorvano
became the merchant�s loyal henchman.
Tsorvano wears his broadsword for everyday use, but
if he expects trouble, he�ll sling his greatsword on his back.
Early 40s; Swarthy, bald, hooked nose, brilliant
green eyes; 6�4�, 220 lbs.
Attributes: ST 13 [30], DX 14 [80], IQ 13 [60], HT 12
[20]
Secondary Characteristics: Dmg 1d/2d-1, BL 34, HP
13, Will 13, Per 13, FP 12, Basic Speed 6.50, Basic
Move 6, Dodge 9, Parry 11.
No armor, no encumbrance.
Advantages: Damage Resistance DR 1 (Tough Skin,
-40%) [3]; Wealth (Wealthy) [20].
Disadvantages: Miserly (12) [-10]; Sense of Duty
(Halmaro and Guild) [-10]; Stubborn [-5].
Quirks: Dotes on Halmaro�s daughters; Dislikes clerics,
will always wear the minimum for comfort and propriety;
Enjoys embarrassing his inferiors; Likes
open spaces; Very cold to strangers. [-5]
Skills: Broadsword (A) DX+2 [8]-16; Desert Survival
(A) Per+3 [12]-16; Fast-Draw (Two-Handed Sword)
(E) DX [1]-14; Fast-Draw (Knife) (E) DX [1]-14;
Fast-Talk (A) IQ+2 [8]-15; Knife (E) DX+3 [8]-17;
Kalba (musical instrument) (H) IQ+1 [8]-14;
Merchant (A) IQ+3 [12]-16; Mountain Survival (A)
Per+2 [8]-15; Two-Handed Sword (A) DX+3 [12]-17.
Languages: Lantrai-Native [0] (default); Shandassa-
Native [6]; Nomic-Native [6]; Ayuni Trade Pidgin-
Broken [0] (default).
Weapons: Broadsword: 2 dice cutting, 1d+1 crushing;
Greatsword: 2d+2 cutting, 1d+2 crushing; Large
Knife: 2d-3 cutting, 1 die impaling.`,
]
