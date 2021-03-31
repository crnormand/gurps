'use strict'

import { extractP, xmlTextToJson, objectToArray, convertRollStringToArrayOfInt, recurselist } from '../lib/utilities.js'
import { ResourceTrackerManager } from '../module/actor/resource-tracker-manager.js'
import ApplyDamageDialog from './damage/applydamage.js'
import * as HitLocations from '../module/hitlocation/hitlocation.js'
import * as settings from '../lib/miscellaneous-settings.js'

export class GurpsActor extends Actor {
  /** @override */
  getRollData() {
    const data = super.getRollData()
    return data
  }

  prepareData() {
    super.prepareData()
  }

  prepareDerivedData() {
    super.prepareDerivedData()
    this.calculateDerivedValues()
  }

  // This will ensure that every characater at least starts with these new data values.  actor-sheet.js may change them.
  calculateDerivedValues() {
    const encs = this.data.data.encumbrance
    const isReeling = !!this.data.data.additionalresources.isReeling
    const isTired = !!this.data.data.additionalresources.isTired
    this.data.data.attributes.ST.currentvalue = isTired
      ? Math.ceil(parseInt(this.data.data.attributes.ST.value) / 2)
      : this.data.data.attributes.ST.value
    // We must assume that the first level of encumbrance has the finally calculated move and dodge settings
    if (!!encs) {
      const level0 = encs[GURPS.genkey(0)] // if there are encumbrances, there will always be a level0
      let m = parseInt(level0.move)
      let d = parseInt(level0.dodge)
      if (isReeling) {
        m = Math.ceil(m / 2)
        d = Math.ceil(d / 2)
      }
      if (isTired) {
        m = Math.ceil(m / 2)
        d = Math.ceil(d / 2)
      }
      for (let enckey in encs) {
        let enc = encs[enckey]
        let t = 1.0 - (0.2 * parseInt(enc.level))
        enc.currentmove = Math.max(1, Math.floor(m * t))
        enc.currentdodge = Math.max(1, d - parseInt(enc.level))
        if (enc.current) {
          // Save the global move/dodge
          this.data.data.currentmove = enc.currentmove
          this.data.data.currentdodge = enc.currentdodge
        }
      }
    }
    if (!this.data.data.equippedparry) this.data.data.equippedparry = this.getEquippedParry()
    if (!this.data.data.equippedblock) this.data.data.equippedblock = this.getEquippedBlock()
  }

  /* Uncomment to see all of the data being 'updated' to this actor  DEBUGGING
  async update(data, options) {
    console.log(this.name + " UPDATE: "+ GURPS.objToString(data))
    await super.update(data, options)
  } */

