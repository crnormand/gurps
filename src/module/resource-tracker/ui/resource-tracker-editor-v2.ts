import { DeepPartial } from 'fvtt-types/utils'

import { ResourceTrackerManager } from '../resource-tracker-manager.js'
import { TrackerInstance } from '../resource-tracker.js'
import { IResourceTracker, IResourceTrackerTemplate, TrackerComparators, TrackerOperators } from '../types.js'

type ResourceTrackerEditorV2Options = DeepPartial<foundry.applications.api.ApplicationV2.Configuration> & {
  onUpdate?: (trackerData: IResourceTracker) => Promise<void> | void
  onCancel?: () => void
}

type ResourceTrackerContext = foundry.applications.api.ApplicationV2.RenderContext & {
  tracker: IResourceTracker
}

export class ResourceTrackerEditorV2 extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  #tracker!: IResourceTracker
  #onUpdate?: (trackerData: IResourceTracker) => Promise<void> | void
  #onCancel?: () => void
  #didSave = false

  constructor(tracker: IResourceTracker, options: ResourceTrackerEditorV2Options = {}) {
    const { onUpdate, onCancel, ...appOptions } = options

    super(appOptions)

    this.#tracker = tracker
    this.#onUpdate = onUpdate
    this.#onCancel = onCancel
  }

  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    classes: ['gurps', 'sheet', 'resource-tracker', 'modern-sheet'],
    id: 'resource-tracker-editor-v2',
    tag: 'form',
    position: {
      width: 500,
      height: 'auto',
    },
    window: {
      title: 'GURPS.resourceTracker.editor.title',
      resizable: true,
    },
    form: {
      submitOnChange: true,
    },
    actions: {
      clearTracker: ResourceTrackerEditorV2.#onClearTracker,
      cloneTracker: ResourceTrackerEditorV2.#onCloneTracker,
      deleteThreshold: ResourceTrackerEditorV2.#onDeleteThreshold,
      clearColor: ResourceTrackerEditorV2.#onClearColor,
      setColor: ResourceTrackerEditorV2.#onSetColor,
      addThreshold: ResourceTrackerEditorV2.#onAddThreshold,
    },
  }

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: 'systems/gurps/templates/resource-tracker/resource-tracker-editor.hbs',
    },
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions
  ): Promise<ResourceTrackerContext> {
    const baseContext = await super._prepareContext(options)

    const context: ResourceTrackerContext = {
      ...baseContext,
      tracker: this.#tracker,
    }

    return context
  }

  protected override async _onRender(
    context: ResourceTrackerContext,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<void> {
    await super._onRender(context, options)

    this.#bindFieldInputs()
    this.#bindThresholdInputs()
    this.#bindFooterActions()
  }

  override _onClose(options: any): void {
    super._onClose(options)

    if (!this.#didSave) {
      this.#onCancel?.()
    }
  }

  static async #onClearTracker(this: ResourceTrackerEditorV2, _event: PointerEvent): Promise<void> {
    this.#tracker.value = 0
    this.#tracker.max = 0
    this.#tracker.min = 0
    this.#tracker.pdf = ''
    this.#tracker.alias = ''
    this.#tracker.isDamageType = false
    this.#tracker.isAccumulator = false
    this.#tracker.isMaxEnforced = false
    this.#tracker.isMinEnforced = false

    this.#tracker.thresholds = []

    await this.render({ force: true })
  }

  /**
   * Get all tracker templates and present a dialog to select one for cloning. Once selected, populate the current
   * tracker with the selected template's data.
   */
  static async #onCloneTracker(this: ResourceTrackerEditorV2, _event: PointerEvent): Promise<void> {
    const templates = ResourceTrackerManager.getAllTemplatesMap()
    const selectedId = await selectTemplate(templates)

    if (!selectedId) return

    const selectedTemplate = templates[selectedId]

    if (!selectedTemplate || !selectedTemplate.tracker) return

    selectedTemplate.tracker.initialValue = selectedTemplate.initialValue

    Object.assign(this.#tracker, foundry.utils.deepClone(selectedTemplate.tracker))

    await this.render({ force: true })
  }

  static async #onDeleteThreshold(
    this: ResourceTrackerEditorV2,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const key = target.dataset.key
    const index = Number.parseInt(key ?? '-1', 10)

    if (!Array.isArray(this.#tracker.thresholds) || index < 0 || index >= this.#tracker.thresholds.length) return

    this.#tracker.thresholds.splice(index, 1)

    await this.render({ force: true })
  }

  static async #onClearColor(this: ResourceTrackerEditorV2, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const key = target.dataset.key
    const index = Number.parseInt(key ?? '-1', 10)

    if (!Array.isArray(this.#tracker.thresholds) || index < 0 || index >= this.#tracker.thresholds.length) return

    this.#tracker.thresholds[index]!.color = null

    await this.render({ force: true })
  }

  static async #onSetColor(this: ResourceTrackerEditorV2, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const key = target.dataset.key
    const index = Number.parseInt(key ?? '-1', 10)

    if (!Array.isArray(this.#tracker.thresholds) || index < 0 || index >= this.#tracker.thresholds.length) return

    // Set a default color (white) when enabling the color picker
    this.#tracker.thresholds[index]!.color = '#ffffff'

    await this.render({ force: true })
  }

  static async #onAddThreshold(this: ResourceTrackerEditorV2, _event: PointerEvent): Promise<void> {
    if (!Array.isArray(this.#tracker.thresholds)) this.#tracker.thresholds = []

    this.#tracker.thresholds.push({
      comparison: TrackerComparators.GT,
      operator: TrackerOperators.MULTIPLY,
      value: 1,
      condition: game.i18n!.localize('GURPS.normal'),
      color: null,
    } as TrackerInstance['thresholds'][number])

    await this.render({ force: true })
  }

  async _updateTracker(_html?: HTMLElement): Promise<void> {
    // If an onUpdate callback was provided, call it with the current tracker data. This allows the parent component to
    // decide what to do with the updated tracker data (e.g. save it to a document, update multiple documents, etc...).
    if (this.#onUpdate) {
      await this.#onUpdate(this.#tracker)

      return
    }
  }

  /**
   * Don't directly update the underlying tracker using `tracker.update({...})` when form fields change, as we don't
   * want to mutate the tracker state directly. Instead, we update the tracker data in memory and only persist the changes
   * when the user clicks the "Save" button. This allows the user to abort changes by clicking "Cancel" without affecting
   * the original tracker data.
   */
  #bindFieldInputs(): void {
    const root = this.element

    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach(element => {
      element.addEventListener('change', event => {
        const target = event.currentTarget as HTMLInputElement | HTMLSelectElement
        const field = target.dataset.field

        if (!field) return

        let value: unknown = target.value

        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          value = target.checked
        } else if (target instanceof HTMLInputElement && target.type === 'number') {
          value = Number.parseFloat(target.value)
        }

        this.#setTrackerField(field, value)
      })
    })
  }

  #bindThresholdInputs(): void {
    const root = this.element

    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[name][data]').forEach(element => {
      element.addEventListener('change', event => {
        const target = event.currentTarget as HTMLInputElement | HTMLSelectElement
        const index = Number.parseInt(target.getAttribute('data') ?? '-1', 10)
        const key = target.getAttribute('name')

        if (index < 0 || !key) return

        if (!Array.isArray(this.#tracker.thresholds) || !this.#tracker.thresholds[index]) return

        let value: unknown = target.value

        if (key === 'value') {
          value = Number.parseFloat(target.value)
        }

        const threshold = this.#tracker.thresholds[index] as unknown as Record<string, unknown>

        threshold[key] = value

        this.render({ force: true })
      })
    })
  }

  #bindFooterActions(): void {
    const root = this.element

    root.querySelector('.ms-save-button')?.addEventListener('click', async () => {
      await this._updateTracker(root)

      this.#didSave = true
      await this.close()
    })

    root.querySelector('.ms-cancel-button')?.addEventListener('click', async () => {
      await this.close()
    })
  }

  #setTrackerField(path: string, value: unknown): void {
    const tracker = this.#tracker as unknown as Record<string, unknown>

    if (!path.startsWith('tracker.')) return

    const key = path.replace('tracker.', '')

    tracker[key] = value
    this.render({ force: true })
  }
}

