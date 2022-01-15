import { i18n } from '../../lib/utilities'

export class GurpsActiveEffectListSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['sheet'],
      width: 400,
      height: 'auto',
      resizable: false,
    })
  }

  get template() {
    return 'systems/gurps/templates/actor/active-effects-list.html'
  }

  getData() {
    return mergeObject(super.getData, {
      effects: actor.getEmbeddedCollection('ActiveEffects').contents,
    })
  }

  activateListeners(html) {
    if (this.isEditable) {
      html.find('.effect-control').on('click', this._onEffectControl.bind(this))
    }
  }

  _onEffectControl(event) {
    event.preventDefault()
    const a = event.currentTarget
    const tr = a.closest('tr')
    const effect = tr.dataset.effectId ? actor.effects.get(tr.dataset.effectId) : null
    switch (a.dataset.action) {
      case 'create':
        return actor.createEmbeddedDocuments('ActiveEffect', [
          {
            label: i18n('GURPS.effectNew', 'New Effect'),
            icon: 'icons/svg/aura.svg',
            disabled: true,
          },
        ])
      case 'delete':
        return effect.delete()
      case 'edit':
        return effect.sheet.render(true)
    }
  }
}
