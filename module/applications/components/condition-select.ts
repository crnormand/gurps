import { StatusEffect } from '../../effects/effects.js'
import Maneuvers, { ManeuverData, ManeuverEffect } from '../../actor/maneuver.js'
import { dom } from '../../util/index.js'

enum ConditionType {
  Maneuver = 'maneuver',
  Posture = 'posture',
  Condition = 'condition',
}

/* -------------------------------------------- */

class ConditionSelectElement extends HTMLElement {
  constructor() {
    super()

    // this._shadowRoot = this.attachShadow({ mode: 'closed' })
    this.render()
  }

  /* -------------------------------------------- */

  render(): void {
    // Root element, button which will open a menu
    const rootElement = document.createElement('button')
    rootElement.classList.add('condition-select')

    // Current selection represented as image with tooltip
    const currentSelection = document.createElement('img')
    currentSelection.classList.add('current-selection')
    rootElement.appendChild(currentSelection)

    this.appendChild(rootElement)
  }

  /* -------------------------------------------- */

  connectedCallback() {
    const id = dom.closest(this, '.application')?.id ?? null
    if (id === null) {
      console.error('ConditionSelectElement: No application found')
      return
    }
    if (!foundry.applications.instances.has(id)) {
      console.error(`ConditionSelectElement: No application found with id ${id}`)
      return
    }
    this._app = foundry.applications.instances.get(id)!

    this._getAttributes()
    this._createMenu()
    this._registerListeners()
    this._setButtonStatus()
  }

  /* -------------------------------------------- */

  private _getAttributes(): void {
    this._type = this.getAttribute('type') as ConditionType
  }

  /* -------------------------------------------- */

  private _createMenu(): void {
    const menu = document.createElement('div')
    menu.classList.add('menu')

    Object.entries(this.conditionChoices).forEach(([key, condition]: [string, ActiveEffect | ManeuverEffect]) => {
      const button = document.createElement('button')
      button.classList.add('condition-option')
      button.setAttribute('data-id', key)
      // NOTE: we really need to refactor maneuvers and effects in general so we can use the same properties
      button.addEventListener('click', event => {
        event.preventDefault()
        this._setActorCondition(key)
        this._setButtonStatus()
      })

      const img = document.createElement('img')

      if (this._type === ConditionType.Maneuver) {
        button.setAttribute('data-tooltip', game.i18n?.localize(condition.label) ?? '')
        img.setAttribute('src', condition.icon)
      } else {
        button.setAttribute('data-tooltip', game.i18n?.localize(condition.name) ?? '')
        img.setAttribute('src', condition.img)
      }

      button.appendChild(img)
      menu.appendChild(button)
    })
    this.appendChild(menu)
  }

  /* -------------------------------------------- */

  private _registerListeners(): void {
    if (!this.isEditable) return
    // Don't allow changing maneuver when not in combat
    if (this._type === ConditionType.Maneuver && !this.actor.inCombat) return

    this.querySelector('button.condition-select')?.addEventListener('click', event => {
      event.preventDefault()
      this.querySelector('.menu')?.classList.toggle('active')

      // Close the menu if you click outside of it
      document.addEventListener('click', event => {
        if (!this.contains(event.target as HTMLElement)) {
          this.querySelector('.menu')?.classList.remove('active')
        }
      })
    })
  }

  /* -------------------------------------------- */

  private _setButtonStatus(): void {
    const currentSelection = this.querySelector('img.current-selection') as HTMLImageElement

    switch (this._type) {
      case ConditionType.Maneuver: {
        // TODO: replace with enum values when conditions are refactored
        const currentCondition = this.currentConditions as ManeuverEffect
        currentSelection.dataset.id = currentCondition?.id
        currentSelection.setAttribute('alt', game.i18n?.localize(currentCondition.label) ?? '')
        currentSelection.setAttribute('src', currentCondition.icon)
        return
      }
      case ConditionType.Posture: {
        const currentCondition = this.currentConditions as ActiveEffect
        currentSelection.dataset.id = currentCondition?.id ?? ''
        currentSelection.setAttribute('alt', game.i18n?.localize(currentCondition.name) ?? '')
        currentSelection.setAttribute('src', currentCondition.img ?? '')
        return
      }
      default:
        return
    }
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  protected _setActorCondition(conditionId: string): void {
    if (!this.isEditable) return

    switch (this._type) {
      case ConditionType.Maneuver: {
        return this.actor.replaceManeuver(conditionId)
      }
      case ConditionType.Posture: {
        return this.actor.replacePosture(conditionId)
      }
      default: {
        return
      }
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  declare private _app: foundry.applications.api.ApplicationV2.Any

  get app(): foundry.applications.api.ApplicationV2.Any {
    return this._app
  }

  /* -------------------------------------------- */

  private _type: ConditionType = ConditionType.Condition

  /* -------------------------------------------- */

  get conditionChoices(): Record<string, ActiveEffect | ManeuverEffect> {
    switch (this._type) {
      case ConditionType.Maneuver:
        return Maneuvers.getAll() as Record<string, ManeuverEffect>
      case ConditionType.Posture:
        return {
          standing: {
            id: 'standing',
            img: 'systems/gurps/icons/statuses/dd-condition-standing.webp',
            name: 'GURPS.status.Standing',
          },
          ...(GURPS.StatusEffect as StatusEffect).getAllPostures(),
        }
      case ConditionType.Condition:
        return (GURPS.StatusEffect as StatusEffect).rawStatusEffects
      default:
        return {}
    }
  }

  /* -------------------------------------------- */

  get currentConditions(): ActiveEffect | ActiveEffect[] | ManeuverEffect | null {
    switch (this._type) {
      case ConditionType.Maneuver:
        return this.actor.inCombat
          ? Maneuvers.get(this.actor?.system.conditions.maneuver ?? 'do_nothing')
          : Maneuvers.get('do_nothing')
      case ConditionType.Posture: {
        const postures = GURPS.StatusEffect.getAllPostures()
        const currentPosture = this.actor?.system.conditions.posture ?? ''
        return (
          // synthetic "Standing" object
          // TODO: replace when conditions are refactored
          (postures[currentPosture] ?? {
            id: 'standing',
            img: 'systems/gurps/icons/statuses/dd-condition-standing.webp',
            name: 'GURPS.status.Standing',
          }) as ActiveEffect
        )
      }
      case ConditionType.Condition:
        return Array.from(this.actor?.effects.values() ?? [])
      default:
        return null
    }
  }

  /* -------------------------------------------- */

  get isEditable(): boolean {
    return !(!this.actor || !this.actor.isOwner)
  }

  /* -------------------------------------------- */

  get actor(): Actor.Implementation | null {
    if (this.document instanceof Actor) return this.document
    return null
  }

  /* -------------------------------------------- */

  get document(): foundry.abstract.Document.Any | null {
    if ('document' in this.app && this.app.document instanceof foundry.abstract.Document) return this.app.document
    return null
  }
}

export { ConditionSelectElement, ConditionType }
