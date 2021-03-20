import * as settings from '../../lib/miscellaneous-settings.js'
import { ResourceTrackerEditor } from './resource-tracker-editor.js'
import { arrayToObject, objectToArray } from '../../lib/utilities.js'

export class ResourceTrackerManager extends FormApplication {
  static initSettings() {
    game.settings.registerMenu(settings.SYSTEM_NAME, settings.SETTING_TRACKER_DEFAULT_EDITOR, {
      name: 'Resource Tracker Manager',
      hint: 'Use this to create, reuse, and automatically apply Resource Trackers to character sheets.',
      label: 'View and Edit Trackers',
      type: ResourceTrackerManager,
      restricted: true,
    })

    let defaultTrackers = JSON.parse(`{
      "0000": {
        "tracker": {
          "name": "Control Points",
          "alias": "ctrl",
          "pdf": "FDG4",
          "max": 0,
          "min": 0,
          "value": 0,
          "isDamageType": true,
          "isDamageTracker": true,
          "thresholds": [
            { "comparison": "<", "operator": "×", "value": 0.1, "condition": "Unrestrained", "color": "#90ee90" },
            { "comparison": "<", "operator": "×", "value": 0.5, "condition": "Grabbed", "color": "#eeee30" },
            { "comparison": "<", "operator": "×", "value": 1, "condition": "Grappled", "color": "#eeaa30" },
            { "comparison": "<", "operator": "×", "value": 1.5, "condition": "Restrained", "color": "#ee5000" },
            { "comparison": "<", "operator": "×", "value": 2, "condition": "Controlled", "color": "#ee0000" },
            { "comparison": "≥", "operator": "×", "value": 2, "condition": "Pinned", "color": "#900000" }
          ]
        },
        "slot": "",
        "initialValue": "attributes.ST.value"
      }
    }`)

    game.settings.register(settings.SYSTEM_NAME, settings.SETTING_TRACKER_TEMPLATES, {
      name: 'Resource Tracker Templates',
      scope: 'world',
      config: false,
      type: Object,
      default: defaultTrackers,
      onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
    })
  }

  static getAllTemplates() {
    let templates = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_TRACKER_TEMPLATES) || {}
    return objectToArray(templates)
  }

  /**
   *
   * @param {*} options
   */
  constructor(options = {}) {
    super(options)

    this._templates = ResourceTrackerManager.getAllTemplates()
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'tracker-manager',
      // classes: ['sheet', 'actor', 'form'],
      template: 'systems/gurps/templates/actor/tracker-manager.html',
      resizable: false,
      minimizable: false,
      width: 520,
      height: 368,
      title: 'Resource Tracker Manager',
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
        slot: '',
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
      let data = JSON.stringify(this._templates[index].tracker)
      let dialog = new ResourceTrackerEditor(JSON.parse(data))
      let defaultClose = dialog.close

      let tracker = await new Promise((resolve, reject) => {
        dialog._updateTracker = () => {
          // validate that the new tracker's name and alias are unique
          let newTracker = dialog._tracker
          let match = this._templates
            .filter((_, i) => i !== index)
            .find(
              t =>
                (!!t.tracker.name && t.tracker.name === newTracker.name) ||
                (!!t.tracker.alias && t.tracker.alias === newTracker.alias)
            )

          if (!!match) {
            ui.notifications.warn(`Tracker name (${newTracker.name}) or alias (${newTracker.alias}) is not unique.`)
            resolve(this._templates[index].tracker)
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

    html.find('[name="tracker-instance"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      let value = ev.currentTarget.value

      // verify that it is unique
      if (this._validate(index, value)) {
        this._templates[index].slot = value
      } else {
        ui.notifications.warn(`There is already a tracker assigned to slot Tracker ${value}.`)
      }
      this.render(true)
    })

    html.find('[name="initial-value"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      this._templates[index].initialValue = ev.currentTarget.value
    })

    // html.find('#update').click(() => this._updateObject())
  }

  _validate(index, value) {
    return this._templates
      .filter(it => !!it.slot)
      .filter((it, idx) => idx != index)
      .every(it => it.slot !== value)
  }

  /**
   * @override
   */
  _updateObject() {
    // convert the array into an object:
    let data = arrayToObject(this._templates)
    game.settings.set(settings.SYSTEM_NAME, settings.SETTING_TRACKER_TEMPLATES, data)
  }
}
