import { TrackerComparators, TrackerOperators } from '../types.ts'
import { IResourceTracker, IResourceTrackerTemplate, SETTING_TRACKER_TEMPLATES } from '../types.ts'

import { ResourceTrackerEditorV2 } from './resource-tracker-editor-v2.ts'

export class ResourceTrackerManager extends FormApplication {
  _templates: Record<string, IResourceTrackerTemplate>

  static getDefaultTemplates(): Record<string, IResourceTrackerTemplate> {
    const id = foundry.utils.randomID()

    return {
      [id]: {
        tracker: {
          _id: id,
          name: game.i18n!.localize('GURPS.grapplingControlPoints'),
          alias: game.i18n!.localize('GURPS.grapplingCPAbbrev'),
          pdf: 'FDG4',
          min: 0,
          currentValue: null,
          isDamageType: true,
          isAccumulator: true,
          isMaxEnforced: false,
          isMinEnforced: false,
          useBreakpoints: true,
          initialValue: 'attributes.ST.value',
          thresholds: [
            {
              comparison: TrackerComparators.LT,
              operator: TrackerOperators.MULTIPLY,
              value: 0.1,
              condition: game.i18n!.localize('GURPS.grapplingUnrestrained'),
              color: '#90ee90',
            },
            {
              comparison: TrackerComparators.GTE,
              operator: TrackerOperators.MULTIPLY,
              value: 0.1,
              condition: game.i18n!.localize('GURPS.grapplingGrabbed'),
              color: '#eeee30',
            },
            {
              comparison: TrackerComparators.GTE,
              operator: TrackerOperators.MULTIPLY,
              value: 0.5,
              condition: game.i18n!.localize('GURPS.grapplingGrappled'),
              color: '#eeaa30',
            },
            {
              comparison: TrackerComparators.GTE,
              operator: TrackerOperators.MULTIPLY,
              value: 1.0,
              condition: game.i18n!.localize('GURPS.grapplingRestrained'),
              color: '#ee5000',
            },
            {
              comparison: TrackerComparators.GTE,
              operator: TrackerOperators.MULTIPLY,
              value: 1.5,
              condition: game.i18n!.localize('GURPS.grapplingControlled'),
              color: '#ee0000',
            },
            {
              comparison: TrackerComparators.GTE,
              operator: TrackerOperators.MULTIPLY,
              value: 2.0,
              condition: game.i18n!.localize('GURPS.grapplingPinned'),
              color: '#900000',
            },
          ],
        },
        autoapply: false,
        name: game.i18n!.localize('GURPS.grapplingControlPoints'),
        id,
      },
    }
  }

  static getAllTemplatesMap(): Record<string, IResourceTrackerTemplate> {
    const settings = game.settings?.get(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES) as
      | Record<string, IResourceTrackerTemplate>
      | undefined

    return settings ?? {}
  }

  static getMissingRequiredTemplates(currentTrackers: IResourceTracker[]): IResourceTrackerTemplate[] {
    const newTrackers: IResourceTrackerTemplate[] = []
    const templates = Object.values(ResourceTrackerManager.getAllTemplatesMap()).filter(template => template.autoapply)

    for (const template of templates) {
      if (!currentTrackers.some(tracker => tracker.name === template.tracker.name)) {
        newTrackers.push(template)
      }
    }

    return newTrackers
  }

