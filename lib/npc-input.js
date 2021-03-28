'use strict'

import { GURPS } from '../module/gurps.js'
import { GurpsActor, Advantage, Skill, Melee, Ranged, Encumbrance, Note, Equipment } from '../module/actor.js'
import { digitsOnly } from './jquery-helper.js'
import { DamageTables } from '../module/damage/damage-tables.js'
import * as settings from '../lib/miscellaneous-settings.js'

Hooks.once('init', async function () {
  game.settings.registerMenu(settings.SYSTEM_NAME, settings.SETTING_MOOK_DEFAULT_EDITOR, {
    name: 'Mook Generator Defaults',
    label: 'Mook Generator Default Editor',
    hint: 'Edit the initial values of the Mook Generator',
    type: NpcInputDefaultEditor,
    restricted: true,
  })

  game.settings.register(settings.SYSTEM_NAME, settings.SETTING_MOOK_DEFAULT, {
    name: 'Mook Default',
    scope: 'world',
    config: false,
    type: Object,
    default: new Mook(),
    onChange: value => console.log(`Updated Mook Default: ${value}`),
  })
})

Hooks.on(`renderNpcInput`, (app, html, data) => {
  $(html).find('#npc-input-name').focus()
})

//Hooks.once("ready", () => { new NpcInput().render(true) });

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
    let m = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_MOOK_DEFAULT)
    this.mook = m || new Mook()
    this.testing = true
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['npc-input', 'sheet', 'actor', 'form'],
      id: 'npc-input',
      template: 'systems/gurps/templates/npc-input.html',
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

  setTesting(t = true) {
    this.testing = t
    this.createButton.innerText = this.testing ? 'Test Mook' : 'Create Mook'
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.gcs-input-sm2').inputFilter(value => digitsOnly.test(value))
    html.find('input[type=text]').on('change paste keyup', ev => {
      let el = ev.currentTarget
      let k = el.dataset.key
      if (!!k) {
        this.mook[k] = el.value
        this.setTesting()
      }
    })

    html.find('.npc-input-ta').on('change', ev => {
      let el = ev.currentTarget
      let k = el.dataset.key
      if (!!k) {
        this.mook[k] = el.value
        this.setTesting()
      }
    })

    html.find('#npc-input-create').on('click keydown focusout', ev => {
      if (ev.type == 'click' || (ev.type == 'keydown' && ev.which == 13)) this.createMook(ev)
      else {
        ev.preventDefault()
        $(html).find('#npc-input-name').focus()
      }
    })
    html.find('#npc-input-import').on('click keydown', ev => {
      if (ev.type == 'click' || (ev.type == 'keydown' && ev.which == 13)) this.importStatBlock(ev)
    })
    this.createButton = html.find('#npc-input-create')[0]
  }

  async importStatBlock(ev) {
    ev.preventDefault()
    let self = this
    let b = this.savedStatBlock || ''
    let d = new Dialog(
      {
        title: `Import Stat Block`,
        content: await renderTemplate('systems/gurps/templates/import-stat-block.html', { block: b }),
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: 'Import',
            callback: html => {
              let ta = html.find('#npc-input-import-ta')[0]
              let t = ta.value
              if (t.length < 3) t = EX[parseInt(t)]
              if (!!t) this.parseStatBlock(t)
              self.render(true)
            },
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
          },
        },
        default: false,
      },
      {
        width: 800,
        height: 800,
      }
    )
    d.render(true)
  }

  async createMook(ev) {
    ev.preventDefault()
    if (this.testing) {
      let err = this.check()
      if (!!err) ui.notifications.warn('Unable to create Mook: ' + err)
      else this.setTesting(false)
    } else {
      let data = { name: this.mook.name, type: 'character' }
      let a = await GurpsActor.create(data, { renderSheet: false })
      await this.populate(a)
      await a.setFlag('core', 'sheetClass', 'gurps.GurpsActorNpcSheet')
      a.sheet.render(true)
    }
    this.render(true)
  }

  async populate(a) {
    let m = this.mook
    let data = a.data.data
    let att = data.attributes
    att.ST.value = m.st
    att.DX.value = m.dx
    att.IQ.value = m.iq
    att.HT.value = m.ht
    att.WILL.value = m.will
    att.PER.value = m.per

    data.HP.max = m.hp
    data.HP.value = m.hp
    data.FP.max = m.fp
    data.FP.value = m.fp

    data.basicmove.value = parseInt(m.move)
    data.basicspeed.value = m.speed
    data.frightcheck = m.will
    if (!!m.check) data.frightcheck = m.check // Imported "fright check"

    data.hearing = m.per
    data.tastesmell = m.per
    data.touch = m.per
    data.vision = m.per
    if (!!m.parry) data.parry = parseInt(m.parry)
    if (!!m.block) data.block = parseInt(m.block)

    let ns = {}
    let nt = new Note(m.notes.trim())
    GURPS.put(ns, nt)

    let hls = data.hitlocations
    let hl = Object.values(hls).find(h => h.penalty == 0)
    hl.dr = m.dr

    let es = {}
    let e = new Encumbrance()
    e.level = 0
    e.current = true
    e.key = 'enc0'
    e.weight = 0
    e.move = parseInt(m.move)
    e.dodge = parseInt(m.dodge)
    game.GURPS.put(es, e)

    let melee = {}
    m.a_melee.forEach(me => game.GURPS.put(melee, me))

    let ranged = {}
    m.a_ranged.forEach(r => game.GURPS.put(ranged, r))

    let ts = {}
    ts.title = m.title
    let dt = new Date().toString().split(' ').splice(1, 3).join(' ')
    ts.createdon = dt
    if (!!m.sm) ts.sizemod = m.sm[0] == '-' ? m.sm : m.sm[0] == '+' ? '' : '+' + m.sm
    ts.appearance = m.desc
    ts.height = m.height
    ts.weight = m.weight
    ts.age = m.age

    let skills = {}
    m.a_skills.forEach(s => game.GURPS.put(skills, s))

    let spells = {}
    m.a_spells.forEach(s => game.GURPS.put(spells, s))

    let ads = {}
    m.a_traits.forEach(a => game.GURPS.put(ads, a))

    let eqt = {}
    m.a_equipment.forEach(e => game.GURPS.put(eqt, e))

    let dmg = m.damage || m.dmg || ''
    let thrst = dmg.split('/')[0]
    let swng = dmg.split('/')[1]
    if (!swng && !!thrst) {
      swng = thrst
      thrst = ''
    }

    let commit = {
      'data.attributes': att,
      'data.HP': data.HP,
      'data.FP': data.FP,
      'data.basicmove': data.basicmove,
      'data.basicspeed': data.basicspeed,
      'data.currentmove': parseInt(m.move),
      'data.currentdodge': parseInt(m.dodge),
      'data.frightcheck': data.frightcheck,
      'data.hearing': data.hearing,
      'data.tastesmell': data.tastesmell,
      'data.touch': data.touch,
      'data.vision': data.vision,
      'data.equippedparry': data.parry,
      'data.parry': data.parry,
      'data.equippedblock': data.block,
      'data.block': data.block,
      'data.notes': ns,
      'data.hitlocations': hls,
      'data.encumbrance': es,
      'data.melee': melee,
      'data.ranged': ranged,
      'data.traits': ts,
      'data.skills': skills,
      'data.spells': spells,
      'data.ads': ads,
      'data.swing': swng,
      'data.thrust': thrst,
      'data.equipment.carried': eqt,
    }

    await a.update(commit)
    console.log('Created Mook:')
    console.log(a)
  }

  check() {
    let e = ''
    if (!this.mook.name) e = ', No Name'
    if (this.checkTraits()) e += ', Error in Traits'
    if (this.checkSkills()) e += ', Error in Skills'
    if (this.checkMelee()) e += ', Error in Melee'
    if (this.checkRanged()) e += ', Error in Ranged'
    if (this.checkSpells()) e += ', Error in Spells'
    if (this.checkEquipment()) e += ', Error in Equipment'
    return e.substr(2)
  }

  // return an array of string representing each line
  prep(text, delim) {
    var ans
    if (!!delim) ans = this.parseDelimLines(text, delim)
    else ans = text.split('\n')
    return ans.map(e => this.cleanLine(e)).filter(e => e.length > 0)
  }

  // Allow () to include delims without breaking line
  parseDelimLines(str, delim) {
    let arr = []
    let i = 0
    let line = ''
    let d = 0
    while (i < str.length) {
      let c = str[i++]
      if ((c == delim && d == 0) || c == '\n') {
        arr.push(line)
        line = ''
      } else {
        line += c
        if (c == '(') d++
        if (c == ')') d--
      }
    }
    if (!!line) arr.push(line)
    return arr
  }

  checkSkills() {
    const m = this.mook
    let txt = ''
    let arr = []
    this.prep(m.skills, ';').forEach(e => {
      if (e.includes(ERR)) return
      txt += '\n' + e
      if (e.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, e.substr(1), ' ')
        return
      }
      const i = e.indexOf('-')
      if (i < 1) return (txt += `\n${ERR} missing '-'`)
      const n = e.substring(0, i).trim()
      const v = e.substr(i + 1).trim()
      if (!v) return (txt += `\n${ERR} missing skill level`)
      if (isNaN(v)) return (txt += `\n${ERR} "${v}" is not a number`)
      arr.push(new Skill(n, v))
    })
    m.skills = txt.substr(1)
    m.a_skills = arr
    return txt.includes(ERR)
  }

  checkSpells() {
    const m = this.mook
    let txt = ''
    let arr = []
    this.prep(m.spells, ';').forEach(e => {
      if (e.includes(ERR)) return
      txt += '\n' + e
      if (e.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, e.substr(1), ' ')
        return
      }
      const i = e.indexOf('-')
      if (i < 1) return (txt += `\n${ERR} missing '-'`)
      const n = e.substring(0, i).trim()
      const v = e.substr(i + 1).trim()
      if (!v) return (txt += `\n${ERR} missing spell level`)
      if (isNaN(v)) return (txt += `\n${ERR} "${v}" is not a number`)
      arr.push(new Skill(n, v))
    })
    m.spell = txt.substr(1)
    m.a_spells = arr
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
    const m = this.mook
    let txt = ''
    let arr = []
    this.prep(m.melee).forEach(e => {
      if (e.includes(ERR)) return
      txt += '\n' + e
      if (e.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, e.substr(1), ' ')
        return
      }
      var me, remain
      let parse = e.replace(
        /(.*) ?\((\d+)\) (\d+)d6?([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)$/g,
        '$1~$2~$3~$4~$5~$6~$7~$8~$9'
      )
      if (e != parse) {
        parse = parse.split('~')
        me = new Melee(
          parse[0].trim(),
          parse[1],
          parse[2] + 'd' + parse[3] + parse[4] + parse[5] + parse[6] + ' ' + parse[7]
        )
        remain = parse[8].trim()
      } else {
        parse = e.replace(/(.*) ?\(([ \w]+)\) "([^"]+)" ?(.*)$/g, '$1~$2~$3~$4')
        if (e == parse) return (txt += `\n${ERR} unable to find (level) and damage`)
        parse = parse.split('~')
        me = new Melee(parse[0].trim(), parse[1], parse[2])
        remain = parse[3].trim()
      }
      if (!!remain) {
        let ext = remain.replace(/ +/g, ' ').split(' ')
        if (ext.length % 2 != 0) return (txt += `\n${ERR} unable to parse "$remain}"`)
        for (let i = 0; i < ext.length; i += 2) {
          let s = ext[i] + ext[i + 1]
          let found = false
          pats.forEach(p => {
            if (s.match(new RegExp(p.regex))) {
              me[p.var] = ext[i + 1]
              found = true
            }
          })
          if (!found) return (txt += `\n${ERR} unknown pattern "${ext[i]} ${ext[i + 1]}"`)
        }
      }
      arr.push(me)
    })
    m.melee = txt.substr(1)
    m.a_melee = arr
    return txt.includes(ERR)
  }

  checkRanged() {
    const pats = [
      { regex: '(^acc|^Acc)\\d+', var: 'acc' },
      { regex: '(^rof|^RoF|^Rof)\\d+', var: 'rof' },
      { regex: '(^rcl|^Rcl)\\d+', var: 'rcl' },
      { regex: '(^usage|^Usage|^mode|^Mode)\\w+', var: 'mode' },
      { regex: '(^range|^Range)\\d+(\\/\\d+)?', var: 'range' },
      { regex: '(^shots|^Shots)[\\w\\)\\(]+', var: 'shots' },
      { regex: '(^bulk|^Bulk)[\\w-]+', var: 'bulk' },
      { regex: '(^st|^ST|^St)\\d+', var: 'st' },
      { regex: '^halfd\\d+', var: 'halfd' },
      { regex: '^max\\d+', var: 'max' },
    ]
    const m = this.mook
    let txt = ''
    let arr = []
    this.prep(m.ranged).forEach(e => {
      if (e.includes(ERR)) return
      txt += '\n' + e
      if (e.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, e.substr(1), ' ')
        return
      }
      let parse = e.replace(
        /(.*) ?\((\d+)\) (\d+)d6?([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)?:? ?([\w-+]+)(.*)/g,
        '$1~$2~$3~$4~$5~$6~$7~$8~$9'
      )

      var r, remain
      if (e != parse) {
        parse = parse.split('~')
        r = new Ranged(
          parse[0].trim(),
          parse[1],
          parse[2] + 'd' + parse[3] + parse[4] + parse[5] + parse[6] + ' ' + parse[7]
        )
        remain = parse[8].trim()
      } else {
        parse = e.replace(/(.*) ?\(([ \w]+)\):? "([^"]+)" ?(.*)$/g, '$1~$2~$3~$4')
        if (e == parse) return (txt += `\n${ERR} unable to find (level) and damage`)
        parse = parse.split('~')
        r = new Ranged(parse[0].trim(), parse[1], parse[2])
        remain = parse[3].trim()
      }
      if (!!remain) {
        let ext = remain.trim().replace(/ +/g, ' ').split(' ')
        if (ext.length % 2 != 0) return (txt += `\n${ERR} unable to parse for `)
        for (let i = 0; i < ext.length; i += 2) {
          let s = ext[i] + ext[i + 1]
          let found = false
          pats.forEach(p => {
            if (s.match(new RegExp(p.regex))) {
              r[p.var] = ext[i + 1]
              found = true
            }
          })
          if (!found) return (txt += `\n${ERR} unknown pattern "${ext[i]} ${ext[i + 1]}"`)
        }
      }
      r.checkRange()
      arr.push(r)
    })
    m.ranged = txt.substr(1)
    m.a_ranged = arr
    return txt.includes(ERR)
  }

  addToNotes(arr, note, delim) {
    if (arr.length == 0) return
    let n = arr[arr.length - 1].notes
    if (!!n) n += delim + note
    else n = note
    arr[arr.length - 1].notes = n
  }

  checkTraits() {
    const m = this.mook
    let txt = ''
    let arr = []
    this.prep(m.traits, ';').forEach(e => {
      txt += '\n' + e
      if (e.startsWith(COMMENT_CHAR)) {
        if (arr.length > 0) this.addToNotes(arr, e.substr(1), '\n')
        return
      }
      arr.push(new Advantage(e))
    })
    m.traits = txt.substr(1)
    m.a_traits = arr
    return false
  }

  checkEquipment() {
    const m = this.mook
    let txt = ''
    let arr = []
    this.prep(m.equipment).forEach(e => {
      if (e.includes(ERR)) return
      txt += '\n' + e
      if (e.startsWith(COMMENT_CHAR)) {
        this.addToNotes(arr, e.substr(1), '\n')
        return
      }
      let a = e.split(';')
      if (a.length != 4) {
        return (txt += `\n${ERR} Expecting <name>; <qty>; $<cost>; <weight> lb\n`)
      } else {
        let eqt = new Equipment(a[0])
        eqt.count = parseInt(a[1])
        eqt.equipped = true
        eqt.carried = true
        let n = a[2].match(/ *\$ *([\?\d]+)/)
        if (n) eqt.cost = n[1]
        else {
          return (txt += `\n${ERR} Unable to find '$ <cost>'\n`)
        }
        n = a[3].match(/ *([\?\d]+) * lbs?/)
        if (n) eqt.weight = n[1]
        else {
          return (txt += `\n${ERR} Unable to find '<weight> lb'\n`)
        }
        Equipment.calc(eqt)
        arr.push(eqt)
      }
    })
    m.equipment = txt.substr(1)
    m.a_equipment = arr
    return txt.includes(ERR)
  }

  preparePastedText(txt) {
    txt = txt.replace(/\t/g, '; ') // replace tabs with '; '
    txt = txt.replace(/ +/g, ' ') // remove multiple spaces in a row
    txt = txt.replace(/\u2011/g, '-') // replace non-breaking hyphon with a minus sign
    txt = txt.replace(/\u2019/g, "'") // replace  rigth single quote with single quote

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
    } catch (e) {
      console.log(e)
      ui.notifications.warn(e)
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
    let m = line.match(re)
    if (!!m) line = line.replace(re, '')
    return [line, m]
  }

  parseEquipment() {
    if (!this.peek('Equipment')) return
    let line = this.nextline() // Skip equipment line
    line = this.nextline()
    while (!!line) {
      var m
      let cost = '?'
      let weight = '?'
      let qty = 1
      let name = ''
      ;[line, m] = this.findInLine(line, /\$([\.\d]+)[ ,\.]*/)
      if (!!m) cost = m[1]
      ;[line, m] = this.findInLine(line, /([\.\d]+) ?lbs?[ ,\.]*/)
      if (!!m) weight = m[1]
      ;[line, m] = this.findInLine(line, /^ *(\d+)/)
      if (!!m) qty = m[1]
      ;[line, m] = this.findInLine(line, /^([^(\.])+\((\d+)\)/)
      if (!!m) {
        qty = m[2]
        name = m[1]
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
    let goUntil = this.peek(end)
    let line = this.nextline()
    if (!line) return
    line = this.cleanLine(line)
    let s = ''
    //    while (!!line && (line.match(/[^-]+-\d+/) || (!!goUntil && !line.startsWith(end)))) {
    while (!!line && line.match(/[^-]+-\d+/) && !line.startsWith(end)) {
      s += '\n' + this.cleanLine(line)
      line = this.nextToken('\n', false, true)
    }
    //if (!s) this.appendToNotes(`?? No ${start} matching pattern '${path}-lvl' found`);
    s = this.cleanLine(s)
    let delim = ';'
    if (s.includes(delim)) s = s.replace(/\n/g, ' ')
    // If has delims, then remove newlines
    else delim = '\n' // No ";", so assume one per line
    var l
    while (!!s) {
      ;[s, l] = this.nextTokenPrim(s, delim, false, true) // Start it off reading the first line

      // Remove skill type, rsl and points  Broadsword (A) DX+2 [8]-16
      l = this.cleanLine(l).replace(/ ?\([a-zA-Z]+\) [a-zA-Z]+([-+][0-9]+)? \[ *-?\d+\ *] */g, '')
      l = l.replace(/ [SDIH][TXQ][-+]?[0-9]* ?/, ' ')
      l = l.replace(/ ?\[ *-?\d+ *\],?\.? ?/g, ' ')
      l = this.cleanLine(l)
      let m = l.match(/([^-]+ *- *\d+)(.*)/)
      if (m) {
        this.mook[path] += '\n' + m[1]
        if (!!m[2]) this.mook[path] += '\n' + COMMENT_CHAR + m[2]
      } else if (!!l) this.mook[path] += '\n' + COMMENT_CHAR + `Unknown ${start} pattern ${l}`
    }
    if (!!line) this.pushToken(line)
  }

  parseTraits() {
    let n = this.peekskipto('Advantages/Disadvantages')
    n += this.peekskipto('Advantages')
    n += this.peekskipto('Traits')
    if (!!n) this.appendToNotes(ERR + ' Skipped before Traits: ' + n, '\n')
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
    trblk = trblk.replace(/ ?\[-?\d+\*?\],?\.? ?/g, ' ')
    this.prep(trblk, ';').forEach(t => {
      t = t.replace(/\( *(\d+) *or less *\)/g, '($1)') // Compress some forms of CR rolls
      let m = t.match(/(.*)\((\d+)\)/)
      if (!!m) traits += `\n[CR: ${m[2]} ${m[1].trim()}]`
      // Convert CR roll into OtF
      else {
        if (t != 'and') traits += '\n' + t
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
        if (!this.peek('\nWeapons:')) this.mook.melee = COMMENT_CHAR + 'No attacks found' // If Weapons aren't listedt later, show error.
      }
    }
    if (!attblk) return
    attblk = this.cleanLine(attblk)
    // assume a line is an attack if it contains '(n)'
    let line, nextline
    ;[attblk, line] = this.nextTokenPrim(attblk, '\n', false, true) // Start it off reading the first line
    ;[attblk, line, nextline] = this.gatherAttackLines(attblk, line, oldformat) // collect up any more lines.

    while (!!line) {
      save = line
      line = this.cleanLine(line)
      var name, lvl, dmg, save
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
        } else if (!!note) note = '\n' + COMMENT_CHAR + this.cleanLine(note)
      }
      let regex = /.*[Rr]each (?<reach>[^\.]+)/g
      let result = regex.exec(line)
      let extra = ''
      let final = ''
      if (!!result?.groups?.reach) {
        // If it has Reach, it is definitely melee
        extra = ' reach ' + result.groups.reach.replace(/ /g, '')
        line = this.cleanLine(line.replace(/[Rr]each [^\.]+/, ''))
        if (!!line) note += '\n' + COMMENT_CHAR + line
        final = '\n' + name + ' (' + lvl + ') ' + dmg + extra
        this.mook.melee += final + note
      } else {
        let ranged = []
        rpats.forEach(p => {
          let re = new RegExp(p.regex)
          let match = line.match(re)
          if (!!match) {
            line = line.replace(re, '').trim()
            if (!!match[1]) ranged.push(p.var + ' ' + match[1])
          }
        })
        if (ranged.length > 0) {
          extra = ranged.join(' ')
          final = '\n' + name + ' (' + lvl + ') ' + dmg + ' ' + extra
          if (!!line) note += '\n' + COMMENT_CHAR + line
          this.mook.ranged += final + note
        } else {
          // but it may not have either, in which case we treat as melee
          final = '\n' + name + ' (' + lvl + ') ' + dmg + extra
          if (!!line) note += '\n' + COMMENT_CHAR + line
          this.mook.melee += final + note
        }
      }
      ;[attblk, line, nextline] = this.gatherAttackLines(attblk, nextline, oldformat) // collect up any more lines.
    }
  }

  mapDmg(line, dmg) {
    if (!dmg) return ['', '']
    dmg = dmg.trim().toLowerCase()
    let p = DamageTables.parseDmg(dmg)
    if (p == dmg) return ['', line]
    let a = p.split('~')
    let roll = a[0] + 'd' + a[1] + a[2] + a[3] + a[4]
    let types = a[5].trim().split(' ')
    let m = DamageTables.translate(types[0])
    if (!m) return ['', `Unrecognized damage type "${types[0]}" for "${line}"`]
    return [roll + ' ' + m, types.slice(1).join(' ')]
  }

  appendToNotes(t, suffix = ' ') {
    this.mook.notes += t + suffix
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
    if (!!this.mook.notes) this.mook.notes += '\n\n'
    this.pushToken(line)
  }

  parseFinalNotes() {
    let postProcessWeapons = this.stealahead('\nWeapons:')
    this.trim()
    let t = this.nextToken()
    if (!!t) {
      if (t == 'Class:') {
        this.appendToNotes(t + ' ' + this.nextline(), '\n')
        return this.parseFinalNotes()
      }
      if (t == 'Notes:') this.appendToNotes(this.statblk)
      else this.appendToNotes(t + ' ' + this.statblk)
    }
    this.mook.notes = this.mook.notes.trim()
    this.statblk = postProcessWeapons
  }

  pushToken(t) {
    this.statblk = t + '\n' + this.statblk
  }

  // This is the exhaustive test to see if we want to parse it as an attribute.
  // Note: we may want to parse some things just so we can safely skip over them
  isAttribute(a) {
    if (!a) return false
    if (a == 'Traits:' || a == 'Advantages/Disadvantages:') return false
    if (a.match(/\w+:/) || !!GURPS.attributepaths[a]) return true
    if (a.match(/\[\d+\],?/)) return true // points costs [20]     accept this to parse, to skip over it
    return POSSIBLE_ATTRIBUTE_KEYS.hasOwnProperty(a.toLowerCase())
  }

  // We know we accept it, however, it may be 'junk' that we are just trying to skip over.
  getAttrib(t) {
    if (t.match(/\[\d+\],?/)) return false // points costs [20]			// Don't count this as "any"
    let a = t.replace(/[^A-Za-z]/g, '') // remove anything but letters
    // Special case is attributes are listed as "basic speed" or "fright check"
    if (!!POSSIBLE_ATTRIBUTE_KEYS[a.toLowerCase()]) return ''
    return a
  }

  storeAttrib(attrib, value) {
    let val = value.replace(/[,;\.]$/g, '') // try to clean up the value by stripping crap off the end
    attrib
      .toLowerCase()
      .split('/')
      .forEach(a => (this.mook[a] = val)) // handles cases like "Parry/Block: 9"
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
    do {
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
        if (!!goodattr) {
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
      if (!!attr) unknowns.slice(-1)[0].push(attr)
    } while (true)
    unknowns.pop() // The last line didn't have any attributes, so not really errors.
    this.pushToken(saved) // We didn't use this line, so put it back
    let a = unknowns
      .map(a => a.join(' '))
      .join(' ')
      .trim() // collapse all unknowns into a string
    if (!!a) {
      // we parsed some things that did not work.
      this.appendToNotes(ERR + ' ' + a, '\n')
    }
  }

  stealahead(str) {
    let i = this.statblk.indexOf(str)
    if (i < 0) return ''
    let s = this.statblk.substr(i + str.length + 1)
    this.statblk = this.statblk.substring(0, 1)
    return s
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
    let [s, t] = this.nextTokenPrim(this.statblk, d1, d2, all)
    this.statblk = s
    return t
  }

  nextline() {
    let [s, t] = this.nextlinePrim(this.statblk)
    this.statblk = s
    return t
  }

  next(delim = ' ') {
    let [s, t] = this.nextPrim(this.statblk, delim)
    this.statblk = s
    return t
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
    let i = str.indexOf(d1)
    let j = str.indexOf(d2)
    if (i >= 0 && j >= 0) {
      if (j <= i) {
        d1 = d2 //
        i = j // Crappy hack to be able to search for 2 delims
      }
      let t = str.substring(0, i)
      return [str.substr(i + d1.length).trim(), t]
    }
    if (i >= 0) {
      let t = str.substring(0, i)
      return [str.substr(i + d1.length).trim(), t]
    }
    if (j >= 0) {
      let t = str.substring(0, j)
      return [str.substr(j + d2.length).trim(), t]
    }
    return all ? ['', str] : [str, undefined]
  }

  nextTokenV2Prim(str, arr, all = false) {
    if (!str) return [str, undefined]
    let best = Number.MAX_SAFE_INTEGER
    let bestIndex = -1
    for (let index = 0; index < arr.length; index++) {
      let d = arr[index]
      let cur = str.indexOf(d)
      if (cur >= 0 && cur < best) {
        best = cur
        bestIndex = index
      }
    }
    if (bestIndex >= 0) {
      let t = str.substring(0, best)
      return [str.substr(best + arr[bestIndex].length).trim(), t]
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
    return mergeObject(super.defaultOptions, {
      classes: ['npc-input', 'sheet', 'actor'],
      id: 'npc-input',
      template: 'systems/gurps/templates/npc-input.html',
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
    game.settings.set(settings.SYSTEM_NAME, settings.SETTING_MOOK_DEFAULT, this.mook)
  }

  setTesting(t = true) {
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
