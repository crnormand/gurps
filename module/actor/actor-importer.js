import { xmlTextToJson, recurselist, i18n, i18n_f, arrayBuffertoBase64, aRecurselist } from '../../lib/utilities.js'
import * as HitLocations from '../hitlocation/hitlocation.js'
import { SmartImporter } from '../smart-importer.js'
import { parseDecimalNumber } from '../../lib/parse-decimal-number/parse-decimal-number.js'
import {
  Skill,
  Spell,
  Advantage,
  Ranged,
  Note,
  Encumbrance,
  Equipment,
  Reaction,
  Modifier,
  Melee,
  Language,
} from './actor-components.js'
import * as Settings from '../../lib/miscellaneous-settings.js'

// const GCA5Version = 'GCA5-14'
const GCAVersion = 'GCA-11'

export class ActorImporter {
  GCSVersion = 0

  constructor(actor) {
    this.actor = actor
  }

  async importActor() {
    let path = this.actor.system.additionalresources.importpath
    if (path) {
      let match = path.match(/.*[/\\]Data[/\\](.*)/)
      // If the path is inside the Foundry Data directory, then we can read the file directly and import it.
      if (match) {
        let fileUrl = match[1].replace(/\\/g, '/')
        let xhr = new XMLHttpRequest()
        xhr.responseType = 'arraybuffer'
        xhr.open('GET', fileUrl)
        xhr.onload = () => {
          if (xhr.status === 200) {
            let source = arrayBuffertoBase64(xhr.response)
            this.importActorFromExternalProgram(source, match[1], path)
          } else this._openImportDialog()
        }
        xhr.send(null)
      } else await this._openImportDialog()
    } else await this._openImportDialog()
  }