  /** @override */
  _onUpdate(data, options, userId, context) {
    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_AUTOMATIC_ONETHIRD)) {
      if (!isNaN(data.data?.HP?.value)) {
        let flag = data.data.HP.value < this.data.data.HP.max / 3
        if (!!this.data.data.additionalresources.isReeling != flag) this.changeOneThirdStatus('isReeling', flag)
      }
      if (!isNaN(data.data?.FP?.value)) {
        let flag = data.data.FP.value < this.data.data.FP.max / 3
        if (!!this.data.data.additionalresources.isTired != flag) this.changeOneThirdStatus('isTired', flag)
      }
    }
    //console.log(this.name + " _onUPDATE: "+ GURPS.objToString(data))
    super._onUpdate(data, options, userId, context)
    game.GURPS.ModifierBucket.refresh() // Update the bucket, in case the actor's status effects have changed
  }

  get _additionalResources() {
    return this.data.data.additionalresources
  }

  get displayname() {
    let n = this.name
    if (!!this.token && this.token.name != n) n = this.token.name + '(' + n + ')'
    return n
  }

  // First attempt at import GCS FG XML export data.
  async importFromGCSv1(xml, importname, importpath) {
    const GCAVersion = 'GCA-7'
    const GCSVersion = 'GCS-5'
    var c, ra // The character json, release attributes
    let isFoundryGCS = false
    let isFoundryGCA = false
    // need to remove <p> and replace </p> with newlines from "formatted text"
    let origx = game.GURPS.cleanUpP(xml)
    let x = xmlTextToJson(origx)
    let r = x.root
    let msg = ''
    let version = 'unknown'
    let exit = false
    if (!r) {
      if (importname.endsWith('.gcs'))
        msg +=
          "We cannot import a GCS file directly. Please export the file using the 'Foundry VTT' output template.<br>"
      else if (importname.endsWith('.gca4'))
        msg +=
          "We cannot import a GCA file directly. Please export the file using the 'export to Foundry VTT.gce' script.<br>"
      else if (!xml.startsWith('<?xml')) msg += 'No XML detected.  Are you importing the correct XML file?<br>'
      exit = true
    } else {
      // The character object starts here
      c = r.character
      if (!c) {
        msg += "Unable to detect the 'character' format.   Most likely you are trying to import the 'npc' format.<br>"
        exit = true
      }

      let parsererror = r.parsererror
      if (!!parsererror) {
        msg += 'Error parsing XML: ' + this.textFrom(parsererror.div)
        exit = true
      }

      ra = r['@attributes']
      // Sorry for the horrible version checking... it sort of evolved organically
      isFoundryGCS = !!ra && ra.release == 'Foundry' && (ra.version == '1' || ra.version.startsWith('GCS'))
      isFoundryGCA = !!ra && ra.release == 'Foundry' && ra.version.startsWith('GCA')
      if (!(isFoundryGCS || isFoundryGCA)) {
        msg += 'We no longer support the Fantasy Grounds import.<br>'
        exit = true
      }
      version = ra?.version || ''
      const v = !!ra?.version ? ra.version.split('-') : []
      if (isFoundryGCA) {
        if (!v[1]) {
          msg +=
            "This file was created with an older version of the GCA Export which does not contain the 'Body Plan' attribute.   We will try to guess the 'Body Plan', but we may get it wrong.<br>"
        }
        let vernum = 1
        if (!!v[1]) vernum = parseInt(v[1])
        if (vernum < 2) {
          msg +=
            "This file was created with an older version of the GCA Export which does not export Innate Ranged attacks and does not contain the 'Parent' Attribute for equipment." +
            '  You may be missing ranged attacks or equipment may not appear in the correct container.<br>'
        }
        if (vernum < 3) {
          msg +=
            'This file was created with an older version of the GCA Export that may incorrectly put ranged attacks in the melee list and does not sanitize equipment page refs.<br>' // Equipment Page ref's sanitized
        }
        if (vernum < 4) {
          msg +=
            "This file was created with an older version of the GCA Export which does not contain the 'Parent' attributes for Ads/Disads, Skills or Spells<br>"
        }
        if (vernum < 5) {
          msg +=
            'This file was created with an older version of the GCA Export which does not sanitize Notes or Ad/Disad names<br>'
        }
        if (vernum < 6) {
          msg +=
            'This file was created with an older version of the GCA Export which may not export a melee attack if it also exists in ranged attacks (e.g. Spears)<br>'
        }
        if (vernum < 7) {
          msg +=
            'This file was created with an older version of the GCA Export which incorrectly calculates Block value for items with DB (e.g. Shields)<br>'
        }
      }
      if (isFoundryGCS) {
        let vernum = 1
        if (!!v[1]) vernum = parseInt(v[1])
        if (vernum < 2) {
          msg +=
            "This file was created with an older version of the GCS Export which does not contain the 'Parent' attributes.   Items will not appear in their containers.<br>"
        }
        if (vernum < 3) {
          msg +=
            'This file was created with an older version of the GCS Export which does not contain the Self Control rolls for Disadvantages (ex: [CR: 9 Bad Temper]).<br>'
        }
        if (vernum < 4) {
          msg +=
            "This file was created with an older version of the GCS Export which does not contain the 'Uses' column for Equipment.<br>"
        }
        if (vernum < 5) {
          msg +=
            'This file was created with an older version of the GCS Export which does not export individual Melee and Ranged attack notes created by the same item.<br>'
        }
      }
    }
    if (!!msg) {
      ui.notifications.error(msg)
      msg = `WARNING:<br>${msg}<br>The file version: '${version}'<br>Current Versions: '${GCAVersion}' & '${GCSVersion}'`
      ChatMessage.create({
        content:
          msg +
          "<br>Check the Users Guide for details on where to get the latest version.<br><a href='" +
          GURPS.USER_GUIDE_URL +
          "'>GURPS 4e Game Aid USERS GUIDE</a>",
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        whisper: [game.user.id],
      })
      if (exit) return // Some errors cannot be forgiven ;-)
    }
    let nm = this.textFrom(c.name)
    console.log("Importing '" + nm + "'")
    // this is how you have to update the domain object so that it is synchronized.

    let commit = {}

    if (!game.settings.get(settings.SYSTEM_NAME, settings.SETTING_IGNORE_IMPORT_NAME)) {
      commit = { ...commit, ...{ name: nm } }
      commit = { ...commit, ...{ 'token.name': nm } }
    }
    commit = { ...commit, ...{ 'data.lastImport': new Date().toString().split(' ').splice(1, 4).join(' ') } }
    let ar = this.data.data.additionalresources || {}
    ar.importname = importname
    ar.importpath = importpath
    ar.importversion = ra.version
    commit = { ...commit, ...{ 'data.additionalresources': ar } }

    try {
      // This is going to get ugly, so break out various data into different methods
      commit = { ...commit, ...(await this.importAttributesFromCGSv1(c.attributes)) }
      commit = { ...commit, ...this.importSkillsFromGCSv1(c.abilities?.skilllist, isFoundryGCS) }
      commit = { ...commit, ...this.importTraitsfromGCSv1(c.traits) }
      commit = { ...commit, ...this.importCombatMeleeFromGCSv1(c.combat?.meleecombatlist, isFoundryGCS) }
      commit = { ...commit, ...this.importCombatRangedFromGCSv1(c.combat?.rangedcombatlist, isFoundryGCS) }
      commit = { ...commit, ...this.importSpellsFromGCSv1(c.abilities?.spelllist, isFoundryGCS) }
      if (isFoundryGCS) {
        commit = { ...commit, ...this.importAdsFromGCSv2(c.traits?.adslist) }
        commit = { ...commit, ...this.importReactionsFromGCSv2(c.reactions) }
      }
      if (isFoundryGCA) {
        commit = { ...commit, ...this.importAdsFromGCA(c.traits?.adslist, c.traits?.disadslist) }
        commit = { ...commit, ...this.importReactionsFromGCA(c.traits?.reactionmodifiers) }
      }
      commit = { ...commit, ...this.importEncumbranceFromGCSv1(c.encumbrance) }
      commit = { ...commit, ...this.importPointTotalsFromGCSv1(c.pointtotals) }
      commit = { ...commit, ...this.importNotesFromGCSv1(c.description, c.notelist) }
      commit = { ...commit, ...this.importEquipmentFromGCSv1(c.inventorylist, isFoundryGCS) }
      commit = { ...commit, ...(await this.importProtectionFromGCSv1(c.combat?.protectionlist, isFoundryGCA)) }
    } catch (err) {
      let msg = 'An error occured while importing ' + nm + ', ' + err.name + ':' + err.message
      ui.notifications.warn(msg)
      let chatData = {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        content: msg,
        whisper: [game.user._id],
      }
      CONFIG.ChatMessage.entityClass.create(chatData, {})
      // Don't return, because we want to see how much actually gets committed.
    }
    console.log('Starting commit')

    let deletes = Object.fromEntries(Object.entries(commit).filter(([key, value]) => key.includes('.-=')))
    let adds = Object.fromEntries(Object.entries(commit).filter(([key, value]) => !key.includes('.-=')))

    try {
      await this.update(deletes)
      await this.update(adds) //.then(() => {
      // This has to be done after everything is loaded
      this.calculateDerivedValues()

      // ... set custom trackers based on templates
      // should be last because it may need other data to initialize...
      await this.setResourceTrackers()

      console.log('Done importing.  You can inspect the character data below:')
      console.log(this)
      //})
    } catch (err) {
      let msg = 'An error occured while importing ' + nm + ', ' + err.name + ':' + err.message
      if (err.message == 'Maximum depth exceeded')
        msg =
          'You have too many levels of containers.  The Foundry import only supports up to 3 levels of sub-containers'
      ui.notifications.warn(msg)
      let chatData = {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        content: msg,
        whisper: [game.user._id],
      }
      CONFIG.ChatMessage.entityClass.create(chatData, {})
    }
  }

  // hack to get to private text element created by xml->json method.
  textFrom(o) {
    if (!o) return ''
    let t = o['#text']
    if (!t) return ''
    return t.trim()
  }

  // similar hack to get text as integer.
  intFrom(o) {
    if (!o) return 0
    let i = o['#text']
    if (!i) return 0
    return parseInt(i)
  }

  floatFrom(o) {
    if (!o) return 0
    let f = o['#text']
    if (!f) return 0
    return parseFloat(f)
  }

  importReactionsFromGCSv2(json) {
    if (!json) return
    let t = this.textFrom
    let rs = {}
    let index = 0
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let r = new Reaction()
        r.modifier = t(j.modifier)
        r.situation = t(j.situation)
        game.GURPS.put(rs, r, index++)
      }
    }
    return {
      'data.-=reactions': null,
      'data.reactions': rs,
    }
  }

  importReactionsFromGCA(json) {
    if (!json) return
    let text = this.textFrom(json)
    let a = text.split(',')
    let rs = {}
    let index = 0
    a.forEach(m => {
      if (!!m) {
        let t = m.trim()
        let i = t.indexOf(' ')
        let mod = t.substring(0, i)
        let sit = t.substr(i + 1)
        let r = new Reaction(mod, sit)
        game.GURPS.put(rs, r, index++)
      }
    })
    return {
      'data.-=reactions': null,
      'data.reactions': rs,
    }
  }

  importPointTotalsFromGCSv1(json) {
    if (!json) return

    let i = this.intFrom
    return {
      'data.totalpoints.attributes': i(json.attributes),
      'data.totalpoints.ads': i(json.ads),
      'data.totalpoints.disads': i(json.disads),
      'data.totalpoints.quirks': i(json.quirks),
      'data.totalpoints.skills': i(json.skills),
      'data.totalpoints.spells': i(json.spells),
      'data.totalpoints.unspent': i(json.unspentpoints),
      'data.totalpoints.total': i(json.totalpoints),
      'data.totalpoints.race': i(json.race),
    }
  }

  importNotesFromGCSv1(descjson, json) {
    if (!json) return
    let t = this.textFrom
    let temp = []
    if (!!descjson) {
      // support for GCA description
      let n = new Note()
      n.notes = t(descjson).replace(/\\r/g, '\n')
      n.imported = true
      temp.push(n)
    }
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let n = new Note()
        //n.setNotes(t(j.text));
        n.notes = t(j.name)
        let txt = t(j.text)
        if (!!txt) n.notes = n.notes + '\n' + txt.replace(/\\r/g, '\n')
        n.uuid = t(j.uuid)
        n.parentuuid = t(j.parentuuid)
        n.pageref = t(j.pageref)
        temp.push(n)
      }
    }
    // Save the old User Entered Notes.
    recurselist(this.data.data.notes, t => {
      if (!!t.save) temp.push(t)
    })
    return {
      'data.-=notes': null,
      'data.notes': this.foldList(temp),
    }
  }

  async importProtectionFromGCSv1(json, isFoundryGCA) {
    if (!json) return
    let t = this.textFrom
    let data = this.data.data
    if (!!data.additionalresources.ignoreinputbodyplan) return
    let locations = []
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let hl = new HitLocations.HitLocation(t(j.location))
        hl.dr = t(j.dr)
        hl.penalty = t(j.db)
        hl.setEquipment(t(j.text))

        // Some hit location tables have two entries for the same location. The code requires
        // each location to be unique. Append an asterisk to the location name in that case.   Hexapods and ichthyoid
        while (locations.filter(it => it.where == hl.where).length > 0) {
          hl.where = hl.where + '*'
        }
        locations.push(hl)
      }
    }

    // Do the results contain vitals? If not, add it.
    let vitals = locations.filter(value => value.where === HitLocations.HitLocation.VITALS)
    if (vitals.length === 0) {
      let hl = new HitLocations.HitLocation(HitLocations.HitLocation.VITALS)
      hl.penalty = HitLocations.hitlocationRolls[HitLocations.HitLocation.VITALS].penalty
      hl.roll = HitLocations.hitlocationRolls[HitLocations.HitLocation.VITALS].roll
      hl.dr = '0'
      locations.push(hl)
    }

    // Hit Locations MUST come from an existing bodyplan hit location table, or else ADD (and
    // potentially other features) will not work. Sometime in the future, we will look at
    // user-entered hit locations.
    let bodyplan = t(json.bodyplan)?.toLowerCase() // Was a body plan actually in the import?
    if (bodyplan === 'snakemen') bodyplan = 'snakeman'
    let table = HitLocations.hitlocationDictionary[bodyplan] // If so, try to use it.
    let locs = []
    locations.forEach(e => {
      if (!!table && !!table[e.where]) {
        // if e.where already exists in table, don't map
        locs.push(e)
      } else {
        // map to new name(s) ... sometimes we map 'Legs' to ['Right Leg', 'Left Leg'], for example.
        e.locations(false).forEach(l => locs.push(l)) // Map to new names
      }
    })
    locations = locs

    if (!table) {
      locs = []
      locations.forEach(e => {
        e.locations(true).forEach(l => locs.push(l)) // Map to new names, but include original to help match against tables
      })
      bodyplan = this._getBodyPlan(locs)
      table = HitLocations.hitlocationDictionary[bodyplan]
    }
    // update location's roll and penalty based on the bodyplan

    if (!!table) {
      Object.values(locations).forEach(it => {
        let [lbl, entry] = HitLocations.HitLocation.findTableEntry(table, it.where)
        if (!!entry) {
          it.where = lbl // It might be renamed (ex: Skull -> Brain)
          if (!it.penalty) it.penalty = entry.penalty
          if (!it.roll || it.roll.length === 0 || it.roll === HitLocations.HitLocation.DEFAULT) it.roll = entry.roll
        }
      })
    }

    // write the hit locations out in bodyplan hit location table order. If there are
    // other entries, append them at the end.
    let temp = []
    Object.keys(table).forEach(key => {
      let results = Object.values(locations).filter(loc => loc.where === key)
      if (results.length > 0) {
        if (results.length > 1) {
          // If multiple locs have same where, concat the DRs.   Leg 7 & Leg 8 both map to "Leg 7-8"
          let d = ''
          var last
          results.forEach(r => {
            if (r.dr != last) {
              d += '|' + r.dr
              last = r.dr
            }
          })
          if (!!d) d = d.substr(1)
          results[0].dr = d
        }
        temp.push(results[0])
        locations = locations.filter(it => it.where !== key)
      } else {
        // Didn't find loc that should be in the table.   Make a default entry
        temp.push(new HitLocations.HitLocation(key, 0, table[key].penalty, table[key].roll))
      }
    })
    locations.forEach(it => temp.push(it))
    //   locations.forEach(it => temp.push(HitLocations.HitLocation.normalized(it)))

    let prot = {}
    let index = 0
    temp.forEach(it => game.GURPS.put(prot, it, index++))

    let saveprot = true
    if (!!data.lastImport && !!data.additionalresources.bodyplan && bodyplan != data.additionalresources.bodyplan) {
      let option = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_IMPORT_BODYPLAN)
      if (option == 1) {
        saveprot = false
      }
      if (option == 2) {
        saveprot = await new Promise((resolve, reject) => {
          let d = new Dialog({
            title: 'Hit Location Body Plan',
            content:
              `Do you want to <br><br><b>Save</b> the current Body Plan (${game.i18n.localize(
                'GURPS.BODYPLAN' + data.additionalresources.bodyplan
              )}) or ` +
              `<br><br><b>Overwrite</b> it with the Body Plan from the import: (${game.i18n.localize(
                'GURPS.BODYPLAN' + bodyplan
              )})?<br><br>&nbsp;`,
            buttons: {
              save: {
                icon: '<i class="far fa-square"></i>',
                label: 'Save',
                callback: () => resolve(false),
              },
              overwrite: {
                icon: '<i class="fas fa-edit"></i>',
                label: 'Overwrite',
                callback: () => resolve(true),
              },
            },
            default: 'save',
            close: () => resolve(false), // just assume overwrite.   Error handling would be too much work right now.
          })
          d.render(true)
        })
      }
    }
    if (saveprot)
      return {
        'data.-=hitlocations': null,
        'data.hitlocations': prot,
        'data.additionalresources.bodyplan': bodyplan,
      }
    else return {}
  }

  /**
   *
   * @param {Array<HitLocations.HitLocation>} locations
   */
  _getBodyPlan(locations) {
    // each key is a "body plan" name like "humanoid" or "quadruped"
    let tableNames = Object.keys(HitLocations.hitlocationDictionary)

    // create a map of tableName:count
    let tableScores = {}
    tableNames.forEach(it => (tableScores[it] = 0))

    // increment the count for a tableScore if it contains the same hit location as "prot"
    locations.forEach(function (hitLocation) {
      tableNames.forEach(function (tableName) {
        if (HitLocations.hitlocationDictionary[tableName].hasOwnProperty(hitLocation.where)) {
          tableScores[tableName] = tableScores[tableName] + 1
        }
      })
    })

    // Select the tableScore with the highest score.
    let match = -1
    let name = HitLocations.HitLocation.HUMANOID
    Object.keys(tableScores).forEach(function (score) {
      if (tableScores[score] > match) {
        match = tableScores[score]
        name = score
      }
    })

    // In the case of a tie, select the one whose score is closest to the number of entries
    // in the table.
    let results = Object.keys(tableScores).filter(it => tableScores[it] === match)
    if (results.length > 1) {
      let diff = Number.MAX_SAFE_INTEGER
      results.forEach(key => {
        // find the smallest difference
        let table = HitLocations.hitlocationDictionary[key]
        if (Object.keys(table).length - match < diff) {
          diff = Object.keys(table).length - match
          name = key
        }
      })
    }

    return name
  }

  importEquipmentFromGCSv1(json, isFoundryGCS) {
    if (!json) return
    let t = this.textFrom
    let i = this.intFrom
    let f = this.floatFrom

    let temp = []
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let eqt = new Equipment()
        eqt.name = t(j.name)
        eqt.count = t(j.count)
        eqt.cost = t(j.cost)
        eqt.weight = t(j.weight)
        eqt.location = t(j.location)
        let cstatus = i(j.carried)
        eqt.carried = cstatus >= 1
        eqt.equipped = cstatus == 2
        eqt.techlevel = t(j.tl)
        eqt.legalityclass = t(j.lc)
        eqt.categories = t(j.type)
        eqt.uses = t(j.uses)
        eqt.maxuses = t(j.maxuses)
        eqt.uuid = t(j.uuid)
        eqt.parentuuid = t(j.parentuuid)
        if (isFoundryGCS) {
          eqt.notes = t(j.notes)
        } else {
          eqt.setNotes(t(j.notes))
        }
        eqt.pageRef(t(j.pageref))
        temp.push(eqt)
      }
    }

    // Put everything in it container (if found), otherwise at the top level
    temp.forEach(eqt => {
      if (!!eqt.parentuuid) {
        let parent = null
        parent = temp.find(e => e.uuid === eqt.parentuuid)
        if (!!parent) game.GURPS.put(parent.contains, eqt)
        else eqt.parentuuid = '' // Can't find a parent, so put it in the top list
      }
    })

    // Save the old User Entered Notes.
    recurselist(this.data.data.equipment.carried, t => {
      t.carried = true
      if (!!t.save) temp.push(t)
    }) // Ensure carried eqt stays in carried
    recurselist(this.data.data.equipment.other, t => {
      t.carried = false
      if (!!t.save) temp.push(t)
    })

    let equipment = {
      carried: {},
      other: {},
    }
    let cindex = 0
    let oindex = 0

    temp.forEach(eqt => {
      Equipment.calc(eqt)
      if (!eqt.parentuuid) {
        if (eqt.carried) game.GURPS.put(equipment.carried, eqt, cindex++)
        else game.GURPS.put(equipment.other, eqt, oindex++)
      }
    })
    return {
      'data.-=equipment': null,
      'data.equipment': equipment,
    }
  }

  // Fold a flat array into a hierarchical target object
  foldList(flat, target = {}) {
    flat.forEach(obj => {
      if (!!obj.parentuuid) {
        const parent = flat.find(o => o.uuid == obj.parentuuid)
        if (!!parent) {
          if (!parent.contains) parent.contains = {} // lazy init for older characters
          game.GURPS.put(parent.contains, obj)
        } else obj.parentuuid = '' // Can't find a parent, so put it in the top list.  should never happen with GCS
      }
    })
    let index = 0
    flat.forEach(obj => {
      if (!obj.parentuuid) game.GURPS.put(target, obj, index++)
    })
    return target
  }

  importEncumbranceFromGCSv1(json) {
    if (!json) return
    let t = this.textFrom
    let es = {}
    let index = 0
    let cm = 0
    let cd = 0
    for (let i = 0; i < 5; i++) {
      let e = new Encumbrance()
      e.level = i
      let k = 'enc_' + i
      let c = t(json[k])
      e.current = c === '1'
      k = 'enc' + i
      e.key = k
      let k2 = k + '_weight'
      e.weight = t(json[k2])
      k2 = k + '_move'
      e.move = this.intFrom(json[k2])
      k2 = k + '_dodge'
      e.dodge = this.intFrom(json[k2])
      if (e.current) {
        cm = e.move
        cd = e.dodge
      }
      game.GURPS.put(es, e, index++)
    }
    return {
      'data.currentmove': cm,
      'data.currentdodge': cd,
      'data.-=encumbrance': null,
      'data.encumbrance': es,
    }
  }

  importCombatMeleeFromGCSv1(json, isFoundryGCS) {
    if (!json) return
    let t = this.textFrom
    let melee = {}
    let index = 0
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let oldnote = t(j.notes)
        for (let k2 in j.meleemodelist) {
          if (k2.startsWith('id-')) {
            let j2 = j.meleemodelist[k2]
            let m = new Melee()
            m.name = t(j.name)
            m.st = t(j.st)
            m.weight = t(j.weight)
            m.techlevel = t(j.tl)
            m.cost = t(j.cost)
            if (isFoundryGCS) {
              m.notes = t(j2.notes) || oldnote
              m.pageref = t(j2.pageref)
            } else
              try {
                m.setNotes(t(j.text))
              } catch {
                console.log(m)
                console.log(t(j.text))
              }
            m.mode = t(j2.name)
            m.level = t(j2.level)
            m.damage = t(j2.damage)
            m.reach = t(j2.reach)
            m.parry = t(j2.parry)
            m.block = t(j2.block)
            game.GURPS.put(melee, m, index++)
          }
        }
      }
    }
    return {
      'data.-=melee': null,
      'data.melee': melee,
    }
  }

  importCombatRangedFromGCSv1(json, isFoundryGCS) {
    if (!json) return
    let t = this.textFrom
    let ranged = {}
    let index = 0
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let oldnote = t(j.notes)
        for (let k2 in j.rangedmodelist) {
          if (k2.startsWith('id-')) {
            let j2 = j.rangedmodelist[k2]
            let r = new Ranged()
            r.name = t(j.name)
            r.st = t(j.st)
            r.bulk = t(j.bulk)
            r.legalityclass = t(j.lc)
            r.ammo = t(j.ammo)
            if (isFoundryGCS) {
              r.notes = t(j2.notes) || oldnote
              r.pageref = t(j2.pageref)
            } else
              try {
                r.setNotes(t(j.text))
              } catch {
                console.log(r)
                console.log(t(j.text))
              }
            r.mode = t(j2.name)
            r.level = t(j2.level)
            r.damage = t(j2.damage)
            r.acc = t(j2.acc)
            r.rof = t(j2.rof)
            r.shots = t(j2.shots)
            r.rcl = t(j2.rcl)
            let rng = t(j2.range)
            let m = rng.match(/^ *x(\d+) $/)
            if (m) {
              rng = parseInt(m[1]) * this.data.data.attributes.ST.value
            } else {
              m = rng.match(/^ *x(\d+) *\/ *x(\d+) *$/)
              if (m) {
                rng = `${parseInt(m[1]) * this.data.data.attributes.ST.value}/${
                  parseInt(m[2]) * this.data.data.attributes.ST.value
                }`
              }
            }
            r.range = rng
            game.GURPS.put(ranged, r, index++)
          }
        }
      }
    }
    return {
      'data.-=ranged': null,
      'data.ranged': ranged,
    }
  }

  importTraitsfromGCSv1(json) {
    if (!json) return
    let t = this.textFrom
    let ts = {}
    ts.race = t(json.race)
    ts.height = t(json.height)
    ts.weight = t(json.weight)
    ts.age = t(json.age)
    ts.title = t(json.title)
    ts.player = t(json.player)
    ts.createdon = t(json.createdon)
    ts.modifiedon = t(json.modifiedon)
    ts.religion = t(json.religion)
    ts.birthday = t(json.birthday)
    ts.hand = t(json.hand)
    ts.sizemod = t(json.sizemodifier)
    ts.techlevel = t(json.tl)
    // <appearance type="string">@GENDER, Eyes: @EYES, Hair: @HAIR, Skin: @SKIN</appearance>
    let a = t(json.appearance)
    ts.appearance = a
    try {
      let x = a.indexOf(', Eyes: ')
      if (x >= 0) {
        ts.gender = a.substring(0, x)
        let y = a.indexOf(', Hair: ')
        ts.eyes = a.substring(x + 8, y)
        x = a.indexOf(', Skin: ')
        ts.hair = a.substring(y + 8, x)
        ts.skin = a.substr(x + 8)
      }
    } catch {
      console.log('Unable to parse appearance traits for ')
      console.log(this)
    }
    return {
      'data.-=traits': null,
      'data.traits': ts,
    }
  }

  // Import the <attributes> section of the GCS FG XML file.
  async importAttributesFromCGSv1(json) {
    if (!json) return
    let i = this.intFrom // shortcut to make code smaller
    let t = this.textFrom
    let data = this.data.data
    let att = data.attributes

    att.ST.value = i(json.strength)
    att.ST.points = i(json.strength_points)
    att.DX.value = i(json.dexterity)
    att.DX.points = i(json.dexterity_points)
    att.IQ.value = i(json.intelligence)
    att.IQ.points = i(json.intelligence_points)
    att.HT.value = i(json.health)
    att.HT.points = i(json.health_points)
    att.WILL.value = i(json.will)
    att.WILL.points = i(json.will_points)
    att.PER.value = i(json.perception)
    att.PER.points = i(json.perception_points)

    data.HP.max = i(json.hitpoints)
    data.HP.points = i(json.hitpoints_points)
    data.FP.max = i(json.fatiguepoints)
    data.FP.points = i(json.fatiguepoints_points)
    let hp = i(json.hps)
    let fp = i(json.fps)
    let saveCurrent = false
    if (!!data.lastImport && (data.HP.value != hp || data.FP.value != fp)) {
      let option = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_IMPORT_HP_FP)
      if (option == 0) {
        saveCurrent = true
      }
      if (option == 2) {
        saveCurrent = await new Promise((resolve, reject) => {
          let d = new Dialog({
            title: 'Current HP & FP',
            content: `Do you want to <br><br><b>Save</b> the current HP (${data.HP.value}) & FP (${data.FP.value}) values or <br><br><b>Overwrite</b> it with the import data, HP (${hp}) & FP (${fp})?<br><br>&nbsp;`,
            buttons: {
              save: {
                icon: '<i class="far fa-square"></i>',
                label: 'Save',
                callback: () => resolve(true),
              },
              overwrite: {
                icon: '<i class="fas fa-edit"></i>',
                label: 'Overwrite',
                callback: () => resolve(false),
              },
            },
            default: 'save',
            close: () => resolve(false), // just assume overwrite.   Error handling would be too much work right now.
          })
          d.render(true)
        })
      }
    }
    if (!saveCurrent) {
      data.HP.value = hp
      data.FP.value = fp
    }

    let lm = {}
    lm.basiclift = t(json.basiclift)
    lm.carryonback = t(json.carryonback)
    lm.onehandedlift = t(json.onehandedlift)
    lm.runningshove = t(json.runningshove)
    lm.shiftslightly = t(json.shiftslightly)
    lm.shove = t(json.shove)
    lm.twohandedlift = t(json.twohandedlift)

    data.basicmove.value = t(json.basicmove)
    data.basicmove.points = i(json.basicmove_points)
    data.basicspeed.value = t(json.basicspeed)
    data.basicspeed.points = i(json.basicspeed_points)
    data.thrust = t(json.thrust)
    data.swing = t(json.swing)
    data.currentmove = t(json.move)
    data.frightcheck = i(json.frightcheck)

    data.hearing = i(json.hearing)
    data.tastesmell = i(json.tastesmell)
    data.touch = i(json.touch)
    data.vision = i(json.vision)

    return {
      'data.attributes': att,
      'data.HP': data.HP,
      'data.FP': data.FP,
      'data.basiclift': data.basiclift,
      'data.basicmove': data.basicmove,
      'data.basicspeed': data.basicspeed,
      'data.thrust': data.thrust,
      'data.swing': data.swing,
      'data.currentmove': data.currentmove,
      'data.frightcheck': data.frightcheck,
      'data.hearing': data.hearing,
      'data.tastesmell': data.tastesmell,
      'data.touch': data.touch,
      'data.vision': data.vision,
      'data.liftingmoving': lm,
    }
  }

  // create/update the skills.
  // NOTE:  For the update to work correctly, no two skills can have the same name.
  // When reading data, use "this.data.data.skills", however, when updating, use "data.skills".
  importSkillsFromGCSv1(json, isFoundryGCS) {
    if (!json) return
    let temp = []
    let t = this.textFrom /// shortcut to make code smaller
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let sk = new Skill()
        sk.name = t(j.name)
        sk.type = t(j.type)
        sk.level = t(j.level)
        if (sk.level == 0) sk.level = ''
        sk.points = this.intFrom(j.points)
        sk.relativelevel = t(j.relativelevel)
        if (isFoundryGCS) {
          sk.notes = t(j.notes)
          sk.pageref = t(j.pageref)
        } else sk.setNotes(t(j.text))
        if (!!j.pageref) sk.pageref = t(j.pageref)
        sk.uuid = t(j.uuid)
        sk.parentuuid = t(j.parentuuid)
        temp.push(sk)
      }
    }
    return {
      'data.-=skills': null,
      'data.skills': this.foldList(temp),
    }
  }

  // create/update the spells.
  // NOTE:  For the update to work correctly, no two spells can have the same name.
  // When reading data, use "this.data.data.spells", however, when updating, use "data.spells".
  importSpellsFromGCSv1(json, isFoundryGCS) {
    if (!json) return
    let temp = []
    let t = this.textFrom /// shortcut to make code smaller
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let sp = new Spell()
        sp.name = t(j.name)
        sp.class = t(j.class)
        sp.college = t(j.college)
        if (isFoundryGCS) {
          sp.cost = t(j.cost)
          sp.maintain = t(j.maintain)
          sp.difficulty = t(j.difficulty)
          sp.notes = t(j.notes)
        } else {
          let cm = t(j.costmaintain)
          let i = cm.indexOf('/')
          if (i >= 0) {
            sp.cost = cm.substring(0, i)
            sp.maintain = cm.substr(i + 1)
          } else {
            sp.cost = cm
          }
          sp.setNotes(t(j.text))
        }
        sp.pageref = t(j.pageref)
        sp.duration = t(j.duration)
        sp.points = t(j.points)
        sp.casttime = t(j.time)
        sp.level = t(j.level)
        sp.duration = t(j.duration)
        sp.uuid = t(j.uuid)
        sp.parentuuid = t(j.parentuuid)
        temp.push(sp)
      }
    }
    return {
      'data.-=spells': null,
      'data.spells': this.foldList(temp),
    }
  }

  importAdsFromGCA(adsjson, disadsjson) {
    let list = []
    this.importBaseAdvantages(list, adsjson)
    this.importBaseAdvantages(list, disadsjson)
    return {
      'data.-=ads': null,
      'data.ads': this.foldList(list),
    }
  }

  importBaseAdvantages(datalist, json) {
    if (!json) return
    let t = this.textFrom /// shortcut to make code smaller
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let a = new Advantage()
        a.name = t(j.name)
        a.points = this.intFrom(j.points)
        a.setNotes(t(j.text))
        a.pageref = t(j.pageref) || a.pageref
        a.uuid = t(j.uuid)
        a.parentuuid = t(j.parentuuid)
        datalist.push(a)
      }
    }
  }

  // In the new GCS import, all ads/disad/quirks/perks are in one list.
  importAdsFromGCSv2(json) {
    let t = this.textFrom /// shortcut to make code smaller
    let temp = []
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let a = new Advantage()
        a.name = t(j.name)
        a.points = this.intFrom(j.points)
        a.note = t(j.notes)
        a.userdesc = t(j.userdesc)
        a.notes = ''
        if (!!a.note && !!a.userdesc) a.notes = a.note + '\n' + a.userdesc
        else if (!!a.note) a.notes = a.note
        else if (!!a.userdesc) a.notes = a.userdesc
        a.pageref = t(j.pageref)
        a.uuid = t(j.uuid)
        a.parentuuid = t(j.parentuuid)
        temp.push(a)
      }
    }
    return {
      'data.-=ads': null,
      'data.ads': this.foldList(temp),
    }
  }

  /**
   * Adds any assigned resource trackers to the actor data and sheet.
   */
  async setResourceTrackers() {
    // find those with non-blank slots
    let templates = ResourceTrackerManager.getAllTemplates().filter(it => !!it.slot)

    templates.forEach(async template => {
      // find the matching data on this actor
      let path = `additionalresources.tracker.${template.slot}`
      let tracker = getProperty(this.data.data, path)

      // skip if already set
      if (tracker !== null && tracker.name === template.tracker.name) {
        return
      }

      // if not blank, don't overwrite
      if (tracker !== null && !!tracker.name) {
        ui.notifications.warn(
          `Will not overwrite Tracker ${template.slot} as its name is set to ${tracker.name}. Create Tracker for ${template.tracker.name} failed.`
        )
        return
      }

      await this.applyTrackerTemplate(path, template)
    })
  }

  /**
   * Update this tracker slot with the contents of the template.
   * @param {String} path JSON data path to the tracker; must start with 'additionalresources.tracker.'
   * @param {*} template to apply
   */
  async applyTrackerTemplate(path, template) {
    // is there an initializer? If so calculate its value
    let value = 0
    if (!!template.initialValue) {
      value = parseInt(template.initialValue, 10)
      if (Number.isNaN(value)) {
        // try to use initialValue as a path to another value
        value = getProperty(this.data.data, template.initialValue)
      }
    }
    template.tracker.max = value
    template.tracker.value = template.tracker.isDamageTracker ? template.tracker.min : value

    // remove whatever is there
    await this.removeTracker(path)

    // add the new tracker
    let update = {}
    update[`data.${path}`] = template.tracker
    await this.update(update)
  }

  /**
   * Overwrites the tracker pointed to by the path with default/blank values.
   * @param {String} path JSON data path to the tracker; must start with 'additionalresources.tracker.'
   */
  async removeTracker(path) {
    // verify that this is a Tracker
    if (!path.startsWith('additionalresources.tracker.'))
      throw `Invalid actor data path, actor=[${this.actor.id}] path=[${path}]`

    let update = {}
    update[`data.${path}`] = {
      name: '',
      alias: '',
      pdf: '',
      max: 0,
      min: 0,
      value: 0,
      isDamageTracker: false,
      isDamageType: false,
      initialValue: '',
      thresholds: [],
    }
    await this.update(update)
  }

  // --- Functions to handle events on actor ---

  handleDamageDrop(damageData) {
    if (game.user.isGM || !game.settings.get(settings.SYSTEM_NAME, settings.SETTING_ONLY_GMS_OPEN_ADD))
      new ApplyDamageDialog(this, damageData).render(true)
    else ui.notifications.warn('Only GMs are allowed to Apply Damage.')
  }

  // This function merges the 'where' and 'dr' properties of this actor's hitlocations
  // with the roll value from the  HitLocations.hitlocationRolls, converting the
  // roll from a string to an array of numbers (see the _convertRollStringToArrayOfInt
  // function).
  //
  // return value is an object with the following structure:
  // 	{
  //  	where: string value from the hitlocations table,
  //  	dr: int DR value from the hitlocations table,
  //  	rollText: string value of the roll from the hitlocations table (examples: '5', '6-9', '-')
  //  	roll: array of int of the values that match rollText (examples: [5], [6,7,8,9], [])
  // 	}
  get hitLocationsWithDR() {
    let myhitlocations = []
    let table = this._hitLocationRolls
    for (const [key, value] of Object.entries(this.data.data.hitlocations)) {
      let rollText = value.roll
      if (!value.roll && !!table[value.where])
        // Can happen if manually edited
        rollText = table[value.where].roll
      if (!rollText) rollText = HitLocations.HitLocation.DEFAULT
      let dr = parseInt(value.dr)
      if (isNaN(dr)) dr = 0
      myhitlocations.push({
        where: value.where,
        dr: dr,
        roll: convertRollStringToArrayOfInt(rollText),
        rollText: rollText,
      })
    }
    return myhitlocations
  }

  /**
   * @returns the appropriate hitlocation table based on the actor's bodyplan
   */
  get _hitLocationRolls() {
    return HitLocations.HitLocation.getHitLocationRolls(this.data.data.additionalresources?.bodyplan)
  }

  // Return the 'where' value of the default hit location, or 'Random'
  // NOTE: could also return 'Large-Area'?
  get defaultHitLocation() {
    // TODO implement a system setting but (potentially) allow it to be overridden
    return game.settings.get('gurps', 'default-hitlocation')
  }

  getCurrentDodge() {
    return this.data.data.currentdodge
  }

  getCurrentMove() {
    return this.data.data.currentmove
  }

  getTorsoDr() {
    if (!this.data.data.hitlocations) return 0
    let hl = Object.values(this.data.data.hitlocations).find(h => h.penalty == 0)
    return !!hl ? hl.dr : 0
  }

  getEquipped(key) {
    let val = 0
    if (!!this.data.data.melee && !!this.data.data.equipment.carried)
      Object.values(this.data.data.melee).forEach(melee => {
        recurselist(this.data.data.equipment.carried, e => {
          if (!val && e.equipped && e.name == melee.name) {
            let t = parseInt(melee[key])
            if (!isNaN(t)) val = t
          }
        })
      })
    if (!val && !!this.data.data[key]) val = parseInt(this.data.data[key])
    return val
  }

  getEquippedParry() {
    return this.getEquipped('parry')
  }

  getEquippedBlock() {
    return this.getEquipped('block')
  }

  changeOneThirdStatus(option, flag) {
    this.update({ [`data.additionalresources.${option}`]: flag }).then(() => {
      this.calculateDerivedValues()
      let msg = this.displayname + ' '
      if (option === 'isReeling') {
        if (flag) msg += 'is Reeling. Move and Dodge are halved. [PDF:B419]'
        else msg += 'is no longer reeling.'
      }
      if (option === 'isTired') {
        if (flag) msg += 'is Tired.   Move, Dodge and ST are halved. [PDF:B426]'
        else msg += 'is no longer tired.'
      }
      let users = this.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true)
      let ids = users.map(it => it._id)
      let messageData = {
        content: msg,
        whisper: ids,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      }
      ChatMessage.create(messageData)
      ui.combat.render()
    })
  }

  findEquipmentByName(pattern, otherFirst = false) {
    pattern = pattern.split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    let pats = pattern.split('/')
    var eqt, key
    let list1 = otherFirst ? this.data.data.equipment.other : this.data.data.equipment.carried
    let list2 = otherFirst ? this.data.data.equipment.carried : this.data.data.equipment.other
    let pkey1 = otherFirst ? 'data.equipment.other.' : 'data.equipment.carried.'
    let pkey2 = otherFirst ? 'data.equipment.carried.' : 'data.equipment.other.'
    recurselist(
      list1,
      (e, k, d) => {
        let l = pats.length - 1
        let p = pats[Math.min(d, l)]
        if (e.name.match('^' + p)) {
          if (!eqt && (d == l || pats.length == 1)) {
            eqt = e
            key = k
          }
        } else return pats.length == 1
      },
      pkey1
    )
    recurselist(
      list2,
      (e, k, d) => {
        let l = pats.length - 1
        let p = pats[Math.min(d, l)]
        if (e.name.match('^' + p)) {
          if (!eqt && (d == l || pats.length == 1)) {
            eqt = e
            key = k
          }
        } else return pats.length == 1
      },
      pkey2
    )
    return [eqt, key]
  }

  async updateParentOf(srckey, pindex = 4) {
    // pindex = 4 for equipment, 3 for everything else.
    let sp = srckey.split('.').slice(0, pindex).join('.')
    if (sp != srckey) {
      let eqt = GURPS.decode(this.data, sp)
      await Equipment.calcUpdate(this, eqt, sp)
    }
  }

  checkEncumbance(currentWeight) {
    let encs = this.data.data.encumbrance
    let last = GURPS.genkey(0) // if there are encumbrances, there will always be a level0
    var best, prev
    for (let key in encs) {
      let enc = encs[key]
      if (enc.current) prev = key
      let w = parseFloat(enc.weight)
      if (w > 0) {
        last = key
        if (currentWeight <= w) {
          best = key
          break
        }
      }
    }
    if (!best) best = last // that has a weight
    if (best != prev) {
      for (let key in encs) {
        let enc = encs[key]
        let t = 'data.encumbrance.' + key + '.current'
        if (key === best) {
          this.update({
            [t]: true,
            'data.currentmove': parseInt(enc.currentmove),
            'data.currentdodge': parseInt(enc.currentdodge),
          })
        } else if (enc.current) {
          this.update({ [t]: false })
        }
      }
    }
  }
}

