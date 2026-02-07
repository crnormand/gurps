import { parseDecimalNumber } from '../../lib/parse-decimal-number/parse-decimal-number.js'
import { aRecurselist, arrayBuffertoBase64, recurselist, xmlTextToJson } from '../../lib/utilities.js'
import * as HitLocations from '../hitlocation/hitlocation.js'
import { ImportSettings } from '../importer/index.js'
import { SmartImporter } from '../smart-importer.js'
import { calculateEncumbranceLevels, readXmlText } from '../utilities/import-utilities.js'

import {
  Advantage,
  Encumbrance,
  Equipment,
  Language,
  Melee,
  Modifier,
  Note,
  Ranged,
  Reaction,
  Skill,
  Spell,
} from './actor-components.js'

// const GCA5Version = 'GCA5-14'
const GCAVersion = 'GCA-11'

export class ActorImporter {
  GCSVersion = 0
  json = {}

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
    if (ImportSettings.useSmartImporter) await this._openNonLocallyHostedImportDialog()
    else await this._openLocallyHostedImportDialog()
  }

  async _openNonLocallyHostedImportDialog() {
    try {
      const file = await SmartImporter.getFileForActor(this.actor)
      const res = await this.importActorFromExternalProgram(await file.text(), file.name, file.path)

      if (res) SmartImporter.setFileForActor(this.actor, file)
    } catch (error) {
      ui.notifications?.error(error)
      throw error
    }
  }

  async _openLocallyHostedImportDialog() {
    new foundry.applications.api.DialogV2({
      window: {
        title: game.i18n.format(`GURPS.importCharacterData`, { name: this.actor.name }),
      },
      position: {
        width: 400,
        height: 'auto',
      },
      content: await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/import-gcs-v1-data.hbs',
        SmartImporter.getTemplateOptions(this.actor)
      ),
      buttons: [
        {
          action: 'import',
          label: 'GURPS.import',
          icon: 'fas fa-file-import',
          default: true,
          callback: async (_, button, __) => {
            let files = button.form.elements.data.files

            if (!files.length) {
              return ui.notifications.error(game.i18n.localize('GURPS.noFile'))
            } else {
              const file = files[0]
              const text = await GURPS.readTextFromFile(file)

              await this.importActorFromExternalProgram(text, file.name, file.path)
            }
          },
        },
        {
          action: 'cancel',
          label: 'GURPS.cancel',
          icon: 'fas fa-times',
          callback: () => undefined, // Resolve with undefined if cancelled
        },
      ],
    }).render({ force: true })
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
    let text
    let msg = []
    let exit = false
    let loadingDialog
    let importResult = false

    try {
      text = JSON.parse(json)
      this.json = text
    } catch {
      msg.push(game.i18n.localize('GURPS.importNoJSONDetected'))
      exit = true
    }

    if (text) {
      if (!text.calc) {
        msg.push(game.i18n.localize('GURPS.importOldGCSFile'))
        exit = true
      }
    }

    this.GCSVersion = text.version

    if (msg.length > 0) {
      ui.notifications?.error(msg.join('<br>'))
      let content = await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/chat-import-actor-errors.hbs',
        {
          lines: msg,
          version: version,
          GCAVersion: GCAVersion,
          GCSVersion: this.GCSVersion,
          url: GURPS.USER_GUIDE_URL,
        }
      )

      ChatMessage.create({
        content: content,
        user: game.user.id,
        whisper: [game.user.id],
      })
      if (exit) return false
    }

    let nm = text['profile']['name']

    console.log("Importing '" + nm + "'")
    let starttime = performance.now()
    let commit = {}

    // if (this.isUsingFoundryItems() || this.actor.items.filter(i => !!i.system.importid).length > 10)
    loadingDialog = await this._showLoadingDialog({ name: nm, generator: 'GCS' })
    commit = { ...commit, ...{ 'system.lastImport': new Date().toString().split(' ').splice(1, 4).join(' ') } }
    let ar = this.actor.system.additionalresources || {}

    ar.importname = importname || ar.importname
    ar.importpath = importpath || ar.importpath

    try {
      commit = { ...commit, ...{ 'system.additionalresources': ar } }
      commit = { ...commit, ...(await this.importAttributesFromGCS(text.attributes, text.equipment, text.calc)) }
      commit = { ...commit, ...(await this.importTraitsFromGCS(text.profile, text.created_date, text.modified_date)) }
      commit = {
        ...commit,
        ...this.importSizeFromGCS(
          commit,
          text.profile,
          text.traits || text.advantages || [],
          text.skills,
          text.equipment
        ),
      }
      commit = { ...commit, ...(await this.importAdsFromGCS(text.traits || text.advantages || [])) }
      commit = { ...commit, ...(await this.importSkillsFromGCS(text.skills)) }
      commit = { ...commit, ...(await this.importSpellsFromGCS(text.spells)) }
      commit = { ...commit, ...(await this.importEquipmentFromGCS(text.equipment, text.other_equipment)) }
      commit = { ...commit, ...this.importNotesFromGCS(text.notes) }

      commit = {
        ...commit,
        ...(await this.importProtectionFromGCS(text.settings.body_type || text.settings.hit_locations)),
      }
      commit = {
        ...commit,
        ...this.importPointTotalsFromGCS(
          text.total_points,
          text.attributes,
          text.traits || text.advantages || [],
          text.skills,
          text.spells
        ),
      }
      commit = {
        ...commit,
        ...this.importReactionsFromGCS(text.traits || text.advantages || [], text.skills, text.equipment),
      }
      commit = {
        ...commit,
        ...this.importCombatFromGCS(text.traits || text.advantages || [], text.skills, text.spells, text.equipment),
      }
    } catch (err) {
      console.log(err.stack)
      msg.push(
        game.i18n.format('GURPS.importGenericError', {
          name: nm,
          error: err.name,
          message: err.message,
        })
      )
      let content = await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/chat-import-actor-errors.hbs',
        {
          lines: [msg],
          version: this.GC,
          GCAVersion: GCAVersion,
          GCSVersion: this.GCSVersion,
          url: GURPS.USER_GUIDE_URL,
        }
      )

      ui.notifications?.warn(msg)
      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }

      ChatMessage.create(chatData, {})
      // Do not return.
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
      if (ImportSettings.overwriteName) {
        await this.actor.update({ name: nm, 'prototypeToken.name': nm })
      }

      // For each saved item with global id, lets run their additions
      // if (this.isUsingFoundryItems()) {
      for (let key of ['ads', 'skills', 'spells']) {
        await aRecurselist(this.actor.system[key], async item => {
          if (item.itemid) {
            const i = this.actor.items.get(item.itemid)

            if (i.system.globalid) {
              await this.actor._addItemAdditions(i, '')
            }
          }
        })
      }

      // }
      // Recalculate DR
      await this.actor.refreshDR()

      if (!suppressMessage) ui.notifications?.info(game.i18n.format('GURPS.importSuccessful', { name: nm }))
      console.log(
        'Done importing (' +
          Math.round(performance.now() - starttime) +
          'ms.)  You can inspect the character data below:'
      )
      console.log(this)
      importResult = true
    } catch (err) {
      console.log(err.stack)
      let msg = [game.i18n.format('GURPS.importGenericError', { name: nm, error: err.name, message: err.message })]

      if (err.message == 'Maximum depth exceeded') msg.push(game.i18n.localize('GURPS.importTooManyContainers'))
      ui.notifications?.warn(msg.join('<br>'))
      let content = await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/chat-import-actor-errors.hbs',
        {
          lines: msg,
          version: 'GCS Direct',
          GCAVersion: GCAVersion,
          GCSVersion: this.GCSVersion,
          url: GURPS.USER_GUIDE_URL,
        }
      )

      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }

      ChatMessage.create(chatData, {})
    } finally {
      if (loadingDialog) await loadingDialog.close()
    }

    return importResult
  }

  async _showLoadingDialog(diagOps) {
    const { name, generator } = diagOps
    const dialog = new foundry.applications.api.DialogV2({
      window: { title: game.i18n.format('GURPS.importSheetHint', { name, generator }) },
      position: {
        width: 400,
        height: 'auto',
      },
      content: `<p>${game.i18n.format('GURPS.importSheetHint', { name, generator })}</p>`,
      buttons: [
        {
          action: 'cancel',
          label: 'Please wait...',
          icon: 'fa-solid fa-hourglass-start fa-spin',
        },
      ],
      form: { closeOnSubmit: false },
    }).render({ force: true })

    return dialog
  }

  async importActorFromGCA(source, importName, importPath, suppressMessage) {
    let character, ra // The character json, release attributes
    let isFoundryGCA = false
    let isFoundryGCA5 = false
    // need to remove <p> and replace </p> with newlines from "formatted text"
    let origx = GURPS.cleanUpP(source)
    let x = xmlTextToJson(origx)
    let text = x.root
    let msg = []
    let version = 'unknown'
    let vernum = 1
    let exit = false

    if (!text) {
      if (importName.endsWith('.gca5')) msg.push(game.i18n.localize('GURPS.importCannotImportGCADirectly'))
      if (importName.endsWith('.gca4')) msg.push(game.i18n.localize('GURPS.importCannotImportGCADirectly'))
      else if (!xml.startsWith('<?xml')) msg.push(game.i18n.localize('GURPS.importNoXMLDetected'))
      exit = true
    } else {
      // The character object starts here
      character = text.character

      if (!character) {
        msg.push(game.i18n.localize('GURPS.importNoCharacterFormat'))
        exit = true
      }

      let parsererror = text.parsererror

      if (parsererror) {
        msg.push(game.i18n.format('GURPS.importErrorParsingXML', { text: readXmlText(parsererror.div) }))
        exit = true
      }

      ra = text['@attributes']
      // Sorry for the horrible version checking... it sort of evolved organically
      isFoundryGCA = !!ra && ra.release == 'Foundry' && ra.version.startsWith('GCA')
      isFoundryGCA5 = !!ra && ra.release == 'Foundry' && ra.version.startsWith('GCA5')

      if (!(isFoundryGCA || isFoundryGCA5)) {
        msg.push(game.i18n.localize('GURPS.importFantasyGroundUnsupported'))
        exit = true
      }

      version = ra?.version || ''
      const ver = ra?.version ? ra.version.split('-') : []

      if (isFoundryGCA) {
        if (isFoundryGCA5) {
          if (ver[1]) vernum = parseInt(ver[1])

          if (vernum < 12) {
            msg.push(game.i18n.localize('GURPS.importGCA5ImprovedInventoryHandling'))
          }

          if (vernum < 13) {
            msg.push(game.i18n.localize('GURPS.importGCA5ImprovedBlock'))
          }
        } else {
          if (!ver[1]) {
            msg.push(game.i18n.localize('GURPS.importGCANoBodyPlan'))
          }

          if (ver[1]) vernum = parseInt(ver[1])

          if (vernum < 2) {
            msg.push(game.i18n.localize('GURPS.importGCANoInnateRangedAndParent'))
          }

          if (vernum < 3) {
            msg.push(game.i18n.localize('GURPS.importGCANoSanitizedEquipmentPageRefs')) // Equipment Page ref's sanitized
          }

          if (vernum < 4) {
            msg.push(game.i18n.localize('GURPS.importGCANoParent'))
          }

          if (vernum < 5) {
            msg.push(game.i18n.localize('GURPS.importGCANoSanitizeNotes'))
          }

          if (vernum < 6) {
            msg.push(game.i18n.localize('GURPS.importGCANoMeleeIfAlsoRanged'))
          }

          if (vernum < 7) {
            msg.push(game.i18n.localize('GURPS.importGCABadBlockForDB'))
          }

          if (vernum < 8) {
            msg.push(game.i18n.localize('GURPS.importGCANoHideFlag'))
          }

          if (vernum < 9) {
            msg.push(game.i18n.localize('GURPS.importGCAChildrenWeights'))
          }

          if (vernum < 10) {
            msg.push(game.i18n.localize('GURPS.importGCAAdvMods'))
          }

          if (vernum < 11) {
            msg.push(game.i18n.localize('GURPS.importGCAConditionalModifiers'))
          }
        }
      }
    }

    if (msg.length > 0) {
      ui.notifications?.error(msg.join('<br>'))
      let content = await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/chat-import-actor-errors.hbs',
        {
          lines: msg,
          version: version,
          GCAVersion: GCAVersion,
          GCSVersion: this.GCSVersion,
          url: GURPS.USER_GUIDE_URL,
        }
      )

      ChatMessage.create({
        content: content,
        user: game.user.id,
        whisper: [game.user.id],
      })
      if (exit) return false // Some errors cannot be forgiven ;-)
    }

    let nm = readXmlText(character.name)

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
      // if (this.isUsingFoundryItems() || this.actor.items.filter(i => !!i.system.importid).length > 10)
      loadingDialog = await this._showLoadingDialog({ name: nm, generator: 'GCA' })
      // This is going to get ugly, so break out various data into different methods
      commit = { ...commit, ...(await this.importAttributesFromGCA(character.attributes)) }
      commit = { ...commit, ...(await this.importSkillsFromGCA(character.abilities?.skilllist)) }
      commit = { ...commit, ...this.importTraitsfromGCA(character.traits) }
      commit = { ...commit, ...this.importCombatMeleeFromGCA(character.combat?.meleecombatlist) }
      commit = { ...commit, ...this.importCombatRangedFromGCA(character.combat?.rangedcombatlist) }
      commit = { ...commit, ...(await this.importSpellsFromGCA(character.abilities?.spelllist)) }
      commit = { ...commit, ...this.importLangFromGCA(character.traits?.languagelist) }
      commit = { ...commit, ...(await this.importAdsFromGCA(character.traits?.adslist, character.traits?.disadslist)) }
      commit = { ...commit, ...this.importReactionsFromGCA(character.traits?.reactionmodifiers, vernum) }
      commit = { ...commit, ...this.importEncumbranceFromGCA(character.encumbrance) }
      commit = { ...commit, ...this.importPointTotalsFromGCA(character.pointtotals) }
      commit = { ...commit, ...this.importNotesFromGCA(character.description, character.notelist) }
      commit = { ...commit, ...(await this.importEquipmentFromGCA(character.inventorylist)) }
      commit = { ...commit, ...(await this.importProtectionFromGCA(character.combat?.protectionlist)) }
    } catch {
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
      if (ImportSettings.overwriteName) {
        await this.actor.update({ name: nm, 'token.name': nm })
      }

      // For each saved item with global id, lets run their additions
      // if (this.isUsingFoundryItems()) {
      for (let key of ['ads', 'skills', 'spells']) {
        await aRecurselist(this.actor.system[key], async item => {
          if (item.itemid) {
            const i = this.actor.items.get(item.itemid)

            if (i.system.globalid) {
              await this.actor._addItemAdditions(i, '')
            }
          }
        })
      }

      // }
      // Recalculate DR
      await this.actor.refreshDR()

      if (!suppressMessage) ui.notifications?.info(game.i18n.format('GURPS.importSuccessful', { name: nm }))
      console.log(
        'Done importing (' +
          Math.round(performance.now() - starttime) +
          'ms.)  You can inspect the character data below:'
      )
      console.log(this)
      importResult = true
    } catch (err) {
      console.log(err.stack)
      let msg = [game.i18n.format('GURPS.importGenericError', { name: nm, error: err.name, message: err.message })]

      if (err.message == 'Maximum depth exceeded') msg.push(game.i18n.localize('GURPS.importTooManyContainers'))
      ui.notifications?.warn(msg.join('<br>')) // FIXME: Why suppressMessage is not available here?
      let content = await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/chat-import-actor-errors.hbs',
        {
          lines: msg,
          version: version,
          GCAVersion: GCAVersion,
          GCSVersion: this.GCSVersion,
          url: GURPS.USER_GUIDE_URL,
        }
      )

      let chatData = {
        user: game.user.id,
        content: content,
        whisper: [game.user.id],
      }

      ChatMessage.create(chatData, {})
    } finally {
      if (loadingDialog) await loadingDialog.close()
    }

    return importResult
  }

  // Import the <attributes> section of the GCS FG XML file.
  /**
   * @param {{ [key: string]: any }} json
   */
  async importAttributesFromGCA(json) {
    if (!json) return
    let data = this.actor.system
    let att = data.attributes

    // attribute.values will be calculated in calculateDerivedValues()
    att.ST.import = this.intFrom(json.strength)
    att.ST.points = this.intFrom(json.strength_points)
    att.DX.import = this.intFrom(json.dexterity)
    att.DX.points = this.intFrom(json.dexterity_points)
    att.IQ.import = this.intFrom(json.intelligence)
    att.IQ.points = this.intFrom(json.intelligence_points)
    att.HT.import = this.intFrom(json.health)
    att.HT.points = this.intFrom(json.health_points)
    att.WILL.import = this.intFrom(json.will)
    att.WILL.points = this.intFrom(json.will_points)
    att.PER.import = this.intFrom(json.perception)
    att.PER.points = this.intFrom(json.perception_points)

    data.HP.max = this.intFrom(json.hitpoints)
    data.HP.points = this.intFrom(json.hitpoints_points)
    data.FP.max = this.intFrom(json.fatiguepoints)
    data.FP.points = this.intFrom(json.fatiguepoints_points)
    let hp = this.intFrom(json.hps)
    let fp = this.intFrom(json.fps)

    let overwrite = await this.promptForSaveOrOverwrite(data, hp, fp)

    if (overwrite !== 'keep') {
      data.HP.value = hp
      data.FP.value = fp
    }

    let lm = {}

    lm.basiclift = this.textFrom(json.basiclift)
    lm.carryonback = this.textFrom(json.carryonback)
    lm.onehandedlift = this.textFrom(json.onehandedlift)
    lm.runningshove = this.textFrom(json.runningshove)
    lm.shiftslightly = this.textFrom(json.shiftslightly)
    lm.shove = this.textFrom(json.shove)
    lm.twohandedlift = this.textFrom(json.twohandedlift)

    data.basicmove.value = this.textFrom(json.basicmove)
    data.basicmove.points = this.intFrom(json.basicmove_points)
    data.basicspeed.value = this.floatFrom(json.basicspeed)

    data.basicspeed.points = this.intFrom(json.basicspeed_points)
    data.thrust = this.textFrom(json.thrust)
    data.swing = this.textFrom(json.swing)
    data.currentmove = this.textFrom(json.move)
    data.frightcheck = this.intFrom(json.frightcheck)

    data.hearing = this.intFrom(json.hearing)
    data.tastesmell = this.intFrom(json.tastesmell)
    data.touch = this.intFrom(json.touch)
    data.vision = this.intFrom(json.vision)

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
   *
   * @param {*} data
   * @param {number} hp
   * @param {number} fp
   * @returns Promise<"keep" | "overwrite">
   */
  async promptForSaveOrOverwrite(data, hp, fp) {
    let overwrite = ImportSettings.overwriteHpAndFp

    if (!!data.lastImport && (data.HP.value != hp || data.FP.value != fp)) {
      if (overwrite === 'ask') {
        overwrite = await foundry.applications.api.DialogV2.wait({
          window: { title: game.i18n.localize('GURPS.importer.promptHPandFP.title') },
          content: game.i18n.format('GURPS.importer.promptHPandFP.content', {
            currentHP: data.HP.value,
            currentFP: data.FP.value,
            hp: hp,
            fp: fp,
          }),
          modal: true,
          buttons: [
            {
              action: 'keep',
              label: game.i18n.localize('GURPS.dialog.keep'),
              icon: 'far fa-square',
              default: true,
            },
            {
              action: 'overwrite',
              label: game.i18n.localize('GURPS.dialog.overwrite'),
              icon: 'fas fa-edit',
            },
          ],
        })
      }
    }

    return overwrite
  }

  /**
   * @param {{ race: Record<string, any>; height: Record<string, any>; weight: Record<string, any>; age: Record<string, any>; title: Record<string, any>; player: Record<string, any>; createdon: Record<string, any>; modifiedon: Record<string, any>; religion: Record<string, any>; birthday: Record<string, any>; hand: Record<string, any>; sizemodifier: Record<string, any>; tl: Record<string, any>; appearance: Record<string, any>; }} json
   */
  importTraitsfromGCA(json) {
    if (!json) return
    let ts = {}

    ts.race = this.textFrom(json.race)
    ts.height = this.textFrom(json.height)
    ts.weight = this.textFrom(json.weight)
    ts.age = this.textFrom(json.age)
    ts.title = this.textFrom(json.title)
    ts.player = this.textFrom(json.player)
    ts.createdon = this.textFrom(json.createdon)
    ts.modifiedon = this.textFrom(json.modifiedon)
    ts.religion = this.textFrom(json.religion)
    ts.birthday = this.textFrom(json.birthday)
    ts.hand = this.textFrom(json.hand)
    ts.sizemod = this.textFrom(json.sizemodifier)
    ts.techlevel = this.textFrom(json.tl)
    // <appearance type="string">@GENDER, Eyes: @EYES, Hair: @HAIR, Skin: @SKIN</appearance>
    let appearance = this.textFrom(json.appearance)

    ts.appearance = appearance

    try {
      let eyesIndex = appearance.indexOf(', Eyes: ')

      if (eyesIndex >= 0) {
        ts.gender = appearance.substring(0, eyesIndex)
        let hairIndex = appearance.indexOf(', Hair: ')

        ts.eyes = appearance.substring(eyesIndex + 8, hairIndex)
        eyesIndex = appearance.indexOf(', Skin: ')
        ts.hair = appearance.substring(hairIndex + 8, eyesIndex)
        ts.skin = appearance.substr(eyesIndex + 8)
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
    await aRecurselist(this.actor.system.ads, async item => {
      if (item.itemid) {
        const i = this.actor.items.get(item.itemid)

        if (i?.system.globalid) {
          if (!(item instanceof Advantage)) item = Advantage.fromObject(item, this.actor)
          item = await this._processItemFrom(item, 'GCA')
          list.push(item)
        }
      }
    })

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

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let advantageJson = json[key]
        let adv = new Advantage()

        adv.name = this.textFrom(advantageJson.name)
        adv.originalName = this.textFrom(advantageJson.name)
        adv.points = this.intFrom(advantageJson.points)
        adv.setNotes(this.textFrom(advantageJson.text))
        adv.pageRef(this.textFrom(advantageJson.pageref) || adv.pageref)
        adv.uuid = this.textFrom(advantageJson.uuid)
        adv.parentuuid = this.textFrom(advantageJson.parentuuid)
        let old = this._findElementIn('ads', adv.uuid)

        this._migrateOtfsAndNotes(old, adv, this.textFrom(advantageJson.vtt_notes))
        adv = await this._processItemFrom(adv, 'GCA')
        datalist.push(adv)
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

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let skillJson = json[key]
        let sk = new Skill()

        sk.name = this.textFrom(skillJson.name)
        sk.originalName = this.textFrom(skillJson.name)
        sk.type = this.textFrom(skillJson.type)
        sk.import = this.textFrom(skillJson.level)
        if (sk.level == 0) sk.level = ''
        sk.points = this.intFrom(skillJson.points)
        sk.relativelevel = this.textFrom(skillJson.relativelevel)
        sk.setNotes(this.textFrom(skillJson.text))
        if (skillJson.pageref) sk.pageRef(this.textFrom(skillJson.pageref))
        sk.uuid = this.textFrom(skillJson.uuid)
        sk.parentuuid = this.textFrom(skillJson.parentuuid)
        let old = this._findElementIn('skills', sk.uuid)

        this._migrateOtfsAndNotes(old, sk, this.textFrom(skillJson.vtt_notes))
        sk = await this._processItemFrom(sk, 'GCA')
        temp.push(sk)
      }
    }

    // Find all skills with globalId
    // if (this.isUsingFoundryItems()) {
    await aRecurselist(this.actor.system.skills, async item => {
      if (item.itemid) {
        const i = this.actor.items.get(item.itemid)

        if (i?.system.globalid) {
          if (!(item instanceof Skill)) item = Skill.fromObject(item, this.actor)
          item = await this._processItemFrom(item, 'GCA')
          temp.push(item)
        }
      }
    })
    // }

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

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let spellJson = json[key]
        let sp = new Spell()

        sp.name = this.textFrom(spellJson.name)
        sp.originalName = this.textFrom(spellJson.name)
        sp.class = this.textFrom(spellJson.class)
        sp.college = this.textFrom(spellJson.college)
        let cm = this.textFrom(spellJson.costmaintain)
        let i = cm.indexOf('/')

        if (i >= 0) {
          sp.cost = cm.substring(0, i)
          sp.maintain = cm.substr(i + 1)
        } else {
          sp.cost = cm
        }

        sp.setNotes(this.textFrom(spellJson.text))
        sp.pageRef(this.textFrom(spellJson.pageref))
        sp.duration = this.textFrom(spellJson.duration)
        sp.points = this.textFrom(spellJson.points)
        sp.casttime = this.textFrom(spellJson.time)
        sp.import = this.textFrom(spellJson.level)
        sp.uuid = this.textFrom(spellJson.uuid)
        sp.parentuuid = this.textFrom(spellJson.parentuuid)
        let old = this._findElementIn('spells', sp.uuid)

        this._migrateOtfsAndNotes(old, sp, this.textFrom(spellJson.vtt_notes))
        sp = await this._processItemFrom(sp, 'GCA')
        temp.push(sp)
      }
    }

    // Find all spells with globalId
    // if (this.isUsingFoundryItems()) {
    await aRecurselist(this.actor.system.spells, async item => {
      if (item.itemid) {
        const i = this.actor.items.get(item.itemid)

        if (i?.system.globalid) {
          if (!(item instanceof Spell)) item = Spell.fromObject(item, this.actor)
          item = await this._processItemFrom(item, 'GCA')
          temp.push(item)
        }
      }
    })
    // }

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
    let melee = {}
    let index = 0

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let meleeJson = json[key]

        for (let meleeModeKey in meleeJson.meleemodelist) {
          if (meleeModeKey.startsWith('id-')) {
            let meleeModeJson = meleeJson.meleemodelist[meleeModeKey]
            let melee = new Melee()

            melee.name = readXmlText(meleeJson.name)
            melee.originalName = readXmlText(meleeJson.name)
            melee.st = readXmlText(meleeJson.st)
            melee.weight = readXmlText(meleeJson.weight)
            melee.techlevel = readXmlText(meleeJson.tl)
            melee.cost = readXmlText(meleeJson.cost)

            try {
              melee.setNotes(readXmlText(meleeJson.text))
            } catch {
              console.log(melee)
              console.log(readXmlText(meleeJson.text))
            }

            melee.mode = readXmlText(meleeModeJson.name)
            melee.import = readXmlText(meleeModeJson.level)
            melee.damage = buildDamageOutputGCA(meleeModeJson)
            melee.reach = readXmlText(meleeModeJson.reach)
            melee.parry = readXmlText(meleeModeJson.parry)
            melee.block = readXmlText(meleeModeJson.block)
            let old = this._findElementIn('melee', false, melee.name, melee.mode)

            this._migrateOtfsAndNotes(old, melee, readXmlText(meleeModeJson.vtt_notes))

            GURPS.put(melee, melee, index++)
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
    let ranged = {}
    let index = 0

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let rangedJson = json[key]

        for (let rangedModeKey in rangedJson.rangedmodelist) {
          if (rangedModeKey.startsWith('id-')) {
            let rangedModeJson = rangedJson.rangedmodelist[rangedModeKey]
            let ranged = new Ranged()

            ranged.name = readXmlText(rangedJson.name)
            ranged.originalName = readXmlText(rangedJson.name)
            ranged.st = readXmlText(rangedJson.st)
            ranged.bulk = readXmlText(rangedJson.bulk)
            ranged.legalityclass = readXmlText(rangedJson.lc)
            ranged.ammo = readXmlText(rangedJson.ammo)

            try {
              ranged.setNotes(readXmlText(rangedJson.text))
            } catch {
              console.log(ranged)
              console.log(readXmlText(rangedJson.text))
            }

            ranged.mode = readXmlText(rangedModeJson.name)
            ranged.import = readXmlText(rangedModeJson.level)
            ranged.damage = buildDamageOutputGCA(rangedModeJson)
            ranged.acc = readXmlText(rangedModeJson.acc)
            let match = ranged.acc.trim().match(/(\d+)([+-]\d+)/)

            if (match) {
              ranged.acc = match[1]
              ranged.notes += ' [' + match[2] + ' ' + game.i18n.localize('GURPS.acc') + ']'
            }

            ranged.rof = readXmlText(rangedModeJson.rof)
            ranged.shots = readXmlText(rangedModeJson.shots)
            ranged.rcl = readXmlText(rangedModeJson.rcl)
            let rng = readXmlText(rangedModeJson.range)

            ranged.range = rng
            let old = this._findElementIn('ranged', false, ranged.name, ranged.mode)

            this._migrateOtfsAndNotes(old, ranged, readXmlText(rangedModeJson.vtt_notes))

            GURPS.put(ranged, ranged, index++)
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
    let temp = []

    if (descjson) {
      // support for GCA description

      let note = new Note()

      note.notes = this.textFrom(descjson).replace(/\\r/g, '\n')
      note.imported = true
      temp.push(note)
    }

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let noteJson = json[key]
        let note = /** @type {Note & { imported: boolean, uuid: string, parentuuid: string }} */ (new Note())

        //note.setNotes(this.textFrom(j.text));
        note.notes = this.textFrom(noteJson.name)
        let txt = this.textFrom(noteJson.text)

        if (txt) note.notes = note.notes + '\n' + txt.replace(/\\r/g, '\n')
        note.uuid = this.textFrom(noteJson.uuid)
        note.parentuuid = this.textFrom(noteJson.parentuuid)
        note.pageref = this.textFrom(noteJson.pageref)
        let old = this._findElementIn('notes', note.uuid)

        this._migrateOtfsAndNotes(old, note)
        temp.push(note)
      }
    }

    // Save the old User Entered Notes.
    recurselist(this.actor.system.notes, item => {
      if (item.save) temp.push(item)
    })

    return {
      'system.-=notes': null,
      'system.notes': this.foldList(temp),
    }
  }

  /**
   * @param {{ [key: string]: any }} json
   */
  async importEquipmentFromGCA(json) {
    if (!json) return

    this.ignoreRender = true
    await this._preImport('GCA', 'equipment')

    /**
     * @type {Equipment[]}
     */
    let temp = []

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let equipmentJson = json[key]
        let { name, techLevel } = this.parseEquipmentNameAndTL(this.textFrom, equipmentJson)
        let parentuuid = this.textFrom(equipmentJson.parentuuid)
        let eqt = new Equipment()

        eqt.name = name
        eqt.originalName = this.textFrom(equipmentJson.name)
        eqt.count = this.intFrom(equipmentJson.count)
        eqt.originalCount = this.intFrom(equipmentJson.count)
        eqt.cost = parentuuid ? this.textFrom(equipmentJson.cost) : 0
        eqt.location = this.textFrom(equipmentJson.location)
        let cstatus = this.intFrom(equipmentJson.carried)

        eqt.carried = cstatus >= 1
        eqt.equipped = cstatus == 2
        eqt.techlevel = techLevel
        eqt.legalityclass = this.textFrom(equipmentJson.lc)
        eqt.categories = this.textFrom(equipmentJson.type)
        eqt.uses = this.textFrom(equipmentJson.uses)
        eqt.maxuses = this.textFrom(equipmentJson.maxuses)
        eqt.uuid = this.textFrom(equipmentJson.uuid)
        eqt.parentuuid = parentuuid
        eqt.setNotes(this.textFrom(equipmentJson.notes))

        // TODO determine if we need the parentuuid in order to import weight
        // eqt.weight = !!parentuuid ? this.textFrom(j.weightsum) : 0 // GCA sends calculated weight in 'weightsum'
        eqt.weight = this.textFrom(equipmentJson.weightsum) ?? 0

        eqt.pageRef(this.textFrom(equipmentJson.pageref))
        let old = this._findElementIn('equipment.carried', eqt.uuid)

        if (!old) old = this._findElementIn('equipment.other', eqt.uuid)
        this._migrateOtfsAndNotes(old, eqt)

        if (old) {
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
    await aRecurselist(this.actor.system.equipment?.carried, async item => {
      item.carried = true

      if (item.save) {
        if (!(item instanceof Equipment)) item = Equipment.fromObject(item, this.actor)
        item = await this._processItemFrom(item, 'GCA')
        temp.push(item)
      }
    }) // Ensure carried eqt stays in carried
    await aRecurselist(this.actor.system.equipment?.other, async item => {
      item.carried = false

      if (item.save) {
        if (!(item instanceof Equipment)) item = Equipment.fromObject(item, this.actor)
        item = await this._processItemFrom(item, 'GCA')
        temp.push(item)
      }
    })

    // if (this.isUsingFoundryItems()) {
    // After retrieve all relevant data
    // Lets remove equipments now
    await this.actor.internalUpdate({
      'system.equipment.-=carried': null,
      'system.equipment.-=other': null,
    })
    // }

    temp.forEach(eqt => {
      // Remove all entries from inside items because if they still exist, they will be added back in
      eqt.contains = {}
      eqt.collapsed = {}
    })

    // Put everything in it container (if found), otherwise at the top level
    for (const eqt of temp) {
      let parent = null

      if (eqt.parentuuid) {
        parent = temp.find(candidateEquipment => candidateEquipment.uuid === eqt.parentuuid)
        if (parent) GURPS.put(parent.contains, eqt)
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
  parseEquipmentNameAndTL(fn, equipmentJson) {
    let name
    let fullName = fn(equipmentJson.name)
    let techLevel = fn(equipmentJson.tl)
    const localizedTL = game.i18n.localize('GURPS.TL')
    let regex = new RegExp(`.+/[TL|${localizedTL}].+`)

    if (fullName.match(regex)) {
      let i = fullName.lastIndexOf('/TL') || fullName.lastIndexOf(`/${localizedTL}`)

      if (i) {
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
    let data = this.actor.system

    if (data.additionalresources.ignoreinputbodyplan) return

    /** @type {HitLocations.HitLocation[]}  */
    let locations = []

    for (let key in json) {
      if (key.startsWith('id-')) {
        // Allows us to skip over junk elements created by xml->json code, and only select the skills.
        let hitLocationJson = json[key]
        let hl = new HitLocations.HitLocation(this.textFrom(hitLocationJson.location))
        let i = this.textFrom(hitLocationJson.dr)

        if (i.match(/^\d+ *(\+ *\d+ *)?$/)) i = eval(this.textFrom(hitLocationJson.dr)) // supports "0 + 8"
        hl.import = !i ? 0 : i
        hl.penalty = this.textFrom(hitLocationJson.db)
        hl.setEquipment(this.textFrom(hitLocationJson.text))

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
    let bodyplan = this.textFrom(json.bodyplan)?.toLowerCase() // Was a body plan actually in the import?

    if (bodyplan === 'snakemen') bodyplan = 'snakeman'
    let table = HitLocations.hitlocationDictionary[bodyplan] // If so, try to use it.

    /** @type {HitLocations.HitLocation[]}  */
    let locs = []

    locations.forEach(location => {
      if (!!table && !!table[location.where]) {
        // if e.where already exists in table, don't map
        locs.push(location)
      } else {
        // map to new name(s) ... sometimes we map 'Legs' to ['Right Leg', 'Left Leg'], for example.
        location.locations(false).forEach(loc => locs.push(loc)) // Map to new names
      }
    })
    locations = locs

    if (!table) {
      locs = []
      locations.forEach(location => {
        location.locations(true).forEach(loc => locs.push(loc)) // Map to new names, but include original to help match against tables
      })
      bodyplan = this._getBodyPlan(locs)
      table = HitLocations.hitlocationDictionary[bodyplan]
    }
    // update location's roll and penalty based on the bodyplan

    if (table) {
      Object.values(locations).forEach(it => {
        let [lbl, entry] = HitLocations.HitLocation.findTableEntry(table, it.where)

        if (entry) {
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
          let dr = ''

          /** @type {string | null} */
          let last = null

          results.forEach(result => {
            if (result.import != last) {
              dr += '|' + result.import
              last = result.import
            }
          })

          if (dr) dr = dr.substring(1)
          results[0].import = dr
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

    let overwrite = ImportSettings.overwriteBodyPlan // "ask", "keep", "overwrite"

    if (data.lastImport) {
      if (!!data.additionalresources.bodyplan && bodyplan !== data.additionalresources.bodyplan) {
        if (overwrite === 'ask')
          overwrite = await this.askOverwriteBodyPlan(data.additionalresources.bodyplan, bodyplan)
      }

      // If we're not overwriting and we have an existing bodyplan, return the empty object.
      if (overwrite !== 'overwrite' && data.additionalresources.bodyplan) return {}
    }

    return {
      'system.-=hitlocations': null,
      'system.hitlocations': prot,
      'system.additionalresources.bodyplan': bodyplan,
    }
  }

  async askOverwriteBodyPlan(currentPlan, newPlan) {
    return await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize('GURPS.importer.promptBodyPlan.title') },
      content: game.i18n.format('GURPS.importer.promptBodyPlan.content', {
        currentBodyPlan: `${game.i18n.localize('GURPS.BODYPLAN' + currentPlan)}`,
        bodyplan: `${game.i18n.localize('GURPS.BODYPLAN' + newPlan)}`,
      }),
      modal: true,
      buttons: [
        {
          action: 'keep',
          label: game.i18n.localize('GURPS.dialog.keep'),
          icon: 'far fa-square',
          default: true,
        },
        {
          action: 'overwrite',
          label: game.i18n.localize('GURPS.dialog.overwrite'),
          icon: 'fas fa-edit',
        },
      ],
    })
  }

  importLangFromGCA(json) {
    if (!json) return
    let langs = {}
    let index = 0

    for (let key in json) {
      if (key.startsWith('id-')) {
        let data = json[key]
        let name = this.textFrom(data.name)
        let spoken = this.textFrom(data.spoken)
        let written = this.textFrom(data.written)
        let points = this.textFrom(data.points)
        let lang = new Language(name, spoken, written, points)

        GURPS.put(langs, lang, index++)
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
    let text = readXmlText(json)
    let mods = vernum <= 9 ? text.split(',') : text.split('|')
    let rs = {}
    let index = 0

    mods.forEach((/** @type {string} */ mod) => {
      if (mod) {
        let text = mod.trim()
        let i = text.indexOf(' ')
        let mod = text.substring(0, i)
        let sit = text.substring(i + 1)
        let reaction = new Reaction(mod, sit)

        GURPS.put(rs, reaction, index++)
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
    let encumbrances = {}
    let index = 0
    let cm = 0
    let cd = 0

    for (let i = 0; i < 5; i++) {
      let encumbrance = new Encumbrance()

      encumbrance.level = i
      let key = 'enc_' + i
      let text = this.textFrom(json[key])

      encumbrance.current = text === '1'
      key = 'enc' + i
      encumbrance.key = key
      let key2 = key + '_weight'

      encumbrance.weight = this.textFrom(json[key2])
      key2 = key + '_move'
      encumbrance.move = this.intFrom(json[key2])
      key2 = key + '_dodge'
      encumbrance.dodge = this.intFrom(json[key2])

      if (encumbrance.current) {
        cm = encumbrance.move
        cd = encumbrance.dodge
      }

      GURPS.put(encumbrances, encumbrance, index++)
    }

    return {
      'system.currentmove': cm,
      'system.currentdodge': cd,
      'system.-=encumbrance': null,
      'system.encumbrance': encumbrances,
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

    att.ST.import = atts.find(attribute => attribute.attr_id === 'st')?.calc?.value || 0
    att.ST.points = atts.find(attribute => attribute.attr_id === 'st')?.calc?.points || 0
    att.DX.import = atts.find(attribute => attribute.attr_id === 'dx')?.calc?.value || 0
    att.DX.points = atts.find(attribute => attribute.attr_id === 'dx')?.calc?.points || 0
    att.IQ.import = atts.find(attribute => attribute.attr_id === 'iq')?.calc?.value || 0
    att.IQ.points = atts.find(attribute => attribute.attr_id === 'iq')?.calc?.points || 0
    att.HT.import = atts.find(attribute => attribute.attr_id === 'ht')?.calc?.value || 0
    att.HT.points = atts.find(attribute => attribute.attr_id === 'ht')?.calc?.points || 0
    att.WILL.import = atts.find(attribute => attribute.attr_id === 'will')?.calc?.value || 0
    att.WILL.points = atts.find(attribute => attribute.attr_id === 'will')?.calc?.points || 0
    att.PER.import = atts.find(attribute => attribute.attr_id === 'per')?.calc?.value || 0
    att.PER.points = atts.find(attribute => attribute.attr_id === 'per')?.calc?.points || 0
    att.QN.import = atts.find(attribute => attribute.attr_id === 'qn')?.calc?.value || 0
    att.QN.points = atts.find(attribute => attribute.attr_id === 'qn')?.calc?.points || 0

    data.HP.max = atts.find(attribute => attribute.attr_id === 'hp')?.calc?.value || 0
    data.HP.points = atts.find(attribute => attribute.attr_id === 'hp')?.calc?.points || 0
    data.FP.max = atts.find(attribute => attribute.attr_id === 'fp')?.calc?.value || 0
    data.FP.points = atts.find(attribute => attribute.attr_id === 'fp')?.calc?.points || 0
    data.QP.max = atts.find(attribute => attribute.attr_id === 'qp')?.calc?.value || 0
    data.QP.points = atts.find(attribute => attribute.attr_id === 'qp')?.calc?.points || 0
    let hp = atts.find(attribute => attribute.attr_id === 'hp')?.calc?.current || 0
    let fp = atts.find(attribute => attribute.attr_id === 'fp')?.calc?.current || 0
    let qp = atts.find(attribute => attribute.attr_id === 'qp')?.calc?.current || 0

    let overwrite = await this.promptForSaveOrOverwrite(data, hp, fp)

    if (overwrite !== 'keep') {
      data.HP.value = hp
      data.FP.value = fp
    }

    data.QP.value = qp

    let bl_string = calc?.basic_lift.match(/[\d,.]+/g)[0]
    let bl_value = parseDecimalNumber(bl_string)
    let bl_unit = calc?.basic_lift.replace(bl_string + ' ', '')

    let lm = {}

    lm.basiclift = (bl_value * 1).toString() + ' ' + bl_unit
    lm.carryonback = (bl_value * 15).toString() + ' ' + bl_unit
    lm.onehandedlift = (bl_value * 2).toString() + ' ' + bl_unit
    lm.runningshove = (bl_value * 24).toString() + ' ' + bl_unit
    lm.shiftslightly = (bl_value * 50).toString() + ' ' + bl_unit
    lm.shove = (bl_value * 12).toString() + ' ' + bl_unit
    lm.twohandedlift = (bl_value * 8).toString() + ' ' + bl_unit

    let bm = atts.find(attribute => attribute.attr_id === 'basic_move')?.calc?.value || 0

    data.basicmove.value = bm.toString()
    data.basicmove.points = atts.find(attribute => attribute.attr_id === 'basic_move')?.calc?.points || 0
    let bs = atts.find(attribute => attribute.attr_id === 'basic_speed')?.calc?.value || 0

    data.basicspeed.value = bs.toString()
    data.basicspeed.points = atts.find(attribute => attribute.attr_id === 'basic_speed')?.calc?.points || 0

    data.thrust = calc?.thrust
    data.swing = calc?.swing
    data.currentmove = data.basicmove.value
    data.frightcheck = atts.find(attribute => attribute.attr_id === 'fright_check')?.calc?.value || 0

    data.hearing = atts.find(attribute => attribute.attr_id === 'hearing')?.calc?.value || 0
    data.tastesmell = atts.find(attribute => attribute.attr_id === 'taste_smell')?.calc?.value || 0
    data.touch = atts.find(attribute => attribute.attr_id === 'touch')?.calc?.value || 0
    data.vision = atts.find(attribute => attribute.attr_id === 'vision')?.calc?.value || 0

    let total_carried = this.calcTotalCarried(eqp)
    const encumbranceLevels = calculateEncumbranceLevels(bl_value, total_carried, bl_unit, calc)
    const currentMove = Object.values(encumbranceLevels).find(level => level.current)?.move || 0
    const currentDodge = Object.values(encumbranceLevels).find(level => level.current)?.dodge || 0

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
      'system.currentmove': currentMove,
      'system.currentdodge': currentDodge,
      'system.encumbrance': encumbranceLevels,
      'system.QP': data.QP,
    }
  }

  async importTraitsFromGCS(profile, cd, md) {
    if (!profile) return
    let traits = {}

    traits.race = ''
    traits.height = profile.height || ''
    traits.weight = profile.weight || ''
    traits.age = profile.age || ''
    traits.title = profile.title || ''
    traits.player = profile.player_name || ''
    traits.createdon =
      new Date(cd).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }).replace(' at', ',') || ''
    traits.modifiedon =
      new Date(md).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }).replace(' at', ',') || ''
    // traits.modifiedon = md || ''
    traits.religion = profile.religion || ''
    traits.birthday = profile.birthday || ''
    traits.hand = profile.handedness || ''
    traits.techlevel = profile.tech_level || ''
    traits.gender = profile.gender || ''
    traits.eyes = profile.eyes || ''
    traits.hair = profile.hair || ''
    traits.skin = profile.skin || ''
    traits.sizemod = profile.SM || '+0'

    const result = {
      'system.-=traits': null,
      'system.traits': traits,
    }

    if (ImportSettings.overwritePortrait) {
      if (profile.portrait) {
        if (game.user.hasPermission('FILES_UPLOAD')) {
          result.img = `data:image/png;base64,${profile.portrait}.png`
        } else {
          await ui.notifications.error(
            'You do not have "FILES_UPLOAD" permission, portrait upload has failed. Please ask your GM to import your character, or acquire the correct permissions.'
          )
        }
      }
    }

    return result
  }

  async importAdsFromGCS(ads) {
    let temp = []

    if (ads) await this._preImport('GCS', 'feature')

    for (let i of ads) {
      temp = temp.concat(await this.importAd(i, ''))
    }

    // Find all adds with globalId
    await aRecurselist(this.actor.system.ads, async item => {
      if (item.itemid) {
        const i = this.actor.items.get(item.itemid)

        if (i?.system.globalid) {
          if (!(item instanceof Advantage)) item = Advantage.fromObject(item, this.actor)
          item = await this._processItemFrom(item, 'GCS')
          temp.push(item)
        }
      }
    })

    return {
      'system.-=ads': null,
      'system.ads': this.foldList(temp),
    }
  }

  async importAd(i, parent) {
    const name = i.name + (i.levels ? ' ' + i.levels.toString() : '') || 'Trait'
    let ad = new Advantage(name, i.levels)

    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('t') ? 'trait' : 'trait_container'
    }

    ad.originalName = i.name
    ad.points = i.calc?.points
    ad.notes = this._resolveNotes(i)
    ad.userdesc = i.userdesc
    ad.cr = i.cr || null

    if (i.cr) {
      ad.notes = '[' + game.i18n.localize('GURPS.CR' + i.cr.toString()) + ': ' + ad.name + ']'
    }

    if (i.modifiers?.length) {
      for (let modifier of i.modifiers)
        if (!modifier.disabled)
          ad.notes += `${ad.notes ? '; ' : ''}${modifier.name}${modifier.notes ? ' (' + modifier.notes + ')' : ''}`
    }

    // Not certain if this is needed, or is it a type-o (note vs. notes)
    if (ad.note) ad.notes += (ad.notes ? '\n' : '') + ad.note

    if (ad.userdesc) ad.notes += (ad.notes ? '\n' : '') + ad.userdesc
    ad.pageRef(i.reference)
    ad.uuid = i.id
    ad.parentuuid = parent
    ad = this._substituteItemReplacements(ad, i)

    let old = this._findElementIn('ads', ad.uuid)

    this._migrateOtfsAndNotes(old, ad, i.vtt_notes)
    ad = await this._processItemFrom(ad, 'GCS')

    let ch = []

    if (i.children?.length) {
      for (let childTrait of i.children) ch = ch.concat(await this.importAd(childTrait, i.id))
    }

    return [ad].concat(ch)
  }

  _resolveNotes(i) {
    return i.calc?.resolved_notes ?? i.notes ?? i.local_notes ?? ''
  }

  async importSkillsFromGCS(sks) {
    await this._preImport('GCS', 'skill')
    if (!sks) return
    let temp = []

    for (let i of sks) {
      temp = temp.concat(await this.importSk(i, ''))
    }

    // Find all skills with globalId
    // if (this.isUsingFoundryItems()) {
    await aRecurselist(this.actor.system.skills, async item => {
      if (item.itemid) {
        const i = this.actor.items.get(item.itemid)

        if (i?.system.globalid) {
          if (!(item instanceof Skill)) item = Skill.fromObject(item, this.actor)
          item = await this._processItemFrom(item, 'GCS')
          temp.push(item)
        }
      }
    })
    // }

    return {
      'system.-=skills': null,
      'system.skills': this.foldList(temp),
    }
  }

  async importSk(i, parent) {
    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('q') ? 'technique' : i.id.startsWith('s') ? 'skill' : 'skill_container'
    }

    let name =
      i.name + (i.tech_level ? `/TL${i.tech_level}` : '') + (i.specialization ? ` (${i.specialization})` : '') ||
      'Skill'

    if (i.type == 'technique' && !!i.default) {
      let addition = ''

      addition = ' (' + i.default.name

      if (i.default.specialization) {
        addition += ' (' + i.default.specialization + ')'
      }

      name += addition + ')'
    }

    let skill = new Skill(name, '')

    skill.originalName = name
    skill.pageRef(i.reference || '')
    skill.uuid = i.id
    skill.parentuuid = parent

    if (['skill', 'technique'].includes(i.type)) {
      skill.type = i.type.toUpperCase()
      skill.import = i.calc ? i.calc.level : ''
      if (skill.level == 0) skill.level = ''
      skill.points = i.points
      skill.relativelevel = i.calc?.rsl
      skill.notes = this._resolveNotes(i)
    } else {
      // Usually containers
      skill.level = ''
    }

    skill = this._substituteItemReplacements(skill, i)
    let old = this._findElementIn('skills', skill.uuid)

    this._migrateOtfsAndNotes(old, skill, i.vtt_notes)
    skill = await this._processItemFrom(skill, 'GCS')

    let ch = []

    if (i.children?.length) {
      for (let childSkill of i.children) ch = ch.concat(await this.importSk(childSkill, i.id))
    }

    return [skill].concat(ch)
  }

  async importSpellsFromGCS(sps) {
    await this._preImport('GCS', 'spell')
    if (!sps) return
    let temp = []

    for (let i of sps) {
      temp = temp.concat(await this.importSp(i, ''))
    }

    // Find all spells with globalId
    await aRecurselist(this.actor.system.spells, async item => {
      if (item.itemid) {
        const i = this.actor.items.get(item.itemid)

        if (i?.system.globalid) {
          if (!(item instanceof Spell)) item = Spell.fromObject(item, this.actor)
          item = await this._processItemFrom(item, 'GCS')
          temp.push(item)
        }
      }
    })

    return {
      'system.-=spells': null,
      'system.spells': this.foldList(temp),
    }
  }

  async importSp(i, parent) {
    let spell = new Spell()

    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('r') ? 'ritual_magic_spell' : i.id.startsWith('p') ? 'spell' : 'spell_container'
    }

    spell.name = i.name || 'Spell'
    spell.originalName = i.name
    spell.uuid = i.id
    spell.parentuuid = parent
    spell.pageRef(i.reference || '')

    if (['spell', 'ritual_magic_spell'].includes(i.type)) {
      spell.class = i.spell_class || ''
      spell.college = i.college || ''
      spell.cost = i.casting_cost || ''
      spell.maintain = i.maintenance_cost || ''
      spell.difficulty = i.difficulty.toUpperCase()
      spell.relativelevel = i.calc?.rsl
      spell.notes = this._resolveNotes(i)
      spell.duration = i.duration || ''
      spell.points = i.points || ''
      spell.casttime = i.casting_time || ''
      spell.import = i.calc?.level || 0
    }

    spell = this._substituteItemReplacements(spell, i)
    let old = this._findElementIn('spells', spell.uuid)

    this._migrateOtfsAndNotes(old, spell, i.vtt_notes)
    spell = await this._processItemFrom(spell, 'GCS')

    let ch = []

    if (i.children?.length) {
      for (let childSpell of i.children) ch = ch.concat(await this.importSp(childSpell, i.id))
    }

    return [spell].concat(ch)
  }

  async importEquipmentFromGCS(eq, oeq) {
    this.ignoreRender = true
    await this._preImport('GCS', 'equipment')
    if (!eq && !oeq) return
    let temp = []

    if (eq)
      for (let i of eq) {
        temp = temp.concat(await this.importEq(i, '', true))
      }

    if (oeq)
      for (let i of oeq) {
        temp = temp.concat(await this.importEq(i, '', false))
      }

    await aRecurselist(this.actor.system.equipment?.carried, async item => {
      item.carried = true

      if (item.save) {
        if (!(item instanceof Equipment)) item = Equipment.fromObject(item, this.actor)
        item = await this._processItemFrom(item, 'GCS')
        temp.push(item)
      }
    })
    await aRecurselist(this.actor.system.equipment?.other, async item => {
      item.carried = false

      if (item.save) {
        if (!(item instanceof Equipment)) item = Equipment.fromObject(item, this.actor)
        item = await this._processItemFrom(item, 'GCS')
        temp.push(item)
      }
    })

    // if (this.isUsingFoundryItems()) {
    // After retrieve all relevant data
    // Lets remove equipments now
    await this.actor.internalUpdate({
      'system.equipment.-=carried': null,
      'system.equipment.-=other': null,
    })
    // }

    temp.forEach(equipmentItem => {
      equipmentItem.contains = {}
      equipmentItem.collapsed = {}
    })

    for (const equipmentItem of temp) {
      let parent = null

      if (equipmentItem.parentuuid) {
        parent = temp.find(item => item.uuid === equipmentItem.parentuuid)
        if (parent) GURPS.put(parent.contains, equipmentItem)
        else equipmentItem.parentuuid = ''
      }

      await this._updateItemContains(equipmentItem, parent)
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

  async importEq(i, parent, carried) {
    let equipment = new Equipment()

    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('e') ? 'equipment' : 'equipment_container'
    }

    equipment.name = i.description || 'Equipment'
    equipment.originalName = i.description
    equipment.originalCount = i.type === 'equipment_container' ? 1 : i.quantity || 0
    equipment.count = equipment.originalCount
    equipment.cost =
      (parseFloat(i.calc?.extended_value) / (i.type === 'equipment_container' ? 1 : i.quantity || 1)).toString() || ''
    equipment.carried = carried
    equipment.equipped = i.equipped
    equipment.techlevel = i.tech_level || ''
    equipment.legalityclass = i.legality_class || '4'
    equipment.categories = i.categories?.join(', ') || ''
    equipment.uses = i.uses || 0
    equipment.maxuses = i.max_uses || 0
    equipment.uuid = i.id
    equipment.parentuuid = parent
    equipment.notes = ''
    equipment.notes = this._resolveNotes(i)

    if (i.modifiers?.length) {
      for (let modifier of i.modifiers)
        if (!modifier.disabled)
          equipment.notes += `${equipment.notes ? '; ' : ''}${modifier.name}${modifier.notes ? ' (' + modifier.notes + ')' : ''}`
    }

    if (equipment.note) equipment.notes += (equipment.notes ? '\n' : '') + equipment.note
    equipment.weight =
      (parseFloat(i.calc?.extended_weight) / (i.type == 'equipment_container' ? 1 : i.quantity || 1)).toString() || '0'
    equipment.pageRef(i.reference || '')
    equipment = this._substituteItemReplacements(equipment, i)
    let old = this._findElementIn('equipment.carried', equipment.uuid)

    if (!old) old = this._findElementIn('equipment.other', equipment.uuid)
    this._migrateOtfsAndNotes(old, equipment, i.vtt_notes)

    if (old) {
      equipment.name = old.name
      equipment.carried = old.carried
      equipment.equipped = old.equipped
      equipment.parentuuid = old.parentuuid

      if (old.ignoreImportQty) {
        equipment.count = old.count
        equipment.uses = old.uses
        equipment.maxuses = old.maxuses
        equipment.ignoreImportQty = true
      }
    }

    // Process Item here
    equipment = await this._processItemFrom(equipment, 'GCS')
    let ch = []

    if (i.children?.length) {
      for (let childItem of i.children) ch = ch.concat(await this.importEq(childItem, i.id, carried))

      for (let childEquipment of ch) {
        equipment.cost -= childEquipment.cost * childEquipment.count
        equipment.weight -= childEquipment.weight * childEquipment.count
      }
    }

    return [equipment].concat(ch)
  }

  importNotesFromGCS(notes) {
    if (!notes) return
    let temp = []

    for (let i of notes) {
      temp = temp.concat(this.importNote(i, ''))
    }

    recurselist(this.actor.system.notes, item => {
      if (item.save) temp.push(item)
    })

    return {
      'system.-=notes': null,
      'system.notes': this.foldList(temp),
    }
  }

  importNote(i, parent) {
    let note = new Note()

    if (this.GCSVersion === 5) {
      i.type = i.id.startsWith('n') ? 'note' : 'note_container'
    }

    note.notes = i.markdown ?? i.calc?.resolved_text ?? i.text ?? ''

    note.uuid = i.id
    note.markdown = !!i.markdown
    note.parentuuid = parent
    note.pageRef(i.reference || '')
    note = this._substituteItemReplacements(note, i)
    let old = this._findElementIn('notes', note.uuid)

    this._migrateOtfsAndNotes(old, note)
    let ch = []

    if (i.children?.length) {
      for (let childNote of i.children) ch = ch.concat(this.importNote(childNote, i.id))
    }

    return [note].concat(ch)
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
        for (let feature of i.features) {
          if (feature.type == 'attribute_bonus' && feature.attribute == 'sm')
            final += feature.amount * (i.levels ? parseFloat(i.levels) : 1)
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

    if (data.additionalresources.ignoreinputbodyplan) return

    /** @type {HitLocations.HitLocation[]} */
    let locations = []

    for (let i of hls.locations) {
      let location = new HitLocations.HitLocation(i.table_name)

      location.import = i.calc?.dr.all?.toString() || '0'

      for (let [key, value] of Object.entries(i.calc?.dr))
        if (key != 'all') {
          let damtype = GURPS.DamageTables.damageTypeMap[key]

          if (!location.split) location.split = {}
          location.split[damtype] = +location.import + value
        }

      location.penalty = i.hit_penalty?.toString() || '0'

      while (locations.filter(it => it.where == location.where).length > 0) {
        location.where = location.where + '*'
      }

      locations.push(location)
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
    let bodyplan = hls.name.toLowerCase() // Was a body plan actually in the import?

    if (bodyplan === 'snakemen') bodyplan = 'snakeman'
    let table = HitLocations.hitlocationDictionary[bodyplan] // If so, try to use it.

    /** @type {HitLocations.HitLocation[]}  */
    let locs = []

    locations.forEach(location => {
      if (!!table && !!table[location.where]) {
        // if e.where already exists in table, don't map
        locs.push(location)
      } else {
        // map to new name(s) ... sometimes we map 'Legs' to ['Right Leg', 'Left Leg'], for example.
        location.locations(false).forEach(loc => locs.push(loc)) // Map to new names
      }
    })
    locations = locs

    if (!table) {
      locs = []
      locations.forEach(location => {
        location.locations(true).forEach(loc => locs.push(loc)) // Map to new names, but include original to help match against tables
      })
      bodyplan = this._getBodyPlan(locs)
      table = HitLocations.hitlocationDictionary[bodyplan]
    }
    // update location's roll and penalty based on the bodyplan

    if (table) {
      Object.values(locations).forEach(it => {
        let [lbl, entry] = HitLocations.HitLocation.findTableEntry(table, it.where)

        if (entry) {
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
          let dr = ''

          /** @type {string | null} */
          let last = null

          results.forEach(result => {
            if (result.import != last) {
              dr += '|' + result.import
              last = result.import
            }
          })

          if (dr) dr = dr.substring(1)
          results[0].import = dr
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

    let overwrite = ImportSettings.overwriteBodyPlan // "ask", "keep", "overwrite"

    if (data.lastImport) {
      if (!!data.additionalresources.bodyplan && bodyplan !== data.additionalresources.bodyplan) {
        if (overwrite === 'ask')
          overwrite = await this.askOverwriteBodyPlan(data.additionalresources.bodyplan, bodyplan)
      }

      // If we're not overwriting and we have an existing bodyplan, return the empty object.
      if (overwrite !== 'overwrite' && data.additionalresources.bodyplan) return {}
    }

    return {
      'system.-=hitlocations': null,
      'system.hitlocations': prot,
      'system.additionalresources.bodyplan': bodyplan,
    }
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
        for (let feature of i.features) {
          if (feature.type == 'reaction_bonus') {
            temp_r.push({
              modifier: feature.amount * (feature.per_level && !!i.levels ? parseInt(i.levels) : 1),
              situation: feature.situation,
            })
          } else if (feature.type == 'conditional_modifier') {
            temp_c.push({
              modifier: feature.amount * (feature.per_level && !!i.levels ? parseInt(i.levels) : 1),
              situation: feature.situation,
            })
          }
        }
    }

    let temp_r2 = []
    let temp_c2 = []

    for (let i of temp_r) {
      let existing_condition = temp_r2.find(condition => condition.situation == i.situation)

      if (existing_condition) existing_condition.modifier += i.modifier
      else temp_r2.push(i)
    }

    for (let i of temp_c) {
      let existing_condition = temp_c2.find(condition => condition.situation == i.situation)

      if (existing_condition) existing_condition.modifier += i.modifier
      else temp_c2.push(i)
    }

    for (let i of temp_r2) {
      let reaction = new Reaction()

      reaction.modifier = i.modifier.toString()
      reaction.situation = i.situation
      GURPS.put(rs, reaction, index_r++)
    }

    for (let i of temp_c2) {
      let condMod = new Modifier()

      condMod.modifier = i.modifier.toString()
      condMod.situation = i.situation
      GURPS.put(cs, condMod, index_c++)
    }

    return {
      'system.-=reactions': null,
      'system.reactions': rs,
      'system.-=conditionalmods': null,
      'system.conditionalmods': cs,
    }
  }

  importCombatFromGCS(ads, skills, spells, equipment) {
    let meleeWeapons = {}
    let rangedWeapons = {}
    let m_index = 0
    let r_index = 0
    let temp = [].concat(ads, skills, spells, equipment)
    let all = []

    for (let i of temp) {
      all = all.concat(this.recursiveGet(i))
    }

    for (let i of all) {
      if (i.weapons?.length) {
        for (let weapon of i.weapons) {
          if (this.GCSVersion === 5) {
            weapon.type = weapon.id.startsWith('w') ? 'melee_weapon' : 'ranged_weapon'
          }

          if (weapon.type == 'melee_weapon') {
            let melee = new Melee()

            melee.name = i.name || i.description || ''
            melee.originalName = i.name
            melee.st = weapon.strength || ''
            melee.weight = i.weight || ''
            melee.techlevel = i.tech_level || ''
            melee.cost = i.value || ''
            melee.notes = i.notes || ''
            melee.pageRef(i.reference || '')
            melee.mode = weapon.usage || ''
            melee.import = weapon.calc?.level?.toString() || '0'
            melee.damage = buildDamageOutputGCS(weapon)
            melee.reach = weapon.reach || ''
            melee.parry = weapon.calc?.parry || ''
            melee.block = weapon.calc?.block || ''
            melee = this._substituteItemReplacements(melee, i)
            let old = this._findElementIn('melee', false, melee.name, melee.mode)

            this._migrateOtfsAndNotes(old, melee, i.vtt_notes, weapon.usage_notes)

            GURPS.put(meleeWeapons, melee, m_index++)
          } else if (weapon.type == 'ranged_weapon') {
            let ranged = new Ranged()

            ranged.name = i.name || i.description || ''
            ranged.originalName = i.name
            ranged.st = weapon.strength || ''
            ranged.bulk = weapon.bulk || ''
            ranged.legalityclass = i.legality_class || '4'
            ranged.ammo = 0
            ranged.notes = i.notes || ''
            ranged.pageRef(i.reference || '')
            ranged.mode = weapon.usage || ''
            ranged.import = weapon.calc?.level || '0'
            ranged.damage = buildDamageOutputGCS(weapon)
            ranged.acc = weapon.accuracy || ''
            let match = ranged.acc.trim().match(/(\d+)([+-]\d+)/)

            if (match) {
              ranged.acc = match[1]
              ranged.notes += ' [' + match[2] + ' ' + game.i18n.localize('GURPS.acc') + ']'
            }

            ranged.rof = weapon.rate_of_fire || ''
            ranged.shots = weapon.shots || ''
            ranged.rcl = weapon.recoil || ''
            ranged.range = weapon.calc?.range || weapon.range || ''
            ranged = this._substituteItemReplacements(ranged, i)
            let old = this._findElementIn('ranged', false, ranged.name, ranged.mode)

            this._migrateOtfsAndNotes(old, ranged, i.vtt_notes, weapon.usage_notes)

            GURPS.put(rangedWeapons, ranged, r_index++)
          }
        }
      }
    }

    return {
      'system.-=melee': null,
      'system.melee': meleeWeapons,
      'system.-=ranged': null,
      'system.ranged': rangedWeapons,
    }
  }

  // similar hack to get text as integer.
  /**
   * @param {{ [key: string]: any }} o
   */
  intFrom(obj) {
    if (!obj) return 0
    let i = obj['#text']

    if (!i) return 0

    return parseInt(i)
  }

  /**
   * @param {{[key: string] : any}} o
   */
  floatFrom(obj) {
    if (!obj) return 0
    let num = obj['#text'].trim()

    if (!num) return 0

    return num.includes(',') ? parseDecimalNumber(num, { thousands: '.', decimal: ',' }) : parseDecimalNumber(num)
  }

  calcTotalCarried(eqp) {
    let total = 0

    if (!eqp) return total

    for (let i of eqp) {
      let weight = 0

      weight += parseFloat(i.weight || '0') * (i.type == 'equipment_container' ? 1 : i.quantity || 0)
      if (i.children?.length) weight += this.calcTotalCarried(i.children)
      total += weight
    }

    return total
  }

  recursiveGet(i) {
    if (!i) return []
    let ch = []

    if (i.children?.length) for (let child of i.children) ch = ch.concat(this.recursiveGet(child))
    if (i.modifiers?.length) for (let modifier of i.modifiers) ch = ch.concat(this.recursiveGet(modifier))
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
    let listObj = foundry.utils.getProperty(this.actor, 'system.' + list)

    recurselist(listObj, (value, key, _d) => {
      if (
        (uuid && value.uuid == uuid) ||
        (!!value.name && value.name.startsWith(name) && value.name.length < foundLength && value.mode == mode)
      ) {
        foundkey = key
        foundLength = value.name ? value.name.length : foundLength
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
      var [adsNum, disadsNum] = [0, 0]

      for (let childTrait of i.children) {
        ;[adsNum, disadsNum, quirks, race] = this.adPointCount(childTrait, adsNum, disadsNum, quirks, race)
      }

      if (toplevel) {
        if (adsNum > 0) ads += adsNum
        else disads += adsNum
        disads += disadsNum
      } else ads += adsNum + disadsNum
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

    if ((i.type === 'skill_container' || i.type === 'spell_container') && i.children?.length)
      for (let childSkill of i.children) skills = this.skPointCount(childSkill, skills)
    else skills += i.points ?? 0

    return skills
  }

  /**
   * Copy old OTFs to the new object, and update the displayable notes
   * @param {Skill|Spell|Ranged|Melee} oldobj
   * @param {Skill|Spell|Ranged|Melee} newobj
   */
  _migrateOtfsAndNotes(oldobj = {}, newobj, importvttnotes = '', usagenotes = '') {
    if (importvttnotes) newobj.notes += (newobj.notes ? ' ' : '') + importvttnotes
    if (usagenotes) newobj.notes += (newobj.notes ? ' ' : '') + usagenotes
    this._updateOtf('check', oldobj, newobj)
    this._updateOtf('during', oldobj, newobj)
    this._updateOtf('pass', oldobj, newobj)
    this._updateOtf('fail', oldobj, newobj)
    if (typeof oldobj.notes === 'string' && oldobj.notes.startsWith(newobj.notes))
      // Must be done AFTER OTFs have been stripped out
      newobj.notes = oldobj.notes
    if (oldobj.name?.startsWith(newobj.name)) newobj.name = oldobj.name
    // If notes have `\n  ` fix it
    newobj.notes = newobj.notes.replace(/\n\s\s+/g, ' ')
    if (!newobj.itemModifiers) newobj.itemModifiers = (oldobj.itemModifiers || '').trim()
    if (!newobj.addToQuickRoll) newobj.addToQuickRoll = oldobj.addToQuickRoll || false
    if (!newobj.modifierTags) newobj.modifierTags = (oldobj.modifierTags || '').trim()
  }

  /**
   *  Search for specific format OTF in the notes (and vttnotes).
   *  If we find it in the notes, remove it and replace the notes with the shorter version
   */
  _updateOtf(otfkey, oldobj, newobj) {
    let objkey = otfkey + 'otf'
    let oldotf = oldobj[objkey]

    newobj[objkey] = oldotf
    let notes,
      newotf

      // Remove OTF
    ;[notes, newotf] = this._removeOtf(otfkey, newobj.notes || '')
    if (newotf) newobj[objkey] = newotf
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
      if (obj.parentuuid) {
        const parent = flat.find(it => it.uuid == obj.parentuuid)

        if (parent) {
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
        if (Object.hasOwn(HitLocations.hitlocationDictionary[tableName], hitLocation.where)) {
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
    const componentType = actorComp.constructor.name.toLowerCase()

    const existingItem = this.actor.items.find(i => {
      const itemType = i.type === 'feature' ? 'advantage' : i.type

      return (
        itemType === componentType &&
        (i.system.importid === actorComp.uuid ||
          (!!i.system[i.itemSysKey]?.originalName && i.system[i.itemSysKey].originalName === actorComp.originalName))
      )
    })

    // Check if we need to update the Item
    if (!actorComp._itemNeedsUpdate(existingItem)) {
      actorComp.name = existingItem.name
      actorComp.itemid = existingItem._id
      actorComp.itemInfo = existingItem.getItemInfo()
      actorComp.uuid = existingItem.system[existingItem.itemSysKey].uuid
      actorComp.itemModifiers = existingItem.system.itemModifiers
      actorComp.addToQuickRoll = existingItem.system.addToQuickRoll
      actorComp.modifierTags = existingItem.system.modifierTags

      return actorComp
    }

    // Create or Update item
    const itemData = actorComp.toItemData(this.actor, fromProgram)
    const [item] = existingItem
      ? await this.actor.updateEmbeddedDocuments('Item', [{ _id: existingItem._id, system: itemData.system }])
      : await this.actor.createEmbeddedDocuments('Item', [itemData])

    // Update Actor Component for new Items
    if (item) {
      actorComp.name = item.name
      actorComp.itemid = item._id
      actorComp.itemInfo = item.getItemInfo()
      actorComp.uuid = item.system[item.itemSysKey].uuid
    } else if (existingItem) {
      actorComp.name = existingItem.name
      actorComp.itemid = existingItem._id
      actorComp.itemInfo = existingItem.getItemInfo()
      actorComp.uuid = existingItem.system[existingItem.itemSysKey].uuid
      actorComp.itemModifiers = existingItem.system.itemModifiers
      actorComp.addToQuickRoll = existingItem.system.addToQuickRoll
      actorComp.modifierTags = existingItem.system.modifierTags
    }

    return actorComp
  }

  async _updateItemContains(actorComp) {
    const item = this.actor.items.get(actorComp.itemid)

    if (item) {
      if (!actorComp.parentuuid) {
        const itemSysContain = `system.${item.itemSysKey}.contains`

        await this.actor.updateEmbeddedDocuments('Item', [{ _id: item._id, [itemSysContain]: actorComp.contains }])
      }
    }
    // }
  }
}
