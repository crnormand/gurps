import * as settings from '../../lib/miscellaneous-settings.js'
import { ResourceTrackerEditor } from '../actor/tracker-editor-dialog.js'

export class ResourceTrackerManager extends FormApplication {
  static initSettings() {
    game.settings.registerMenu(settings.SYSTEM_NAME, settings.SETTING_TRACKER_DEFAULT_EDITOR, {
      name: 'Resource Tracker Manager',
      hint: 'Use this to create, reuse, and automatically apply Resource Trackers to character sheets.',
      label: 'View and Edit Trackers',
      type: ResourceTrackerManager,
      restricted: false,
    })

    // game.settings.register(settings.SYSTEM_NAME, settings.SETTING_MOOK_DEFAULT, {
    //   name: 'Mook Default',
    //   scope: 'world',
    //   config: false,
    //   type: Object,
    //   default: new Mook(),
    //   onChange: value => console.log(`Updated Mook Default: ${value}`),
    // })
  }

  constructor(options = {}) {
    super(options)

    this._templates = []
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'tracker-manager',
      // classes: ['sheet', 'actor', 'form'],
      template: 'systems/gurps/templates/actor/tracker-manager.html',
      resizable: true,
      minimizable: false,
      width: 600,
      height: 400,
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
      let index = $(ev.currentTarget).attr('data')
      let data = JSON.stringify(this._templates[index].tracker)
      let dialog = new ResourceTrackerEditor(JSON.parse(data))
      let defaultClose = dialog.close

      let tracker = await new Promise((resolve, reject) => {
        dialog._updateTracker = () => {
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
  }

  _validate(index, value) {
    return this._templates.filter((it, idx) => idx != index).every(it => it.slot !== value)
  }

  /**
   * @override
   */
  _updateObject() {}
}
