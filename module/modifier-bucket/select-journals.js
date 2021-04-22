import * as settings from '../../lib/miscellaneous-settings.js'
import { i18n, arrayToObject, objectToArray } from '../../lib/utilities.js'

export default class ModifierBucketJournals extends FormApplication {
  static getAllJournals() {
    let journals = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BUCKET_JOURNALS)
    // verify each journal (still) exists, removing them if they do not

    return journals
  }

  constructor(options = {}) {
    super(options)

    this._journals = ['WoignqCRLfn5zuWg']
    //    ModifierBucketJournals.getAllJournals()
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'modifier-journals',
      template: 'systems/gurps/templates/modifier-bucket/select-journals.html',
      resizeable: false,
      minimizable: false,
      width: 400,
      height: 'auto',
      title: i18n('GURPS.bucketJournalManager', 'Modifier Bucket Journals'),
      closeOnSubmit: true,
    })
  }

  /**
   * @override
   */
  getData(options) {
    const data = super.getData(options)
    data.journals = this._journals
    data.allJournals = this._htmlJournals
    return data
  }

  /**
   * @override
   * @param {HtmlElement} html - JQuery reference to this form element
   */
  activateListeners(html) {
    super.activateListeners(html)
  }

  get _htmlJournals() {
    let allJournals = Array.from(game.journal)
    let htmlJournals = allJournals.filter(it => !!it.data.content)
    let results = htmlJournals.map(it => {
      return { id: it.id, folder: this._folderPath(it.data.folder), name: it.name }
    })
    return results.sort((a, b) => `${a.folder}/${a.name}`.localeCompare(`${b.folder}/${b.name}`))
  }

  _folderPath(id, name = '') {
    let folder = game.folders.get(id)
    if (!!folder.parent) {
      name = this._folderPath(folder.parent.id, name) + '/'
    }
    name = name + folder.name
    return name
  }

  /**
   * @override
   */
  _updateObject() {}
}