async function selectTemplate(templates: Record<string, IResourceTrackerTemplate>): Promise<string | null> {
  const templateEntries = Object.entries(templates)

  if (!templateEntries.length) return null

  const templateOptions = templateEntries
    .map(([key, template]) => {
      // const id = template.id || key
      const id = key

      if (!id) return null

      return {
        id,
        label: template.name ?? template.tracker?.name ?? id,
      }
    })
    .filter((option): option is { id: string; label: string } => option !== null)

  if (!templateOptions.length) return null

  const optionsHtml = templateOptions
    .map(option => {
      const escapedId = foundry.utils.escapeHTML(option.id)
      const escapedLabel = foundry.utils.escapeHTML(option.label)

      return `<option value="${escapedId}">${escapedLabel}</option>`
    })
    .join('')

  const result = await foundry.applications.api.DialogV2.prompt({
    window: {
      title: game.i18n!.localize('GURPS.resourceTemplateManager'),
      resizable: true,
    },
    content: `<form><div class="form-group"><label>${foundry.utils.escapeHTML(
      game.i18n!.localize('GURPS.resourceTemplateManager')
    )}</label><select name="template">${optionsHtml}</select></div></form>`,
    ok: {
      callback: (_event: Event, button: HTMLButtonElement) => {
        const form = button.form

        if (!form) return null

        const select = form.elements.namedItem('template') as HTMLSelectElement | null

        return select?.value ?? null
      },
    },
  })

  return typeof result === 'string' ? result : null
}
