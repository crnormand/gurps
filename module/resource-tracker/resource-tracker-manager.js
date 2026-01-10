import { arrayToObject, objectToArray } from '../../lib/utilities.js'

import { ResourceTrackerEditor } from './resource-tracker-editor.js'
import { SETTING_TRACKER_TEMPLATES } from './types.js'

export class ResourceTrackerManager extends FormApplication {
  /**
   * @returns {Record<string, ResourceTrackerTemplate>}
   */
  static getDefaultTemplates() {
    return {
      '0000': {
        tracker: {
          name: game.i18n.localize('GURPS.grapplingControlPoints'),
          alias: game.i18n.localize('GURPS.grapplingCPAbbrev'),
          pdf: 'FDG4',
          max: 0,
          min: 0,
          value: 0,
          isDamageType: true,
          isDamageTracker: true,
          breakpoints: true,
          thresholds: [
            {
              comparison: '<',
              operator: '×',
              value: 0.1,
              condition: game.i18n.localize('GURPS.grapplingUnrestrained'),
              color: '#90ee90',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 0.1,
              condition: game.i18n.localize('GURPS.grapplingGrabbed'),
              color: '#eeee30',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 0.5,
              condition: game.i18n.localize('GURPS.grapplingGrappled'),
              color: '#eeaa30',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 1.0,
              condition: game.i18n.localize('GURPS.grapplingRestrained'),
              color: '#ee5000',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 1.5,
              condition: game.i18n.localize('GURPS.grapplingControlled'),
              color: '#ee0000',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 2.0,
              condition: game.i18n.localize('GURPS.grapplingPinned'),
              color: '#900000',
            },
          ],
        },
        initialValue: 'attributes.ST.value',
        slot: false,
      },
    }
  }

  /**
   * Retrieves all resource tracker templates from the settings.
   * @returns {ResourceTrackerTemplate[]}
   */
  static getAllTemplates() {
    const settings = game.settings.get(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES)
    const templates = objectToArray(settings || {})

    return templates
  }

  /**
   * Retrieves templates that are required but not currently present in the provided trackers.
   * @returns {ResourceTrackerTemplate[]}
   */
  static getMissingRequiredTemplates(currentTrackers) {
    const newTrackers = []
    const templates = ResourceTrackerManager.getAllTemplates().filter(t => t.autoapply)

    for (const template of templates) {
      if (!currentTrackers.some(t => t.name === template.tracker.name)) {
        newTrackers.push(template)
      }
    }

    return newTrackers
  }

  /**
   *
   * @param {*} options
   */
  constructor(options = {}) {
    super(options)

    /** @type {import('./types.js').ResourceTrackerTemplate[]} */
    this._templates = ResourceTrackerManager.getAllTemplates()
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'tracker-manager',
      template: 'systems/gurps/templates/resource-tracker/tracker-manager.hbs',
      resizable: false,
      minimizable: false,
      width: 520,
      height: 'auto',
      title: game.i18n.localize('GURPS.resourceTemplateManager'),
      closeOnSubmit: true,
    })
  }

  getData(options) {
    const data = super.getData(options)

    data.templates = this._templates

    return data
  }

  /**
   * @override
   * @param {HtmlElement} html
   */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('#template-add').click(() => {
      if (!this._templates) {
        this._templates = []
      }

      this._templates.push({
        tracker: {
          name: '',
          alias: '',
          max: 0,
          min: 0,
          value: 0,
        },
        slot: false,
        initialValue: '',
      })
      this.render(true)
    })

    html.find('[name="delete-template"]').click(ev => {
      let index = $(ev.currentTarget).attr('data')

      this._templates.splice(index, 1)
      this.render(true)
    })

    html.find('[name="name"]').click(async ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      let dialog = new ResourceTrackerEditor(JSON.parse(JSON.stringify(this._templates[index].tracker)))
      let defaultClose = dialog.close

      let tracker = await new Promise(resolve => {
        dialog._updateTracker = () => {
          // validate that the new tracker's name and alias are unique
          let newTracker = dialog._tracker
          let match = this._templates
            .filter((_, i) => i !== index)
            .some(
              t =>
                (!!t.tracker.name && t.tracker.name === newTracker.name) ||
                (!!t.tracker.alias && t.tracker.alias === newTracker.alias)
            )

          while (match) {
            if (this._templates.filter((_, i) => i !== index).some(t => t.tracker.name === newTracker.name)) {
              newTracker.name += ' (copy)'
            }

            if (this._templates.filter((_, i) => i !== index).some(t => t.tracker.alias === newTracker.alias)) {
              newTracker.alias += ' (copy)'
            }

            match = this._templates
              .filter((_, i) => i !== index)
              .some(
                t =>
                  (!!t.tracker.name && t.tracker.name === newTracker.name) ||
                  (!!t.tracker.alias && t.tracker.alias === newTracker.alias)
              )
          }

          resolve(dialog._tracker)
        }

        dialog.close = () => {
          resolve(this._templates[index].tracker)
        }

        dialog.render(true)
      })

      dialog.close = defaultClose
      dialog.close()
      this._templates[index].tracker = tracker
      this.render(true)
    })

    html.find('[name="autoapply"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      let value = ev.currentTarget.checked

      this._templates[index].autoapply = value
      this.render(true)
    })

    html.find('[name="initial-value"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))

      this._templates[index].initialValue = ev.currentTarget.value
    })
  }

  /**
   * @override
   */
  async _updateObject() {
    // convert the array into an object:
    let data = arrayToObject(this._templates)

    game.settings.set(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, data)

    // remove all resources from the two objects:
    let entries = Object.entries(GURPS.DamageTables.woundModifiers).filter(([_k, v]) => !!v.resource)

    entries.forEach(([key]) => delete GURPS.DamageTables.woundModifiers[key])
    entries.forEach(([key]) => {
      let toDelete = Object.entries(GURPS.DamageTables.damageTypeMap).filter(([_k, v]) => v === key)

      toDelete.forEach(([k]) => delete GURPS.DamageTables.damageTypeMap[k])
    })

    // get all aliases defined in the resource tracker templates and register them as damage types
    let resourceTrackers = ResourceTrackerManager.getAllTemplates()
      .filter(it => !!it.tracker.isDamageType)
      .filter(it => !!it.tracker.alias)
      .map(it => it.tracker)

    resourceTrackers.forEach(it => (GURPS.DamageTables.damageTypeMap[it.alias] = it.alias))
    resourceTrackers.forEach(
      it =>
        (GURPS.DamageTables.woundModifiers[it.alias] = {
          multiplier: 1,
          label: it.name,
          resource: true,
        })
    )
  }
}
