import * as settings from '../../lib/miscellaneous-settings.js'
import { arrayToObject, objectToArray } from '../../lib/utilities.js'
import { ResourceTrackerEditor } from './resource-tracker-editor.js'

export class ResourceTrackerManager extends FormApplication {
  static initSettings() {
    game.settings.registerMenu(settings.SYSTEM_NAME, settings.SETTING_TRACKER_DEFAULT_EDITOR, {
      name: game.i18n.localize('GURPS.resourceTemplateManager'),
      hint: game.i18n.localize('GURPS.resourceTemplateHint'),
      label: game.i18n.localize('GURPS.resourceTemplateButton'),
      type: ResourceTrackerManager,
      restricted: true,
    })

    game.settings.register(settings.SYSTEM_NAME, settings.SETTING_TRACKER_TEMPLATES, {
      name: game.i18n.localize('GURPS.resourceTemplateTitle'),
      scope: 'world',
      config: false,
      type: Object,
      default: ResourceTrackerManager.getDefaultTemplates(),
      onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
    })
  }

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
              value: 0.5,
              condition: game.i18n.localize('GURPS.grapplingGrabbed'),
              color: '#eeee30',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 1,
              condition: game.i18n.localize('GURPS.grapplingGrappled'),
              color: '#eeaa30',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 1.5,
              condition: game.i18n.localize('GURPS.grapplingRestrained'),
              color: '#ee5000',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 2,
              condition: game.i18n.localize('GURPS.grapplingControlled'),
              color: '#ee0000',
            },
            {
              comparison: '≥',
              operator: '×',
              value: 2,
              condition: game.i18n.localize('GURPS.grapplingPinned'),
              color: '#900000',
            },
          ],
        },
        initialValue: 'attributes.ST.value',
      },
    }
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
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'tracker-manager',
      template: 'systems/gurps/templates/actor/tracker-manager.hbs',
      resizable: false,
      minimizable: false,
      width: 520,
      height: 368,
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
            .some(
              t =>
                (!!t.tracker.name && t.tracker.name === newTracker.name) ||
                (!!t.tracker.alias && t.tracker.alias === newTracker.alias)
            )

          while (!!match) {
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

    html.find('[name="tracker-instance"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      let value = ev.currentTarget.value

      // verify that it is unique
      if (this._validate(index, value)) {
        this._templates[index].slot = value
      } else {
        ui.notifications.warn(
          game.i18n.format('GURPS.slotNotUnique', {
            value: value,
          })
        )
      }
      this.render(true)
    })

    html.find('[name="initial-value"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      this._templates[index].initialValue = ev.currentTarget.value
    })
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

    // remove all resources from the two objects:
    let entries = Object.entries(GURPS.DamageTables.woundModifiers).filter(([k, v]) => !!v.resource)
    entries.forEach(([key, _]) => delete GURPS.DamageTables.woundModifiers[key])
    entries.forEach(([key, _]) => {
      let toDelete = Object.entries(GURPS.DamageTables.damageTypeMap).filter(([k, v]) => v === key)
      toDelete.forEach(([k, v]) => delete GURPS.DamageTables.damageTypeMap[k])
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
