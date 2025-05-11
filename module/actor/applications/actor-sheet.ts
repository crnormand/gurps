import { AnyObject, DeepPartial } from 'fvtt-types/utils'
import { arrayToObject, atou, isEmptyObject, objectToArray, zeroFill } from '../../../lib/utilities.js'
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin
import ActorSheetV2 = foundry.applications.sheets.ActorSheetV2
import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2
import ContextMenu = foundry.applications.ux.ContextMenu
import * as Settings from '../../../lib/miscellaneous-settings.js'
import * as CI from '../../injury/domain/ConditionalInjury.js'
import GurpsWiring from '../../gurps-wiring.js'
import { isConfigurationAllowed } from '../../game-utils.js'
import {
  Advantage,
  Equipment,
  Melee,
  Modifier,
  Note,
  Ranged,
  Reaction,
  Skill,
  Spell,
} from '../../actor/actor-components.js'
import { ResourceTrackerEditor } from '../../actor/resource-tracker-editor.js'
import { ResourceTrackerManager } from '../../actor/resource-tracker-manager.js'
import GurpsActiveEffectListSheet from '../../effects/active-effect-list.js'
import MoveModeEditor from '../../actor/move-mode-editor.js'
import { cleanTags } from '../../actor/effect-modifier-popout.js'
import { ActorImporter } from '../../actor/actor-importer.js'
import SplitDREditor from '../../actor/splitdr-editor.js'
import { HitLocation } from '../../hitlocation/hitlocation.js'

const ClickAndContextMenu = 'click contextmenu'

type ActorComponent = Advantage | Equipment | Melee | Note | Ranged | Skill | Spell | HitLocation | Modifier | Reaction

class ActorSheetGURPS extends HandlebarsApplicationMixin(ActorSheetV2<ActorSheetGURPS.RenderContext>) {
  // @ts-expect-error: awaiting types implementation
  #dragDrop: foundry.applications.ux.DragDrop.implementation[] = []

  /* ---------------------------------------- */

  constructor(options = {}) {
    super(options)
    this.#dragDrop = this.#createDragDropHandlers()
  }

