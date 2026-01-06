export default class EffectPicker extends Application {
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

  constructor(actor, options = {}) {
    super(options)
    this.actor = actor
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'effect-picker',
      classes: ['gurps', 'effect-picker'],
      template: 'systems/gurps/templates/actor/effect-picker.hbs',
      width: 400,
      height: 500,
      resizable: true,
      title: game.i18n.localize('GURPS.effectPicker.title'),
    })
  }

  getData() {
    const activeEffectIds = new Set(
      this.actor.effects
        .filter(effect => !effect.disabled)
        .flatMap(effect => effect.statuses ? Array.from(effect.statuses) : [])
    )

    const allEffects = CONFIG.statusEffects.filter(effect => effect.id !== 'dead')

    const categories = Object.entries(EffectPicker.EFFECT_CATEGORIES).map(([key, category]) => {
      const effects = category.ids
        .map(effectId => allEffects.find(effect => effect.id === effectId))
        .filter(effect => effect !== undefined)
        .filter(effect => !activeEffectIds.has(effect.id))
        .map(effect => ({
          ...effect,
          localizedName: game.i18n.localize(effect.name),
        }))

      return {
        key,
        label: game.i18n.localize(category.label),
        effects,
        hasEffects: effects.length > 0,
      }
    }).filter(category => category.hasEffects)

    return {
      categories,
    }
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.effect-picker-search').on('input', event => {
      this.filterEffects(event.currentTarget.value)
    })

    html.find('.effect-picker-item').on('click', async event => {
      event.preventDefault()
      const effectId = event.currentTarget.dataset.effectId
      await this.addEffect(effectId)
      this.close()
    })

    html.find('.effect-picker-category-header').on('click', event => {
      const categoryElement = event.currentTarget.closest('.effect-picker-category')
      categoryElement.classList.toggle('collapsed')
    })

    setTimeout(() => html.find('.effect-picker-search').focus(), 50)
  }

  filterEffects(query) {
    const searchLower = query.toLowerCase()
    const categories = this.element.find('.effect-picker-category')

    categories.each((index, categoryElement) => {
      const items = $(categoryElement).find('.effect-picker-item')
      let visibleCount = 0

      items.each((itemIndex, itemElement) => {
        const name = $(itemElement).find('.effect-picker-name').text().toLowerCase()
        const matches = !query || name.includes(searchLower)
        $(itemElement).toggle(matches)
        if (matches) visibleCount++
      })

      $(categoryElement).toggle(visibleCount > 0)
      $(categoryElement).find('.effect-picker-category-count').text(visibleCount)
    })

    const hasVisible = this.element.find('.effect-picker-item:visible').length > 0
    this.element.find('.effect-picker-empty').toggle(!hasVisible)
  }

  async addEffect(effectId) {
    const statusEffect = CONFIG.statusEffects.find(effect => effect.id === effectId)
    if (!statusEffect) return

    const effectData = {
      name: game.i18n.localize(statusEffect.name),
      icon: statusEffect.img,
      disabled: false,
      statuses: [statusEffect.id],
      ...statusEffect.changes && { changes: statusEffect.changes },
      ...statusEffect.flags && { flags: statusEffect.flags },
      ...statusEffect.duration && { duration: statusEffect.duration },
    }

    await this.actor.createEmbeddedDocuments('ActiveEffect', [effectData])
  }
}
