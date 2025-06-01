import { arrayToObject, objectToArray } from '../../lib/utilities.js'
import { SETTING_TRACKER_TEMPLATES } from './types.js'

export class ResourceTrackerManager extends FormApplication {
  // static initSettings() {
  //   game.settings.registerMenu(GURPS.SYSTEM_NAME, SETTING_TRACKER_EDITOR, {
  //     name: game.i18n.localize('GURPS.resourceTemplateManager'),
  //     hint: game.i18n.localize('GURPS.resourceTemplateHint'),
  //     label: game.i18n.localize('GURPS.resourceTemplateButton'),
  //     type: ResourceTrackerManager,
  //     restricted: true,
  //   })

  //   game.settings.register(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, {
  //     name: game.i18n.localize('GURPS.resourceTemplateTitle'),
  //     scope: 'world',
  //     config: false,
  //     type: Object,
  //     default: ResourceTrackerManager.getDefaultTemplates(),
  //     onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
  //   })
  // }

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
        slot: false,
      },
    }
  }

  /**
   * Retrieves all resource tracker templates from the settings.
   * @returns {ResourceTrackerTemplate[]}
   */
  static getAllTemplates() {
    const templates = objectToArray(game.settings.get(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES) || {})
    // For legacy support, convert the slot field to a boolean.
    templates.forEach(element => (element.slot = element.slot !== '' && element.slot !== 'none'))
    return templates
  }

  static getMissingRequiredTemplates(currentTrackers) {
    const newTrackers = []
    const templates = ResourceTrackerManager.getAllTemplates().filter(t => t.slot)
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

    html.find('[name="slot"]').change(ev => {
      let index = parseInt($(ev.currentTarget).attr('data'))
      let value = ev.currentTarget.checked
      this._templates[index].slot = value
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
export class ResourceTrackerEditor extends Application {
  /**
   * Create a new Resource Tracker Editor
   * @param {Tracker} tracker data to update
   * @param {*} options
   */
  constructor(tracker, isActor, options = {}) {
    super(options)

    this._tracker = tracker
    this._isActor = isActor
  }

  /**
   * TODO Should update this to not depend upon actor: read the tracker in the Actor class, and
   * pass it in as parameter, then return it if edited.
   * @param {Actor} actor
   * @param {string} path
   * @param {*} options
   */
  static editForActor(actor, path, options) {
    let tracker = foundry.utils.getProperty(actor.system, path)
    let temp = JSON.stringify(tracker)
    let dialog = new ResourceTrackerEditor(JSON.parse(temp), true, options)
    dialog._updateTracker = async () => {
      let update = {}
      update[`system.${path}`] = dialog._tracker
      actor.update(update)
      dialog.close()
    }
    dialog.render(true)
  }

  static createTrackerDataForActor(actor, path, template) {
    const tracker = template.tracker
  }

  static addMissingTemplates(currentTrackers) {
    const newTrackers = [...currentTrackers]
    const templates = ResourceTrackerManager.getAllTemplates().filter(t => t.slot)
    for (const template of templates) {
      if (!currentTrackers.some(t => t.name === template.tracker.name)) {
        newTrackers.push(template.tracker)
      }
    }
    return newTrackers
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/resource-editor-popup.hbs',
      width: 360,
      height: 'auto',
      popOut: true,
      minimizable: false,
      jQuery: true,
      resizable: false,
      title: game.i18n.localize('GURPS.resourceTrackerEditor'),
    })
  }

  /** @override */
  getData(options) {
    const data = super.getData(options)
    data.tracker = this._tracker
    data.isActor = this._isActor
    return data
  }

  /**
   * By default, do nothing. Each specific use will need its own update method.
   * @param {*} html
   */
  async _updateTracker(html) {}

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('.name input').change(ev => {
      this._tracker.name = ev.currentTarget.value
    })

    html.find('.inputs .alias').change(ev => {
      // change the regex from /(w+)(.*)/ to /([A-Za-z0-9_+-]+)(.*)/ to make sure we recognize pi-, pi+ and pi++
      let alias = ev.currentTarget.value
      if (/^[A-Za-z0-9_+-]+$/.test(alias)) this._tracker.alias = alias
      else {
        ui.notifications.warn(game.i18n.format('GURPS.resourceInvalidAlias', { alias: alias }))
        ev.currentTarget.value = this._tracker.alias
      }
    })

    html.find('[name="damage-type"]').click(ev => {
      let element = $(ev.currentTarget)
      this._tracker.isDamageType = element.is(':checked')
      this.render(false)
    })

    html.find('[name="enforce-minimum"]').click(ev => {
      let element = $(ev.currentTarget)
      this._tracker.isMinimumEnforced = element.is(':checked')
      this.render(false)
    })

    html.find('[name="enforce-maximum"]').click(ev => {
      let element = $(ev.currentTarget)
      this._tracker.isMaximumEnforced = element.is(':checked')
      this.render(false)
    })

    html.find('[name="damage-tracker"]').click(ev => {
      let element = $(ev.currentTarget)
      this._tracker.isDamageTracker = element.is(':checked')
      this.render(false)
    })

    html.find('.inputs .current').change(ev => {
      this._tracker.value = parseInt(ev.currentTarget.value)
    })

    html.find('.inputs .minimum').change(ev => {
      this._tracker.min = parseInt(ev.currentTarget.value)
    })

    html.find('.inputs .maximum').change(ev => {
      this._tracker.max = parseInt(ev.currentTarget.value)
    })

    html.find('.inputs .pdf-ref').change(ev => {
      this._tracker.pdf = ev.currentTarget.value
    })

    html.find('#threshold-add').click(() => {
      if (!this._tracker.thresholds) {
        this._tracker.thresholds = []
      }

      this._tracker.thresholds.push({
        comparison: '>',
        operator: '×',
        value: 1,
        condition: game.i18n.localize('GURPS.normal'),
        color: '#FFFFFF',
      })
      this.render(false)
    })

    html.find('[name="delete-threshold"]').click(ev => {
      let index = $(ev.currentTarget).attr('data')
      this._tracker.thresholds.splice(index, 1)
      this.render(false)
    })

    html.find('[name="comparison"]').change(ev => {
      let index = $(ev.currentTarget).attr('data')
      this._tracker.thresholds[index].comparison = ev.currentTarget.value
    })

    html.find('[name="operator"]').change(ev => {
      let index = $(ev.currentTarget).attr('data')
      this._tracker.thresholds[index].operator = ev.currentTarget.value
    })

    html.find('[name="value"]').change(ev => {
      let index = $(ev.currentTarget).attr('data')
      this._tracker.thresholds[index].value = parseFloat(ev.currentTarget.value)
    })

    html.find('[name="condition"]').change(ev => {
      let index = $(ev.currentTarget).attr('data')
      this._tracker.thresholds[index].condition = ev.currentTarget.value
    })

    html.find('[name="color"]').change(ev => {
      let index = $(ev.currentTarget).attr('data')
      this._tracker.thresholds[index].color = ev.currentTarget.value
    })

    html.find('#update').click(() => this._updateTracker())

    html.find('#reset').on('click', ev => {
      this._tracker = {
        name: '',
        alias: '',
        pdf: '',
        max: 0,
        min: 0,
        value: 0,
        isDamageTracker: false,
        isDamageType: false,
        initialValue: '',
        thresholds: [],
      }
      this.render(false)
    })
  }
}