export class Named {
  constructor(n1) {
    this.name = n1
  }
  name = ''
  notes = ''
  pageref = ''
  contains = {}

  pageRef(r) {
    this.pageref = r
    if (!!r && r.match(/[hH][tT][Tt][pP][sS]?:\/\//)) {
      this.pageref = '*Link'
      this.externallink = r
    }
  }

  // This is an ugly hack to parse the GCS FG Formatted Text entries.   See the method cleanUpP() above.
  setNotes(n) {
    if (!!n) {
      let v = extractP(n)
      let k = 'Page Ref: '
      let i = v.indexOf(k)
      if (i >= 0) {
        this.notes = v.substr(0, i).trim()
        // Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
        this.pageref = v.substr(i + k.length).trim()
      } else {
        this.notes = v.trim()
        this.pageref = ''
      }
    }
  }
}

export class NamedCost extends Named {
  points = 0
}

export class Leveled extends NamedCost {
  constructor(n1, lvl) {
    super(n1)
    this.level = lvl
  }

  level = 1
}

export class Skill extends Leveled {
  type = '' // "DX/E";
  relativelevel = '' // "DX+1";
}

export class Spell extends Leveled {
  class = ''
  college = ''
  cost = ''
  maintain = ''
  duration = ''
  resist = ''
  casttime = ''
  difficulty = ''
}

export class Advantage extends NamedCost {
  userdesc = ''
  note = ''
}

export class Attack extends Named {
  st = ''
  mode = ''
  level = ''
  damage = ''
  constructor(n1, lvl, dmg) {
    super(n1)
    this.level = lvl
    this.damage = dmg
  }
}

export class Melee extends Attack {
  weight = ''
  techlevel = ''
  cost = ''
  reach = ''
  parry = ''
  block = ''
}

export class Ranged extends Attack {
  bulk = ''
  legalityclass = ''
  ammo = ''
  acc = ''
  range = ''
  rof = ''
  shots = ''
  rcl = ''
  checkRange() {
    if (!!this.halfd) this.range = this.halfd
    if (!!this.max) this.range = this.max
    if (!!this.halfd && !!this.max) this.range = this.halfd + '/' + this.max
  }
}

export class Encumbrance {
  key = ''
  level = 0
  dodge = 9
  weight = ''
  move = ''
  current = false
}

export class Note extends Named {
  constructor(n, ue) {
    super()
    this.notes = n
    this.save = ue
  }
}

export class Equipment extends Named {
  constructor(nm, ue) {
    super(nm)
    this.save = ue
  }
  equipped = false
  carried = false
  count = 0
  cost = 0
  weight = 0
  location = ''
  techlevel = ''
  legalityclass = ''
  categories = ''
  costsum = ''
  weightsum = ''
  uses = ''
  maxuses = ''