  async _openImportDialog() {
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_BROWSER_IMPORTER))
      await this._openNonLocallyHostedImportDialog()
    else await this._openLocallyHostedImportDialog()
  }

  async _openNonLocallyHostedImportDialog() {
    try {
      const file = await SmartImporter.getFileForActor(this.actor)
      const res = await this.importActorFromExternalProgram(await file.text(), file.name, file.path)
      if (res) SmartImporter.setFileForActor(this.actor, file)
    } catch (e) {
      ui.notifications?.error(e)
      throw e
    }
  }

  async _openLocallyHostedImportDialog() {
    setTimeout(async () => {
      new Dialog(
        {
          title: `Import character data for: ${this.actor.name}`,
          content: await renderTemplate(
            'systems/gurps/templates/import-gcs-v1-data.hbs',
            SmartImporter.getTemplateOptions(this.actor)
          ),
          buttons: {
            import: {
              icon: '<i class="fas fa-file-import"></i>',
              label: 'Import',
              callback: async html => {
                const form = html.find('form')[0]
                let files = form.data.files
                let file = null
                if (!files.length) {
                  return ui.notifications.error('You did not upload a data file!')
                } else {
                  file = files[0]
                  const text = await GURPS.readTextFromFile(file)
                  await this.importActorFromExternalProgram(text, file.name, file.path)
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
  }

  async importActorFromExternalProgram(source, importName, importPath, suppressMessage = false) {
    if (importName.endsWith('.gcs')) return this.importActorFromGCS(source, importName, importPath, suppressMessage)
    return this.importActorFromGCA(source, importName, importPath, suppressMessage)
  }

  /**
   * @param {string} json
   * @param {string} importname
   * @param {string | undefined} [importpath]
   */
  async importActorFromGCS(json, importname, importpath, suppressMessage = false) {
    let r
    let msg = []
    let exit = false
    let loadingDialog
    let importResult = false
    try {
      r = JSON.parse(json)
    } catch (err) {
      msg.push(i18n('GURPS.importNoJSONDetected'))
      exit = true
    }
    if (!!r) {
      if (!r.calc) {
        msg.push(i18n('GURPS.importOldGCSFile'))
        exit = true
      }
    }
    this.GCSVersion = r.version

    if (msg.length > 0) {
      ui.notifications?.error(msg.join('<br>'))
      let content = await renderTemplate('systems/gurps/templates/chat-import-actor-errors.html', {
        lines: msg,
        version: version,
        GCAVersion: GCAVersion,
        GCSVersion: this.GCSVersion,
        url: GURPS.USER_GUIDE_URL,
      })
      ChatMessage.create({
        content: content,
        user: game.user.id,
        whisper: [game.user.id],
      })
      if (exit) return false
    }

    let nm = r['profile']['name']
    console.log("Importing '" + nm + "'")
    let starttime = performance.now()
    let commit = {}

    if (
      !!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS) ||
      this.actor.items.filter(i => !!i.system.importid).length > 10
    )
      loadingDialog = await this._showLoadingDialog({ name: nm, generator: 'GCS' })
    commit = { ...commit, ...{ 'system.lastImport': new Date().toString().split(' ').splice(1, 4).join(' ') } }
    let ar = this.actor.system.additionalresources || {}
    ar.importname = importname || ar.importname
    ar.importpath = importpath || ar.importpath
    try {
      commit = { ...commit, ...{ 'system.additionalresources': ar } }
      commit = { ...commit, ...(await this.importAttributesFromGCS(r.attributes, r.equipment, r.calc)) }
      commit = { ...commit, ...(await this.importTraitsFromGCS(r.profile, r.created_date, r.modified_date)) }
      commit = {
        ...commit,
        ...this.importSizeFromGCS(commit, r.profile, r.traits || r.advantages || [], r.skills, r.equipment),
      }
      commit = { ...commit, ...(await this.importAdsFromGCS(r.traits || r.advantages || [])) }
      commit = { ...commit, ...(await this.importSkillsFromGCS(r.skills)) }
      commit = { ...commit, ...(await this.importSpellsFromGCS(r.spells)) }
      commit = { ...commit, ...(await this.importEquipmentFromGCS(r.equipment, r.other_equipment)) }
      commit = { ...commit, ...this.importNotesFromGCS(r.notes) }

      commit = {
        ...commit,
        ...(await this.importProtectionFromGCS(r.settings.body_type || r.settings.hit_locations)),
      }
      commit = {
        ...commit,
        ...this.importPointTotalsFromGCS(
          r.total_points,
          r.attributes,
          r.traits || r.advantages || [],
          r.skills,
          r.spells
        ),
      }
      commit = { ...commit, ...this.importReactionsFromGCS(r.traits || r.advantages || [], r.skills, r.equipment) }
      commit = {
        ...commit,
        ...this.importCombatFromGCS(r.traits || r.advantages || [], r.skills, r.spells, r.equipment),
      }
    } catch (err) {
      console.log(err.stack)
      msg.push(
        i18n_f('GURPS.importGenericError', {
          name: nm,
          error: err.name,
          message: err.message,
        })
      )
      let content = await renderTemplate('systems/gurps/templates/chat-import-actor-errors.html', {
        lines: [msg],
        version: this.GC,
        GCAVersion: GCAVersion,
        GCSVersion: this.GCSVersion,
        url: GURPS.USER_GUIDE_URL,
      })
      ui.notifications?.warn(msg)
      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }
      ChatMessage.create(chatData, {})
      // Don't return
    }

    console.log('Starting commit')

    let deletes = Object.fromEntries(Object.entries(commit).filter(([key, _value]) => key.includes('.-=')))
    let adds = Object.fromEntries(Object.entries(commit).filter(([key, _value]) => !key.includes('.-=')))

    try {
      this.ignoreRender = true
      await this.actor.internalUpdate(deletes, { diff: true })
      await this.actor.internalUpdate(adds, { diff: false })
      // This has to be done after everything is loaded
      await this.actor.postImport()
      this.actor._forceRender()

      // Must update name outside of protection so that Actors list (and other external views) update correctly
      if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IGNORE_IMPORT_NAME)) {
        await this.actor.update({ name: nm, 'token.name': nm })
      }

      // For each saved item with global id, lets run their additions
      if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
        for (let key of ['ads', 'skills', 'spells']) {
          await aRecurselist(this.actor.system[key], async t => {
            if (!!t.itemid) {
              const i = this.actor.items.get(t.itemid)
              if (!!i.system.globalid) {
                await this.actor._addItemAdditions(i, '')
              }
            }
          })
        }
      }
      // Recalculate DR
      await this.actor.refreshDR()

      if (!suppressMessage) ui.notifications?.info(i18n_f('GURPS.importSuccessful', { name: nm }))
      console.log(
        'Done importing (' +
          Math.round(performance.now() - starttime) +
          'ms.)  You can inspect the character data below:'
      )
      console.log(this)
      importResult = true
    } catch (err) {
      console.log(err.stack)
      let msg = [i18n_f('GURPS.importGenericError', { name: nm, error: err.name, message: err.message })]
      if (err.message == 'Maximum depth exceeded') msg.push(i18n('GURPS.importTooManyContainers'))
      ui.notifications?.warn(msg.join('<br>'))
      let content = await renderTemplate('systems/gurps/templates/chat-import-actor-errors.html', {
        lines: msg,
        version: 'GCS Direct',
        GCAVersion: GCAVersion,
        GCSVersion: this.GCSVersion,
        url: GURPS.USER_GUIDE_URL,
      })

      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }
      ChatMessage.create(chatData, {})
    } finally {
      if (!!loadingDialog) await loadingDialog.close()
    }
    return importResult
  }

  async _showLoadingDialog(diagOps) {
    const { name, generator } = diagOps
    const dialog = new Dialog(
      {
        title: game.i18n.format('GURPS.importSheetTitle', { generator }),
        content: `<p>${game.i18n.format('GURPS.importSheetHint', { name, generator })}</p>`,
        buttons: {},
        close: () => {},
      },
      {
        width: 400,
        height: 200,
        resizable: false,
        closeOnSubmit: false,
      }
    )
    await dialog.render(true)
    return dialog
  }

  async importActorFromGCA(source, importName, importPath, suppressMessage) {
    let c, ra // The character json, release attributes
    let isFoundryGCA = false
    let isFoundryGCA5 = false
    // need to remove <p> and replace </p> with newlines from "formatted text"
    let origx = GURPS.cleanUpP(source)
    let x = xmlTextToJson(origx)
    let r = x.root
    let msg = []
    let version = 'unknown'
    let vernum = 1
    let exit = false
    if (!r) {
      if (importName.endsWith('.gca5')) msg.push(i18n('GURPS.importCannotImportGCADirectly'))
      if (importName.endsWith('.gca4')) msg.push(i18n('GURPS.importCannotImportGCADirectly'))
      else if (!xml.startsWith('<?xml')) msg.push(i18n('GURPS.importNoXMLDetected'))
      exit = true
    } else {
      // The character object starts here
      c = r.character
      if (!c) {
        msg.push(i18n('GURPS.importNoCharacterFormat'))
        exit = true
      }

      let parsererror = r.parsererror
      if (!!parsererror) {
        msg.push(i18n_f('GURPS.importErrorParsingXML', { text: this.textFrom(parsererror.div) }))
        exit = true
      }

      ra = r['@attributes']
      // Sorry for the horrible version checking... it sort of evolved organically
      isFoundryGCA = !!ra && ra.release == 'Foundry' && ra.version.startsWith('GCA')
      isFoundryGCA5 = !!ra && ra.release == 'Foundry' && ra.version.startsWith('GCA5')
      if (!(isFoundryGCA || isFoundryGCA5)) {
        msg.push(i18n('GURPS.importFantasyGroundUnsupported'))
        exit = true
      }
      version = ra?.version || ''
      const v = !!ra?.version ? ra.version.split('-') : []
      if (isFoundryGCA) {
        if (isFoundryGCA5) {
          if (!!v[1]) vernum = parseInt(v[1])
          if (vernum < 12) {
            msg.push(i18n('GURPS.importGCA5ImprovedInventoryHandling'))
          }
          if (vernum < 13) {
            msg.push(i18n('GURPS.importGCA5ImprovedBlock'))
          }
        } else {
          if (!v[1]) {
            msg.push(i18n('GURPS.importGCANoBodyPlan'))
          }
          if (!!v[1]) vernum = parseInt(v[1])
          if (vernum < 2) {
            msg.push(i18n('GURPS.importGCANoInnateRangedAndParent'))
          }
          if (vernum < 3) {
            msg.push(i18n('GURPS.importGCANoSanitizedEquipmentPageRefs')) // Equipment Page ref's sanitized
          }
          if (vernum < 4) {
            msg.push(i18n('GURPS.importGCANoParent'))
          }
          if (vernum < 5) {
            msg.push(i18n('GURPS.importGCANoSanitizeNotes'))
          }
          if (vernum < 6) {
            msg.push(i18n('GURPS.importGCANoMeleeIfAlsoRanged'))
          }
          if (vernum < 7) {
            msg.push(i18n('GURPS.importGCABadBlockForDB'))
          }
          if (vernum < 8) {
            msg.push(i18n('GURPS.importGCANoHideFlag'))
          }
          if (vernum < 9) {
            msg.push(i18n('GURPS.importGCAChildrenWeights'))
          }
          if (vernum < 10) {
            msg.push(i18n('GURPS.importGCAAdvMods'))
          }
          if (vernum < 11) {
            msg.push(i18n('GURPS.importGCAConditionalModifiers'))
          }
        }
      }
    }
    if (msg.length > 0) {
      ui.notifications?.error(msg.join('<br>'))
      let content = await renderTemplate('systems/gurps/templates/chat-import-actor-errors.html', {
        lines: msg,
        version: version,
        GCAVersion: GCAVersion,
        GCSVersion: this.GCSVersion,
        url: GURPS.USER_GUIDE_URL,
      })

      ChatMessage.create({
        content: content,
        user: game.user.id,
        whisper: [game.user.id],
      })
      if (exit) return false // Some errors cannot be forgiven ;-)
    }
    let nm = this.textFrom(c.name)
    console.log("Importing '" + nm + "'")
    let starttime = performance.now()

    let commit = {}
    commit = { ...commit, ...{ 'system.lastImport': new Date().toString().split(' ').splice(1, 4).join(' ') } }
    let ar = this.actor.system.additionalresources || {}
    ar.importName = importName || ar.importName
    ar.importPath = importPath || ar.importPath
    ar.importversion = ra.version
    commit = { ...commit, ...{ 'system.additionalresources': ar } }

    let loadingDialog
    let importResult = false
    try {
      if (
        !!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS) ||
        this.actor.items.filter(i => !!i.system.importid).length > 10
      )
        loadingDialog = await this._showLoadingDialog({ name: nm, generator: 'GCA' })
      // This is going to get ugly, so break out various data into different methods
      commit = { ...commit, ...(await this.importAttributesFromGCA(c.attributes)) }
      commit = { ...commit, ...(await this.importSkillsFromGCA(c.abilities?.skilllist)) }
      commit = { ...commit, ...this.importTraitsfromGCA(c.traits) }
      commit = { ...commit, ...this.importCombatMeleeFromGCA(c.combat?.meleecombatlist) }
      commit = { ...commit, ...this.importCombatRangedFromGCA(c.combat?.rangedcombatlist) }
      commit = { ...commit, ...(await this.importSpellsFromGCA(c.abilities?.spelllist)) }
      commit = { ...commit, ...this.importLangFromGCA(c.traits?.languagelist) }
      commit = { ...commit, ...(await this.importAdsFromGCA(c.traits?.adslist, c.traits?.disadslist)) }
      commit = { ...commit, ...this.importReactionsFromGCA(c.traits?.reactionmodifiers, vernum) }
      commit = { ...commit, ...this.importEncumbranceFromGCA(c.encumbrance) }
      commit = { ...commit, ...this.importPointTotalsFromGCA(c.pointtotals) }
      commit = { ...commit, ...this.importNotesFromGCA(c.description, c.notelist) }
      commit = { ...commit, ...(await this.importEquipmentFromGCA(c.inventorylist)) }
      commit = { ...commit, ...(await this.importProtectionFromGCA(c.combat?.protectionlist)) }
    } catch (err) {
      throw err
      console.log(err.stack)
      let msg = i18n_f('GURPS.importGenericError', { name: nm, error: err.name, message: err.message })
      let content = await renderTemplate('systems/gurps/templates/chat-import-actor-errors.html', {
        lines: [msg],
        version: version,
        GCAVersion: GCAVersion,
        GCSVersion: this.GCSVersion,
        url: GURPS.USER_GUIDE_URL,
      })

      ui.notifications?.warn(msg)
      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }
      ChatMessage.create(chatData, {})
      // Don't return, because we want to see how much actually gets committed.
    }
    console.log('Starting commit')

    let deletes = Object.fromEntries(Object.entries(commit).filter(([key, _value]) => key.includes('.-=')))
    let adds = Object.fromEntries(Object.entries(commit).filter(([key, _value]) => !key.includes('.-=')))

    try {
      this.ignoreRender = true
      await this.actor.internalUpdate(deletes, { diff: false })
      await this.actor.internalUpdate(adds, { diff: false })
      // This has to be done after everything is loaded
      await this.actor.postImport()
      this.actor._forceRender()

      // Must update name outside of protection so that Actors list (and other external views) update correctly
      if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IGNORE_IMPORT_NAME)) {
        await this.actor.update({ name: nm, 'token.name': nm })
      }

      // For each saved item with global id, lets run their additions
      if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
        for (let key of ['ads', 'skills', 'spells']) {
          await aRecurselist(this.actor.system[key], async t => {
            if (!!t.itemid) {
              const i = this.actor.items.get(t.itemid)
              if (!!i.system.globalid) {
                await this.actor._addItemAdditions(i, '')
              }
            }
          })
        }
      }
      // Recalculate DR
      await this.actor.refreshDR()

      if (!suppressMessage) ui.notifications?.info(i18n_f('GURPS.importSuccessful', { name: nm }))
      console.log(
        'Done importing (' +
          Math.round(performance.now() - starttime) +
          'ms.)  You can inspect the character data below:'
      )
      console.log(this)
      importResult = true
    } catch (err) {
      console.log(err.stack)
      let msg = [i18n_f('GURPS.importGenericError', { name: nm, error: err.name, message: err.message })]
      if (err.message == 'Maximum depth exceeded') msg.push(i18n('GURPS.importTooManyContainers'))
      ui.notifications?.warn(msg.join('<br>')) // FIXME: Why suppressMessage is not available here?
      let content = await renderTemplate('systems/gurps/templates/chat-import-actor-errors.html', {
        lines: msg,
        version: version,
        GCAVersion: GCAVersion,
        GCSVersion: this.GCSVersion,
        url: GURPS.USER_GUIDE_URL,
      })

      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }
      ChatMessage.create(chatData, {})
    } finally {
      if (!!loadingDialog) await loadingDialog.close()
    }
    return importResult
  }

  // Import the <attributes> section of the GCS FG XML file.
  /**
   * @param {{ [key: string]: any }} json
   */
  async importAttributesFromGCA(json) {
    if (!json) return
    let i = this.intFrom // shortcut to make code smaller -- I reject your attempt to make the code smaller. Why does it need to be smaller?
    let t = this.textFrom // shortcut to make code smaller -- I reject your attempt to make the code smaller. Why does it need to be smaller?
    let data = this.actor.system
    let att = data.attributes

    // attribute.values will be calculated in calculateDerivedValues()
    att.ST.import = i(json.strength)
    att.ST.points = i(json.strength_points)
    att.DX.import = i(json.dexterity)
    att.DX.points = i(json.dexterity_points)
    att.IQ.import = i(json.intelligence)
    att.IQ.points = i(json.intelligence_points)
    att.HT.import = i(json.health)
    att.HT.points = i(json.health_points)
    att.WILL.import = i(json.will)
    att.WILL.points = i(json.will_points)
    att.PER.import = i(json.perception)
    att.PER.points = i(json.perception_points)

    data.HP.max = i(json.hitpoints)
    data.HP.points = i(json.hitpoints_points)
    data.FP.max = i(json.fatiguepoints)
    data.FP.points = i(json.fatiguepoints_points)
    let hp = i(json.hps)
    let fp = i(json.fps)

    let saveCurrent = false
    if (!!data.lastImport && (data.HP.value != hp || data.FP.value != fp)) {
      let option = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_HP_FP)
      if (option == 0) {
        saveCurrent = true
      }
      if (option == 2) {
        saveCurrent = await new Promise(resolve => {
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
    data.basicspeed.value = this.floatFrom(json.basicspeed)

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
      'system.attributes': att,
      'system.HP': data.HP,
      'system.FP': data.FP,
      'system.basiclift': data.basiclift,
      'system.basicmove': data.basicmove,
      'system.basicspeed': data.basicspeed,
      'system.thrust': data.thrust,
      'system.swing': data.swing,
      'system.currentmove': data.currentmove,
      'system.frightcheck': data.frightcheck,
      'system.hearing': data.hearing,
      'system.tastesmell': data.tastesmell,
      'system.touch': data.touch,
      'system.vision': data.vision,
      'system.liftingmoving': lm,
    }
  }

  /**
   * @param {{ race: Record<string, any>; height: Record<string, any>; weight: Record<string, any>; age: Record<string, any>; title: Record<string, any>; player: Record<string, any>; createdon: Record<string, any>; modifiedon: Record<string, any>; religion: Record<string, any>; birthday: Record<string, any>; hand: Record<string, any>; sizemodifier: Record<string, any>; tl: Record<string, any>; appearance: Record<string, any>; }} json
   */
  importTraitsfromGCA(json) {
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
      'system.-=traits': null,
      'system.traits': ts,
    }
  }

  /**
   * @param {{ [key: string]: any }} adsjson
   * @param {{ [key: string]: any }} disadsjson
   */
  async importAdsFromGCA(adsjson, disadsjson) {
    /** @type {Advantage[]} */
    if (!!adsjson || !!disadsjson) await this._preImport('GCA', 'feature')
    let list = []
    await this.importBaseAdvantagesFromGCA(list, adsjson)
    await this.importBaseAdvantagesFromGCA(list, disadsjson)

    // Find all Features with globalId
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      await aRecurselist(this.actor.system.ads, async t => {
        if (!!t.itemid) {
          const i = this.actor.items.get(t.itemid)
          if (!!i?.system.globalid) {
            if (!(t instanceof Advantage)) t = Advantage.fromObject(t, this.actor)
            t = await this._processItemFrom(t, 'GCA')
            list.push(t)
          }
        }
      })
    }

    return {
      'system.-=ads': null,
      'system.ads': this.foldList(list),
    }
  }

  /**
   * @param {Advantage[]} datalist
   * @param {{ [key: string]: any }} json
   */
  async importBaseAdvantagesFromGCA(datalist, json) {
    if (!json) return
    let t = this.textFrom /// shortcut to make code smaller
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let a = new Advantage()
        a.name = t(j.name)
        a.originalName = t(j.name)
        a.points = this.intFrom(j.points)
        a.setNotes(t(j.text))
        a.pageRef(t(j.pageref) || a.pageref)
        a.uuid = t(j.uuid)
        a.parentuuid = t(j.parentuuid)
        let old = this._findElementIn('ads', a.uuid)
        this._migrateOtfsAndNotes(old, a, t(j.vtt_notes))
        a = await this._processItemFrom(a, 'GCA')
        datalist.push(a)
      }
    }
  }

  /**
   * @param {{ [key: string]: any }} json
   */
  async importSkillsFromGCA(json) {
    if (!json) return
    await this._preImport('GCA', 'skill')
    let temp = []
    let t = this.textFrom /// shortcut to make code smaller
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let sk = new Skill()
        sk.name = t(j.name)
        sk.originalName = t(j.name)
        sk.type = t(j.type)
        sk.import = t(j.level)
        if (sk.level == 0) sk.level = ''
        sk.points = this.intFrom(j.points)
        sk.relativelevel = t(j.relativelevel)
        sk.setNotes(t(j.text))
        if (!!j.pageref) sk.pageRef(t(j.pageref))
        sk.uuid = t(j.uuid)
        sk.parentuuid = t(j.parentuuid)
        let old = this._findElementIn('skills', sk.uuid)
        this._migrateOtfsAndNotes(old, sk, t(j.vtt_notes))
        sk = await this._processItemFrom(sk, 'GCA')
        temp.push(sk)
      }
    }

    // Find all skills with globalId
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      await aRecurselist(this.actor.system.skills, async t => {
        if (!!t.itemid) {
          const i = this.actor.items.get(t.itemid)
          if (!!i?.system.globalid) {
            if (!(t instanceof Skill)) t = Skill.fromObject(t, this.actor)
            t = await this._processItemFrom(t, 'GCA')
            temp.push(t)
          }
        }
      })
    }

    return {
      'system.-=skills': null,
      'system.skills': this.foldList(temp),
    }
  }

  // create/update the spells.
  // NOTE:  For the update to work correctly, no two spells can have the same name.
  // When reading data, use "this.actor.system.spells", however, when updating, use "system.spells".
  /**
   * @param {{ [key: string]: any }} json
   */
  async importSpellsFromGCA(json) {
    if (!json) return
    await this._preImport('GCA', 'spell')
    let temp = []
    let t = this.textFrom /// shortcut to make code smaller
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let sp = new Spell()
        sp.name = t(j.name)
        sp.originalName = t(j.name)
        sp.class = t(j.class)
        sp.college = t(j.college)
        let cm = t(j.costmaintain)
        let i = cm.indexOf('/')
        if (i >= 0) {
          sp.cost = cm.substring(0, i)
          sp.maintain = cm.substr(i + 1)
        } else {
          sp.cost = cm
        }
        sp.setNotes(t(j.text))
        sp.pageRef(t(j.pageref))
        sp.duration = t(j.duration)
        sp.points = t(j.points)
        sp.casttime = t(j.time)
        sp.import = t(j.level)
        sp.uuid = t(j.uuid)
        sp.parentuuid = t(j.parentuuid)
        let old = this._findElementIn('spells', sp.uuid)
        this._migrateOtfsAndNotes(old, sp, t(j.vtt_notes))
        sp = await this._processItemFrom(sp, 'GCA')
        temp.push(sp)
      }
    }

    // Find all spells with globalId
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      await aRecurselist(this.actor.system.spells, async t => {
        if (!!t.itemid) {
          const i = this.actor.items.get(t.itemid)
          if (!!i?.system.globalid) {
            if (!(t instanceof Spell)) t = Spell.fromObject(t, this.actor)
            t = await this._processItemFrom(t, 'GCA')
            temp.push(t)
          }
        }
      })
    }

    return {
      'system.-=spells': null,
      'system.spells': this.foldList(temp),
    }
  }

  /**
   * @param {{ [key: string]: any }} json
   */
  importCombatMeleeFromGCA(json) {
    if (!json) return
    let t = this.textFrom
    let melee = {}
    let index = 0
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        for (let k2 in j.meleemodelist) {
          if (k2.startsWith('id-')) {
            let j2 = j.meleemodelist[k2]
            let m = new Melee()
            m.name = t(j.name)
            m.originalName = t(j.name)
            m.st = t(j.st)
            m.weight = t(j.weight)
            m.techlevel = t(j.tl)
            m.cost = t(j.cost)
            try {
              m.setNotes(t(j.text))
            } catch {
              console.log(m)
              console.log(t(j.text))
            }
            m.mode = t(j2.name)
            m.import = t(j2.level)
            m.damage = t(j2.damage)
            m.reach = t(j2.reach)
            m.parry = t(j2.parry)
            m.block = t(j2.block)
            let old = this._findElementIn('melee', false, m.name, m.mode)
            this._migrateOtfsAndNotes(old, m, t(j2.vtt_notes))

            GURPS.put(melee, m, index++)
          }
        }
      }
    }
    return {
      'system.-=melee': null,
      'system.melee': melee,
    }
  }

  /**
   * @param {{ [key: string]: any }} json
   */
  importCombatRangedFromGCA(json) {
    if (!json) return
    let t = this.textFrom
    let ranged = {}
    let index = 0
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        for (let k2 in j.rangedmodelist) {
          if (k2.startsWith('id-')) {
            let j2 = j.rangedmodelist[k2]
            let r = new Ranged()
            r.name = t(j.name)
            r.originalName = t(j.name)
            r.st = t(j.st)
            r.bulk = t(j.bulk)
            r.legalityclass = t(j.lc)
            r.ammo = t(j.ammo)
            try {
              r.setNotes(t(j.text))
            } catch {
              console.log(r)
              console.log(t(j.text))
            }
            r.mode = t(j2.name)
            r.import = t(j2.level)
            r.damage = t(j2.damage)
            r.acc = t(j2.acc)
            let m = r.acc.trim().match(/(\d+)([+-]\d+)/)
            if (m) {
              r.acc = m[1]
              r.notes += ' [' + m[2] + ' ' + i18n('GURPS.acc') + ']'
            }
            r.rof = t(j2.rof)
            r.shots = t(j2.shots)
            r.rcl = t(j2.rcl)
            let rng = t(j2.range)
            r.range = rng
            let old = this._findElementIn('ranged', false, r.name, r.mode)
            this._migrateOtfsAndNotes(old, r, t(j2.vtt_notes))

            GURPS.put(ranged, r, index++)
          }
        }
      }
    }
    return {
      'system.-=ranged': null,
      'system.ranged': ranged,
    }
  }

  /**
   * @param {{ [key: string]: any }} descjson
   * @param {{ [key: string]: any }} json
   */
  importNotesFromGCA(descjson, json) {
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
        let n = /** @type {Note & { imported: boolean, uuid: string, parentuuid: string }} */ (new Note())
        //n.setNotes(t(j.text));
        n.notes = t(j.name)
        let txt = t(j.text)
        if (!!txt) n.notes = n.notes + '\n' + txt.replace(/\\r/g, '\n')
        n.uuid = t(j.uuid)
        n.parentuuid = t(j.parentuuid)
        n.pageref = t(j.pageref)
        let old = this._findElementIn('notes', n.uuid)
        this._migrateOtfsAndNotes(old, n)
        temp.push(n)
      }
    }
    // Save the old User Entered Notes.
    recurselist(this.actor.system.notes, t => {
      if (!!t.save) temp.push(t)
    })
    return {
      'system.-=notes': null,
      'system.notes': this.foldList(temp),
    }
  }

  async _preImport(generator, itemType) {
    if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      // Before we import, we need to find all eligible items,
      // and backup their exclusive info inside Actor system.itemInfo
      const isEligibleItem = item => {
        const sysKey =
          itemType === 'equipment'
            ? this.actor._findEqtkeyForId('itemid', item.id)
            : this.actor._findSysKeyForId('itemid', item.id, item.actorComponentKey)
        return (
          (!!item.system.importid && item.system.importFrom === generator && item.type === itemType) ||
          !foundry.utils.getProperty(this.actor, sysKey)?.save
        )
      }
      let backupItemData = foundry.utils.getProperty(this.actor, `system.backupItemInfo`) || {}
      const eligibleItems = this.actor.items.filter(i => !!isEligibleItem(i))
      backupItemData = eligibleItems.reduce((acc, i) => {
        return {
          ...acc,
          [i.system.importid || i.system.originalName]: i.getItemInfo(),
        }
      }, backupItemData)
      await this.actor.internalUpdate({ 'system.backupItemInfo': backupItemData })

      if (eligibleItems.length > 0)
        await this.actor.deleteEmbeddedDocuments(
          'Item',
          eligibleItems.map(i => i.id)
        )
    }
  }

  /**
   * @param {{ [key: string]: any }} json
   */
  async importEquipmentFromGCA(json) {
    if (!json) return
    let t = this.textFrom
    let i = this.intFrom

    this.ignoreRender = true
    await this._preImport('GCA', 'equipment')

    /**
     * @type {Equipment[]}
     */
    let temp = []
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let { name, techLevel } = this.parseEquipmentNameAndTL(t, j)
        let parentuuid = t(j.parentuuid)
        let eqt = new Equipment()
        eqt.name = name
        eqt.originalName = t(j.name)
        eqt.count = t(j.count)
        eqt.cost = !!parentuuid ? t(j.cost) : 0
        eqt.location = t(j.location)
        let cstatus = i(j.carried)
        eqt.carried = cstatus >= 1
        eqt.equipped = cstatus == 2
        eqt.techlevel = techLevel
        eqt.legalityclass = t(j.lc)
        eqt.categories = t(j.type)
        eqt.uses = t(j.uses)
        eqt.maxuses = t(j.maxuses)
        eqt.uuid = t(j.uuid)
        eqt.parentuuid = parentuuid
        eqt.setNotes(t(j.notes))
        eqt.weight = !!parentuuid ? t(j.weightsum) : 0 // GCA sends calculated weight in 'weightsum'
        eqt.pageRef(t(j.pageref))
        let old = this._findElementIn('equipment.carried', eqt.uuid)
        if (!old) old = this._findElementIn('equipment.other', eqt.uuid)
        this._migrateOtfsAndNotes(old, eqt)
        if (!!old) {
          eqt.name = old.name
          eqt.carried = old.carried
          eqt.equipped = old.equipped
          eqt.parentuuid = old.parentuuid
          if (old.ignoreImportQty) {
            eqt.count = old.count
            eqt.uses = old.uses
            eqt.maxuses = old.maxuses
            eqt.ignoreImportQty = true
          }
        }
        // Process Item here
        eqt = await this._processItemFrom(eqt, 'GCA')
        temp.push(eqt)
      }
    }

    // Save the old User Entered Notes.
    await aRecurselist(this.actor.system.equipment?.carried, async t => {
      t.carried = true
      if (!!t.save) {
        if (!(t instanceof Equipment)) t = Equipment.fromObject(t, this.actor)
        t = await this._processItemFrom(t, 'GCA')
        temp.push(t)
      }
    }) // Ensure carried eqt stays in carried
    await aRecurselist(this.actor.system.equipment?.other, async t => {
      t.carried = false
      if (!!t.save) {
        if (!(t instanceof Equipment)) t = Equipment.fromObject(t, this.actor)
        t = await this._processItemFrom(t, 'GCA')
        temp.push(t)
      }
    })

    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      // After retrieve all relevant data
      // Lets remove equipments now
      await this.actor.internalUpdate({
        'system.equipment.-=carried': null,
        'system.equipment.-=other': null,
      })
    }

    temp.forEach(eqt => {
      // Remove all entries from inside items because if they still exist, they will be added back in
      eqt.contains = {}
      eqt.collapsed = {}
    })

    // Put everything in it container (if found), otherwise at the top level
    for (const eqt of temp) {
      let parent = null
      if (!!eqt.parentuuid) {
        parent = temp.find(e => e.uuid === eqt.parentuuid)
        if (!!parent) GURPS.put(parent.contains, eqt)
        else eqt.parentuuid = '' // Can't find a parent, so put it in the top list
      }
      await this._updateItemContains(eqt, parent)
    }

    let equipment = {
      carried: {},
      other: {},
    }
    let cindex = 0
    let oindex = 0

    for (const eqt of temp) {
      await Equipment.calc(eqt)
      if (!eqt.parentuuid) {
        if (eqt.carried) GURPS.put(equipment.carried, eqt, cindex++)
        else GURPS.put(equipment.other, eqt, oindex++)
      }
    }
    return {
      'system.-=equipment': null,
      'system.equipment': equipment,
    }
  }

  /*
   * Parse Name and TL for GCA data.
   *
   * Example: Backpack/TL8+3^
   */
  parseEquipmentNameAndTL(t, j) {
    let name
    let fullName = t(j.name)
    let techLevel = t(j.tl)
    const localizedTL = i18n('GURPS.TL')
    let regex = new RegExp(`.+\/[TL|${localizedTL}].+`)
    if (!!fullName.match(regex)) {
      let i = fullName.lastIndexOf('/TL') || fullName.lastIndexOf(`/${localizedTL}`)
      if (!!i) {
        name = fullName.substring(0, i)
        techLevel = fullName.substring(i + 3)
      }
    }
    if (!name) {
      name = fullName
    }
    return { name, techLevel }
  }

  /**
   * @param {{ [x: string]: any; bodyplan: Record<string, any>; }} json
   */
  async importProtectionFromGCA(json) {
    if (!json) return
    let t = this.textFrom
    let data = this.actor.system
    if (!!data.additionalresources.ignoreinputbodyplan) return

    /** @type {HitLocations.HitLocation[]}  */
    let locations = []
    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let j = json[key]
        let hl = new HitLocations.HitLocation(t(j.location))
        let i = t(j.dr)
        if (i.match(/^\d+ *(\+ *\d+ *)?$/)) i = eval(t(j.dr)) // supports "0 + 8"
        hl.import = !i ? 0 : i
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
      hl.import = '0'
      locations.push(hl)
    }

    // Hit Locations MUST come from an existing bodyplan hit location table, or else ADD (and
    // potentially other features) will not work. Sometime in the future, we will look at
    // user-entered hit locations.
    let bodyplan = t(json.bodyplan)?.toLowerCase() // Was a body plan actually in the import?
    if (bodyplan === 'snakemen') bodyplan = 'snakeman'
    let table = HitLocations.hitlocationDictionary[bodyplan] // If so, try to use it.

    /** @type {HitLocations.HitLocation[]}  */
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
    /** @type {HitLocations.HitLocation[]}  */
    let temp = []
    Object.keys(table).forEach(key => {
      let results = Object.values(locations).filter(loc => loc.where === key)
      if (results.length > 0) {
        if (results.length > 1) {
          // If multiple locs have same where, concat the DRs.   Leg 7 & Leg 8 both map to "Leg 7-8"
          let d = ''

          /** @type {string | null} */
          let last = null
          results.forEach(r => {
            if (r.import != last) {
              d += '|' + r.import
              last = r.import
            }
          })

          if (!!d) d = d.substring(1)
          results[0].import = d
        }
        temp.push(results[0])
        locations = locations.filter(it => it.where !== key)
      } else {
        // Didn't find loc that should be in the table. Make a default entry
        temp.push(new HitLocations.HitLocation(key, '0', table[key].penalty, table[key].roll))
      }
    })
    locations.forEach(it => temp.push(it))

    let prot = {}
    let index = 0
    temp.forEach(it => GURPS.put(prot, it, index++))

    let saveprot = true
    if (!!data.lastImport && !!data.additionalresources.bodyplan && bodyplan != data.additionalresources.bodyplan) {
      let option = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_BODYPLAN)
      if (option == 1) {
        saveprot = false
      }
      if (option == 2) {
        saveprot = await new Promise((resolve, _reject) => {
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
        'system.-=hitlocations': null,
        'system.hitlocations': prot,
        'system.additionalresources.bodyplan': bodyplan,
      }
    else return {}
  }

  importLangFromGCA(json) {
    if (!json) return
    let langs = {}
    let index = 0
    let t = this.textFrom
    for (let key in json) {
      if (key.startsWith('id-')) {
        let j = json[key]
        let n = t(j.name)
        let s = t(j.spoken)
        let w = t(j.written)
        let p = t(j.points)
        let l = new Language(n, s, w, p)
        GURPS.put(langs, l, index++)
      }
    }
    return {
      'system.-=languages': null,
      'system.languages': langs,
    }
  }

  /**
   * @param {{ [key: string]: any }} json
   */
  importReactionsFromGCA(json, vernum) {
    if (!json) return
    let text = this.textFrom(json)
    let a = vernum <= 9 ? text.split(',') : text.split('|')
    let rs = {}
    let index = 0
    a.forEach((/** @type {string} */ m) => {
      if (!!m) {
        let t = m.trim()
        let i = t.indexOf(' ')
        let mod = t.substring(0, i)
        let sit = t.substring(i + 1)
        let r = new Reaction(mod, sit)
        GURPS.put(rs, r, index++)
      }
    })
    return {
      'system.-=reactions': null,
      'system.reactions': rs,
    }
  }

  /**
   * @param {{ [x: string]: Record<string, any>; }} json
   */
  importEncumbranceFromGCA(json) {
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
      GURPS.put(es, e, index++)
    }
    return {
      'system.currentmove': cm,
      'system.currentdodge': cd,
      'system.-=encumbrance': null,
      'system.encumbrance': es,
    }
  }

  /**
   * @param {{ attributes: Record<string, any>; ads: Record<string, any>; disads: Record<string, any>; quirks: Record<string, any>; skills: Record<string, any>; spells: Record<string, any>; unspentpoints: Record<string, any>; totalpoints: Record<string, any>; race: Record<string, any>; }} json
   */
  importPointTotalsFromGCA(json) {
    if (!json) return

    let i = this.intFrom
    return {
      'system.totalpoints.attributes': i(json.attributes),
      'system.totalpoints.ads': i(json.ads),
      'system.totalpoints.disads': i(json.disads),
      'system.totalpoints.quirks': i(json.quirks),
      'system.totalpoints.skills': i(json.skills),
      'system.totalpoints.spells': i(json.spells),
      'system.totalpoints.unspent': i(json.unspentpoints),
      'system.totalpoints.total': i(json.totalpoints),
      'system.totalpoints.race': i(json.race),
    }
  }

  /**
   *
   * @param {{ [key: string]: any}} json
   */
  async importAttributesFromGCS(atts, eqp, calc) {
    if (!atts) return
    let data = this.actor.system
    let att = data.attributes
    if (!att.QN) {
      // upgrade older actors to include Q
      att.QN = {}
      data.QP = {}
    }

    att.ST.import = atts.find(e => e.attr_id === 'st')?.calc?.value || 0
    att.ST.points = atts.find(e => e.attr_id === 'st')?.calc?.points || 0
    att.DX.import = atts.find(e => e.attr_id === 'dx')?.calc?.value || 0
    att.DX.points = atts.find(e => e.attr_id === 'dx')?.calc?.points || 0
    att.IQ.import = atts.find(e => e.attr_id === 'iq')?.calc?.value || 0
    att.IQ.points = atts.find(e => e.attr_id === 'iq')?.calc?.points || 0
    att.HT.import = atts.find(e => e.attr_id === 'ht')?.calc?.value || 0
    att.HT.points = atts.find(e => e.attr_id === 'ht')?.calc?.points || 0
    att.WILL.import = atts.find(e => e.attr_id === 'will')?.calc?.value || 0
    att.WILL.points = atts.find(e => e.attr_id === 'will')?.calc?.points || 0
    att.PER.import = atts.find(e => e.attr_id === 'per')?.calc?.value || 0
    att.PER.points = atts.find(e => e.attr_id === 'per')?.calc?.points || 0
    att.QN.import = atts.find(e => e.attr_id === 'qn')?.calc?.value || 0
    att.QN.points = atts.find(e => e.attr_id === 'qn')?.calc?.points || 0

    data.HP.max = atts.find(e => e.attr_id === 'hp')?.calc?.value || 0
    data.HP.points = atts.find(e => e.attr_id === 'hp')?.calc?.points || 0
    data.FP.max = atts.find(e => e.attr_id === 'fp')?.calc?.value || 0
    data.FP.points = atts.find(e => e.attr_id === 'fp')?.calc?.points || 0
    data.QP.max = atts.find(e => e.attr_id === 'qp')?.calc?.value || 0
    data.QP.points = atts.find(e => e.attr_id === 'qp')?.calc?.points || 0
    let hp = atts.find(e => e.attr_id === 'hp')?.calc?.current || 0
    let fp = atts.find(e => e.attr_id === 'fp')?.calc?.current || 0
    let qp = atts.find(e => e.attr_id === 'qp')?.calc?.current || 0

    let saveCurrent = false

    if (!!data.lastImport && (data.HP.value != hp || data.FP.value != fp)) {
      let option = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_HP_FP)
      if (option == 0) {
        saveCurrent = true
      }
      if (option == 2) {
        saveCurrent = await new Promise((resolve, _reject) => {
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
    data.QP.value = qp

    let bl_value = parseDecimalNumber(calc?.basic_lift.match(/[\d,\.]+/g)[0])
    let bl_unit = calc?.basic_lift.replace(bl_value + ' ', '')

    let lm = {}
    lm.basiclift = (bl_value * 1).toString() + ' ' + bl_unit
    lm.carryonback = (bl_value * 15).toString() + ' ' + bl_unit
    lm.onehandedlift = (bl_value * 2).toString() + ' ' + bl_unit
    lm.runningshove = (bl_value * 24).toString() + ' ' + bl_unit
    lm.shiftslightly = (bl_value * 50).toString() + ' ' + bl_unit
    lm.shove = (bl_value * 12).toString() + ' ' + bl_unit
    lm.twohandedlift = (bl_value * 8).toString() + ' ' + bl_unit

    let bm = atts.find(e => e.attr_id === 'basic_move')?.calc?.value || 0
    data.basicmove.value = bm.toString()
    data.basicmove.points = atts.find(e => e.attr_id === 'basic_move')?.calc?.points || 0
    let bs = atts.find(e => e.attr_id === 'basic_speed')?.calc?.value || 0
    data.basicspeed.value = bs.toString()
    data.basicspeed.points = atts.find(e => e.attr_id === 'basic_speed')?.calc?.points || 0

    data.thrust = calc?.thrust
    data.swing = calc?.swing
    data.currentmove = data.basicmove.value
    data.frightcheck = atts.find(e => e.attr_id === 'fright_check')?.calc?.value || 0

    data.hearing = atts.find(e => e.attr_id === 'hearing')?.calc?.value || 0
    data.tastesmell = atts.find(e => e.attr_id === 'taste_smell')?.calc?.value || 0
    data.touch = atts.find(e => e.attr_id === 'touch')?.calc?.value || 0
    data.vision = atts.find(e => e.attr_id === 'vision')?.calc?.value || 0

    let cm = 0
    let cd = 0
    let es = {}
    let ew = [1, 2, 3, 6, 10]
    let index = 0
    let total_carried = this.calcTotalCarried(eqp)
    for (let i = 0; i <= 4; i++) {
      let e = new Encumbrance()
      e.level = i
      e.current = false
      e.key = 'enc' + i
      let weight_value = bl_value * ew[i]
      // e.current = total_carried <= weight_value && (i == 4 || total_carried < bl_value*ew[i+1]);
      e.current =
        (total_carried < weight_value || i == 4 || bl_value == 0) && (i == 0 || total_carried > bl_value * ew[i - 1])
      e.weight = weight_value.toString() + ' ' + bl_unit
      e.move = calc?.move[i].toString()
      e.dodge = calc?.dodge[i]
      if (e.current) {
        cm = e.move
        cd = e.dodge
      }
      GURPS.put(es, e, index++)
    }

    return {
      'system.attributes': att,
      'system.HP': data.HP,
      'system.FP': data.FP,
      'system.basiclift': data.basiclift,
      'system.basicmove': data.basicmove,
      'system.basicspeed': data.basicspeed,
      'system.thrust': data.thrust,
      'system.swing': data.swing,
      'system.frightcheck': data.frightcheck,
      'system.hearing': data.hearing,
      'system.tastesmell': data.tastesmell,
      'system.touch': data.touch,
      'system.vision': data.vision,
      'system.liftingmoving': lm,
      'system.currentmove': cm,
      'system.currentdodge': cd,
      'system.encumbrance': es,
      'system.QP': data.QP,
    }
  }

  async importTraitsFromGCS(p, cd, md) {
    if (!p) return
    let ts = {}
    ts.race = ''
    ts.height = p.height || ''
    ts.weight = p.weight || ''
    ts.age = p.age || ''
    ts.title = p.title || ''
    ts.player = p.player_name || ''
    ts.createdon =
      new Date(cd).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }).replace(' at', ',') || ''
    ts.modifiedon =
      new Date(md).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }).replace(' at', ',') || ''
    // ts.modifiedon = md || ''
    ts.religion = p.religion || ''
    ts.birthday = p.birthday || ''
    ts.hand = p.handedness || ''
    ts.techlevel = p.tech_level || ''
    ts.gender = p.gender || ''
    ts.eyes = p.eyes || ''
    ts.hair = p.hair || ''
    ts.skin = p.skin || ''
    ts.sizemod = p.SM || '+0'

    const r = {
      'system.-=traits': null,
      'system.traits': ts,
    }

    if (p.portrait) {
      if (game.user.hasPermission('FILES_UPLOAD')) {
        r.img = `data:image/png;base64,${p.portrait}.png`
      } else {
        await ui.notifications.error(
          'You do not have "FILES_UPLOAD" permission, portrait upload has failed. Please ask your GM to import your character, or acquire the correct permissions.'
        )
      }
    }

    return r
  }

  async importAdsFromGCS(ads) {
    let temp = []
    if (!!ads) await this._preImport('GCS', 'feature')
    for (let i of ads) {
      temp = temp.concat(await this.importAd(i, ''))
    }

    // Find all adds with globalId
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      await aRecurselist(this.actor.system.ads, async t => {
        if (!!t.itemid) {
          const i = this.actor.items.get(t.itemid)
          if (!!i?.system.globalid) {
            if (!(t instanceof Advantage)) t = Advantage.fromObject(t, this.actor)
            t = await this._processItemFrom(t, 'GCS')
            temp.push(t)
          }
        }
      })
    }

    return {
      'system.-=ads': null,
      'system.ads': this.foldList(temp),
    }
  }

  async importAd(i, p) {
    let a = new Advantage()
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('t') ? 'trait' : 'trait_container'
    }
    a.name = i.name + (i.levels ? ' ' + i.levels.toString() : '') || 'Trait'
    a.originalName = i.name
    a.points = i.calc?.points
    a.notes = i.calc?.resolved_notes ?? i.notes ?? ''
    a.userdesc = i.userdesc

    if (i.cr != null) {
      a.notes = '[' + game.i18n.localize('GURPS.CR' + i.cr.toString()) + ': ' + a.name + ']'
    }
    if (i.modifiers?.length) {
      for (let j of i.modifiers)
        if (!j.disabled) a.notes += `${!!a.notes ? '; ' : ''}${j.name}${!!j.notes ? ' (' + j.notes + ')' : ''}`
    }
    // Not certain if this is needed, or is it a type-o (note vs. notes)
    if (!!a.note) a.notes += (!!a.notes ? '\n' : '') + a.note

    if (!!a.userdesc) a.notes += (!!a.notes ? '\n' : '') + a.userdesc
    a.pageRef(i.reference)
    a.uuid = i.id
    a.parentuuid = p
    a = this._substituteItemReplacements(a, i)

    let old = this._findElementIn('ads', a.uuid)
    this._migrateOtfsAndNotes(old, a, i.vtt_notes)
    a = await this._processItemFrom(a, 'GCS')

    let ch = []
    if (i.children?.length) {
      for (let j of i.children) ch = ch.concat(await this.importAd(j, i.id))
    }
    return [a].concat(ch)
  }

  async importSkillsFromGCS(sks) {
    await this._preImport('GCS', 'skill')
    if (!sks) return
    let temp = []
    for (let i of sks) {
      temp = temp.concat(await this.importSk(i, ''))
    }

    // Find all skills with globalId
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      await aRecurselist(this.actor.system.skills, async t => {
        if (!!t.itemid) {
          const i = this.actor.items.get(t.itemid)
          if (!!i?.system.globalid) {
            if (!(t instanceof Skill)) t = Skill.fromObject(t, this.actor)
            t = await this._processItemFrom(t, 'GCS')
            temp.push(t)
          }
        }
      })
    }

    return {
      'system.-=skills': null,
      'system.skills': this.foldList(temp),
    }
  }

  async importSk(i, p) {
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('q') ? 'technique' : i.id.startsWith('s') ? 'skill' : 'skill_container'
    }
    let name =
      i.name + (!!i.tech_level ? `/TL${i.tech_level}` : '') + (!!i.specialization ? ` (${i.specialization})` : '') ||
      'Skill'
    if (i.type == 'technique' && !!i.default) {
      let addition = ''
      addition = ' (' + i.default.name
      if (!!i.default.specialization) {
        addition += ' (' + i.default.specialization + ')'
      }
      name += addition + ')'
    }
    let s = new Skill(name, '')
    s.originalName = name
    s.pageRef(i.reference || '')
    s.uuid = i.id
    s.parentuuid = p
    if (['skill', 'technique'].includes(i.type)) {
      s.type = i.type.toUpperCase()
      s.import = !!i.calc ? i.calc.level : ''
      if (s.level == 0) s.level = ''
      s.points = i.points
      s.relativelevel = i.calc?.rsl
      s.notes = i.calc?.resolved_notes ?? i.notes ?? ''
    } else {
      // Usually containers
      s.level = ''
    }
    s = this._substituteItemReplacements(s, i)
    let old = this._findElementIn('skills', s.uuid)
    this._migrateOtfsAndNotes(old, s, i.vtt_notes)
    s = await this._processItemFrom(s, 'GCS')

    let ch = []
    if (i.children?.length) {
      for (let j of i.children) ch = ch.concat(await this.importSk(j, i.id))
    }
    return [s].concat(ch)
  }

  async importSpellsFromGCS(sps) {
    await this._preImport('GCS', 'spell')
    if (!sps) return
    let temp = []
    for (let i of sps) {
      temp = temp.concat(await this.importSp(i, ''))
    }

    // Find all spells with globalId
    await aRecurselist(this.actor.system.spells, async t => {
      if (!!t.itemid) {
        const i = this.actor.items.get(t.itemid)
        if (!!i?.system.globalid) {
          if (!(t instanceof Spell)) t = Spell.fromObject(t, this.actor)
          t = await this._processItemFrom(t, 'GCS')
          temp.push(t)
        }
      }
    })

    return {
      'system.-=spells': null,
      'system.spells': this.foldList(temp),
    }
  }

  async importSp(i, p) {
    let s = new Spell()
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('r') ? 'ritual_magic_spell' : i.id.startsWith('p') ? 'spell' : 'spell_container'
    }
    s.name = i.name || 'Spell'
    s.originalName = i.name
    s.uuid = i.id
    s.parentuuid = p
    s.pageRef(i.reference || '')
    if (['spell', 'ritual_magic_spell'].includes(i.type)) {
      s.class = i.spell_class || ''
      s.college = i.college || ''
      s.cost = i.casting_cost || ''
      s.maintain = i.maintenance_cost || ''
      s.difficulty = i.difficulty.toUpperCase()
      s.relativelevel = i.calc?.rsl
      s.notes = i.calc?.resolved_notes ?? i.notes ?? ''
      s.duration = i.duration || ''
      s.points = i.points || ''
      s.casttime = i.casting_time || ''
      s.import = i.calc?.level || 0
    }

    s = this._substituteItemReplacements(s, i)
    let old = this._findElementIn('spells', s.uuid)
    this._migrateOtfsAndNotes(old, s, i.vtt_notes)
    s = await this._processItemFrom(s, 'GCS')

    let ch = []
    if (i.children?.length) {
      for (let j of i.children) ch = ch.concat(await this.importSp(j, i.id))
    }
    return [s].concat(ch)
  }

  async importEquipmentFromGCS(eq, oeq) {
    this.ignoreRender = true
    await this._preImport('GCS', 'equipment')
    if (!eq && !oeq) return
    let temp = []
    if (!!eq)
      for (let i of eq) {
        temp = temp.concat(await this.importEq(i, '', true))
      }
    if (!!oeq)
      for (let i of oeq) {
        temp = temp.concat(await this.importEq(i, '', false))
      }

    await aRecurselist(this.actor.system.equipment?.carried, async t => {
      t.carried = true
      if (!!t.save) {
        if (!(t instanceof Equipment)) t = Equipment.fromObject(t, this.actor)
        t = await this._processItemFrom(t, 'GCS')
        temp.push(t)
      }
    })
    await aRecurselist(this.actor.system.equipment?.other, async t => {
      t.carried = false
      if (!!t.save) {
        if (!(t instanceof Equipment)) t = Equipment.fromObject(t, this.actor)
        t = await this._processItemFrom(t, 'GCS')
        temp.push(t)
      }
    })

    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      // After retrieve all relevant data
      // Lets remove equipments now
      await this.actor.internalUpdate({
        'system.equipment.-=carried': null,
        'system.equipment.-=other': null,
      })
    }

    temp.forEach(e => {
      e.contains = {}
      e.collapsed = {}
    })

    for (const e of temp) {
      if (!!e.parentuuid) {
        let parent = null
        parent = temp.find(f => f.uuid === e.parentuuid)
        if (!!parent) GURPS.put(parent.contains, e)
        else e.parentuuid = ''
      }
      await this._updateItemContains(e, parent)
    }

    let equipment = {
      carried: {},
      other: {},
    }
    let cindex = 0
    let oindex = 0

    for (const eqt of temp) {
      await Equipment.calc(eqt)
      if (!eqt.parentuuid) {
        if (eqt.carried) GURPS.put(equipment.carried, eqt, cindex++)
        else GURPS.put(equipment.other, eqt, oindex++)
      }
    }
    return {
      'system.-=equipment': null,
      'system.equipment': equipment,
    }
  }

  async importEq(i, p, carried) {
    let e = new Equipment()
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('e') ? 'equipment' : 'equipment_container'
    }
    e.name = i.description || 'Equipment'
    e.originalName = i.description
    e.count = i.type == 'equipment_container' ? '1' : i.quantity || '0'
    e.cost =
      (parseFloat(i.calc?.extended_value) / (i.type == 'equipment_container' ? 1 : i.quantity || 1)).toString() || ''
    e.carried = carried
    e.equipped = i.equipped
    e.techlevel = i.tech_level || ''
    e.legalityclass = i.legality_class || '4'
    e.categories = i.categories?.join(', ') || ''
    e.uses = i.uses || 0
    e.maxuses = i.max_uses || 0
    e.uuid = i.id
    e.parentuuid = p
    e.notes = ''
    e.notes = i.calc?.resolved_notes ?? i.notes ?? ''
    if (i.modifiers?.length) {
      for (let j of i.modifiers)
        if (!j.disabled) e.notes += `${!!e.notes ? '; ' : ''}${j.name}${!!j.notes ? ' (' + j.notes + ')' : ''}`
    }
    if (!!e.note) e.notes += (!!e.notes ? '\n' : '') + e.note
    e.weight =
      (parseFloat(i.calc?.extended_weight) / (i.type == 'equipment_container' ? 1 : i.quantity || 1)).toString() || '0'
    e.pageRef(i.reference || '')
    e = this._substituteItemReplacements(e, i)
    let old = this._findElementIn('equipment.carried', e.uuid)
    if (!old) old = this._findElementIn('equipment.other', e.uuid)
    this._migrateOtfsAndNotes(old, e, i.vtt_notes)
    if (!!old) {
      e.name = old.name
      e.carried = old.carried
      e.equipped = old.equipped
      e.parentuuid = old.parentuuid
      if (old.ignoreImportQty) {
        e.count = old.count
        e.uses = old.uses
        e.maxuses = old.maxuses
        e.ignoreImportQty = true
      }
    }
    // Process Item here
    e = await this._processItemFrom(e, 'GCS')
    let ch = []
    if (i.children?.length) {
      for (let j of i.children) ch = ch.concat(await this.importEq(j, i.id, carried))
      for (let j of ch) {
        e.cost -= j.cost * j.count
        e.weight -= j.weight * j.count
      }
    }
    return [e].concat(ch)
  }

  importNotesFromGCS(notes) {
    if (!notes) return
    let temp = []
    for (let i of notes) {
      temp = temp.concat(this.importNote(i, ''))
    }
    recurselist(this.actor.system.notes, t => {
      if (!!t.save) temp.push(t)
    })
    return {
      'system.-=notes': null,
      'system.notes': this.foldList(temp),
    }
  }

  importNote(i, p) {
    let n = new Note()
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('n') ? 'note' : 'note_container'
    }
    n.notes = i.calc?.resolved_text ?? i.text ?? ''
    n.uuid = i.id
    n.parentuuid = p
    n.pageRef(i.reference || '')
    n = this._substituteItemReplacements(n, i)
    let old = this._findElementIn('notes', n.uuid)
    this._migrateOtfsAndNotes(old, n)
    let ch = []
    if (i.children?.length) {
      for (let j of i.children) ch = ch.concat(this.importNote(j, i.id))
    }
    return [n].concat(ch)
  }

  importSizeFromGCS(commit, profile, ads, skills, equipment) {
    let ts = commit['system.traits']
    let final = profile.SM || 0
    let temp = [].concat(ads, skills, equipment)
    let all = []
    for (let i of temp) {
      all = all.concat(this.recursiveGet(i))
    }
    for (let i of all) {
      if (i.features?.length)
        for (let f of i.features) {
          if (f.type == 'attribute_bonus' && f.attribute == 'sm')
            final += f.amount * (!!i.levels ? parseFloat(i.levels) : 1)
        }
    }
    ts.sizemod = this.signedNum(final)
    return {
      'system.-=traits': null,
      'system.traits': ts,
    }
  }

  async importProtectionFromGCS(hls) {
    if (!hls) return
    let data = this.actor.system
    if (!!data.additionalresources.ignoreinputbodyplan) return

    /** @type {HitLocations.HitLocation[]} */
    let locations = []
    for (let i of hls.locations) {
      let l = new HitLocations.HitLocation(i.table_name)
      l.import = i.calc?.dr.all?.toString() || '0'
      for (let [key, value] of Object.entries(i.calc?.dr))
        if (key != 'all') {
          let damtype = GURPS.DamageTables.damageTypeMap[key]
          if (!l.split) l.split = {}
          l.split[damtype] = +l.import + value
        }
      l.penalty = i.hit_penalty?.toString() || '0'
      while (locations.filter(it => it.where == l.where).length > 0) {
        l.where = l.where + '*'
      }
      locations.push(l)
    }
    let vitals = locations.filter(value => value.where === HitLocations.HitLocation.VITALS)
    if (vitals.length === 0) {
      let hl = new HitLocations.HitLocation(HitLocations.HitLocation.VITALS)
      hl.penalty = HitLocations.hitlocationRolls[HitLocations.HitLocation.VITALS].penalty
      hl.roll = HitLocations.hitlocationRolls[HitLocations.HitLocation.VITALS].roll
      hl.import = '0'
      locations.push(hl)
    }
    // Hit Locations MUST come from an existing bodyplan hit location table, or else ADD (and
    // potentially other features) will not work. Sometime in the future, we will look at
    // user-entered hit locations.
    let bodyplan = hls.id // Was a body plan actually in the import?
    if (bodyplan === 'snakemen') bodyplan = 'snakeman'
    let table = HitLocations.hitlocationDictionary[bodyplan] // If so, try to use it.

    /** @type {HitLocations.HitLocation[]}  */
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
    /** @type {HitLocations.HitLocation[]}  */
    let temp = []
    Object.keys(table).forEach(key => {
      let results = Object.values(locations).filter(loc => loc.where === key)
      if (results.length > 0) {
        if (results.length > 1) {
          // If multiple locs have same where, concat the DRs.   Leg 7 & Leg 8 both map to "Leg 7-8"
          let d = ''

          /** @type {string | null} */
          let last = null
          results.forEach(r => {
            if (r.import != last) {
              d += '|' + r.import
              last = r.import
            }
          })

          if (!!d) d = d.substring(1)
          results[0].import = d
        }
        temp.push(results[0])
        locations = locations.filter(it => it.where !== key)
      } else {
        // Didn't find loc that should be in the table. Make a default entry
        temp.push(new HitLocations.HitLocation(key, '0', table[key].penalty, table[key].roll))
      }
    })
    locations.forEach(it => temp.push(it))

    let prot = {}
    let index = 0
    temp.forEach(it => GURPS.put(prot, it, index++))

    let saveprot = true
    if (!!data.lastImport && !!data.additionalresources.bodyplan && bodyplan != data.additionalresources.bodyplan) {
      let option = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_BODYPLAN)
      if (option == 1) {
        saveprot = false
      }
      if (option == 2) {
        saveprot = await new Promise((resolve, _reject) => {
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
    if (saveprot) {
      return {
        'system.-=hitlocations': null,
        'system.hitlocations': prot,
        'system.additionalresources.bodyplan': bodyplan,
      }
    } else return {}
  }

  importPointTotalsFromGCS(total, atts, ads, skills, spells) {
    if (!ads) ads = []
    if (!skills) skills = []
    if (!spells) spells = []
    let p_atts = 0
    let p_ads = 0
    let p_disads = 0
    let p_quirks = 0
    let p_skills = 0
    let p_spells = 0
    let p_unspent = total
    let p_total = total
    let p_race = 0
    for (let i of atts) p_atts += i.calc?.points
    for (let i of ads)
      [p_ads, p_disads, p_quirks, p_race] = this.adPointCount(i, p_ads, p_disads, p_quirks, p_race, true)
    for (let i of skills) p_skills = this.skPointCount(i, p_skills)
    for (let i of spells) p_spells = this.skPointCount(i, p_spells)
    p_unspent -= p_atts + p_ads + p_disads + p_quirks + p_skills + p_spells + p_race
    return {
      'system.totalpoints.attributes': p_atts,
      'system.totalpoints.ads': p_ads,
      'system.totalpoints.disads': p_disads,
      'system.totalpoints.quirks': p_quirks,
      'system.totalpoints.skills': p_skills,
      'system.totalpoints.spells': p_spells,
      'system.totalpoints.unspent': p_unspent,
      'system.totalpoints.total': p_total,
      'system.totalpoints.race': p_race,
    }
  }

  importReactionsFromGCS(ads, skills, equipment) {
    let rs = {}
    let cs = {}
    let index_r = 0
    let index_c = 0
    let temp = [].concat(ads, skills, equipment)
    let all = []
    for (let i of temp) {
      all = all.concat(this.recursiveGet(i))
    }
    let temp_r = []
    let temp_c = []
    for (let i of all) {
      if (i.features?.length)
        for (let f of i.features) {
          if (f.type == 'reaction_bonus') {
            temp_r.push({
              modifier: f.amount * (f.per_level && !!i.levels ? parseInt(i.levels) : 1),
              situation: f.situation,
            })
          } else if (f.type == 'conditional_modifier') {
            temp_c.push({
              modifier: f.amount * (f.per_level && !!i.levels ? parseInt(i.levels) : 1),
              situation: f.situation,
            })
          }
        }
    }
    let temp_r2 = []
    let temp_c2 = []
    for (let i of temp_r) {
      let existing_condition = temp_r2.find(e => e.situation == i.situation)
      if (!!existing_condition) existing_condition.modifier += i.modifier
      else temp_r2.push(i)
    }
    for (let i of temp_c) {
      let existing_condition = temp_c2.find(e => e.situation == i.situation)
      if (!!existing_condition) existing_condition.modifier += i.modifier
      else temp_c2.push(i)
    }
    for (let i of temp_r2) {
      let r = new Reaction()
      r.modifier = i.modifier.toString()
      r.situation = i.situation
      GURPS.put(rs, r, index_r++)
    }
    for (let i of temp_c2) {
      let c = new Modifier()
      c.modifier = i.modifier.toString()
      c.situation = i.situation
      GURPS.put(cs, c, index_c++)
    }
    return {
      'system.-=reactions': null,
      'system.reactions': rs,
      'system.-=conditionalmods': null,
      'system.conditionalmods': cs,
    }
  }

  importCombatFromGCS(ads, skills, spells, equipment) {
    let melee = {}
    let ranged = {}
    let m_index = 0
    let r_index = 0
    let temp = [].concat(ads, skills, spells, equipment)
    let all = []
    for (let i of temp) {
      all = all.concat(this.recursiveGet(i))
    }
    for (let i of all) {
      if (i.weapons?.length) {
        for (let w of i.weapons) {
          if (this.GCSVersion === 5) {
            w.type = w.id.startsWith('w') ? 'melee_weapon' : 'ranged_weapon'
          }
          if (w.type == 'melee_weapon') {
            let m = new Melee()
            m.name = i.name || i.description || ''
            m.originalName = i.name
            m.st = w.strength || ''
            m.weight = i.weight || ''
            m.techlevel = i.tech_level || ''
            m.cost = i.value || ''
            m.notes = i.notes || ''
            m.pageRef(i.reference || '')
            m.mode = w.usage || ''
            m.import = w.calc?.level?.toString() || '0'
            m.damage = w.calc?.damage || ''
            m.reach = w.reach || ''
            m.parry = w.calc?.parry || ''
            m.block = w.calc?.block || ''
            m = this._substituteItemReplacements(m, i)
            let old = this._findElementIn('melee', false, m.name, m.mode)
            this._migrateOtfsAndNotes(old, m, i.vtt_notes, w.usage_notes)

            GURPS.put(melee, m, m_index++)
          } else if (w.type == 'ranged_weapon') {
            let r = new Ranged()
            r.name = i.name || i.description || ''
            r.originalName = i.name
            r.st = w.strength || ''
            r.bulk = w.bulk || ''
            r.legalityclass = i.legality_class || '4'
            r.ammo = 0
            r.notes = i.notes || ''
            r.pageRef(i.reference || '')
            r.mode = w.usage || ''
            r.import = w.calc?.level || '0'
            r.damage = w.calc?.damage || ''
            r.acc = w.accuracy || ''
            let m = r.acc.trim().match(/(\d+)([+-]\d+)/)
            if (m) {
              r.acc = m[1]
              r.notes += ' [' + m[2] + ' ' + i18n('GURPS.acc') + ']'
            }
            r.rof = w.rate_of_fire || ''
            r.shots = w.shots || ''
            r.rcl = w.recoil || ''
            r.range = w.calc?.range || w.range || ''
            r = this._substituteItemReplacements(r, i)
            let old = this._findElementIn('ranged', false, r.name, r.mode)
            this._migrateOtfsAndNotes(old, r, i.vtt_notes, w.usage_notes)

            GURPS.put(ranged, r, r_index++)
          }
        }
      }
    }
    return {
      'system.-=melee': null,
      'system.melee': melee,
      'system.-=ranged': null,
      'system.ranged': ranged,
    }
  }

  // hack to get to private text element created by xml->json method.
  /**
   * @param {{ [key: string]: any }} o
   */
  textFrom(o) {
    if (!o) return ''
    let t = o['#text']
    if (!t) return ''
    return t.trim()
  }

  // similar hack to get text as integer.
  /**
   * @param {{ [key: string]: any }} o
   */
  intFrom(o) {
    if (!o) return 0
    let i = o['#text']
    if (!i) return 0
    return parseInt(i)
  }

  /**
   * @param {{[key: string] : any}} o
   */
  floatFrom(o) {
    if (!o) return 0
    let f = o['#text'].trim()
    if (!f) return 0
    return f.includes(',') ? parseDecimalNumber(f, { thousands: '.', decimal: ',' }) : parseDecimalNumber(f)
  }

  calcTotalCarried(eqp) {
    let t = 0
    if (!eqp) return t
    for (let i of eqp) {
      let w = 0
      w += parseFloat(i.weight || '0') * (i.type == 'equipment_container' ? 1 : i.quantity || 0)
      if (i.children?.length) w += this.calcTotalCarried(i.children)
      t += w
    }
    return t
  }

  recursiveGet(i) {
    if (!i) return []
    let ch = []
    if (i.children?.length) for (let j of i.children) ch = ch.concat(this.recursiveGet(j))
    if (i.modifiers?.length) for (let j of i.modifiers) ch = ch.concat(this.recursiveGet(j))
    if (!!i.disabled || (i.equipped != null && i.equipped == false)) return []
    return [i].concat(ch)
  }

  signedNum(x) {
    if (x >= 0) return `+${x}`
    else return x.toString()
  }

  /**
   * @param {string} list
   * @param {string|boolean} uuid
   */
  _findElementIn(list, uuid, name = '', mode = '') {
    var foundkey
    let foundLength = Number.MAX_VALUE
    let l = foundry.utils.getProperty(this.actor, 'system.' + list)
    recurselist(l, (e, k, _d) => {
      if (
        (uuid && e.uuid == uuid) ||
        (!!e.name && e.name.startsWith(name) && e.name.length < foundLength && e.mode == mode)
      ) {
        foundkey = k
        foundLength = !!e.name ? e.name.length : foundLength
      }
    })
    return foundkey == null ? foundkey : foundry.utils.getProperty(this.actor, 'system.' + list + '.' + foundkey)
  }

  adPointCount(i, ads, disads, quirks, race, toplevel = false) {
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('t') ? 'trait' : 'trait_container'
    }
    if (i.type == 'trait_container' && i.container_type == 'race') race += i.calc?.points
    else if (i.type == 'trait_container' && i.container_type == 'alternative_abilities') ads += i.calc?.points
    else if (i.type == 'trait_container' && !!i.children?.length) {
      var [a, d] = [0, 0]
      for (let j of i.children) [a, d, quirks, race] = this.adPointCount(j, a, d, quirks, race)
      if (toplevel) {
        if (a > 0) ads += a
        else disads += a
        disads += d
      } else ads += a + d
    } else if (i.calc?.points == -1) quirks += i.calc?.points
    else if (i.calc?.points > 0) ads += i.calc?.points
    else disads += i.calc?.points
    return [ads, disads, quirks, race]
  }

  skPointCount(i, skills) {
    if (this.GCSVersion === 5) {
      if (i.id.startsWith('q')) i.type = 'technique'
      if (i.id.startsWith('s')) i.type = 'skill'
      if (i.id.startsWith('S')) i.type = 'skill_container'
      if (i.id.startsWith('r')) i.type = 'ritual_magic_spell'
      if (i.id.startsWith('p')) i.type = 'spell'
      if (i.id.startsWith('P')) i.type = 'spell_container'
    }
    if (i.type == ('skill_container' || 'spell_container') && i.children?.length)
      for (let j of i.children) skills = this.skPointCount(j, skills)
    else skills += i.points
    return skills
  }

  /**
   * Copy old OTFs to the new object, and update the displayable notes
   * @param {Skill|Spell|Ranged|Melee} oldobj
   * @param {Skill|Spell|Ranged|Melee} newobj
   */
  _migrateOtfsAndNotes(oldobj = {}, newobj, importvttnotes = '', usagenotes = '') {
    if (!!importvttnotes) newobj.notes += (!!newobj.notes ? ' ' : '') + importvttnotes
    if (!!usagenotes) newobj.notes += (!!newobj.notes ? ' ' : '') + usagenotes
    this._updateOtf('check', oldobj, newobj)
    this._updateOtf('during', oldobj, newobj)
    this._updateOtf('pass', oldobj, newobj)
    this._updateOtf('fail', oldobj, newobj)
    if (oldobj.notes?.startsWith(newobj.notes))
      // Must be done AFTER OTFs have been stripped out
      newobj.notes = oldobj.notes
    if (oldobj.name?.startsWith(newobj.name)) newobj.name = oldobj.name
    // If notes have `\n  ` fix it
    newobj.notes = newobj.notes.replace(/\n\s\s+/g, ' ')
  }

  /**
   *  Search for specific format OTF in the notes (and vttnotes).
   *  If we find it in the notes, remove it and replace the notes with the shorter version
   */
  _updateOtf(otfkey, oldobj, newobj) {
    let objkey = otfkey + 'otf'
    let oldotf = oldobj[objkey]
    newobj[objkey] = oldotf
    var notes, newotf
    ;[notes, newotf] = this._removeOtf(otfkey, newobj.notes || '')
    if (!!newotf) newobj[objkey] = newotf
    newobj.notes = notes.trim()
  }

  // Looking for OTFs in text.  ex:   c:[/qty -1] during:[/anim healing c]
  _removeOtf(key, text) {
    if (!text) return [text, null]
    let otf = null
    let found = true
    while (found) {
      found = false
      var start
      let patstart = text.toLowerCase().indexOf(key[0] + ':[')
      if (patstart < 0) {
        patstart = text.toLowerCase().indexOf(key + ':[')
        if (patstart < 0) return [text, otf]
        else start = patstart + key.length + 2
      } else start = patstart + 3
      let cnt = 1
      let i = start
      if (i >= text.length) return [text, otf]
      do {
        let ch = text[i++]
        if (ch == '[') cnt++
        if (ch == ']') cnt--
      } while (i < text.length && cnt > 0)
      if (cnt == 0) {
        found = true
        otf = text.substring(start, i - 1)
        let front = text.substring(0, patstart)
        let end = text.substr(i)
        if ((front == '' || front.endsWith(' ')) && end.startsWith(' ')) end = end.substring(1)
        text = front + end
      } else return [text, otf]
    }
    return [text, otf]
  }

  // Fold a flat array into a hierarchical target object
  /**
   * @param {any[]} flat
   */
  foldList(flat, target = {}) {
    flat.forEach(obj => {
      if (!!obj.parentuuid) {
        const parent = flat.find(o => o.uuid == obj.parentuuid)
        if (!!parent) {
          if (!parent.contains) parent.contains = {} // lazy init for older characters
          GURPS.put(parent.contains, obj)
        } else obj.parentuuid = '' // Can't find a parent, so put it in the top list.  should never happen with GCS
      }
    })
    let index = 0
    flat.forEach(obj => {
      if (!obj.parentuuid) GURPS.put(target, obj, index++)
    })
    return target
  }

  /**
   *
   * @param {Array<HitLocations.HitLocation>} locations
   */
  _getBodyPlan(locations) {
    // each key is a "body plan" name like "humanoid" or "quadruped"
    let tableNames = Object.keys(HitLocations.hitlocationDictionary)

    // create a map of tableName:count
    /** @type {Record<string, number>} */
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

  _substituteItemReplacements(item, importedItem) {
    if (importedItem.replacements) {
      for (const [replacementKey, replacementValue] of Object.entries(importedItem.replacements)) {
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string' && value.includes(`@${replacementKey}@`)) {
            item[key] = value.replaceAll(`@${replacementKey}@`, replacementValue)
          }
        }
      }
    }
    return item
  }

  async _processItemFrom(actorComp, fromProgram) {
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      // Sanity check
      if (
        !(actorComp instanceof Equipment) &&
        !(actorComp instanceof Advantage) &&
        !(actorComp instanceof Skill) &&
        !(actorComp instanceof Spell) &&
        !(actorComp instanceof Melee) &&
        !(actorComp instanceof Ranged)
      ) {
        throw new Error(
          'Invalid Actor Component. To process a Item it must be an Equipment, Skill, Spell, Ranged or Melee Attack or Advantage'
        )
      }
      // When Item does not have uuid (some cases in GCA) we need to check against the originalName too
      const existingItem = this.actor.items.find(
        i =>
          i.system.importid === actorComp.uuid ||
          (!!i.system[i.itemSysKey]?.originalName && i.system[i.itemSysKey].originalName === actorComp.originalName)
      )

      // Check if we need to update the Item
      if (!actorComp._itemNeedsUpdate(existingItem)) {
        actorComp.name = existingItem.name
        actorComp.itemid = existingItem._id
        actorComp.itemInfo = existingItem.getItemInfo()
        actorComp.uuid = existingItem.system[existingItem.itemSysKey].uuid
        return actorComp
      }

      // Create or Update item
      const itemData = actorComp.toItemData(this.actor, fromProgram)
      const [item] = !!existingItem
        ? await this.actor.updateEmbeddedDocuments('Item', [{ _id: existingItem._id, system: itemData.system }])
        : await this.actor.createEmbeddedDocuments('Item', [itemData])
      // Update Actor Component for new Items
      if (!!item) {
        actorComp.name = item.name
        actorComp.itemid = item._id
        actorComp.itemInfo = item.getItemInfo()
        actorComp.uuid = item.system[item.itemSysKey].uuid
      } else if (!!existingItem) {
        actorComp.name = existingItem.name
        actorComp.itemid = existingItem._id
        actorComp.itemInfo = existingItem.getItemInfo()
        actorComp.uuid = existingItem.system[existingItem.itemSysKey].uuid
      }
    }
    return actorComp
  }
  async _updateItemContains(actorComp, parent) {
    if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      const item = this.actor.items.get(actorComp.itemid)
      if (!!item) {
        if (!actorComp.parentuuid) {
          const itemSysContain = `system.${item.itemSysKey}.contains`
          await this.actor.updateEmbeddedDocuments('Item', [{ _id: item._id, [itemSysContain]: actorComp.contains }])
        }
      }
    }
  }
}
