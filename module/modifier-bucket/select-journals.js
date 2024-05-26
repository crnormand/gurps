import * as settings from '../../lib/miscellaneous-settings.js'
import { i18n, arrayToObject, objectToArray } from '../../lib/utilities.js'

export default class ModifierBucketJournals extends FormApplication {
  static getJournalIds() {
    let journals = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BUCKET_JOURNALS)
    let results = objectToArray(journals)
    return results
  }

  constructor(options = {}) {
    super(options)
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'modifier-journals',
      template: 'systems/gurps/templates/modifier-bucket/select-journals.html',
      resizeable: true,
      minimizable: false,
      width: 550,
      height: 'auto',
      title: i18n('GURPS.modifierJournalManager'),
      closeOnSubmit: true,
    })
  }

  /**
   * @override
   */
  getData(options) {
    const data = super.getData(options)
    data.journals = ModifierBucketJournals.getJournalIds()
    data.allJournals = this._htmlJournals
    return data
  }

  /**
   * @returns {Array} an array of all journals which have text in the data.content field.
   * Each entry contains the journal's entity ID, folder hierarchy, and name. This list
   * is sorted by folder hierarchy + name.
   *
   * Entry:
   * {
   *   name: String,
   *   folder: String,
   *   id: String
   * }
   */
  get _htmlJournals() {
    let htmlJournals = []
    game.journal.forEach(j => {
      j.pages.forEach(p => {
        if (p.type === 'text') htmlJournals.push(p)
      })
    })

    // only keep the journals this user has permissions to see
    htmlJournals = htmlJournals.filter(it => it.testUserPermission(game.user, 'OBSERVER'))

    let results = htmlJournals.map(it => {
      return { id: it.id, folder: this._folderPath(it.folder), name: it.name }
    })
    return results.sort((a, b) => `${a.folder}/${a.name}`.localeCompare(`${b.folder}/${b.name}`))
  }

  /**
   * @param {String} id of the journal entry
   * @param {String} name the String that contains the working folder path; only used by the
   * function internals. Should not be passed in the initial invocation.
   *
   * @returns a String that shows the folder hierarchy/path to where the journal entry exists
   */
  _folderPath(id, name = '') {
    let folder = game.folders.get(id)

    if (!!folder && !!folder.parent) {
      name = this._folderPath(folder.parent.id, name) + '/'
    }
    if (!!folder) name = name + folder.name
    return name
  }

  /**
   * @override
   */
  _updateObject(event, formData) {
    let html = $(event.currentTarget)
    let checkboxes = html.find('#entry-list').find('input[type="checkbox"]:checked')
    let ids = Array.from(checkboxes).map(it => it.id)

    let data = arrayToObject(ids)
    game.settings.set(settings.SYSTEM_NAME, settings.SETTING_BUCKET_JOURNALS, data)
  }
}