  static calc(eqt) {
    Equipment.calcUpdate(null, eqt, '')
  }

  // OMG, do NOT fuck around with this method.   So many gotchas...
  // the worst being that you cannot use array.forEach.   You must use a for loop
  static async calcUpdate(actor, eqt, objkey) {
    const num = s => {
      return isNaN(s) ? 0 : Number(s)
    }
    const cln = s => {
      return !s ? 0 : num(String(s).replace(/,/g, ''))
    }

    eqt.count = cln(eqt.count)
    eqt.cost = cln(eqt.cost)
    eqt.weight = cln(eqt.weight)
    let cs = eqt.count * eqt.cost
    let ws = eqt.count * eqt.weight
    if (!!eqt.contains) {
      for (let k in eqt.contains) {
        let e = eqt.contains[k]
        await Equipment.calcUpdate(actor, e, objkey + '.contains.' + k)
        cs += e.costsum
        ws += e.weightsum
      }
    }
    if (!!eqt.collapsed) {
      for (let k in eqt.collapsed) {
        let e = eqt.contains[k]
        await Equipment.calcUpdate(actor, e, objkey + '.collapsed.' + k)
        cs += e.costsum
        ws += e.weightsum
      }
    }
    if (!!actor)
      await actor.update({
        [objkey + '.costsum']: cs,
        [objkey + '.weightsum']: ws,
      })
    // the local values 'should' be updated... but I need to force them anyway
    eqt.costsum = cs
    eqt.weightsum = ws
  }
}
export class Reaction {
  modifier = ''
  situation = ''
  constructor(m, s) {
    this.modifier = m
    this.situation = s
  }
}
