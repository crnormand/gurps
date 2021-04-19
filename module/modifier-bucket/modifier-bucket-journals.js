import * as settings from '../../lib/miscellaneous-settings.js'

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
    })
  }
}
