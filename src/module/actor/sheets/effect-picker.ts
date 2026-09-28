import { HandlebarsApplicationMixin, Application, DeepPartial } from '@gurps-types/foundry/index.js'
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'

/* ---------------------------------------- */

type GurpsEffectPickerConfiguration = DeepPartial<Application.Configuration> & {
  actor: Actor.Implementation
}

/* ---------------------------------------- */

interface GurpsEffectPickerRenderContext extends Application.RenderContext {
  categories: {
    key: string
    label: string
    effects: (CONFIG.StatusEffect & { localizedName: string })[]
    hasEffects: boolean
  }[]
}

/* ---------------------------------------- */

class GurpsEffectPicker extends HandlebarsApplicationMixin(Application) {
  actor: Actor.Implementation

  /* ---------------------------------------- */

  static EFFECT_CATEGORIES = {
    postures: {
      label: 'GURPS.effectPicker.postures',
      ids: ['prone', 'kneel', 'crouch', 'sit', 'crawl'],
    },
    combat: {
      label: 'GURPS.effectPicker.combat',
      ids: ['stun', 'mentalstun', 'grapple', 'shock1', 'shock2', 'shock3', 'shock4'],
    },
    conditions: {
      label: 'GURPS.effectPicker.conditions',
      ids: [
        'reeling',
        'exhausted',
        'fly',
        'fall',
        'pinned',
        'nauseated',
        'coughing',
        'retching',
        'drowsy',
        'sleeping',
        'tipsy',
        'drunk',
        'euphoria',
        'suffocate',
        'disabled',
      ],
    },
    senses: {
      label: 'GURPS.effectPicker.senses',
      ids: ['blind', 'deaf', 'silence'],
    },
    pain: {
      label: 'GURPS.effectPicker.pain',
      ids: ['mild_pain', 'moderate_pain', 'moderate_pain2', 'severe_pain', 'severe_pain2', 'terrible_pain', 'agony'],
    },
    status: {
      label: 'GURPS.effectPicker.status',
      ids: ['bleed', 'poison', 'burn', 'disarmed'],
    },
    utility: {
      label: 'GURPS.effectPicker.utility',
      ids: ['stealth', 'waiting', 'sprint'],
    },
    counters: {
      label: 'GURPS.effectPicker.counters',
      ids: ['num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9', 'num10'],
    },
    modifiers: {
      label: 'GURPS.effectPicker.modifiers',
      ids: ['bad+1', 'bad+2', 'bad+3', 'bad+4', 'bad+5', 'bad-1', 'bad-2', 'bad-3', 'bad-4', 'bad-5'],
    },
  }

  /* ---------------------------------------- */

  constructor({ actor, ...options }: GurpsEffectPickerConfiguration) {
    super(options)

    if (!actor) {
      throw new Error('GurpsEffectPicker was not assigned an Actor document!')
    }

    this.actor = actor
  }

  static override DEFAULT_OPTIONS: Application.DefaultOptions = {
    classes: ['gurps', 'effect-picker'],
    tag: 'form',
    position: { width: 400, height: 500 },
    window: { resizable: true },
    form: {
      handler: GurpsEffectPicker.#onSubmitForm,
      closeOnSubmit: false,
      submitOnChange: false,
    },
    actions: {
      chooseEffect: GurpsEffectPicker.#onChooseEffect,
      addNewEffect: GurpsEffectPicker.#onAddNewEffect,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    body: {
      template: systemPath('templates/actor/effect-picker.hbs'),
    },
  }

  /* ---------------------------------------- */

  override get title(): string {
    return getGame().i18n.format('GURPS.effectPicker.title')
  }

  /* ---------------------------------------- */

