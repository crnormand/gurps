import { DeepPartial } from 'fvtt-types/utils'

import { TrackerComparators, TrackerOperators } from '../types.ts'
import { IResourceTracker, IResourceTrackerTemplate, SETTING_TRACKER_TEMPLATES } from '../types.ts'

import { ResourceTrackerEditorV2 } from './resource-tracker-editor-v2.ts'

type ResourceTrackerManagerV2Context = foundry.applications.api.ApplicationV2.RenderContext & {
  templates: Record<string, IResourceTrackerTemplate>
}

export class ResourceTrackerManagerV2 extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  #templates: Record<string, IResourceTrackerTemplate>

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
    const templates = Object.values(ResourceTrackerManagerV2.getAllTemplatesMap()).filter(
      template => template.autoapply
    )

    for (const template of templates) {
      if (!currentTrackers.some(tracker => tracker.name === template.tracker.name)) {
        newTrackers.push(template)
      }
    }

    return newTrackers
  }

  constructor(options: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {}) {
    super(options)
    this.#templates = ResourceTrackerManagerV2.getAllTemplatesMap()
  }

  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    id: 'tracker-manager-v2',
    classes: ['gurps', 'sheet', 'resource-tracker', 'modern-sheet'],
    tag: 'form',
    position: {
      width: 520,
      height: 'auto',
    },
    window: {
      title: 'GURPS.resourceTracker.template.title',
      resizable: false,
      minimizable: false,
    },
    form: {
      closeOnSubmit: true,
      handler: ResourceTrackerManagerV2.#onSubmit,
    },
  }

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: 'systems/gurps/templates/resource-tracker/tracker-manager.hbs',
    },
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions
  ): Promise<ResourceTrackerManagerV2Context> {
    const baseContext = await super._prepareContext(options)

    return foundry.utils.mergeObject(baseContext, {
      templates: this.#templates,
    })
  }

  protected override async _onRender(
    context: ResourceTrackerManagerV2Context,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<void> {
    await super._onRender(context, options)

    this.#bindEvents()
  }

  #bindEvents(): void {
    const root = this.element

    root.querySelector('#template-add')?.addEventListener('click', event => {
      event.preventDefault()
      const id = foundry.utils.randomID()

      this.#templates[id] = {
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
      void this.render({ force: true })
    })

    root.querySelectorAll<HTMLElement>('[name="delete-template"]').forEach(element => {
      element.addEventListener('click', event => {
        event.preventDefault()
        const key = element.getAttribute('data')

        if (!key) return

        delete this.#templates[key]
        void this.render({ force: true })
      })
    })

    root.querySelectorAll<HTMLElement>('[name="name"]').forEach(element => {
      element.addEventListener('click', async event => {
        event.preventDefault()
        const key = element.getAttribute('data')

        if (!key) return

        const template = this.#templates[key]

        if (!template) return

        const editedTracker = await this.#editTrackerTemplate(key, template.tracker)

        if (!editedTracker) return

        template.tracker = editedTracker
        template.name = editedTracker.name
        await this.render({ force: true })
      })
    })

    root.querySelectorAll<HTMLInputElement>('[name="autoapply"]').forEach(element => {
      element.addEventListener('change', () => {
        const key = element.getAttribute('data')

        if (!key || !this.#templates[key]) return

        this.#templates[key].autoapply = element.checked
        void this.render({ force: true })
      })
    })

    root.querySelectorAll<HTMLInputElement>('[name="initial-value"]').forEach(element => {
      element.addEventListener('change', () => {
        const key = element.getAttribute('data')

        if (!key || !this.#templates[key]) return

        this.#templates[key].tracker.initialValue = element.value
      })
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

    const others = Object.entries(this.#templates)
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

  static async #onSubmit(
    this: ResourceTrackerManagerV2,
    event: SubmitEvent | Event,
    _form: HTMLFormElement,
    _formData: FormDataExtended
  ): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    await this.#updateObject()
  }

  async #updateObject(): Promise<void> {
    await game.settings?.set(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, this.#templates as any)

    const entries = Object.entries(GURPS.DamageTables.woundModifiers).filter(([_, value]) => !!value.resource)

    entries.forEach(([key]) => delete GURPS.DamageTables.woundModifiers[key])
    entries.forEach(([key]) => {
      const toDelete = Object.entries(GURPS.DamageTables.damageTypeMap).filter(([_, value]) => value === key)

      toDelete.forEach(([deleteKey]) => delete GURPS.DamageTables.damageTypeMap[deleteKey])
    })

    const resourceTrackers = Object.values(this.#templates)
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
