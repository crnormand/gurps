import * as settings from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'

export default class ModifierBucketJournals extends FormApplication {
  static getAllJournals() {
    let journals = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BUCKET_JOURNALS)
    // verify each journal (still) exists, removing them if they do not

    return journals
  }

  constructor(options = {}) {
    super(options)
  }

  static getDefaultOptions() {
    return mergeObject(super.getDefaultOptions(), {
      id: 'modifier-journals',
      template: 'systems/gurps/templates/modifier-bucket/select-journals.html',
      resizeable: false,
      minimizable: false,
      width: 400,
      height: 'auto',
      title: i18n('GURPS.bucketJournalManager', 'Modifier Bucket Journals'),
      closeOnSubmit: true,
      classes: ['gurps-app'],
    })
  }

  /**
   * @override
   */
  getData(options) {
    const data = super.getData(options)
    data.journals = this._journals
    return data
  }

  /**
   * @override
   * @param {HtmlElement} html - JQuery reference to this form element
   */
  activateListeners(html) {
    super.activateListeners(html)
  }

  /**
   * @override
   */
  _updateObject() {}
}