  constructor(options = {}) {
    super(options)

    this._templates = ResourceTrackerManager.getAllTemplatesMap()
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'tracker-manager',
      template: 'systems/gurps/templates/resource-tracker/tracker-manager.hbs',
      resizable: false,
      minimizable: false,
      width: 520,
      height: 'auto',
      title: game.i18n?.localize('GURPS.resourceTracker.template.title') ?? '',
      closeOnSubmit: true,
    })
  }

  override getData(options: unknown) {
    const data = super.getData(options as any)

    return foundry.utils.mergeObject(data, {
      templates: this._templates,
    })
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html)

    html.find('#template-add').on('click', () => {
      const id = foundry.utils.randomID()

      this._templates[id] = {
        tracker: {
          _id: id,
          name: '',
          alias: '',
          min: 0,
          currentValue: null,
          pdf: '',
          isDamageType: false,
          isAccumulator: false,
          isMaxEnforced: false,
          isMinEnforced: false,
          useBreakpoints: false,
          initialValue: null,
          thresholds: [],
        },
        autoapply: false,
        name: '',
        id,
      }
      this.render(true)
    })

    html.find('[name="delete-template"]').on('click', ev => {
      const key = $(ev.currentTarget).attr('data')

      if (!key) return

      delete this._templates[key]
      this.render(true)
    })

    html.find('[name="name"]').on('click', async ev => {
      const key = $(ev.currentTarget).attr('data')

      if (!key) return

      const template = this._templates[key]

      if (!template) return

      const editedTracker = await this.#editTrackerTemplate(key, template.tracker)

      if (!editedTracker) return

      template.tracker = editedTracker
      template.name = editedTracker.name
      this.render(true)
    })

    html.find('[name="autoapply"]').on('change', ev => {
      const key = $(ev.currentTarget).attr('data')
      const value = (ev.currentTarget as HTMLInputElement).checked

      if (!key || !this._templates[key]) return

      this._templates[key].autoapply = value
      this.render(true)
    })

    html.find('[name="initial-value"]').on('change', ev => {
      const key = $(ev.currentTarget).attr('data')

      if (!key || !this._templates[key]) return

      this._templates[key].tracker.initialValue = (ev.currentTarget as HTMLInputElement).value
    })
  }

  async #editTrackerTemplate(key: string, tracker: IResourceTracker): Promise<IResourceTracker | null> {
    return await new Promise<IResourceTracker | null>(resolve => {
      let resolved = false

      const resolveOnce = (value: IResourceTracker | null) => {
        if (resolved) return

        resolved = true
        resolve(value)
      }

      const trackerData = { ...tracker, currentValue: tracker.currentValue } as IResourceTracker
      const dialog = new ResourceTrackerEditorV2(trackerData, {
        onUpdate: editedTracker => {
          resolveOnce(this.#uniquifyTracker(key, editedTracker))
        },
        onCancel: () => {
          resolveOnce(null)
        },
      })

      void dialog.render({ force: true })
    })
  }

  #uniquifyTracker(key: string, tracker: IResourceTracker): IResourceTracker {
    const result = foundry.utils.deepClone(tracker)

    const others = Object.entries(this._templates)
      .filter(([templateKey]) => templateKey !== key)
      .map(([, template]) => template.tracker)

    const usedNames = new Set(others.map(otherTracker => otherTracker.name).filter(Boolean))
    const usedAliases = new Set(others.map(otherTracker => otherTracker.alias).filter(Boolean))

    result.name = this.#nextUnique(result.name, usedNames)
    result.alias = this.#nextUnique(result.alias, usedAliases)

    return result
  }

  #nextUnique(base: string, usedValues: Set<string>): string {
    if (!base) return base

    let candidate = base

    while (usedValues.has(candidate)) {
      candidate += ' (copy)'
    }

    return candidate
  }

  override async _updateObject(): Promise<void> {
    await game.settings?.set(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, this._templates as any)

    const entries = Object.entries(GURPS.DamageTables.woundModifiers).filter(([_, value]) => !!value.resource)

    entries.forEach(([key]) => delete GURPS.DamageTables.woundModifiers[key])
    entries.forEach(([key]) => {
      const toDelete = Object.entries(GURPS.DamageTables.damageTypeMap).filter(([_, value]) => value === key)

      toDelete.forEach(([deleteKey]) => delete GURPS.DamageTables.damageTypeMap[deleteKey])
    })

    const resourceTrackers = Object.values(this._templates)
      .filter(it => !!it.tracker.isDamageType)
      .filter(it => !!it.tracker.alias)
      .map(it => it.tracker)

    resourceTrackers.forEach(it => (GURPS.DamageTables.damageTypeMap[it.alias] = it.alias))
    resourceTrackers.forEach(it => {
      GURPS.DamageTables.woundModifiers[it.alias] = {
        multiplier: 1,
        label: it.name,
        resource: true,
      }
    })
  }
}
