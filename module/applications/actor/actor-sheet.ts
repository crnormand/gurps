import * as settings from '../../../lib/miscellaneous-settings.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'
import { arrayToObject, atou, isEmptyObject, objectToArray, zeroFill } from '../../../lib/utilities.js'
import { AnyMutableObject, AnyObject, DeepPartial, EmptyObject } from 'fvtt-types/utils'
import GurpsActiveEffectListSheet from '../../effects/active-effect-list.js'
import { dom } from '../../util/index.js'
import GurpsWiring from '../../gurps-wiring.js'
import SplitDREditor from '../../actor/splitdr-editor.js'
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
import MoveModeEditor from '../../actor/move-mode-editor.js'
import { ResourceTrackerEditor } from '../../actor/resource-tracker-editor.js'
import { ResourceTrackerManager } from '../../actor/resource-tracker-manager.js'
import { cleanTags } from '../../actor/effect-modifier-popout.js'

class GurpsActorSheetV2 extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  /* -------------------------------------------- */
  /*  Basic Functionality                         */
  /* -------------------------------------------- */

  static override DEFAULT_OPTIONS: foundry.applications.api.DocumentSheetV2.PartialConfiguration<
    foundry.applications.api.DocumentSheetV2.Configuration<foundry.abstract.Document.Any>
  > &
    object = {
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
      openActiveEffects: this.#onOpenActiveEffects,
    },
    // @ts-expect-error fvtt-types currently doesn't include dragDrop for DocumentSheetV2
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
        visible: game.settings?.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_SHEET_NAVIGATION) ?? false,
        hasMelee: !isEmptyObject(this.actor.system.melee),
        hasRanged: !isEmptyObject(this.actor.system.ranged),
        hasSpells: !isEmptyObject(this.actor.system.spells),
        hasOther: !isEmptyObject(this.actor.system?.equipment?.other),
      },
      isGM: game.user?.isGM ?? false,
      // _id: olddata._id,
      effects: this.actor.getEmbeddedCollection('ActiveEffect').contents,
      useQN: game.settings?.get(settings.SYSTEM_NAME, settings.SETTING_USE_QUINTESSENCE) ?? false,
      toggleQnotes: this.actor.getFlag('gurps', 'qnotes'),
    }
  }

  /* -------------------------------------------- */

  protected override async _onFirstRender(
    context: DeepPartial<EmptyObject>,
    options: DeepPartial<foundry.applications.api.DocumentSheetV2.RenderOptions>
  ): Promise<void> {
    super._onFirstRender(context, options)
    GURPS.SetLastActor(this.actor)
  }

  /* -------------------------------------------- */

  protected override async _onRender(
    _context: DeepPartial<EmptyObject>,
    _options: DeepPartial<foundry.applications.api.DocumentSheetV2.RenderOptions>
  ): Promise<void> {
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

    this._createHeaderMenus()
  }

  /* -------------------------------------------- */

  // add the default menu items for all tables with a headermenu
  protected _createHeaderMenus(): void {
    const tables = Array.from(dom.querySelectorAll(this.element, '.headermenu')).reduce((acc: HTMLElement[], el) => {
      const table = dom.closest(el, '.gga-table')
      if (table) acc.push(table)
      return acc
    }, [])

    for (const table of tables) {
      const id = `#${table.id}`
      const items = this._getMenuItems(id)
      this._makeHeaderMenu(table, '.headermenu', items, GurpsActorSheetV2.ClickAndContextMenu)
    }

    let trackerMenu = dom.querySelector(this.element, '#combat-trackers')
    if (trackerMenu) {
      this._makeHeaderMenu(
        trackerMenu,
        '.headermenu',
        [
          {
            name: game.i18n?.localize('GURPS.addTracker') ?? '',
            icon: '<i class="fa-solid fa-plus icon"></i>',
            callback: () => {
              this._addTracker().then()
            },
          },
        ],
        GurpsActorSheetV2.ClickAndContextMenu
      )
    }
  }

  /* -------------------------------------------- */

  protected _createGlobalItemMenus(): void {
    const options = [
      this._createMenu(
        game.i18n?.localize('GURPS.delete') ?? '',
        '<i class="fa-solid fa-trash icon"></i>',
        this._deleteItem.bind(this),
        this._isRemovable.bind(this)
      ),
    ]

    new foundry.applications.ux.ContextMenu<false>(this.element, '.adsdraggable', options, { eventName: 'contextmenu' })
    new foundry.applications.ux.ContextMenu<false>(this.element, '.skldraggable', options, { eventName: 'contextmenu' })
    new foundry.applications.ux.ContextMenu<false>(this.element, '.spldraggable', options, { eventName: 'contextmenu' })
  }

  /* -------------------------------------------- */

  protected _createEquipmentItemMenus(): void {
    // NOTE: should this be re-thought so it doesn't necessitate keeping sheet class
    // definitions in the same file to avoid circular dependencies?
    const includeCollapsed = this instanceof GurpsActorEditorSheetV2

    const options = [
      this._createMenu(
        game.i18n?.localize('GURPS.edit') ?? '',
        '<i class="fa-solid fa-edit icon"></i>',
        this._editEquipment.bind(this)
      ),
      this._createMenu(
        game.i18n?.localize('GURPS.sortContentsAscending') ?? '',
        '<i class="fa-solid fa-sort-amount-down-alt icon"></i>',
        this._sortContentAscending.bind(this),
        this._isSortable.bind(this, includeCollapsed)
      ),
      this._createMenu(
        game.i18n?.localize('GURPS.sortContentsDescending') ?? '',
        '<i class="fa-solid fa-sort-amount-down icon"></i>',
        this._sortContentDescending.bind(this),
        this._isSortable.bind(this, includeCollapsed)
      ),
      this._createMenu(
        game.i18n?.localize('GURPS.delete') ?? '',
        '<i class="fa-solid fa-trash icon"></i>',
        this._deleteItem.bind(this)
      ),
    ]

    const moveUp = this._createMenu(
      game.i18n?.localize('GURPS.moveToCarriedEquipment') ?? '',
      '<i class="fa-solid fa-level-up-alt icon"></i>',
      this._moveEquipment.bind(this, 'system.equipment.carried')
    )

    const moveDown = this._createMenu(
      game.i18n?.localize('GURPS.moveToOtherEquipment') ?? '',
      '<i class="fa-solid fa-level-down-alt icon"></i>',
      this._moveEquipment.bind(this, 'system.equipment.other')
    )

    new foundry.applications.ux.ContextMenu<false>(this.element, '.equipmenucarried', [moveDown, ...options], {
      eventName: 'contextmenu',
    })
    new foundry.applications.ux.ContextMenu<false>(this.element, '.equipmenuother', [moveUp, ...options], {
      eventName: 'contextmenu',
    })
  }

  /* -------------------------------------------- */

  protected _editEquipment(target: HTMLElement): void {
    const path = target.dataset.key ?? null
    if (path === null) {
      console.error('GurpsActorSheetV2._editEquipment: No path found')
      return
    }

    const o = foundry.utils.duplicate(GURPS.decode(this.actor, path))
    this.editEquipment(this.actor, path, o)
  }

  /* -------------------------------------------- */

  protected _createMenu(
    name: string,
    icon: string,
    callback: (element: HTMLElement) => void,
    condition: (...args: any[]) => boolean = () => true
  ): foundry.applications.ux.ContextMenu.Entry<HTMLElement> {
    return {
      name,
      icon,
      callback,
      condition,
    }
  }

  /* -------------------------------------------- */

  protected _deleteItem(target: HTMLElement): void {
    const key = target.dataset.key ?? ''
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS) === false) {
      if (key.includes('.equipment')) this.actor.deleteEquipment(key)
      else GURPS.removeKey(this.actor, key)
      this.actor.refreshDR().then()
    } else {
      const item = this.actor.items.get(GURPS.decode(this.actor, key).itemid)
      if (!item) return

      this.actor._removeItemAdditions(item.id).then(() => {
        this.actor.deleteEmbeddedDocuments('Item', [item.id]).then(() => {
          GURPS.removeKey(this.actor, key)
          this.actor.refreshDR().then()
        })
      })
    }
  }

  /* -------------------------------------------- */

  protected _sortContentAscending(target: HTMLElement): void {
    this._sortContent(target.dataset.key ?? null, 'contains', false)
    this._sortContent(target.dataset.key ?? null, 'collapsed', false)
  }

  /* -------------------------------------------- */

  protected _sortContentDescending(target: HTMLElement): void {
    this._sortContent(target.dataset.key ?? null, 'contains', true)
    this._sortContent(target.dataset.key ?? null, 'collapsed', true)
  }

  /* -------------------------------------------- */

  protected async _sortContent(parentPath: string | null, objectKey: string, reverse: boolean): Promise<void> {
    if (parentPath === null) return

    const key = parentPath + '.' + objectKey
    // Copy the list to a local variable before deleting the actor copy.
    // Using a type assertion here as the types can't be defined when using getProperty in this way
    const list = foundry.utils.getProperty(this.actor, key) as Record<string, { name: string }>
    const deleteKey = parentPath + '.-=' + objectKey

    // Delete the whole object
    await this.actor.internalUpdate({ [deleteKey]: null })

    const sortedList = {}
    let index = 0
    Object.values(list)
      .sort((a, b) => (reverse ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)))
      .forEach(item => GURPS.put(sortedList, item, index++))

    await this.actor.internalUpdate({ [key]: sortedList })
  }

  /* -------------------------------------------- */

  /**
   * @param list - The system path to the list to move the item to
   * @param target - The target element that was clicked
   */
  protected _moveEquipment(list: string, target: HTMLElement): void {
    const path = target.dataset.key ?? null
    if (path === null) {
      console.error('GurpsActorSheetV2._moveEquipment: No path found')
      return
    }

    this.actor.moveEquipment(path, list)
  }

  /* -------------------------------------------- */

  protected _hasContents(target: HTMLElement): boolean {
    const path = target.dataset.key
    if (path === null) {
      console.error('GurpsActorSheetV2._hasContents: No path found')
      return false
    }
    const elements = dom.siblings(target, `.desc[data-key="${path}.contains"]`)
    return elements.length > 0
  }

  /* -------------------------------------------- */

  /**
   * @returns true if the object is a container ... ie, it has a non-empty contains collection
   */
  protected _isSortable(includeCollapsed: boolean, target: HTMLElement): boolean {
    const path = target.dataset.key
    if (path === null) {
      console.error('GurpsActorSheetV2._isSortable: No path found')
      return false
    }

    const item = GURPS.decode(this.actor, path)
    if (item?.contains && Object.keys(item.conntains).length > 1) return true
    if (includeCollapsed) return item?.collapsed && Object.keys(item?.collapsed).length > 1
    return false
  }

  /* -------------------------------------------- */

  protected _isRemovable(target: HTMLElement): boolean {
    const path = target.dataset.key
    if (path === null) {
      console.error('GurpsActorSheetV2._isRemovable: No path found')
      return false
    }

    const item = GURPS.decode(this.actor, path)
    return !!this.actor.items.get(item.itemid)?.system.globalid
  }

  /* -------------------------------------------- */

  protected _getMenuItems(elementId: string) {
    const map: Record<string, foundry.applications.ux.ContextMenu.Entry<HTMLElement>[]> = {
      '#ranged': [this._sortAscendingMenu('system.ranged'), this._sortDescendingMenu('system.ranged')],
      '#melee': [this._sortAscendingMenu('system.melee'), this._sortDescendingMenu('system.melee')],
      '#advantages': [this._sortAscendingMenu('system.ads'), this._sortDescendingMenu('system.ads')],
      '#skills': [this._sortAscendingMenu('system.skills'), this._sortDescendingMenu('system.skills')],
      '#spells': [this._sortAscendingMenu('system.spells'), this._sortDescendingMenu('system.spells')],
      '#equipmentcarried': [
        this._addItemMenu(
          game.i18n?.localize('GURPS.equipment') ?? '',
          new Equipment(`${game.i18n?.localize('GURPS.equipment')}...`, true),
          'system.equipment.carried'
        ),
        this._sortAscendingMenu('system.equipment.carried'),
        this._sortDescendingMenu('system.equipment.carried'),
      ],
      '#equipmentother': [
        this._addItemMenu(
          game.i18n?.localize('GURPS.equipment') ?? '',
          new Equipment(`${game.i18n?.localize('GURPS.equipment')}...`, true),
          'system.equipment.other'
        ),
        this._sortAscendingMenu('system.equipment.other'),
        this._sortDescendingMenu('system.equipment.other'),
      ],
    }
    return elementId in map ? map[elementId] : []
  }

  /* -------------------------------------------- */

  protected _addItemMenu(
    name: string,
    object: Equipment,
    path: string
  ): foundry.applications.ux.ContextMenu.Entry<HTMLElement> {
    return {
      name: game.i18n?.format('GURPS.editorAddItem', { name: name }) ?? '',
      icon: '<i class="fa-solid fa-plus icon"></i>',
      callback: async () => {
        if (path.includes('system.equipment')) {
          if (!!game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
            object.save = true
            let payload = object.toItemData(this.actor, '')
            const [item] = await this.actor.createEmbeddedDocuments('Item', [payload])
            object.itemid = item._id
          }
          if (!object.uuid)
            object.uuid = object._getGGAId({ name: object.name, type: path.split('.')[1], generator: '' })
        }
        let o = GURPS.decode(this.actor, path) || {}
        GURPS.put(o, foundry.utils.duplicate(object))
        await this.actor.internalUpdate({ [path]: o })
      },
    }
  }

  /* -------------------------------------------- */

  protected _makeListDrag(element: HTMLElement, cls: string, type: string) {
    dom.querySelectorAll(element, cls).forEach(item => {
      item.setAttribute('draggable', 'true')

      item.addEventListener('dragstart', event => {
        let oldd = event.dataTransfer?.getData('text/plain')
        let eqtkey = (event.currentTarget as HTMLElement).dataset.key ?? ''
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
          if (itemData) img.src = itemData.img
          const w = 50
          const h = 50
          const preview = DragDrop.createDragImage(img, w, h)
          event.dataTransfer?.setDragImage(preview, 0, 0)
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
        return event.dataTransfer?.setData('text/plain', payload)
      })
    })
  }

  /* -------------------------------------------- */

  protected async _addNote(event: Event): Promise<void> {
    const parent = dom.closest(event.currentTarget as HTMLElement, '.header')
    if (!parent) {
      console.error('GurpsActorSheetV2._addNote: No parent found')
      return
    }

    const path = parent?.getAttribute('data-key')
    if (!path) {
      console.error('GurpsActorSheetV2._addNote: No path found')
      return
    }

    const actor = this.actor
    let list = foundry.utils.duplicate(foundry.utils.getProperty(actor, path))
    let note = new Note('', true)
    let dlgHtml = await renderTemplate('systems/gurps/templates/note-editor-popup.hbs', note)

    // TODO: re-do with DialogV2
    let d = new Dialog(
      {
        title: 'Note Editor',
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Create',
            callback: async html => {
              ;['notes', 'pageref', 'title'].forEach(a => (note[a] = html.find(`.${a}`).val()))
              let u = html.find('.save') // Should only find in Note (or equipment)
              if (!!u) note.save = u.is(':checked')
              GURPS.put(list, note)
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

  /* -------------------------------------------- */

  protected async _addTracker(): Promise<void> {
    this.actor.addTracker()
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

  protected _handleDoubleClickEditDrop(event: Event): void {
    const parent = dom.closest(event.currentTarget as HTMLElement, '[data-key]')
    const path = parent?.dataset.key
    this._dropFoundryLinks(event, path + '.notes')
  }

  /* -------------------------------------------- */

  protected _handleQuickNoteDrop(event: Event): void {
    this._dropFoundryLinks(event, 'system.additionalresources.qnotes')
  }

  /* -------------------------------------------- */

  protected _getItemData(dragData: {
    type: string
    id: string
    uuid: string
    [key: string]: unknown
  }): { n: string; id: string | null } | EmptyObject {
    let item: JournalEntry | Actor | RollTable | Item | JournalEntryPage | null = null

    switch (dragData.type) {
      case 'JournalEntry':
        // @ts-expect-error: game.journal may be typed incorrectly
        item = game.journal?.get(dragData.id) ?? null
        break
      case 'Actor':
        item = game.actors?.get(dragData.id) ?? null
        break
      case 'RollTable':
        // @ts-expect-error: game.tables may be typed incorrectly
        item = game.tables?.get(dragData.id) ?? null
        break
      case 'Item':
        item = game.items?.get(dragData.id) ?? null
        break
      case 'JournalEntryPage':
        const journal = game.journal?.get(dragData.id)
        item = journal?.pages.get(dragData.uuid.split('.').at(-1) ?? '') ?? null
        break
    }

    const equipmentAsItem = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS) ?? false
    if (item === null) return {}

    return !(item instanceof Item) || (equipmentAsItem && item.type !== 'equipment') || !equipmentAsItem
      ? {
          n: item.name,
          id: item.id,
        }
      : {}
  }

  /* -------------------------------------------- */

  /**
   * Drop a foundry link into a text area
   *
   * FIXME: Not sure why this exists. Maybe is important to link the item
   *    on another item?
   *
   * To resolve the drag and drop of Foundry Items when using Equipment as Item,
   * we will add the link only for non equipment items
   */
  protected _dropFoundryLinks(event: Event, modelKey: string) {
    // NOTE: I don't think this applies when the event is not a JQuery event
    if (!!event.originalEvent) event = event.originalEvent

    // NOTE: this seems to assume a drop event, but the function is sometimes called from a click event
    let dragData = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '')
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
      dragData.bucket.forEach(otf => {
        add += sep + '/r [' + otf + ']'
        sep = '\\\\'
      })
      add += ']'
    }

    if (!!add)
      if (!!modelKey) {
        let t = foundry.utils.getProperty(this.actor, modelKey) || ''
        this.actor.internalUpdate({ [modelKey]: t + (t ? ' ' : '') + add })
      } else {
        let t = dom.getValue(event.currentTarget as HTMLElement) || ''
        dom.setValue(event.currentTarget as HTMLElement, t + (t ? ' ' : '') + add)
      }
  }

  /* -------------------------------------------- */

  protected async _editTracker(event: Event): Promise<void> {
    event.preventDefault()

    const path = dom.closest(event.currentTarget as HTMLElement, '[data-gurps-resource]')?.dataset.gurpsResource
    let templates: any[] | null = ResourceTrackerManager.getAllTemplates()
    if (!templates || templates.length == 0) templates = null

    let selectTracker = async function (this: GurpsActorSheetV2, html: HTMLElement) {
      const name = dom.querySelector(html, 'select option:selected')?.textContent?.trim()
      let template = templates?.find(template => template.tracker.name === name)
      await this.actor.applyTrackerTemplate(path, template)
    }

    // show dialog asking if they want to apply a standard tracker, or edit this tracker
    let buttons: Record<string, foundry.applications.api.DialogV2.Button<void>> = {
      edit: {
        icon: '<i class="fas fa-edit"></i>',
        label: game.i18n?.localize('GURPS.resourceEditTracker') ?? '',
        action: '',
        callback: () => ResourceTrackerEditor.editForActor(this.actor, path),
      },
      remove: {
        icon: '<i class="fas fa-trash"></i>',
        label: game.i18n?.localize('GURPS.resourceDeleteTracker') ?? '',
        action: '',
        callback: async () => await this.actor.removeTracker(path),
      },
    }

    if (!!templates) {
      buttons.apply = {
        icon: '<i class="far fa-copy"></i>',
        label: game.i18n?.localize('GURPS.resourceCopyTemplate') ?? '',
        callback: selectTracker.bind(this),
      }
    }

    // TODO: re-do with DialogV2
    let d = new Dialog(
      {
        title: game.i18n?.localize('GURPS.resourceUpdateTrackerSlot') ?? '',
        buttons: buttons,
        content: await renderTemplate('systems/gurps/templates/actor/update-tracker.hbs', { templates: templates }),
        default: 'edit',
        // NOTE: apparently does not exist on this type. To revisit when this part is re-done
        templates: templates,
      },
      { width: 600 }
    )
    d.render(true)
  }

  /* -------------------------------------------- */

  protected async _showActiveEffectsListPopup(event: Event): Promise<void> {
    event.preventDefault()
    new GurpsActiveEffectListSheet(this.actor).render(true)
  }

  /* -------------------------------------------- */

  protected async _showMoveModeEditorPopup(event: Event): Promise<void> {
    event.preventDefault()
    new MoveModeEditor(this.actor).render(true)
  }

  /* -------------------------------------------- */

  async editEquipment(actor: Actor.Implementation, path: string, obj: Equipment) {
    // NOTE:  This code is duplicated above.  Haven't refactored yet
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
              if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
                ;['name', 'uses', 'maxuses', 'techlevel', 'notes', 'pageref'].forEach(
                  a => (obj[a] = html.find(`.${a}`).val())
                )
                ;['count', 'cost', 'weight'].forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val())))
                let u = html.find('.save') // Should only find in Note (or equipment)
                if (!!u && obj.save != null) obj.save = u.is(':checked') // only set 'saved' if it was already defined
                let v = html.find('.ignoreImportQty') // Should only find in equipment
                if (!!v) obj.ignoreImportQty = v.is(':checked')
                await actor.internalUpdate({ [path]: obj })
                await actor.updateParentOf(path, false)
              } else {
                let item = actor.items.get(obj.itemid)
                item.name = obj.name
                item.system.eqt.count = obj.count
                item.system.eqt.cost = obj.cost
                item.system.eqt.uses = obj.uses
                item.system.eqt.maxuses = obj.maxuses
                item.system.eqt.techlevel = obj.techlevel
                item.system.eqt.notes = obj.notes
                item.system.eqt.pageref = obj.pageref
                item.system.itemModifiers = obj.itemModifiers
                await actor._updateItemFromForm(item)
                await actor.updateParentOf(path, false)
              }
            },
          },
        },
        render: h => {
          $(h).find('textarea').on('drop', this._dropFoundryLinks)
          $(h).find('input').on('drop', this._dropFoundryLinks)
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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  async editRanged(actor: Actor.Implementation, path: string, obj: Ranged) {
    if (obj.baseParryPenalty === undefined) obj.baseParryPenalty = -4
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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

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

  /* -------------------------------------------- */

  async editItem(
    actor: Actor.Implementation,
    path: string,
    obj: AnyMutableObject,
    html: string,
    title: string,
    strprops: any[],
    numprops: any[],
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
              strprops.forEach(a => (obj[a] = html.find(`.${a}`).val()))
              numprops.forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val())))

              let q = html.find('.quick-roll')
              if (!!q) obj.addToQuickRoll = q.is(':checked')

              let ca = html.find('.consumeAction')
              if (!!ca) obj.consumeAction = ca.is(':checked')

              let u = html.find('.save') // Should only find in Note (or equipment)
              if (!!u) obj.save = u.is(':checked')

              if (!!obj.modifierTags) obj.modifierTags = cleanTags(obj.modifierTags).join(', ')
              await actor.removeModEffectFor(path)
              await actor.internalUpdate({ [path]: obj })
              const commit = actor.applyItemModEffects({}, true)
              if (commit) {
                await actor.internalUpdate(commit)
                if (canvas.tokens?.controlled && canvas.tokens.controlled.length > 0) {
                  await canvas.tokens?.controlled[0].document.setFlag(
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
          $(h).find('textarea').on('drop', this._dropFoundryLinks)
          $(h).find('input').on('drop', this._dropFoundryLinks)
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

  /* -------------------------------------------- */

  _makeHeaderMenu(
    html: HTMLElement,
    cssclass: string,
    menuitems: foundry.applications.ux.ContextMenu.Entry<HTMLElement>[],
    eventname = 'contextmenu'
  ) {
    eventname.split(' ').forEach(function (e) {
      new foundry.applications.ux.ContextMenu<false>(html, cssclass, menuitems, { eventName: e })
    })
  }

  /* -------------------------------------------- */

  protected _sortAscendingMenu(key: string): foundry.applications.ux.ContextMenu.Entry<HTMLElement> {
    return {
      name: game.i18n?.localize('GURPS.sortAscending') ?? '',
      icon: '<i class="fas fa-sort-amount-down-alt"></i>',
      callback: () => this._sortAscending(key),
    }
  }

  /* -------------------------------------------- */

  protected _sortDescendingMenu(key: string): foundry.applications.ux.ContextMenu.Entry<HTMLElement> {
    return {
      name: game.i18n?.localize('GURPS.sortDescending') ?? '',
      icon: '<i class="fas fa-sort-amount-down"></i>',
      callback: () => this._sortDescending(key),
    }
  }

  /* -------------------------------------------- */

  protected async _sortAscending(key: string): Promise<void> {
    let i = key.lastIndexOf('.')
    let parentpath = key.substring(0, i)
    let objkey = key.substring(i + 1)
    let object = GURPS.decode(this.actor, key) as Record<string, { name: string }>
    let t = parentpath + '.-=' + objkey
    await this.actor.internalUpdate({ [t]: null }) // Delete the whole object
    let sortedobj = {}
    let index = 0
    Object.values(object)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(o => GURPS.put(sortedobj, o, index++))
    await this.actor.internalUpdate({ [key]: sortedobj })
  }

  /* -------------------------------------------- */

  protected async _sortDescending(key: string): Promise<void> {
    let i = key.lastIndexOf('.')
    let parentpath = key.substring(0, i)
    let objkey = key.substring(i + 1)
    let object = GURPS.decode(this.actor, key) as Record<string, { name: string }>
    let t = parentpath + '.-=' + objkey
    await this.actor.internalUpdate({ [t]: null }) // Delete the whole object
    let sortedobj = {}
    let index = 0
    Object.values(object)
      .sort((a, b) => b.name.localeCompare(a.name))
      .forEach(o => GURPS.put(sortedobj, o, index++))
    await this.actor.internalUpdate({ [key]: sortedobj })
  }

  /* -------------------------------------------- */
  /*   Action Handlers                            */
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

/* -------------------------------------------- */

class GurpsActorEditorSheetV2 extends GurpsActorSheetV2 {}

/* -------------------------------------------- */

namespace GurpsActorSheetV2 {
  export type RenderContext = {}
  export const ClickAndContextMenu = 'click contextmenu'

  export type ActorComponent = Advantage | Equipment | Melee | Modifier | Note | Ranged | Reaction | Skill | Spell
}

export { GurpsActorSheetV2 }