  /* ---------------------------------------- */
  static override DEFAULT_OPTIONS: DocumentSheetV2.PartialConfiguration<
    DocumentSheetV2.Configuration<Actor.Implementation>
  > &
    object = {
    ...super.DEFAULT_OPTIONS,
    tag: 'form',
    classes: ['gurps', 'sheet', 'actor'],
    position: {
      width: 800,
      height: 800,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: this.#onSubmit,
    },
    actions: {
      viewImage: this.#onViewImage,
      editImage: this.#onEditImage,
      openActiveEffects: this.#onOpenActiveEffects,
      toggleSheet: this.#onToggleSheet,
      fileImport: this.#onFileImport,
      openEditor: this.#onOpenEditor,
    },
    // @ts-expect-error: awaiting types implementation
    dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/actor/actor-sheet-gcs.hbs',
      scrollable: [
        '.gurpsactorsheet',
        '#advantages',
        '#reactions',
        '#melee',
        '#ranged',
        '#skills',
        '#spells',
        '#equipmentcarried',
        '#equipmentother',
        '#notes',
      ],
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<DocumentSheetV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ActorSheetGURPS.RenderContext> {
    const data = await super._prepareContext(options)

    const actions = {}
    // TODO: remove once move to DataModel for actor is complete
    // this makes the assumption that the model is missing some properties
    // and correts for it. It should not be missing those in the first place.
    // @ts-expect-error: awaiting types implementation
    if (!this.actor.system.conditions.actions?.maxActions) actions['maxActions'] = 1
    // @ts-expect-error: awaiting types implementation
    if (!this.actor.system.conditions.actions?.maxBlocks) actions['maxBlocks'] = 1
    if (Object.keys(actions).length > 0) this.actor.internalUpdate({ 'system.conditions.actions': actions })

    return {
      ...data,
      actor: this.actor,
      data: this.actor.system,
      system: this.actor.system,
      ranges: GURPS.rangeObject.ranges,
      useCI: GURPS.ConditionalInjury.isInUse(),
      conditionalEffectsTable: GURPS.ConditionalInjury.conditionalEffectsTable(),
      // @ts-expect-error: awaiting types implementation
      eqtsummary: this.actor.system.eqtsummary,
      navigateBar: {
        visible: game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_SHEET_NAVIGATION) ?? false,
        // @ts-expect-error: awaiting types implementation
        hasMelee: !isEmptyObject(this.actor.system.melee),
        // @ts-expect-error: awaiting types implementation
        hasRanged: !isEmptyObject(this.actor.system.ranged),
        // @ts-expect-error: awaiting types implementation
        hasSpells: !isEmptyObject(this.actor.system.spells),
        // @ts-expect-error: awaiting types implementation
        hasOther: !isEmptyObject(this.actor.system?.equipment?.other),
      },
      isGM: game.user?.isGM ?? false,
      effects: this.actor.getEmbeddedCollection('ActiveEffect').contents,
      useQN: game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUINTESSENCE) ?? false,
      toggleQnotes: this.actor.getFlag('gurps', 'qnotes'),
    }
  }

  /* ---------------------------------------- */

  #createDragDropHandlers() {
    // @ts-expect-error: awaiting types implementation
    return (this.options as any).dragDrop.map((d: Partial<foundry.applications.ux.DragDrop.Configuration>) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      }
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      }
      // @ts-expect-error: awaiting types implementation
      return new foundry.applications.ux.DragDrop.implementation(d)
    })
  }

  // @ts-expect-error: awaiting types implementation
  get dragDrop(): foundry.applications.ux.DragDrop.implementation[] {
    return this.#dragDrop
  }

  /* ---------------------------------------- */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} _selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   */
  protected _canDragStart(_selector: string | null | undefined): boolean {
    // game.user fetches the current user
    return this.isEditable
  }

  /* ---------------------------------------- */

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} _selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   */
  protected _canDragDrop(_selector: string | null | undefined): boolean {
    // game.user fetches the current user
    return this.isEditable
  }

  /* ---------------------------------------- */

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   */
  protected _onDragStart(event: DragEvent) {
    const el = event.currentTarget as HTMLElement
    if ('link' in el.dataset) return

    // Extract the data you need
    let dragData = null

    // Owned Items
    if (el.dataset.itemId) {
      const item = this.actor.items.get(el.dataset.itemId)
      if (item) dragData = item.toDragData()
    }

    // Active Effect
    if (el.dataset.effectId) {
      const effect = this.actor.effects.get(el.dataset.effectId)
      if (effect) dragData = effect.toDragData()
    }

    if (!dragData) return

    // Set data transfer
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData))
  }

  /* ---------------------------------------- */

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} _event       The originating DragEvent
   */
  protected _onDragOver(_event: DragEvent) {}

  /* ---------------------------------------- */

  protected override _renderFrame(options: DeepPartial<DocumentSheetV2.RenderOptions>): Promise<HTMLElement> {
    const frame = super._renderFrame(options)
    if (this.isEditable) {
      const buttons = this.getCustomHeaderButtons()
      buttons.forEach((b: string) => {
        this.window.controls?.insertAdjacentHTML('beforebegin', b)
      })
    }

    return frame
  }

  /* ---------------------------------------- */

  protected override async _onFirstRender(
    context: DeepPartial<AnyObject>,
    options: DeepPartial<DocumentSheetV2.RenderOptions>
  ): Promise<void> {
    await super._onFirstRender(context, options)
    GURPS.SetLastActor(this.actor)
  }

  /* ---------------------------------------- */

  protected override async _onRender(
    _context: DeepPartial<AnyObject>,
    _options: DeepPartial<DocumentSheetV2.RenderOptions>
  ): Promise<void> {
    // JQuery compatibility
    const html = $(this.element)

    html.find('.gurpsactorsheet').on('click', ev => {
      this._onfocus(ev)
    })

    html
      .parent('.window-content')
      .siblings('.window-header')
      .on('click', ev => {
        this._onfocus(ev)
      })

    // Click on a navigation-link to scroll the sheet to that section.
    html.find('.navigation-link').on('click', event => this._onNavigate(event))

    // Enable some fields to be a targeted roll without an OTF.
    html.find('.rollable').on('click', event => this._onClickRoll(event))

    // Wire events to all OTFs on the sheet.
    GurpsWiring.hookupAllEvents(html)

    // Allow OTFs on this actor sheet to be draggable.
    html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', 'true')
      li.addEventListener('dragstart', ev => {
        let display = ''
        if (!!(ev.currentTarget as HTMLElement)?.dataset.action) display = (ev.currentTarget as HTMLElement).innerText
        return ev.dataTransfer?.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf'),
            actor: this.actor.id,
            encodedAction: (ev.currentTarget as HTMLElement).dataset.action,
            displayname: display,
          })
        )
      })
    })

    // open the split DR dialog
    html.find('.dr button[data-key]').on('click', this._onClickSplit.bind(this))

    if (!isConfigurationAllowed(this.actor)) return // Only allow "owners" to be able to edit the sheet, but anyone can roll from the sheet

    this._createHeaderMenus(html)
    this._createEquipmentItemMenus(this.element)
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS) === true) {
      this._createGlobalItemMenus(this.element)
    }

    // if not doing automatic encumbrance calculations, allow a click on the Encumbrance table to set the current value.
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE) === false) {
      html.find('.enc').on('click', this._onClickEnc.bind(this))
    }

    // allow items in these lists to be draggable
    // TODO provide feedback about where the cursor is and whether you can drop it there.
    this.makelistdrag(html, '.condmoddraggable', 'condmod')
    this.makelistdrag(html, '.reactdraggable', 'reactions')
    this.makelistdrag(html, '.eqtdraggable', 'equipment')
    this.makelistdrag(html, '.adsdraggable', 'ads')
    this.makelistdrag(html, '.skldraggable', 'skills')
    this.makelistdrag(html, '.spldraggable', 'spells')
    this.makelistdrag(html, '.notedraggable', 'note')
    this.makelistdrag(html, '.meleedraggable', 'melee')
    this.makelistdrag(html, '.rangeddraggable', 'ranged')

    html.find('[data-operation="share-portrait"]').on('click', ev => {
      ev.preventDefault()
      // @ts-expect-error: awaiting types implementation
      let image = this.actor.system.fullimage ?? this.actor.img
      const ip = new foundry.applications.apps.ImagePopout({
        src: image,
        window: {
          title: this.actor.name,
        },
        // shareable: true,
        uuid: this.actor.uuid,
      })
      // Display the image popout
      ip.render({ force: true })
    })

    // Stop ENTER key in a Resource Tracker (HP, FP, others) from doing anything.
    // This prevents the inadvertant triggering of the inc/dec buttons.
    html.find('.spinner details summary input').on('keypress', ev => {
      if (ev.key === 'Enter') ev.preventDefault()
    })

    // Handle resource tracker "+" button.
    html.find('button[data-operation="resource-inc"]').on('click', async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource') ?? ''

      let tracker = foundry.utils.getProperty(this.actor.system, path)
      let value = (+tracker.value || 0) + (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = tracker.max || 0

      if (tracker.isMinimumEnforced && value < tracker.min) value = tracker.min
      if (tracker.isMaximumEnforced && value > tracker.max) value = tracker.max

      let json = `{ "system.${path}.value": ${value} }`
      this.actor.internalUpdate(JSON.parse(json))
    })

    // Handle resource tracker "-" button.
    html.find('button[data-operation="resource-dec"]').on('click', ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      if (path) {
        let tracker = foundry.utils.getProperty(this.actor.system, path)
        let value = (tracker.value || 0) - (ev.shiftKey ? 5 : 1)
        if (isNaN(value)) value = tracker.max || 0

        if (tracker.isMinimumEnforced && value < tracker.min) value = tracker.min
        if (tracker.isMaximumEnforced && value > tracker.max) value = tracker.max

        let json = `{ "system.${path}.value": ${value} }`
        this.actor.internalUpdate(JSON.parse(json))
      }
    })

    // Handle resource tracker "reset" button.
    html.find('button[data-operation="resource-reset"]').on('click', ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      if (path) {
        let tracker = foundry.utils.getProperty(this.actor.system, path)
        let value = !!tracker.isDamageTracker ? tracker.min || 0 : tracker.max || 0

        let json = `{ "system.${path}.value": ${value} }`
        this.actor.internalUpdate(JSON.parse(json))
      }
    })

    // allow a click on the 'edit' icon to open the resource tracker editor.
    html.find('.tracked-resource .header.with-editor').on('click', event => this.editTracker(event))

    // START CONDITIONAL INJURY

    const formatCIEmpty = (val: number | null) => (val === null ? '' : val)

    const updateActorWithChangedSeverity = (changedSeverity: number | null) => {
      this.actor.internalUpdate({
        'system.conditionalinjury.injury.severity': formatCIEmpty(changedSeverity),
        'system.conditionalinjury.injury.daystoheal': formatCIEmpty(CI.daysToHealForSeverity(changedSeverity)),
      })
    }

    html.find('button[data-operation="ci-severity-inc"]').on('click', async ev => {
      ev.preventDefault()
      //@ts-expect-error: awaiting types implementation
      updateActorWithChangedSeverity(CI.incrementSeverity(this.actor.system.conditionalinjury.injury.severity))
    })

    html.find('button[data-operation="ci-severity-dec"]').on('click', ev => {
      ev.preventDefault()
      // @ts-expect-error: type is assumed to be number but can be any.
      updateActorWithChangedSeverity(CI.decrementSeverity(this.actor.system.conditionalinjury.injury.severity))
    })

    const updateActorWithChangedDaysToHeal = (changedDaysToHeal: number | null) => {
      this.actor.internalUpdate({
        'system.conditionalinjury.injury.severity': formatCIEmpty(CI.severityForDaysToHeal(changedDaysToHeal)),
        'system.conditionalinjury.injury.daystoheal': formatCIEmpty(changedDaysToHeal),
      })
    }

    html.find('button[data-operation="ci-days-inc"]').on('click', async ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(
        // @ts-expect-error: awaiting types implementation
        CI.incrementDaysToHeal(this.actor.system.conditionalinjury.injury.daystoheal, ev.shiftKey ? 5 : 1)
      )
    })

    html.find('button[data-operation="ci-days-dec"]').on('click', ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(
        // @ts-expect-error: awaiting types implementation
        CI.decrementDaysToHeal(this.actor.system.conditionalinjury.injury.daystoheal, ev.shiftKey ? 5 : 1)
      )
    })

    html.find('button[data-operation="ci-reset"]').on('click', ev => {
      ev.preventDefault()
      updateActorWithChangedSeverity(null)
    })

    html.find('input[data-operation="ci-severity-set"]').on('change', ev => {
      ev.preventDefault()
      updateActorWithChangedSeverity(CI.setSeverity((ev.target as HTMLInputElement).value))
    })

    // TODO after this event resolves, the severity field briefly flashes with the correct value but then reverts to what was there before the change
    html.find('input[data-operation="ci-days-set"]').on('change', ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(CI.setDaysToHeal((ev.target as HTMLInputElement).value))
    })

    // END CONDITIONAL INJURY

    // If using the "enhanced" inputs for trackers, enable the ribbon popup.
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ENHANCED_INPUT)) {
      // On Focus, initialize the ribbon popup and show it.
      html.find('.spinner details summary input').on('focus', ev => {
        let details = ev.currentTarget.closest('details')

        if (details) {
          if (!details.open) {
            let parent = ev.currentTarget.closest('[data-gurps-resource]')

            if (parent) {
              let path = $(parent).attr('data-gurps-resource')
              if (!path) return
              let tracker = foundry.utils.getProperty(this.actor.system, path)

              let restoreButton = $(details).find('button.restore')
              restoreButton.attr('data-value', `${tracker.value}`)
              restoreButton.text(tracker.value)

              // set position of the popup
              let window = this.element
              let popup = $(details).find('.popup')
              const windowRect = window!.getBoundingClientRect()
              const detailsRect = details.getBoundingClientRect()
              const popupWidth = popup.width() ?? 0

              const center = detailsRect.left + detailsRect.width / 2

              if (center - popupWidth / 2 < windowRect.left) {
                popup.css({ left: '0px' })
              } else if (center + popupWidth / 2 > windowRect.right) {
                popup.css({ right: '0px' })
              } else {
                popup.css({ left: `-${popupWidth / 2 - detailsRect.width / 2}px` })
              }
            }
          }
          details.open = true
        }
      })

      // Update the actor's data, set the restore button to the new value,
      // and close the popup.
      html.find('.spinner details summary input').on('focusout', ev => {
        ev.preventDefault()
        // set the restore button to the new value of the input field
        let details = ev.currentTarget.closest('details')
        if (!details) return
        let input = $(details).find('input')
        let newValue = input.val() ?? ''

        let restoreButton = $(details).find('button.restore')
        restoreButton.attr('data-value', newValue)
        restoreButton.text(newValue)

        // update the actor's data to newValue
        let parent = ev.currentTarget.closest('[data-gurps-resource]')
        if (parent) {
          let path = $(parent).attr('data-gurps-resource')
          if (!path) return
          let value = parseInt(newValue)

          // This is a hack to get the correct value for the tracker.
          if (path.startsWith('additionalresources.tracker.')) {
            let tracker = foundry.utils.getProperty(this.actor.system, path)

            if (tracker.isMinimumEnforced && value < tracker.min) value = tracker.min
            if (tracker.isMaximumEnforced && value > tracker.max) value = tracker.max
          }

          let json = `{ "system.${path}.value": ${value} }`
          this.actor.internalUpdate(JSON.parse(json))

          details.open = false
        }
      })

      // Prevent the popup from closing on a click.
      html.find('.spinner details .popup > *').on('mousedown', ev => {
        ev.preventDefault()
      })

      // On a click of the enhanced input popup, update the text input field, but do not update the actor's data.
      html.find('button[data-operation="resource-update"]').on('click', ev => {
        let dataValue = $(ev.currentTarget).attr('data-value')
        if (!dataValue) return
        let details = $(ev.currentTarget).closest('details')
        let input = $(details).find('input')
        if (!input) return
        let value = parseInt(input.val() ?? '')

        if (dataValue.charAt(0) === '-' || dataValue.charAt(0) === '+') {
          value += parseInt(dataValue)
        } else {
          value = parseInt(dataValue)
        }

        if (!isNaN(value)) {
          input.val(value)
        }
      })
    } // end enhanced input

    // Handle the Maneuver and Posture dropdowns on the tabbed sheet.
    html.find('#condition details').on('click', ev => {
      ev.preventDefault()
      const target = $(ev.currentTarget)[0]
      if (!(target && target instanceof HTMLDetailsElement)) return
      target.open = !target.open
    })

    html.find('#combat-status details').on('click', ev => {
      ev.preventDefault()
      const target = $(ev.currentTarget)[0]
      if (!(target && target instanceof HTMLDetailsElement)) return
      target.open = !target.open
    })

    // Handle the "Maneuver" dropdown on the tabbed sheet.
    html.find('#condition details#maneuver .popup .button').on('click', ev => {
      ev.preventDefault()
      const details = $(ev.currentTarget).closest('details')
      if (!(details && details instanceof HTMLDetailsElement)) return
      const target = $(ev.currentTarget)[0] as HTMLImageElement
      this.actor.replaceManeuver(target.alt)
      details.open = !details.open
    })

    html.find('#combat-status details#maneuver .popup .button').on('click', ev => {
      ev.preventDefault()
      const details = $(ev.currentTarget).closest('details')
      if (!(details && details instanceof HTMLDetailsElement)) return
      const target = $(ev.currentTarget)[0] as HTMLImageElement
      this.actor.replaceManeuver(target.alt)
      details.open = !details.open
    })

    // Handle the "Posture" dropdown on the tabbed sheet.
    html.find('#condition details#posture .popup .button').on('click', ev => {
      ev.preventDefault()
      const details = $(ev.currentTarget).closest('details')
      if (!(details && details instanceof HTMLDetailsElement)) return
      const target = $(ev.currentTarget)[0] as HTMLImageElement
      this.actor.replacePosture(target.alt)
      details.open = !details.open
    })

    // Handle the "Posture" dropdown on the tabbed sheet.
    html.find('#combat-status details#posture .popup .button').on('click', ev => {
      ev.preventDefault()
      const details = $(ev.currentTarget).closest('details')
      if (!(details && details instanceof HTMLDetailsElement)) return
      const target = $(ev.currentTarget)[0] as HTMLImageElement
      this.actor.replacePosture(target.alt)
      details.open = !details.open
    })

    // On mouseover any item with the class .tooltip-manager which also has a child (image) of class .tooltippic,
    // display the tooltip in the correct position.
    html.find('.tooltip.gga-manual').on('mouseover', ev => {
      ev.preventDefault()

      let target = $(ev.currentTarget)
      if (target.children().length === 0) {
        return
      }

      let tooltip = target.children('.tooltiptext.gga-manual')
      if (tooltip) {
        tooltip.css({ visibility: 'visible' })
      }
      tooltip = target.children('.tooltippic.gga-manual')
      if (tooltip) {
        tooltip.css({ visibility: 'visible' })
      }
    })

    // On mouseout, stop displaying the tooltip.
    html.find('.tooltip.gga-manual').on('mouseout', ev => {
      ev.preventDefault()
      let target = $(ev.currentTarget)
      if (target.children().length === 0) {
        return
      }

      let tooltip = target.children('.tooltiptext.gga-manual')
      if (tooltip) {
        tooltip.css({ visibility: 'hidden' })
      }
      tooltip = target.children('.tooltippic.gga-manual')
      if (tooltip) {
        tooltip.css({ visibility: 'hidden' })
      }
    })

    // Equipment ===

    // On clicking the Equip column, toggle the equipped status of the item.
    html.find('.changeequip').on('click', this._onClickEquip.bind(this))

    // Simple trick, move 'contains' items into 'collapsed' and back. The html doesn't show 'collapsed'.
    html.find('.expandcollapseicon').on('click', async ev => {
      let actor = this.actor
      let element = ev.currentTarget
      let parent = $(element).closest('[data-key]')
      let path = parent.attr('data-key')
      if (path) actor.toggleExpand(path)
    })

    // On double-clicking an item, open its editor.
    html.find('.dblclkedit').on('dblclick', async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')

      let path = parent[0].dataset.key
      if (!path) return
      let actor = this.actor
      let obj = foundry.utils.duplicate(foundry.utils.getProperty(actor, path)) // must dup so difference can be detected when updated
      if (!!obj.itemid) {
        if (!(await this.actor._sanityCheckItemSettings(obj))) return
        let item = this.actor.items.get(obj.itemid)
        if (!item) return
        // @ts-expect-error: awaiting types implementation
        if (!!item.system.fromItem) {
          // @ts-expect-error: awaiting types implementation
          item = this.actor.items.get(item.system.fromItem)
        }
        // @ts-expect-error: awaiting types implementation
        item.editingActor = this.actor
        // @ts-expect-error: awaiting types implementation
        item?.sheet?.render({ force: true })
        return
      }

      if (path.includes('equipment')) await this.editEquipment(actor, path, obj)
      if (path.includes('melee')) await this.editMelee(actor, path, obj)
      if (path.includes('ranged')) await this.editRanged(actor, path, obj)
      if (path.includes('ads')) await this.editAds(actor, path, obj)
      if (path.includes('skills')) await this.editSkills(actor, path, obj)
      if (path.includes('spells')) await this.editSpells(actor, path, obj)
      if (path.includes('notes')) await this.editNotes(actor, path, obj)
    })

    html.find('.dblclkedit').on('drop', event => this.handleDblclickeditDrop(event))

    // On clicking equipment quantity increment, increase the amount.
    html.find('i[data-operation="equipment-inc"]').on('click', async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')
      let path = parent.attr('data-key')
      if (!path) return
      let eqt = foundry.utils.getProperty(this.actor, path)
      let value = parseInt(eqt.count) + (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = 0
      await this.actor.updateEqtCount(path, value)
    })

    html.find('i.equipmentbutton[data-operation="equipment-inc-uses"]').on('click', async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')
      let path = parent.attr('data-key')
      if (!path) return
      let eqt = foundry.utils.getProperty(this.actor, path)
      if (!(await this.actor._sanityCheckItemSettings(eqt))) return
      let value = parseInt(eqt.uses) + (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = eqt.uses
      if (!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
        await this.actor.internalUpdate({ [path + '.uses']: value })
      } else {
        let item = this.actor.items.get(eqt.itemid)
        if (!item) return
        // @ts-expect-error: awaiting types implementation
        item.system.eqt.uses = value
        await this.actor._updateItemFromForm(item)
      }
    })
    html.find('i.equipmentbutton[data-operation="equipment-dec-uses"]').on('click', async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')
      let path = parent.attr('data-key')
      if (!path) return
      let eqt = foundry.utils.getProperty(this.actor, path)
      if (!(await this.actor._sanityCheckItemSettings(eqt))) return
      let value = parseInt(eqt.uses) - (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = eqt.uses
      if (value < 0) value = 0
      if (!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
        await this.actor.internalUpdate({ [path + '.uses']: value })
      } else {
        let item = this.actor.items.get(eqt.itemid)
        if (!item) return
        // @ts-expect-error: awaiting types implementation
        item.system.eqt.uses = value
        await this.actor._updateItemFromForm(item)
      }
    })

    // On clicking equipment quantity decrement, decrease the amount or remove from list.
    html.find('i[data-operation="equipment-dec"]').on('click', async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')
      let path = parent.attr('data-key')
      if (!path) return
      let actor = this.actor
      let eqt = foundry.utils.getProperty(actor, path)
      if (!(await this.actor._sanityCheckItemSettings(eqt))) return
      if (eqt.count == 0) {
        // TODO: swap for DialogV2
        await Dialog.confirm({
          title: game.i18n?.localize('GURPS.removeItem'),
          content: game.i18n?.format('GURPS.confirmRemoveItem', { name: eqt.name }),
          yes: () => actor.deleteEquipment(path),
        })
      } else {
        let value = parseInt(eqt.count) - (ev.shiftKey ? 5 : 1)
        if (isNaN(value) || value < 0) value = 0
        await this.actor.updateEqtCount(path, value)
      }
    })

    html.find('.addnoteicon').on('click', (event: JQuery.ClickEvent) => this._addNote(event.currentTarget))

    let notesMenuItems: ContextMenu.Entry<HTMLElement>[] = [
      {
        name: 'Edit',
        icon: "<i class='fas fa-edit'></i>",
        callback: (e: HTMLElement) => {
          let path = e.dataset.key
          if (!path) return
          let o = foundry.utils.duplicate(GURPS.decode(this.actor, path))
          this.editNotes(this.actor, path, o)
        },
      },
      {
        name: 'Delete',
        icon: "<i class='fas fa-trash'></i>",
        callback: (e: HTMLElement) => {
          GURPS.removeKey(this.actor, e.dataset.key)
        },
      },
    ]
    new ContextMenu(this.element, '.notesmenu', notesMenuItems, { jQuery: false })

    html.find('[data-onethird]').on('click', ev => {
      ev.preventDefault()
      let el = ev.currentTarget
      let opt = el.dataset.onethird ?? ''
      // @ts-expect-error: awaiting types implementation
      let active = !!this.actor.system.conditions[opt]
      this.actor.toggleEffectByName(opt, !active)
    })

    html.find('[data-onethird]').on(
      'hover',
      function (this: HTMLElement) {
        let opt = $(this).attr('data-onethird')
        let msg = 'Disable&nbsp;' + opt
        if ($(this).hasClass('buttongrey')) msg = 'Enable&nbsp;' + opt
        $(this).append(
          $(
            `<div style='font-family: Roboto, sans-serif; position: absolute;z-index: 10;top: 10px;left: 100%;padding: 5px;width=120px;color:#9f0000;background-color:lightgrey;border: 1px solid grey;border-radius:5px'>${msg}</div>`
          )
        )
      },
      function () {
        $(this).find('div').last().remove()
      }
    )

    /* ---------------------------------------- */

    html.find('#qnotes .qnotes-content').on('dblclick', async () => {
      // @ts-expect-error: awaiting types implementation
      let n = this.actor.system.additionalresources.qnotes || ''
      n = n.replace(/<br>/g, '\n')
      let actor = this.actor

      const dlg = await new foundry.applications.api.DialogV2({
        window: { title: 'Quick Note', resizable: true },
        content: `Enter a Quick Note (a great place to put an On-the-Fly formula!):<textarea rows="4" id="i">${n}</textarea><b>Examples:</b>
          [+1 due to shield]<br>[Dodge +3 retreat]<br>[Dodge +2 Feverish Defense *Cost 1FP]`,
        buttons: [
          // TODO: adapt for DialogV2
          // @ts-expect-error: to do later
          {
            label: 'Save',
            icon: 'fas fa-save',
            callback: (_event, button, _dialog) => {
              // TODO: figure out what this is doing
              // @ts-expect-error: to do later
              let value = button.form?.elements.i.value
              actor.internalUpdate({ 'system.additionalresources.qnotes': value.replace(/\n/g, '<br>') })
            },
          },
        ],
      }).render({ force: true })
      // TODO: figure out what dropFoundryLinks wants
      // @ts-expect-error: to do later
      dlg.element.querySelector('textarea')?.addEventListener('drop', event => this.dropFoundryLinks(event))
    })

    html.find('#qnotes .qnotes-content').on('drop', this.handleQnoteDrop.bind(this))

    html.find('#qnotes .toggle-label').on('click', () => {
      this.actor.setFlag('gurps', 'qnotes', !this.actor.getFlag('gurps', 'qnotes'))
    })

    html.find('#maneuver').on('change', ev => {
      let target = ev.currentTarget as HTMLInputElement
      this.actor.replaceManeuver(target.value)
    })

    html.find('#posture').on('change', ev => {
      let target = $(ev.currentTarget)
      this.actor.replacePosture(target.val())
    })

    html.find('#move-mode').on('change', ev => {
      let target = $(ev.currentTarget)
      this.actor.setMoveDefault(target.val())
    })

    html.find('#open-modifier-popup').on('click', this._showActiveEffectsListPopup.bind(this))
    html.find('#edit-move-modes').on('click', this._showMoveModeEditorPopup.bind(this))

    html.find('#addFirstResourceTracker').on('click', () => this._addTracker())
  }

  /* ---------------------------------------- */

  _createHeaderMenus(html: JQuery<HTMLElement>) {
    // add the default menu items for all tables with a headermenu
    let tables = html.find('.headermenu').closest('.gga-table')
    for (const table of tables) {
      let id = `#${table.id}`
      let items = this.getMenuItems(id)
      this._makeHeaderMenu(table, '.headermenu', items, ClickAndContextMenu)
    }

    let trackermenu = html.find('#combat-trackers')
    if (!!trackermenu.length) {
      this._makeHeaderMenu(
        trackermenu[0],
        '.headermenu',
        [
          {
            name: game.i18n?.localize('GURPS.addTracker') ?? '',
            icon: '<i class="fas fa-plus"></i>',
            callback: () => {
              this._addTracker().then()
            },
          },
        ],
        ClickAndContextMenu
      )
    }
  }

  /* ---------------------------------------- */

  _createGlobalItemMenus(html: HTMLElement) {
    let opts = [
      this._createMenu(
        game.i18n?.localize('GURPS.delete') ?? '',
        '<i class="fas fa-trash"></i>',
        this._deleteItem.bind(this),
        this._isRemovable.bind(this)
      ),
    ]
    new ContextMenu(html, '.adsdraggable', opts, { eventName: 'contextmenu', jQuery: false })
    new ContextMenu(html, '.skldraggable', opts, { eventName: 'contextmenu', jQuery: false })
    new ContextMenu(html, '.spldraggable', opts, { eventName: 'contextmenu', jQuery: false })
  }

  /* ---------------------------------------- */

  _createEquipmentItemMenus(html: HTMLElement, includeCollapsed = false) {
    let opts = [
      this._createMenu(
        game.i18n?.localize('GURPS.edit') ?? '',
        '<i class="fas fa-edit"></i>',
        this._editEquipment.bind(this)
      ),
      this._createMenu(
        game.i18n?.localize('GURPS.sortContentsAscending') ?? '',
        '<i class="fas fa-sort-amount-down-alt"></i>',
        this._sortContentAscending.bind(this),
        this._isSortable.bind(this, includeCollapsed)
      ),
      this._createMenu(
        game.i18n?.localize('GURPS.sortContentsDescending') ?? '',
        '<i class="fas fa-sort-amount-down"></i>',
        this._sortContentDescending.bind(this),
        this._isSortable.bind(this, includeCollapsed)
      ),
      this._createMenu(
        game.i18n?.localize('GURPS.delete') ?? '',
        '<i class="fas fa-trash"></i>',
        this._deleteItem.bind(this)
      ),
    ]

    let movedown = this._createMenu(
      game.i18n?.localize('GURPS.moveToOtherEquipment') ?? '',
      '<i class="fas fa-level-down-alt"></i>',
      this._moveEquipment.bind(this, 'system.equipment.other')
    )
    new ContextMenu(html, '.equipmenucarried', [movedown, ...opts], {
      eventName: 'contextmenu',
      jQuery: false,
    })

    let moveup = this._createMenu(
      game.i18n?.localize('GURPS.moveToCarriedEquipment') ?? '',
      '<i class="fas fa-level-up-alt"></i>',
      this._moveEquipment.bind(this, 'system.equipment.carried')
    )
    new ContextMenu(html, '.equipmenuother', [moveup, ...opts], {
      eventName: 'contextmenu',
      jQuery: false,
    })
  }

  /* ---------------------------------------- */

  _editEquipment(target: HTMLElement) {
    let path = target.dataset.key
    if (!path) return
    let o = foundry.utils.duplicate(GURPS.decode(this.actor, path))
    this.editEquipment(this.actor, path, o)
  }

  /* ---------------------------------------- */

  _createMenu(
    label: string,
    icon: string,
    callback: (target: HTMLElement) => void,
    condition: boolean | ((target: HTMLElement) => boolean) = true
  ): ContextMenu.Entry<HTMLElement> {
    return {
      name: label,
      icon: icon,
      callback: callback,
      condition: condition,
    }
  }

  /* ---------------------------------------- */

  _deleteItem(target: HTMLElement) {
    let key = target.dataset.key
    if (!key) return
    if (!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      if (key.includes('.equipment.')) this.actor.deleteEquipment(key)
      else GURPS.removeKey(this.actor, key)
      this.actor.refreshDR().then()
    } else {
      let item = this.actor.items.get(GURPS.decode(this.actor, key).itemid)
      if (!!item) {
        this.actor._removeItemAdditions(item.id ?? '').then(() => {
          this.actor.deleteEmbeddedDocuments('Item', [item.id ?? '']).then(() => {
            GURPS.removeKey(this.actor, key)
            this.actor.refreshDR().then()
          })
        })
      }
    }
  }

  /* ---------------------------------------- */

  _sortContentAscending(target: HTMLElement) {
    this._sortContent(target.dataset.key ?? '', 'contains', false)
    this._sortContent(target.dataset.key ?? '', 'collapsed', false)
  }

  async _sortContent(parentpath: string, objkey: string, reverse: boolean) {
    let key = parentpath + '.' + objkey
    let list = foundry.utils.getProperty(this.actor, key)
    let t = parentpath + '.-=' + objkey

    await this.actor.internalUpdate({ [t]: null }) // Delete the whole object

    let sortedobj = {}
    let index = 0
    Object.values(list)
      .sort((a: any, b: any) => (reverse ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)))
      .forEach(o => GURPS.put(sortedobj, o, index++))
    await this.actor.internalUpdate({ [key]: sortedobj })
  }

  /* ---------------------------------------- */

  _sortContentDescending(target: HTMLElement) {
    this._sortContent(target.dataset.key ?? '', 'contains', true)
    this._sortContent(target.dataset.key ?? '', 'collapsed', true)
  }

  /* ---------------------------------------- */

  _moveEquipment(list: string, target: HTMLElement) {
    let path = target.dataset.key
    if (!path) return
    this.actor.moveEquipment(path, list, false)
  }

  /* ---------------------------------------- */

  _hasContents(target: JQuery<HTMLElement>): boolean {
    let path = target[0].dataset.key
    let elements = $(target).siblings(`.desc[data-key="${path}.contains"]`)
    return elements.length > 0
  }

  /* ---------------------------------------- */

  /**
   * @returns true if the object is a container ... ie, it has a non-empty contains collection
   */
  _isSortable(includeCollapsed: boolean, target: HTMLElement): boolean {
    let path = target.dataset.key
    let x = GURPS.decode(this.actor, path)
    if (x?.contains && Object.keys(x.contains).length > 1) return true
    if (includeCollapsed) return x?.collapsed && Object.keys(x.collapsed).length > 1
    return false
  }

  /* ---------------------------------------- */

  _isRemovable(target: HTMLElement): boolean {
    const path = target.dataset.key
    const ac = GURPS.decode(this.actor, path)
    let item
    if (ac.itemid) {
      item = this.actor.items.get(ac.itemid)
    }
    // @ts-expect-error: awaiting types implementation
    return !!item?.system.globalid
  }

  /* ---------------------------------------- */

  getMenuItems(elementid: string) {
    const map: Record<string, ContextMenu.Entry<HTMLElement>[]> = {
      '#ranged': [this.sortAscendingMenu('system.ranged'), this.sortDescendingMenu('system.ranged')],
      '#melee': [this.sortAscendingMenu('system.melee'), this.sortDescendingMenu('system.melee')],
      '#advantages': [this.sortAscendingMenu('system.ads'), this.sortDescendingMenu('system.ads')],
      '#skills': [this.sortAscendingMenu('system.skills'), this.sortDescendingMenu('system.skills')],
      '#spells': [this.sortAscendingMenu('system.spells'), this.sortDescendingMenu('system.spells')],
      '#equipmentcarried': [
        this.addItemMenu(
          game.i18n?.localize('GURPS.equipment') ?? '',
          new Equipment(`${game.i18n?.localize('GURPS.equipment')}...`, true),
          'system.equipment.carried'
        ),
        this.sortAscendingMenu('system.equipment.carried'),
        this.sortDescendingMenu('system.equipment.carried'),
      ],
      '#equipmentother': [
        this.addItemMenu(
          game.i18n?.localize('GURPS.equipment') ?? '',
          new Equipment(`${game.i18n?.localize('GURPS.equipment')}...`, true),
          'system.equipment.other'
        ),
        this.sortAscendingMenu('system.equipment.other'),
        this.sortDescendingMenu('system.equipment.other'),
      ],
    }
    return map[elementid] ?? []
  }

  /* ---------------------------------------- */

  addItemMenu(name: string, obj: ActorComponent, path: string) {
    return {
      name: game.i18n?.format('GURPS.editorAddItem', { name: name }) ?? '',
      icon: '<i class="fas fa-plus"></i>',
      callback: async (_e: HTMLElement) => {
        if (path.includes('system.equipment') && obj instanceof Equipment) {
          if (!!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
            obj.save = true
            let payload = obj.toItemData(this.actor, '')
            // @ts-expect-error: awaiting types implementation
            const [item] = (await this.actor.createEmbeddedDocuments('Item', [payload])) ?? []
            obj.itemid = item?._id
          }
          if (!obj.uuid) obj.uuid = obj._getGGAId({ name: obj.name, type: path.split('.')[1], generator: '' })
        }
        let o = GURPS.decode(this.actor, path) || {}
        GURPS.put(o, foundry.utils.duplicate(obj))
        await this.actor.internalUpdate({ [path]: o })
      },
    }
  }

  /* ---------------------------------------- */

  makelistdrag(html: JQuery<HTMLElement>, cls: string, type: string) {
    html.find(cls).each((_i, li) => {
      li.setAttribute('draggable', 'true')

      li.addEventListener('dragstart', ev => {
        let oldd = ev.dataTransfer?.getData('text/plain')
        let eqtkey = (ev.currentTarget as HTMLElement | null)?.dataset.key
        if (!eqtkey) return
        let eqt = foundry.utils.getProperty(this.actor, eqtkey) // FYI, may not actually be Equipment

        if (!eqt) return
        if (!!eqt.eqtkey) {
          eqtkey = eqt.eqtkey
          eqt = GURPS.decode(this.actor, eqtkey) // Features added by equipment will point to the equipment
          type = 'equipment'
        }

        var itemData
        if (!!eqt.itemid) {
          itemData = this.actor.items.get(eqt.itemid) // We have to get it now, as the source of the drag, since the target may not be owned by us
          let img = new Image()
          if (itemData) img.src = itemData.img ?? ''
          const w = 50
          const h = 50
          // @ts-expect-error: awaiting types implementation
          const preview = foundry.applications.ux.DragDrop.implementation.createDragImage(img, w, h)
          ev.dataTransfer?.setDragImage(preview, 0, 0)
        }

        let newd = {
          actorid: this.actor.id, // may not be useful if this is an unlinked token
          // actor: this.actor, // so send the actor,
          isLinked: !this.actor.isToken,
          type: type,
          key: eqtkey,
          uuid: this.actor.items.get(eqt.itemid)?.uuid,
          itemid: eqt.itemid,
          itemData: itemData,
        }
        if (!!oldd) foundry.utils.mergeObject(newd, JSON.parse(oldd)) // May need to merge in OTF drag info

        let payload = JSON.stringify(newd)
        return ev.dataTransfer?.setData('text/plain', payload)
      })
    })
  }

  /* ---------------------------------------- */

  async _addNote(event: JQuery.ClickEvent) {
    let parent = $(event.currentTarget as HTMLElement).closest('.header')
    let path = parent.attr('data-key')
    if (!path) return
    let actor = this.actor
    let list = foundry.utils.duplicate(foundry.utils.getProperty(actor, path))
    let obj = new Note('', true)
    let dlgHtml = await renderTemplate('systems/gurps/templates/note-editor-popup.hbs', obj)

    let d = new Dialog(
      {
        title: 'Note Editor',
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Create',
            callback: async html => {
              obj.notes = String(html.find('.notes').val())
              obj.pageref = String(html.find('.pageref').val())
              // ;['notes', 'pageref', 'title'].forEach(a => (obj[a] = html.find(`.${a}`).val()))
              let u = html.find('.save') // Should only find in Note (or equipment)
              if (!!u) obj.save = u.is(':checked')
              GURPS.put(list, obj)
              await actor.internalUpdate({ [path]: list })
            },
          },
        },
        default: 'one',
      },
      {
        width: 730,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    )
    d.render(true)
  }

  /* ---------------------------------------- */

  async _addTracker() {
    this.actor.addTracker()
  }

  /* ---------------------------------------- */

  handleDblclickeditDrop(ev: JQuery.DropEvent) {
    let parent = $(ev.currentTarget as HTMLElement).closest('[data-key]')
    let path = parent[0].dataset.key
    this.dropFoundryLinks(ev, path + '.notes')
  }

  /* ---------------------------------------- */

  handleQnoteDrop(ev: JQuery.DropEvent) {
    this.dropFoundryLinks(ev, 'system.additionalresources.qnotes')
  }

  /* ---------------------------------------- */

  _getItemData(dragData: any) {
    let item
    switch (dragData.type) {
      case 'JournalEntry':
        item = game.journal?.get(dragData.id)
        break
      case 'Actor':
        item = game.actors?.get(dragData.id)
        break
      case 'RollTable':
        item = game.tables?.get(dragData.id)
        break
      case 'Item':
        item = game.items?.get(dragData.id)
        break
      case 'JournalEntryPage':
        let j = game.journal?.get(dragData.id)
        item = j?.pages.get(dragData.uuid.split('.').at(-1))
        break
    }
    const equipmentAsItem = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)
    if (!item) return {}
    // @ts-expect-error: awaiting types implementation
    return (!!equipmentAsItem && (item as unknown as Item.Implementation).type !== 'equipment') || !equipmentAsItem
      ? {
          n: item.name,
          id: item.id,
        }
      : {}
  }

  /* ---------------------------------------- */

  /**
   * Drop a foundry link into a text area
   *
   * FIXME: Not sure why this exists. Maybe is important to link the item
   *    on another item?
   *
   * To resolve the drag and drop of Foundry Items when using Equipment as Item,
   * we will add the link only for non equipment items
   *
   * @param ev
   * @param modelkey
   */
  dropFoundryLinks(ev: JQuery.Event, modelkey: string) {
    // @ts-expect-error: TODO: figure out what this does and fix it
    if (!!ev.originalEvent) ev = ev.originalEvent
    // @ts-expect-error: TODO: figure out what this does and fix it
    let dragData = JSON.parse(ev.dataTransfer.getData('text/plain'))
    if (!!dragData.uuid) dragData.id = dragData.uuid.split('.').at(1)
    let add = ''
    const { n, id } = this._getItemData(dragData)
    dragData.id = id
    if (!!n) add = ` [${dragData.type}[${dragData.id}]` + '{' + n + '}]'
    if (!!dragData.otf) {
      let prefix = ''
      if (!!dragData.displayname) {
        let q = '"'
        if (dragData.displayname.includes(q)) q = "'"
        prefix = q + dragData.displayname + q
      }
      add = '[' + prefix + dragData.otf + ']'
    }
    if (!!dragData.bucket) {
      add = '["Modifier Bucket"'
      let sep = ''
      dragData.bucket.forEach((otf: string) => {
        add += sep + '/r [' + otf + ']'
        sep = '\\\\'
      })
      add += ']'
    }

    if (!!add)
      if (!!modelkey) {
        let t = foundry.utils.getProperty(this.actor, modelkey) || ''
        this.actor.internalUpdate({ [modelkey]: t + (t ? ' ' : '') + add })
      } else {
        let t = $((ev as unknown as Event).currentTarget as HTMLInputElement).val()
        $((ev as unknown as Event).currentTarget as HTMLInputElement).val(t + (t ? ' ' : '') + add)
      }
  }

  /* ---------------------------------------- */

  async editTracker(ev: JQuery.ClickEvent) {
    ev.preventDefault()

    let path = $(ev.currentTarget).closest('[data-gurps-resource]').attr('data-gurps-resource')
    if (!path) return
    let templates: any[] | null = ResourceTrackerManager.getAllTemplates()
    if (!templates || templates.length == 0) templates = null

    let selectTracker = async (html: HTMLElement | JQuery<HTMLElement>) => {
      html = $(html)
      let name = html.find('select option:selected').text().trim()
      let template = templates?.find(template => template.tracker.name === name)
      await this.actor.applyTrackerTemplate(path, template)
    }

    // show dialog asking if they want to apply a standard tracker, or edit this tracker
    let buttons: Record<string, Dialog.Button> = {
      edit: {
        icon: '<i class="fas fa-edit"></i>',
        label: game.i18n?.localize('GURPS.resourceEditTracker') ?? '',
        callback: () => ResourceTrackerEditor.editForActor(this.actor, path, {}),
      },
      remove: {
        icon: '<i class="fas fa-trash"></i>',
        label: game.i18n?.localize('GURPS.resourceDeleteTracker') ?? '',
        callback: async () => await this.actor.removeTracker(path),
      },
    }

    if (!!templates) {
      buttons.apply = {
        icon: '<i class="far fa-copy"></i>',
        label: game.i18n?.localize('GURPS.resourceCopyTemplate') ?? '',
        callback: (html: HTMLElement | JQuery<HTMLElement>) => selectTracker(html),
      }
    }

    // TODO: replace with DialogV2
    let d = new Dialog(
      {
        title: game.i18n?.localize('GURPS.resourceUpdateTrackerSlot') ?? '',
        content: await renderTemplate('systems/gurps/templates/actor/update-tracker.hbs', { templates: templates }),
        buttons: buttons,
        default: 'edit',
        // @ts-expect-error: will be replaced
        templates: templates,
      },
      { width: 600 }
    )
    d.render(true)
  }

  /* ---------------------------------------- */

  async _showActiveEffectsListPopup(ev: JQuery.ClickEvent) {
    ev.preventDefault()
    new GurpsActiveEffectListSheet(this.actor).render(true)
  }

  /* ---------------------------------------- */

  async _showMoveModeEditorPopup(ev: JQuery.ClickEvent) {
    ev.preventDefault()
    new MoveModeEditor(this.actor).render(true)
  }

  /* ---------------------------------------- */

  async editEquipment(actor: Actor.Implementation, path: string, obj: Equipment) {
    // NOTE:  This code is duplicated above.  Haven't refactored yet
    // @ts-expect-error: awaiting types implementation
    obj.f_count = obj.count // Hack to get around The Furnace's "helpful" Handlebar helper {{count}}
    let dlgHtml = await renderTemplate('systems/gurps/templates/equipment-editor-popup.hbs', obj)

    if (!(await this.actor._sanityCheckItemSettings(obj))) return

    let d = new Dialog(
      {
        title: 'Equipment Editor',
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Update',
            callback: async html => {
              if (!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
                ;['name', 'uses', 'maxuses', 'techlevel', 'notes', 'pageref'].forEach(
                  // @ts-expect-error: TODO: redo this bit
                  a => (obj[a] = html.find(`.${a}`).val())
                )
                // @ts-expect-error: TODO: redo this bit
                ;['count', 'cost', 'weight'].forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val())))
                let u = html.find('.save') // Should only find in Note (or equipment)
                if (!!u && obj.save != null) obj.save = u.is(':checked') // only set 'saved' if it was already defined
                let v = html.find('.ignoreImportQty') // Should only find in equipment
                if (!!v) obj.ignoreImportQty = v.is(':checked')
                await actor.internalUpdate({ [path]: obj })
                await actor.updateParentOf(path, false)
              } else {
                let item = actor.items.get(obj.itemid)
                if (!item) return
                item.name = obj.name
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.count = obj.count
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.cost = obj.cost
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.uses = obj.uses
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.maxuses = obj.maxuses
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.techlevel = obj.techlevel
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.notes = obj.notes
                // @ts-expect-error: awaiting types implementation
                item.system.eqt.pageref = obj.pageref
                // @ts-expect-error: awaiting types implementation
                item.system.itemModifiers = obj.itemModifiers
                await actor._updateItemFromForm(item)
                await actor.updateParentOf(path, false)
              }
            },
          },
        },
        render: h => {
          $(h).find('textarea').on('drop', this.dropFoundryLinks)
          $(h).find('input').on('drop', this.dropFoundryLinks)
        },
        default: 'one',
      },
      {
        width: 530,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    )
    d.render(true)
  }

  /* ---------------------------------------- */

  async editMelee(actor: Actor.Implementation, path: string, obj: Melee) {
    if (obj.baseParryPenalty === undefined) obj.baseParryPenalty = -4
    if (obj.extraAttacks === undefined) obj.extraAttacks = 0
    if (obj.consumeAction === undefined) obj.consumeAction = true
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/melee-editor-popup.hbs',
      'Melee Weapon Editor',
      [
        'name',
        'mode',
        'parry',
        'block',
        'damage',
        'reach',
        'st',
        'notes',
        'import',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
        'itemModifiers',
        'modifierTags',
      ],
      ['baseParryPenalty', 'extraAttacks']
    )
  }

  /* ---------------------------------------- */

  async editRanged(actor: Actor.Implementation, path: string, obj: Ranged) {
    // if (obj.baseParryPenalty === undefined) obj.baseParryPenalty = -4
    if (obj.extraAttacks === undefined) obj.extraAttacks = 0
    if (obj.consumeAction === undefined) obj.consumeAction = true
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/ranged-editor-popup.hbs',
      'Ranged Weapon Editor',
      [
        'name',
        'mode',
        'range',
        'rof',
        'damage',
        'shots',
        'rcl',
        'st',
        'notes',
        'import',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
        'itemModifiers',
        'modifierTags',
      ],
      ['acc', 'bulk', 'extraAttacks']
    )
  }

  /* ---------------------------------------- */

  async editAds(actor: Actor.Implementation, path: string, obj: Advantage) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/advantage-editor-popup.hbs',
      'Advantage / Disadvantage / Perk / Quirk Editor',
      ['name', 'notes', 'pageref', 'itemModifiers'],
      ['points']
    )
  }

  /* ---------------------------------------- */

  async editSkills(actor: Actor.Implementation, path: string, obj: Skill) {
    if (obj.consumeAction === undefined) obj.consumeAction = false
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/skill-editor-popup.hbs',
      'Skill Editor',
      [
        'name',
        'import',
        'relativelevel',
        'pageref',
        'notes',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
        'itemModifiers',
        'modifierTags',
      ],
      ['points']
    )
  }

  /* ---------------------------------------- */

  async editSpells(actor: Actor.Implementation, path: string, obj: Spell) {
    if (obj.consumeAction === undefined) obj.consumeAction = true
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/spell-editor-popup.hbs',
      'Spell Editor',
      [
        'name',
        'import',
        'difficulty',
        'pageref',
        'notes',
        'resist',
        'class',
        'cost',
        'maintain',
        'casttime',
        'duration',
        'college',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
        'itemModifiers',
        'modifierTags',
      ],
      ['points']
    )
  }

  /* ---------------------------------------- */

  async editNotes(actor: Actor.Implementation, path: string, obj: Note) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/note-editor-popup.hbs',
      'Note Editor',
      ['pageref', 'notes', 'title'],
      [],
      730
    )
  }

  /* ---------------------------------------- */

  async editItem(
    actor: Actor.Implementation,
    path: string,
    obj: Advantage | Skill | Spell | Note | Melee | Ranged,
    html: string,
    title: string,
    strprops: string[],
    numprops: string[],
    width = 560
  ) {
    let dlgHtml = await renderTemplate(html, obj)
    let d = new Dialog(
      {
        title: title,
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Update',
            callback: async html => {
              // @ts-expect-error: TODO: redo this bit
              strprops.forEach(a => (obj[a] = html.find(`.${a}`).val()))
              // @ts-expect-error: TODO: redo this bit
              numprops.forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val())))

              let q = html.find('.quick-roll')
              // @ts-expect-error: TODO: redo this bit
              if (!!q) obj.addToQuickRoll = q.is(':checked')

              let ca = html.find('.consumeAction')
              if (!!ca && !(obj instanceof Note || obj instanceof Advantage)) obj.consumeAction = ca.is(':checked')

              let u = html.find('.save') // Should only find in Note (or equipment)
              if (!!u && obj instanceof Note) obj.save = u.is(':checked')

              if (!(obj instanceof Note || obj instanceof Advantage) && !!obj.modifierTags)
                obj.modifierTags = cleanTags(obj.modifierTags).join(', ')
              await actor.removeModEffectFor(path)
              await actor.internalUpdate({ [path]: obj })
              const commit = actor.applyItemModEffects({}, true)
              if (commit) {
                await actor.internalUpdate(commit)
                if (canvas.tokens && canvas.tokens.controlled.length > 0) {
                  await canvas.tokens.controlled[0].document.setFlag(
                    'gurps',
                    'lastUpdate',
                    new Date().getTime().toString()
                  )
                }
              }
            },
          },
        },
        render: h => {
          $(h).find('textarea').on('drop', this.dropFoundryLinks)
          $(h).find('input').on('drop', this.dropFoundryLinks)
        },
      },
      {
        width: width,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    )
    d.render(true)
  }

  /* ---------------------------------------- */

  _makeHeaderMenu(
    html: HTMLElement,
    cssclass: string,
    menuitems: ContextMenu.Entry<HTMLElement>[],
    eventname = 'contextmenu'
  ) {
    eventname.split(' ').forEach(function (e) {
      new ContextMenu(html, cssclass, menuitems, { eventName: e, jQuery: false })
    })
  }

  /* ---------------------------------------- */

  sortAscendingMenu(key: string) {
    return {
      name: game.i18n?.localize('GURPS.sortAscending') ?? '',
      icon: '<i class="fas fa-sort-amount-down-alt"></i>',
      callback: () => this.sortAscending(key),
    }
  }

  /* ---------------------------------------- */

  sortDescendingMenu(key: string) {
    return {
      name: game.i18n?.localize('GURPS.sortDescending') ?? '',
      icon: '<i class="fas fa-sort-amount-down"></i>',
      callback: () => this.sortDescending(key),
    }
  }

  /* ---------------------------------------- */

  async sortAscending(key: string) {
    let i = key.lastIndexOf('.')
    let parentpath = key.substring(0, i)
    let objkey = key.substring(i + 1)
    let object = GURPS.decode(this.actor, key)
    let t = parentpath + '.-=' + objkey
    await this.actor.internalUpdate({ [t]: null }) // Delete the whole object
    let sortedobj = {}
    let index = 0
    Object.values(object)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .forEach(o => GURPS.put(sortedobj, o, index++))
    await this.actor.internalUpdate({ [key]: sortedobj })
  }

  /* ---------------------------------------- */

  async sortDescending(key: string) {
    let i = key.lastIndexOf('.')
    let parentpath = key.substring(0, i)
    let objkey = key.substring(i + 1)
    let object = GURPS.decode(this.actor, key)
    let t = parentpath + '.-=' + objkey
    await this.actor.internalUpdate({ [t]: null }) // Delete the whole object
    let sortedobj = {}
    let index = 0
    Object.values(object)
      .sort((a: any, b: any) => b.name.localeCompare(a.name))
      .forEach(o => GURPS.put(sortedobj, o, index++))
    await this.actor.internalUpdate({ [key]: sortedobj })
  }

  /* -------------------------------------------- */
  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   */
  protected async _onDrop(event: DragEvent) {
    this.actor.ignoreRender = true
    let dragData = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}')

    if (dragData.type === 'damageItem') this.actor.handleDamageDrop(dragData.payload)
    if (dragData.type === 'Item') await this.actor.handleItemDrop(dragData)

    await this.handleDragFor(event, dragData, 'ranged', 'rangeddraggable')
    await this.handleDragFor(event, dragData, 'melee', 'meleedraggable')
    await this.handleDragFor(event, dragData, 'ads', 'adsdraggable')
    await this.handleDragFor(event, dragData, 'skills', 'skldraggable')
    await this.handleDragFor(event, dragData, 'spells', 'spldraggable')
    await this.handleDragFor(event, dragData, 'note', 'notedraggable')
    await this.handleDragFor(event, dragData, 'reactions', 'reactdraggable')
    await this.handleDragFor(event, dragData, 'condmod', 'condmoddraggable')

    if (dragData.type === 'equipment') {
      if ((await this.actor.handleEquipmentDrop(dragData)) !== false) return // handle external drag/drop

      // drag/drop in same character sheet
      // Validate that the target is valid for the drop.
      let dropTargetElements = $(event.target as HTMLElement)?.closest('.eqtdraggable, .eqtdragtarget')
      if (dropTargetElements?.length === 0) return

      // Get the target element.
      let dropTarget = dropTargetElements[0]

      let targetkey = dropTarget.dataset.key
      if (!!targetkey) {
        let srckey = dragData.key
        await this.actor.moveEquipment(srckey, targetkey, event.shiftKey)
      }
    }
    this.actor.ignoreRender = false
    await this.actor.refreshDR()
  }

  /* ---------------------------------------- */

  // Non-equipment list drags
  async handleDragFor(event: DragEvent, dragData: any, type: string, cls: string) {
    if (dragData.type === type) {
      // Validate that the target is valid for the drop.
      let dropTargetElements = $(event.target as HTMLElement).closest(`.${cls}`)
      if (dropTargetElements?.length === 0) return

      // Get the target element.
      let dropTarget = dropTargetElements[0]

      // Dropping an item into a container that already contains it does nothing; tell the user and bail.
      let targetkey = dropTarget.dataset.key
      if (!!targetkey) {
        let sourceKey = dragData.key
        if (sourceKey.includes(targetkey) || targetkey.includes(sourceKey)) {
          ui.notifications?.error(game.i18n?.localize('GURPS.dragSameContainer') ?? '')
          return
        }

        let object = GURPS.decode(this.actor, sourceKey)

        // Because we may be modifing the same list, we have to check the order of the keys and
        // apply the operation that occurs later in the list, first (to keep the indexes the same).
        let sourceTermsArray = sourceKey.split('.')
        sourceTermsArray.splice(0, 2) // Remove the first two elements: data.xxxx
        let targetTermsArray = targetkey.split('.')
        targetTermsArray.splice(0, 2)
        let max = Math.min(sourceTermsArray.length, targetTermsArray.length)

        let isSrcFirst = false
        for (let i = 0; i < max; i++) {
          // Could be a term like parseInt('contains') < parseInt('contains'), which in typical JS jankiness, reduces
          // to NaN < NaN, which is false.
          if (parseInt(sourceTermsArray[i]) < parseInt(targetTermsArray[i])) {
            isSrcFirst = true
            break
          }
        }

        let d = new Dialog({
          title: object.name,
          content: `<p>${game.i18n?.localize('GURPS.dropResolve')}</p>`,
          buttons: {
            one: {
              icon: '<i class="fas fa-level-up-alt"></i>',
              label: `${game.i18n?.localize('GURPS.dropBefore')}`,
              callback: async () => {
                if (!isSrcFirst) {
                  await this._removeKey(sourceKey)
                  await this._insertBeforeKey(targetkey, object)
                } else {
                  await this._insertBeforeKey(targetkey, object)
                  await this._removeKey(sourceKey)
                }
              },
            },
            two: {
              icon: '<i class="fas fa-sign-in-alt"></i>',
              label: `${game.i18n?.localize('GURPS.dropInside')}`,
              callback: async () => {
                let key = targetkey + '.contains.' + zeroFill(0)
                if (!isSrcFirst) {
                  await this._removeKey(sourceKey)
                  await this._insertBeforeKey(key, object)
                } else {
                  await this._insertBeforeKey(key, object)
                  await this._removeKey(sourceKey)
                }
              },
            },
          },
          default: 'one',
        })
        d.render(true)
      }
    }
  }

  /* ---------------------------------------- */

  async _insertBeforeKey(targetKey: string, element: any) {
    // target key is the whole path, like 'data.melee.00001'
    let components = targetKey.split('.')

    let index = parseInt(components.pop()!)
    let path = components.join('.')

    let object = GURPS.decode(this.actor, path)
    let array = objectToArray(object)

    // Delete the whole object.
    let last = components.pop()
    let t = `${components.join('.')}.-=${last}`
    await this.actor.internalUpdate({ [t]: null })

    // Insert the element into the array.
    array.splice(index, 0, element)

    // Convert back to an object
    object = arrayToObject(array, 5)

    // update the actor
    await this.actor.internalUpdate({ [path]: object }, { diff: false })
  }

  /* ---------------------------------------- */

  async _removeKey(sourceKey: string) {
    // source key is the whole path, like 'data.melee.00001'
    let components = sourceKey.split('.')

    let index = parseInt(components.pop()!)
    let path = components.join('.')

    let object = GURPS.decode(this.actor, path)
    let array = objectToArray(object)

    // Delete the whole object.
    let last = components.pop()
    let t = `${components.join('.')}.-=${last}`
    await this.actor.internalUpdate({ [t]: null })

    // Remove the element from the array
    array.splice(index, 1)

    // Convert back to an object
    object = arrayToObject(array, 5)

    // update the actor
    await this.actor.internalUpdate({ [path]: object }, { diff: false })
  }

  /* ---------------------------------------- */

  _onfocus(ev: JQuery.Event) {
    ev.preventDefault()
    GURPS.SetLastActor(this.actor)
  }

  /* ---------------------------------------- */

  override setPosition(options = {}) {
    const position = super.setPosition(options) || this.position
    const sheetBody = $(this.element).find('.sheet-body')
    if (!!position.height) {
      if (position.height === 'auto') return position
      const bodyHeight = position.height - 192
      sheetBody.css('height', bodyHeight)
    }
    return position
  }

  /* ---------------------------------------- */

  override get title() {
    const t = this.actor.name
    const sheet = this.actor.getFlag('core', 'sheetClass')
    return sheet === 'gurps.GurpsActorEditorSheet' ? '**** Editing: ' + t + ' ****' : t
  }

  /* ---------------------------------------- */

  /**
   * Override this to change the buttons appended to the actor sheet title bar.
   */
  getCustomHeaderButtons() {
    const sheet = this.actor.getFlag('core', 'sheetClass')
    const isEditor = sheet === 'gurps.GurpsActorEditorSheet'
    const altsheet = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ALT_SHEET) ?? ''

    const isFull = sheet === undefined || sheet === 'GURPS.ActorSheetGURPS'

    let b = [
      {
        label: isFull ? altsheet : 'Full View',
        class: 'toggle',
        icon: 'fa-solid fa-exchange-alt',
        action: 'toggleSheet',
      },
    ]

    if (!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_BLOCK_IMPORT) || game.user?.isTrusted)
      b.push({
        label: 'Import',
        class: 'import',
        icon: 'fa-solid fa-file-import',
        action: 'fileImport',
      })

    if (!isEditor) {
      b.push({
        label: 'Editor',
        class: 'edit',
        icon: 'fa-solid fa-edit',
        action: 'openEditor',
      })
    }
    return b.map(
      e =>
        `<button type="button" class="header-control fa-solid ${e.class} ${e.icon} icon" data-action=${e.action} data-tooltip="${e.label}" aria-label="${e.label}"></button>`
    )
  }

  /* -------------------------------------------- */

  static async #onSubmit(
    this: ActorSheetGURPS,
    event: Event | SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    event.preventDefault()
    event.stopImmediatePropagation()

    await this.actor.update(formData.object)
  }

  /* -------------------------------------------- */

  static async #onViewImage(this: ActorSheetGURPS, event: PointerEvent): Promise<void> {
    event.preventDefault()
    if (!this.actor.img || this.actor.img === '') return
    const title = this.actor.name
    new ImagePopout(this.actor.img, { title, uuid: this.actor.uuid }).render(true)
  }

  /* -------------------------------------------- */

  static async #onEditImage(this: ActorSheetGURPS, event: PointerEvent): Promise<void> {
    const img = event.currentTarget as HTMLImageElement
    const current = this.actor.img ?? foundry.CONST.DEFAULT_TOKEN
    const fp = new FilePicker({
      type: 'image',
      current: current,
      callback: async (path: string) => {
        img.src = path
        await this.actor.update({ img: path })
        return this.render()
      },
      top: this.position.top! + 40,
      left: this.position.left! + 10,
    })
    await fp.browse(current)
  }

  /* -------------------------------------------- */

  static async #onOpenActiveEffects(this: ActorSheetGURPS, event: PointerEvent): Promise<void> {
    event.preventDefault()

    new GurpsActiveEffectListSheet(this.actor).render(true)
  }

  static async #onFileImport(this: ActorSheetGURPS, event: PointerEvent) {
    event.preventDefault()
    new ActorImporter(this.actor).importActor()
    // this.actor.importCharacter()
  }

  static async #onToggleSheet(this: ActorSheetGURPS, event: PointerEvent) {
    event.preventDefault()
    const altsheet = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ALT_SHEET) ?? ''
    let newSheet = CONFIG.Actor.sheetClasses['character'][altsheet].id

    const original =
      this.actor.getFlag('core', 'sheetClass') ||
      Object.values(CONFIG.Actor.sheetClasses['character']).filter(s => s.default)[0].id

    if (original != 'gurps.ActorSheetGURPS') newSheet = 'gurps.ActorSheetGURPS'
    if (event.shiftKey)
      // Hold down the shift key for Simplified
      newSheet = 'gurps.ActorSimplifiedSheetGURPS'
    if (game.keyboard?.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL))
      // Hold down the Ctrl key (Command on Mac) for Simplified
      newSheet = 'gurps.NPCSheetGURPS'

    this.actor.openSheet(newSheet)
  }

  static async #onOpenEditor(this: ActorSheetGURPS, event: PointerEvent) {
    event.preventDefault()
    this.actor.openSheet('gurps.GurpsActorEditorSheet')
  }

  async _onRightClickGurpslink(event: JQuery.ContextMenuEvent) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let action = el.dataset.action
    if (!!action) {
      action = JSON.parse(atou(action))
      if (action.type === 'damage' || action.type === 'deriveddamage') {
        GURPS.resolveDamageRoll(event, this.actor, action.orig, action.overridetxt, game.user?.isGM, true)
      } else {
        GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, this.actor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
      }
    }
  }

  async _onRightClickPdf(event: JQuery.ContextMenuEvent) {
    event.preventDefault()
    let el = event.currentTarget
    GURPS.whisperOtfToOwner('PDF:' + el.innerText, null, event, false, this.actor)
  }

  async _onRightClickGmod(event: JQuery.ContextMenuEvent) {
    event.preventDefault()
    let el = event.currentTarget
    let n = el.dataset.name
    let t = el.innerText
    GURPS.whisperOtfToOwner(t + ' ' + n, null, event, false, this.actor)
  }

  async _onRightClickOtf(event: JQuery.ContextMenuEvent) {
    event.preventDefault()
    let el = event.currentTarget
    let isDamageRoll = el.dataset.hasOwnProperty('damage')
    let otf = event.currentTarget.dataset.otf

    if (isDamageRoll) {
      GURPS.resolveDamageRoll(event, this.actor, otf, null, game.user?.isGM)
    } else {
      GURPS.whisperOtfToOwner(event.currentTarget.dataset.otf, null, event, !isDamageRoll, this.actor) // Can't blind roll damages (yet)
    }
  }

  async _onClickRoll(event: JQuery.Event, targets: string[] = []) {
    GURPS.handleRoll(event, this.actor, { targets: targets })
  }

  async _onClickSplit(event: JQuery.ClickEvent) {
    let element = event.currentTarget
    let key = element.dataset.key
    new SplitDREditor(this.actor, key).render(true)
  }

  async _onNavigate(event: JQuery.ClickEvent) {
    let dataValue = $(event.currentTarget).attr('data-value')
    let windowContent = event.currentTarget.closest('.window-content')
    let target = windowContent.querySelector(`#${dataValue}`)

    if (!target) return // If they click on a section that isn't on the sheet (like ranged)

    // The '33' represents the height of the window title bar + a bit of margin
    // TODO: we should really look this up and use the actual values as found in the DOM.
    windowContent.scrollTop = target.offsetTop - 33

    // add the glowing class to target AND to event.currentTarget, then remove it
    $(target).addClass('glowing')
    $(event.currentTarget).addClass('glowing')

    setTimeout(function () {
      $(target).removeClass('glowing')
      $(event.currentTarget).removeClass('glowing')
    }, 2000)
  }

  async _onClickEnc(ev: JQuery.ClickEvent) {
    ev.preventDefault()
    if (!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE)) {
      let element = ev.currentTarget
      let key = element.dataset.key
      //////////
      // Check for 'undefined' when clicking on Encumbrance Level 'header'. ~Stevil
      if (key !== undefined) {
        //////////
        // @ts-expect-error: awaiting types implementation
        let encs = this.actor.system.encumbrance
        if (encs[key].current) return // already selected
        for (let enckey in encs) {
          let enc = encs[enckey]
          let t = 'system.encumbrance.' + enckey + '.current'
          if (key === enckey) {
            await this.actor.internalUpdate({
              [t]: true,
              'system.currentmove': parseInt(enc.move),
              'system.currentdodge': parseInt(enc.dodge),
            })
          } else if (enc.current) {
            await this.actor.internalUpdate({ [t]: false })
          }
        }
        //////////
      }
      //////////
    } else {
      ui.notifications?.warn(
        "You cannot manually change the Encumbrance level. The 'Automatically calculate Encumbrance Level' setting is turned on."
      )
    }
  }

  async _onClickEquip(ev: JQuery.ClickEvent) {
    ev.preventDefault()
    let element = ev.currentTarget
    let key = element.dataset.key
    if (!(await this.actor._sanityCheckItemSettings(GURPS.decode(this.actor, key)))) return
    let eqt = foundry.utils.duplicate(GURPS.decode(this.actor, key))
    eqt.equipped = !eqt.equipped
    await this.actor.updateItemAdditionsBasedOn(eqt, key)
    await this.actor.internalUpdate({ [key]: eqt })
    if (!!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      let item = this.actor.items.get(eqt.itemid)
      if (!item) return
      // @ts-expect-error: awaiting types implementation
      item.system.equipped = eqt.equipped
      // @ts-expect-error: awaiting types implementation
      item.system.eqt.equipped = eqt.equipped
      await this.actor._updateItemFromForm(item)
    }
    let p = this.actor.getEquippedParry()
    let b = this.actor.getEquippedBlock()
    await this.actor.internalUpdate({
      'system.equippedparry': p,
      'system.equippedblock': b,
    })
    this.actor._forceRender()
  }

  deleteItemMenu(_obj: any) {
    return [
      {
        name: 'Delete',
        icon: "<i class='fas fa-trash'></i>",
        callback: async (e: HTMLElement) => {
          let key = e.dataset.key
          if (!key) return
          if (!!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
            // We need to remove linked item
            const actorComponent = foundry.utils.getProperty(this.actor, key)
            const existingItem = this.actor.items.get(actorComponent.itemid)
            if (!!existingItem) {
              this.actor._removeItemAdditions(existingItem.id!)
              await existingItem.delete()
            }
          } else {
            if (key.includes('.equipment.')) this.actor.deleteEquipment(key)
          }
          GURPS.removeKey(this.actor, key)
          await this.actor.refreshDR()
        },
      },
    ]
  }
}

namespace ActorSheetGURPS {
  export type RenderContext = AnyObject
}
export { ActorSheetGURPS }
