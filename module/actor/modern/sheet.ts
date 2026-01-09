import type {
  DeepPartial,
  ActorSheetV2Configuration,
  ActorSheetV2RenderOptions,
  ActorSheetV2RenderContext,
  HandlebarsTemplatePart,
  HeaderControlsEntry,
  HandlebarsActorSheetV2Constructor,
} from '../../types/foundry/actor-sheet-v2.ts'
import type { GurpsActorV2 } from '../gurps-actor.ts'
import * as Settings from '../../../lib/miscellaneous-settings.js'
import EffectPicker from '../effect-picker.js'
import { bindAllInlineEdits, bindAttributeEdit, bindSecondaryStatsEdit, bindPointsEdit } from './inline-edit-handler.ts'
import { bindCrudActions, bindModifierCrudActions } from './crud-handler.ts'
import { entityConfigurations, modifierConfigurations } from './entity-config.ts'
import { bindDropdownToggle } from './dropdown-handler.ts'
import { bindEquipmentCrudActions, bindNoteCrudActions, bindTrackerActions } from './dialog-crud-handler.ts'
import { bindRowExpand, bindSectionCollapse, bindResourceReset, bindContainerCollapse } from './collapse-handler.ts'
import { isPostureOrManeuver } from './utils/effect.ts'
import MoveModeEditor from '../move-mode-editor.js'
import { ImportSettings } from '../../importer/index.js'
import { ActorImporter } from '../actor-importer.js'
import GurpsWiring from '../../gurps-wiring.js'

export function countItems(record: Record<string, EntityComponentBase> | undefined): number {
  if (!record) return 0

  return Object.values(record).reduce((count, item) => {
    const nestedContains = item?.contains ? countItems(item.contains) : 0
    const nestedCollapsed = item?.collapsed ? countItems(item.collapsed) : 0
    return count + 1 + nestedContains + nestedCollapsed
  }, 0)
}

interface ModernSheetContext extends ActorSheetV2RenderContext {
  system: Actor.SystemOfType<'character' | 'characterV2'>
  effects: ActiveEffect[]
  skillCount: number
  traitCount: number
  meleeCount: number
  rangedCount: number
  modifierCount: number
  showHPTinting: boolean
  // Uses getter's union return type since it varies between v1/v2 actor models
  moveMode: GurpsActorV2<Actor.SubType>['currentMoveMode']
  cssClass: string
}

type RenderOptions = ActorSheetV2RenderOptions & { isFirstRender: boolean }

type GurpsActor = GurpsActorV2<Actor.SubType>

// See module/types/foundry/actor-sheet-v2.ts for why we need this type assertion
const SheetBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) as unknown as HandlebarsActorSheetV2Constructor<GurpsActor>

export class GurpsActorModernSheet extends SheetBase {
  tabGroups = {
    'modern-tabs': 'character',
  }

  static override DEFAULT_OPTIONS: DeepPartial<ActorSheetV2Configuration> = {
    classes: ['gurps', 'sheet', 'actor', 'modern-sheet'],
    tag: 'form',
    position: {
      width: 768,
      height: 816,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: false,
    },
    actions: {
      resetHp: GurpsActorModernSheet.#onResetResource,
      resetFp: GurpsActorModernSheet.#onResetResource,
      addEffect: GurpsActorModernSheet.#onAddEffect,
      deleteEffect: GurpsActorModernSheet.#onDeleteEffect,
      importActor: GurpsActorModernSheet.#onImportActor,
      editQuickNotes: GurpsActorModernSheet.#onEditQuickNotes,
      editMoveMode: GurpsActorModernSheet.#onEditMoveMode,
    },
  }

  static override PARTS: Record<string, HandlebarsTemplatePart> = {
    sheet: {
      template: 'systems/gurps/templates/actor/actor-modern-sheet.hbs',
      scrollable: ['.ms-body .tab'],
    },
  }

  get template(): string {
    if (!game.user!.isGM && this.actor.limited) {
      return 'systems/gurps/templates/actor/actor-sheet-gcs-limited.hbs'
    }
    return 'systems/gurps/templates/actor/actor-modern-sheet.hbs'
  }