  get document(): Actor.Implementation {
    return this.actor
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: Application.RenderOptions
  ): Promise<GurpsEffectPickerRenderContext> {
    const context = await super._prepareContext(options)

    const activeEffectIds = new Set(
      this.actor.effects
        .filter(effect => !effect.disabled)
        .flatMap(effect => (effect.statuses ? Array.from(effect.statuses) : []))
    )
    const allEffects = CONFIG.statusEffects.filter(effect => effect.id !== 'dead')

    const categories = Object.entries(GurpsEffectPicker.EFFECT_CATEGORIES)
      .map(([key, category]) => {
        const effects = category.ids
          .map(effectId => allEffects.find(effect => effect.id === effectId))
          .filter(effect => effect !== undefined)
          .filter(effect => !activeEffectIds.has(effect.id))
          .map(effect => ({
            ...effect,
            localizedName: getGame().i18n.localize(effect.name),
          }))

        return {
          key,
          label: getGame().i18n.localize(category.label),
          effects,
          hasEffects: effects.length > 0,
        }
      })
      .filter(category => category.hasEffects)

    return {
      ...context,
      categories,
    }
  }

  /* ---------------------------------------- */

  protected override async _onFirstRender(
    context: DeepPartial<GurpsEffectPickerRenderContext>,
    options: DeepPartial<Application.RenderOptions>
  ): Promise<void> {
    super._onFirstRender(context, options)

    const filter = new foundry.applications.ux.SearchFilter({
      inputSelector: 'input[name="search"]',
      contentSelector: '.effect-picker-list',
      delay: 200,
      callback: (event, _query, rgx, content) => {
        event?.preventDefault()

        if (!content) return

        for (const category of content.querySelectorAll<HTMLElement>('.effect-picker-category')) {
          let visibleCount = 0

          for (const item of category.querySelectorAll<HTMLElement>('.effect-picker-item')) {
            const name = item.querySelector('.effect-picker-name')?.textContent?.toLowerCase() ?? ''
            const matches = rgx.test(foundry.applications.ux.SearchFilter.cleanQuery(name))

            if (matches) visibleCount++

            item.hidden = !matches
          }

          category.hidden = visibleCount === 0
        }
      },
    })

    filter.bind(this.element)

    for (const collapseToggle of this.element.querySelectorAll<HTMLElement>('.effect-picker-category-header')) {
      collapseToggle.addEventListener('click', () => {
        const categoryElement = collapseToggle.closest<HTMLElement>('.effect-picker-category')

        categoryElement?.classList.toggle('collapsed')
      })
    }

    this.element.querySelector<HTMLInputElement>('input[name="search"]')?.focus()
  }

  /* ---------------------------------------- */

  static async #onAddNewEffect(this: GurpsEffectPicker, event: PointerEvent): Promise<void> {
    event.preventDefault()

    const effects = await this.actor.createEmbeddedDocuments('ActiveEffect', [
      { _id: foundry.utils.randomID(), name: getGame().i18n.localize('DOCUMENT.ActiveEffect') },
    ])

    const sheet = effects[0]?.sheet as Application | null

    if (sheet) await sheet.render({ force: true })

    await this.close()
  }

  /* ---------------------------------------- */

  static async #onChooseEffect(this: GurpsEffectPicker, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const effectId = target.dataset.effectId

    if (!effectId) {
      ui.notifications?.error('GURPS.effectPicker.error.noEffectId')

      return
    }

    const status: Readonly<CONFIG.StatusEffect | null> =
      CONFIG.statusEffects.find(effect => effect.id === effectId) ?? null

    if (!status) {
      ui.notifications?.error('GURPS.effectPicker.error.invalidEffectId')

      return
    }

    const effect = await ActiveEffect.fromStatusEffect(effectId)

    const effectData: ActiveEffect.CreateData = {
      ...effect.toObject(true),
      name: getGame().i18n.localize(status.name),
      disabled: false,
      statuses: [effectId],
    }

    await this.actor.createEmbeddedDocuments('ActiveEffect', [effectData])
    await this.close()
  }

  /* ---------------------------------------- */

  static async #onSubmitForm(
    this: GurpsEffectPicker,
    _event: Event | SubmitEvent,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended
  ): Promise<void> {
    await this.actor.update(foundry.utils.expandObject(formData.object) as Actor.UpdateData)
  }
}

/* ---------------------------------------- */

export { GurpsEffectPicker }
