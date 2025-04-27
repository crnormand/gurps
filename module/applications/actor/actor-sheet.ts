import * as settings from '../../../lib/miscellaneous-settings.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'
import { arrayToObject, atou, isEmptyObject, objectToArray, zeroFill } from '../../../lib/utilities.js'
import { AnyObject, DeepPartial, EmptyObject } from 'fvtt-types/utils'
import GurpsActiveEffectListSheet from '../../effects/active-effect-list.js'
import DocumentSheetV2 from 'node_modules/fvtt-types/src/foundry/client-esm/applications/api/document-sheet.mjs'
import { dom } from '../../util/index.js'
import GurpsWiring from '../../gurps-wiring.js'
import SplitDREditor from '../../actor/splitdr-editor.js'
import { isConfigurationAllowed } from '../../game-utils.js'

namespace GurpsActorSheetV2 {
  export type RenderContext = {}
}

interface GurpsActorSheetV2 {
  constructor: typeof GurpsActorSheetV2
}

class GurpsActorSheetV2 extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  /* -------------------------------------------- */
  /*  Basic Functionality                         */
  /* -------------------------------------------- */

  static override DEFAULT_OPTIONS: foundry.applications.api.DocumentSheetV2.PartialConfiguration<foundry.applications.api.DocumentSheetV2.Configuration> =
    {
      tag: 'form',
      classes: ['gurps', 'sheet', 'actor'],
      position: {
        height: 800,
        width: 800,
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false,
        handler: this.#onSubmit,
      },
      window: {
        resizable: true,
      },
      actions: {
        viewImage: this.#onViewImage,
        editImage: this.#onEditImage,
        toggleMode: this.#onToggleMode,
        openActiveEffects: this.#onOpenActiveEffects,
      },
      // @ts-expect-error v12 currently doesn't include dragDrop for DocumentSheetV2
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    }

  /* -------------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/actor/actor-sheet-gcs.hbs',
      scrollable: [
        '.gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipmentcarried #equipmentother #notes',
      ],
    },
  }

  /* -------------------------------------------- */

  /**
   * @param tabs - Record of tabs to mark
   * @returns Record of tabs, with active tab marked as active
   */
  protected _markTabs(
    tabs: Record<string, Partial<foundry.applications.types.ApplicationTab>>
  ): Record<string, Partial<foundry.applications.types.ApplicationTab>> {
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group!] === v.id
      v.cssClass = v.active ? 'active' : ''
      if ('tabs' in v) this._markTabs(v.tabs as Record<string, Partial<foundry.applications.types.ApplicationTab>>)
    }
    return tabs
  }

  /* -------------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<GurpsActorSheetV2.RenderContext> {
    const data = await super._prepareContext(options)

    const actions = {}
    // TODO: remove once move to DataModel for actor is complete
    // this makes the assumption that the model is missing some properties
    // and correts for it. It should not be missing those in the first place.
    if (!this.actor.system.conditions.actions?.maxActions) actions['maxActions'] = 1
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
      eqtsummary: this.actor.system.eqtsummary,
      navigateBar: {
        visible: game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_SHEET_NAVIGATION),
        hasMelee: !isEmptyObject(this.actor.system.melee),
        hasRanged: !isEmptyObject(this.actor.system.ranged),
        hasSpells: !isEmptyObject(this.actor.system.spells),
        hasOther: !isEmptyObject(this.actor.system?.equipment?.other),
      },
      isGM: game.user.isGM,
      // _id: olddata._id,
      effects: this.actor.getEmbeddedCollection('ActiveEffect').contents,
      useQN: game.settings.get(settings.SYSTEM_NAME, settings.SETTING_USE_QUINTESSENCE),
      toggleQnotes: this.actor.getFlag('gurps', 'qnotes'),
    }
  }

  /* -------------------------------------------- */

  protected override _onFirstRender(
    context: DeepPartial<EmptyObject>,
    options: DeepPartial<DocumentSheetV2.RenderOptions>
  ): void {
    super._onFirstRender(context, options)
    GURPS.SetLastActor(this.actor)
  }

  /* -------------------------------------------- */

  protected override _onRender(
    context: DeepPartial<EmptyObject>,
    options: DeepPartial<DocumentSheetV2.RenderOptions>
  ): void {
    // Set Last Actor when sheet is clicked on
    dom.querySelector(this.element, '.gurpsactorsheet')?.addEventListener('click', event => this._onClickSheet(event))
    dom.siblings(dom.querySelector(this.element, '.window-content'), '.window-header')?.forEach(header => {
      header.addEventListener('click', event => this._onClickSheet(event))
    })

    // Click on a navigation-link to scroll the sheet to that section.
    dom.querySelectorAll(this.element, '.navigation-link').forEach(link => {
      link.addEventListener('click', event => this._onClickNavigate(event))
    })

    // Enable some fields to be a targeted roll without an OTF.
    dom.querySelectorAll(this.element, '.rollable').forEach(rollable => {
      rollable.addEventListener('click', event => this._onClickRoll(event))
    })

    // Wire events to all OTFs on the sheet.
    GurpsWiring.hookupAllEvents($(this.element))

    // Allow OTFs on this actor sheet to be draggable.
    dom.querySelectorAll(this.element, '[data-otf]').forEach(element => {
      element.setAttribute('draggable', 'true')
      element.addEventListener('dragstart', event => {
        let display = ''
        if (!!element.dataset.action) display = element.innerText
        return event.dataTransfer?.setData(
          'text/plain',
          JSON.stringify({
            otf: element.getAttribute('data-otf'),
            actor: this.actor.id,
            encodedAction: element.dataset.action,
            displayname: display,
          })
        )
      })
    })

    // open the split DR dialog
    dom.querySelectorAll(this.element, '.dr button[data-key]').forEach(button => {
      button.addEventListener('click', event => this._onClickDrSplit(event))
    })

    // Only allow "owners" to be able to edit the sheet, but anyone can roll from the sheet
    if (!isConfigurationAllowed(this.actor)) return

    this._createHeaderMenus(this.element)
  }

  /* -------------------------------------------- */

  // add the default menu items for all tables with a headermenu
  protected _createHeaderMenus(element: HTMLElement): void {
    const tables = Array.from(dom.querySelectorAll(element, '.headermenu')).reduce((acc: HTMLElement[], el) => {
      const table = dom.closest(el, '.gga-table')
      if (table) acc.push(table)
      return acc
    }, [])

    for (const table of tables) {
      const id = `#${table.id}`
    }
  }
  /* -------------------------------------------- */

  protected override _onClose(options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>): void {
    super._onClose(options)
    GURPS.ClearLastActor(this.actor)
  }

  /* -------------------------------------------- */

  /**
   * Adds toggle switch to header
   */
  protected override async _renderFrame(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>
  ): Promise<HTMLElement> {
    const frame = await super._renderFrame(options)

    // if (this.isEditable) {
    //   const toggleLabel = game.i18n?.localize('GURPS.Sheet.Common.ToggleMode')
    //   const toggleIcon =
    //     this._mode === this.constructor.MODES.EDIT ? 'fa-solid fa-unlock icon' : 'fa-solid fa-lock icon'
    //   const toggleButton = `<button type='button' class='header-control ${toggleIcon}' data-action='toggleMode' data-tooltip='${toggleLabel}' aria-label='${toggleLabel}'></button>`
    //   this.window.controls?.insertAdjacentHTML('beforebegin', toggleButton)
    // }

    return frame
  }

  /* -------------------------------------------- */
  /*   Event Handlers                             */
  /* -------------------------------------------- */

  protected _onClickSheet(event: MouseEvent): void {
    event.preventDefault()
    GURPS.SetLastActor(this.actor)
  }

  /* -------------------------------------------- */

  protected _onClickNavigate(event: MouseEvent): void {
    event.preventDefault()
    const button = event.currentTarget as HTMLElement
    const value = button.dataset.value
    const windowContent = dom.querySelector(this.element, '.window-content')
    const scrollTarget = dom.querySelector(windowContent, `#${value}`)

    if (!scrollTarget) return // If they click on a section that isn't on the sheet (like ranged)

    scrollTarget.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' })

    button.classList.add('glowing')
    scrollTarget.classList.add('glowing')

    setTimeout(() => {
      button.classList.remove('glowing')
      scrollTarget.classList.remove('glowing')
    }, 2000)
  }

  /* -------------------------------------------- */

  protected _onClickRoll(event: MouseEvent): void {
    GURPS.handleRoll(event, this.actor, { targets: [] })
  }

  /* -------------------------------------------- */

  protected _onClickDrSplit(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement
    const key = button.dataset.key
    new SplitDREditor(this.actor, key).render(true)
  }

  /* -------------------------------------------- */

  static async #onSubmit(
    this: GurpsActorSheetV2,
    event: Event | SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    event.preventDefault()
    event.stopImmediatePropagation()

    await this.actor.update(formData.object)
  }

  /* -------------------------------------------- */

  static async #onViewImage(this: GurpsActorSheetV2, event: Event): Promise<void> {
    event.preventDefault()
    if (!this.actor.img || this.actor.img === '') return
    const title = this.actor.name
    new ImagePopout(this.actor.img, { title, uuid: this.actor.uuid }).render(true)
  }

  /* -------------------------------------------- */

  static async #onEditImage(this: GurpsActorSheetV2, event: Event): Promise<void> {
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

  static async #onOpenActiveEffects(this: GurpsActorSheetV2, event: Event): Promise<void> {
    event.preventDefault()

    new GurpsActiveEffectListSheet(this.actor).render(true)
  }
}
export { GurpsActorSheetV2 }