  protected override async _prepareContext(options: RenderOptions): Promise<ModernSheetContext> {
    const baseContext = await super._prepareContext(options)
    const actorSystem = this.actor.system as Actor.SystemOfType<'character' | 'characterV2'>

    const effects = this.actor.effects.contents.filter(effect => !isPostureOrManeuver(effect))

    const context: ModernSheetContext = {
      ...baseContext,
      actor: this.actor,
      system: actorSystem,
      effects,
      skillCount: countItems(actorSystem?.skills),
      traitCount: countItems(actorSystem?.ads),
      meleeCount: countItems(actorSystem?.melee),
      rangedCount: countItems(actorSystem?.ranged),
      modifierCount:
        Object.keys(actorSystem?.reactions ?? {}).length + Object.keys(actorSystem?.conditionalmods ?? {}).length,
      showHPTinting: game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_PORTRAIT_HP_TINTING) as boolean,
      moveMode: this.actor.currentMoveMode,
      cssClass: 'gurps sheet actor modern-sheet',
    }

    return context
  }

  override _getHeaderControls(): HeaderControlsEntry[] {
    const controls = super._getHeaderControls()

    const blockImport = ImportSettings.onlyTrustedUsersCanImport
    if (!blockImport || game.user!.isTrusted) {
      controls.unshift({
        icon: 'fas fa-file-import',
        label: 'Import',
        action: 'importActor',
      })
    }

    return controls
  }

  protected override async _onRender(context: ActorSheetV2RenderContext, options: RenderOptions): Promise<void> {
    super._onRender(context, options)

    const html = this.element

    // Bind inline edit handlers (click-to-edit pattern)
    bindAllInlineEdits(html, this.actor)
    bindAttributeEdit(html, this.actor)
    bindSecondaryStatsEdit(html, this.actor)
    bindPointsEdit(html, this.actor)

    // Bind resource reset handlers - note: these are now handled by actions system
    // but keeping for complex multi-resource configs
    bindResourceReset(html, this.actor, [
      {
        selector: '.ms-resource-reset[data-action="reset-hp"]',
        resourcePath: 'system.HP.value',
        maxPath: 'system.HP.max',
      },
      {
        selector: '.ms-resource-reset[data-action="reset-fp"]',
        resourcePath: 'system.FP.value',
        maxPath: 'system.FP.max',
      },
    ])

    // Bind row expand/collapse handlers
    bindRowExpand(html, {
      rowSelector: '.ms-skills-row, .ms-traits-row',
      excludeSelectors: ['.ms-use-button', '.expandcollapseicon', '.ms-row-actions'],
    })

    bindSectionCollapse(html, {
      headerSelector: '.ms-section-header.ms-collapsible',
      excludeSelectors: ['.expandcollapseicon', '.ms-add-icon'],
    })

    bindContainerCollapse(html, this.actor.id!, {
      tableSelector: '.ms-traits-table, .ms-skills-table, .ms-spells-table',
      rowSelector: '.ms-traits-row, .ms-skills-row, .ms-spells-row',
      excludeSelectors: ['.ms-row-actions', '.ms-use-button', '.ms-col-otf', '.ms-col-level'],
    })

    // Bind quick notes editor
    const quickNotesContent = html.querySelector('.ms-quicknotes-content')
    quickNotesContent?.addEventListener('dblclick', () => this.#openQuickNoteEditor())

    // Bind CRUD actions for entities
    bindEquipmentCrudActions(html, this.actor, this)
    bindNoteCrudActions(html, this.actor, this)
    bindTrackerActions(html, this.actor)

    // Bind dropdown handlers
    this.#bindPostureActions(html)
    this.#bindManeuverActions(html)
    this.#bindMoveModeActions(html)

    // Bind entity CRUD actions
    this.#bindEntityCrudActions(html)

    // Wire up OTF rollable elements (requires jQuery wrapper for now)
    GurpsWiring.hookupAllEvents($(html))

    // Make OTF elements draggable
    html.querySelectorAll<HTMLElement>('[data-otf]').forEach(element => {
      element.setAttribute('draggable', 'true')
      element.addEventListener('dragstart', (event: DragEvent) => {
        let display = ''
        if (element.dataset.action) display = element.innerText
        event.dataTransfer?.setData(
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

    // Wire rollable elements
    html.querySelectorAll<HTMLElement>('.rollable').forEach(element => {
      element.addEventListener('click', this.#onClickRoll.bind(this))
    })
  }

  // ============================================
  // Static Action Handlers
  // ============================================

  static async #onResetResource(
    this: GurpsActorModernSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()
    const action = target.dataset.action
    if (action === 'resetHp' || action === 'reset-hp') {
      const maxValue = foundry.utils.getProperty(this.actor, 'system.HP.max') as number
      // @ts-expect-error Dynamic path notation
      await this.actor.internalUpdate({ 'system.HP.value': maxValue })
    } else if (action === 'resetFp' || action === 'reset-fp') {
      const maxValue = foundry.utils.getProperty(this.actor, 'system.FP.max') as number
      // @ts-expect-error Dynamic path notation
      await this.actor.internalUpdate({ 'system.FP.value': maxValue })
    }
  }

  static async #onAddEffect(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    new EffectPicker(this.actor).render(true)
  }

  static async #onDeleteEffect(
    this: GurpsActorModernSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()
    event.stopPropagation()
    const effectId = target.dataset.effectId ?? ''
    const effect = this.actor.effects.get(effectId)
    if (!effect) return

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n!.localize('GURPS.delete') },
      content: `<p>${game.i18n!.localize('GURPS.delete')}: <strong>${effect.name}</strong>?</p>`,
    })
    if (confirmed) {
      await effect.delete()
    }
  }

  static async #onImportActor(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    switch (this.actor.type) {
      case 'character':
        return new ActorImporter(this.actor).importActor()
      case 'enemy':
      case 'characterV2':
        // @ts-expect-error GURPS.modules is dynamically populated
        return GURPS.modules.Importer.importGCS(this.actor)
      default:
        throw new Error(`Invalid actor type for import: ${this.actor.type}`)
    }
  }

  static async #onEditQuickNotes(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    await this.#openQuickNoteEditor()
  }

  static async #onEditMoveMode(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    new MoveModeEditor(this.actor).render(true)
  }

  // ============================================
  // Instance Methods
  // ============================================

  async #openQuickNoteEditor(): Promise<void> {
    const actorSystem = this.actor.system as Actor.SystemOfType<'character' | 'characterV2'>
    const noteText = ((actorSystem.additionalresources as { qnotes?: string })?.qnotes || '').replace(/<br>/g, '\n')
    const actor = this.actor

    const dialog = await new foundry.applications.api.DialogV2({
      window: { title: 'Quick Note', resizable: true },
      content: `Enter a Quick Note (a great place to put an On-the-Fly formula!):<textarea rows="4" id="i">${noteText}</textarea><b>Examples:</b>
        [+1 due to shield]<br>[Dodge +3 retreat]<br>[Dodge +2 Feverish Defense *Cost 1FP]`,
      buttons: [
        {
          action: 'save',
          label: 'Save',
          icon: 'fas fa-save',
          callback: (_event: Event, button: HTMLButtonElement) => {
            const form = button.form as HTMLFormElement
            const input = form.elements.namedItem('i') as HTMLTextAreaElement
            const value = input.value
            // @ts-expect-error: Not sure why key is not recognized. TODO: fix
            actor.internalUpdate({ 'system.additionalresources.qnotes': value.replace(/\n/g, '<br>') })
          },
        },
      ],
    }).render({ force: true })

    const textarea = dialog.element.querySelector('textarea') as HTMLTextAreaElement
    textarea.addEventListener('drop', this.dropFoundryLinks.bind(this) as EventListener)
  }

  #bindPostureActions(html: HTMLElement): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-posture-dropdown',
      toggleSelector: '.ms-posture-selected',
      optionSelector: '.ms-posture-option',
      onSelect: (posture: string) => this.actor.replacePosture(posture),
    })
  }

  #bindManeuverActions(html: HTMLElement): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-maneuver-dropdown',
      toggleSelector: '.ms-maneuver-selected',
      optionSelector: '.ms-maneuver-option',
      onSelect: (maneuver: string) => this.actor.replaceManeuver(maneuver),
    })
  }

  #bindMoveModeActions(html: HTMLElement): void {
    const editButton = html.querySelector('.ms-move-mode-edit')
    editButton?.addEventListener('click', () => {
      new MoveModeEditor(this.actor).render(true)
    })

    bindDropdownToggle(html, {
      dropdownSelector: '.ms-move-mode-dropdown',
      toggleSelector: '.ms-move-mode-selected',
      optionSelector: '.ms-move-mode-option',
      onSelect: (mode: string) => this.actor.setMoveDefault(mode),
    })
  }

  #bindEntityCrudActions(html: HTMLElement): void {
    entityConfigurations.forEach(config => {
      const editMethodKey = config.editMethod as keyof this
      const resolvedConfig: EntityConfigWithMethod = {
        ...config,
        editMethod: (this[editMethodKey] as EntityConfigWithMethod['editMethod']).bind(this),
        createArgs: config.createArgs?.(),
      }
      bindCrudActions(html, this.actor, this, resolvedConfig)
    })

    modifierConfigurations.forEach(({ isReaction }) => {
      bindModifierCrudActions(html, this.actor, this, this.editModifier.bind(this), isReaction)
    })
  }

  #onClickRoll(event: MouseEvent): void {
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    const otf = target.dataset.otf
    if (otf) {
      GURPS.performAction({ orig: otf, type: 'skill-spell', actor: this.actor }, this.actor, event)
    }
  }

  // ============================================
  // Edit Methods (from base GurpsActorSheet)
  // ============================================

  async editSkills(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    if (obj.consumeAction === undefined) obj.consumeAction = false
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/skill-editor-popup.hbs',
      'Skill Editor',
      ['name', 'import', 'relativelevel', 'pageref', 'notes', 'checkotf', 'duringotf', 'passotf', 'failotf', 'itemModifiers', 'modifierTags'],
      ['points']
    )
  }

  async editAds(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/advantage-editor-popup.hbs',
      'Trait Editor',
      ['name', 'notes', 'pageref', 'checkotf', 'duringotf', 'passotf', 'failotf', 'itemModifiers', 'modifierTags'],
      ['points']
    )
  }

  async editSpells(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    if (obj.consumeAction === undefined) obj.consumeAction = true
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/spell-editor-popup.hbs',
      'Spell Editor',
      ['name', 'import', 'difficulty', 'pageref', 'notes', 'resist', 'class', 'cost', 'maintain', 'casttime', 'duration', 'college', 'checkotf', 'duringotf', 'passotf', 'failotf', 'itemModifiers', 'modifierTags'],
      ['points']
    )
  }

  async editMelee(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/melee-editor-popup.hbs',
      'Melee Weapon Editor',
      ['name', 'import', 'reach', 'parry', 'block', 'damage', 'st', 'mode', 'notes', 'checkotf', 'duringotf', 'passotf', 'failotf', 'itemModifiers', 'modifierTags'],
      []
    )
  }

  async editRanged(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/ranged-editor-popup.hbs',
      'Ranged Weapon Editor',
      ['name', 'import', 'acc', 'range', 'rof', 'shots', 'rcl', 'bulk', 'damage', 'st', 'mode', 'notes', 'checkotf', 'duringotf', 'passotf', 'failotf', 'itemModifiers', 'modifierTags'],
      []
    )
  }

  async editEquipment(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    const dlgHtml = await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/equipment-editor-popup.hbs',
      obj
    )
    new Dialog(
      {
        title: 'Equipment Editor',
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Update',
            callback: async (html: JQuery) => {
              obj.name = html.find('.name').val() || ''
              obj.notes = html.find('.notes').val() || ''
              obj.pageref = html.find('.pageref').val() || ''
              obj.count = parseFloat(html.find('.count').val() as string) || 0
              obj.cost = parseFloat(html.find('.cost').val() as string) || 0
              obj.weight = parseFloat(html.find('.weight').val() as string) || 0
              obj.carried = html.find('.carried').is(':checked')
              obj.equipped = html.find('.equipped').is(':checked')
              obj.save = html.find('.save').is(':checked')
              actor.editItem(path, obj)
            },
          },
        },
        render: (h: JQuery) => {
          h.find('textarea').on('drop', this.dropFoundryLinks.bind(this) as JQuery.TypeEventHandler<HTMLTextAreaElement, undefined, HTMLTextAreaElement, HTMLTextAreaElement, 'drop'>)
          h.find('input').on('drop', this.dropFoundryLinks.bind(this) as JQuery.TypeEventHandler<HTMLInputElement, undefined, HTMLInputElement, HTMLInputElement, 'drop'>)
        },
      },
      {
        width: 560,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    ).render(true)
  }

  async editNotes(actor: Actor.Implementation, path: string, obj: Record<string, unknown>): Promise<void> {
    await this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/note-editor-popup.hbs',
      'Note Editor',
      ['pageref', 'notes', 'markdown', 'title'],
      [],
      730
    )
  }

  async editModifier(
    actor: Actor.Implementation,
    path: string,
    obj: Record<string, unknown>,
    isReaction = true
  ): Promise<void> {
    const dlgHtml = await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/modifier-editor-popup.hbs',
      obj
    )
    const title = isReaction
      ? game.i18n!.localize('GURPS.reaction')
      : game.i18n!.localize('GURPS.conditionalModifier')

    new Dialog({
      title: `${title} Editor`,
      content: dlgHtml,
      buttons: {
        one: {
          label: game.i18n!.localize('GURPS.update'),
          callback: async (html: JQuery) => {
            obj.modifier = parseInt(html.find('.modifier').val() as string) || 0
            obj.situation = html.find('.situation').val()
            await actor.internalUpdate({ [path]: obj })
          },
        },
      },
      default: 'one',
    }).render(true)
  }

  async editItem(
    actor: Actor.Implementation,
    path: string,
    obj: Record<string, unknown>,
    template: string,
    title: string,
    strprops: string[],
    numprops: string[],
    width = 560
  ): Promise<void> {
    const dlgHtml = await foundry.applications.handlebars.renderTemplate(template, obj)
    new Dialog(
      {
        title: title,
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Update',
            callback: async (html: JQuery) => {
              strprops.forEach(a => (obj[a] = html.find(`.${a}`)?.val() || ''))
              numprops.forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val() as string)))

              const quickRoll = html.find('.quick-roll')
              if (quickRoll.length) obj.addToQuickRoll = quickRoll.is(':checked')

              const consumeAction = html.find('.consumeAction')
              if (consumeAction.length) obj.consumeAction = consumeAction.is(':checked')

              const save = html.find('.save')
              if (save.length) obj.save = save.is(':checked')

              actor.editItem(path, obj)
            },
          },
        },
        render: (h: JQuery) => {
          h.find('textarea').on('drop', this.dropFoundryLinks.bind(this) as JQuery.TypeEventHandler<HTMLTextAreaElement, undefined, HTMLTextAreaElement, HTMLTextAreaElement, 'drop'>)
          h.find('input').on('drop', this.dropFoundryLinks.bind(this) as JQuery.TypeEventHandler<HTMLInputElement, undefined, HTMLInputElement, HTMLInputElement, 'drop'>)
        },
      },
      {
        width: width,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    ).render(true)
  }

  // ============================================
  // Utility Methods
  // ============================================

  dropFoundryLinks(event: Event | JQuery.DropEvent, modelkey?: string): void {
    const ev = (event as JQuery.DropEvent).originalEvent ?? event as DragEvent
    const dragData = JSON.parse(ev.dataTransfer?.getData('text/plain') ?? '{}')
    if (dragData.uuid) dragData.id = dragData.uuid.split('.').at(1)

    if (!dragData.type) return
    if (dragData.type === 'JournalEntry' || dragData.type === 'JournalEntryPage' || dragData.type === 'Actor') {
      const target = ev.target as HTMLTextAreaElement | HTMLInputElement
      let currentText = target.value
      if (modelkey) {
        currentText = (foundry.utils.getProperty(this.actor, modelkey) as string) ?? ''
      }

      const link = dragData.type === 'Actor'
        ? `@Actor[${dragData.id}]{${dragData.name ?? 'Actor'}}`
        : `@UUID[${dragData.uuid}]{${dragData.name ?? 'Link'}}`

      const newText = currentText ? `${currentText}\n${link}` : link

      if (modelkey) {
        this.actor.update({ [modelkey]: newText })
      } else {
        target.value = newText
      }
    }
  }
}
