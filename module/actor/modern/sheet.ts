import { GurpsActorSheet } from '../actor-sheet.js'
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
import { ImportSettings } from '../../importer/index.ts'

export function countItems(record: Record<string, EntityComponentBase> | undefined): number {
  if (!record) return 0

  return Object.values(record).reduce((count, item) => {
    const nestedContains = item?.contains ? countItems(item.contains) : 0
    const nestedCollapsed = item?.collapsed ? countItems(item.collapsed) : 0
    return count + 1 + nestedContains + nestedCollapsed
  }, 0)
}

interface ModernSheetData {
  system?: GurpsActorSystem
  effects?: ActiveEffect[]
  skillCount?: number
  traitCount?: number
  meleeCount?: number
  rangedCount?: number
  modifierCount?: number
  showHPTinting?: boolean
  // TODO Waiting for Global declarations update.
  // @ts-expect-error: waiting for Global declarations update.
  moveMode?: GurpsMoveMode
}

export class GurpsActorModernSheet extends GurpsActorSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor', 'modern-sheet'],
      width: 768,
      height: 816,
      tabs: [{ navSelector: '.ms-tabs', contentSelector: '.ms-body', initial: 'character' }],
      scrollY: ['.ms-body .tab'],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  // @ts-expect-error - Template returns modern sheet path which extends base templates
  override get template() {
    if (!game.user!.isGM && this.actor.limited) return 'systems/gurps/templates/actor/actor-sheet-gcs-limited.hbs'
    return 'systems/gurps/templates/actor/actor-modern-sheet.hbs'
  }

  override getData(): ModernSheetData {
    const sheetData = super.getData() as ModernSheetData

    sheetData.effects = sheetData.effects?.filter(effect => !isPostureOrManeuver(effect))

    sheetData.skillCount = countItems(sheetData.system?.skills)
    sheetData.traitCount = countItems(sheetData.system?.ads)
    sheetData.meleeCount = countItems(sheetData.system?.melee)
    sheetData.rangedCount = countItems(sheetData.system?.ranged)
    sheetData.modifierCount = countItems(sheetData.system?.reactions) + countItems(sheetData.system?.conditionalmods)
    // TODO Update typing.
    // @ts-expect-error: update settings typing.
    sheetData.showHPTinting = game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_PORTRAIT_HP_TINTING)
    // TODO: Update GurpsActorV2 with new methods in GurpsActor (_actor.js).
    sheetData.moveMode = this.actor.currentMoveMode

    return sheetData
  }

  override getCustomHeaderButtons() {
    const blockImport = ImportSettings.onlyTrustedUsersCanImport
    if (blockImport && !game.user!.isTrusted) return []

    return [
      {
        label: 'Import',
        class: 'import',
        icon: 'fas fa-file-import',
        onclick: async (event: Event) => this._onFileImport(event),
      },
    ]
  }

  override async _render(force?: boolean, options?: Application.RenderOptions): Promise<void> {
    const scrollContainer = this.element?.find('.ms-body')[0]
    const scrollTop = scrollContainer?.scrollTop ?? 0
    await super._render(force, options)
    if (scrollTop > 0) {
      const newContainer = this.element?.find('.ms-body')[0]
      if (newContainer) newContainer.scrollTop = scrollTop
    }
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html)

    if (!this.actor.isOfType('character', 'characterV2', 'enemy')) return

    bindAllInlineEdits(html, this.actor)
    bindAttributeEdit(html, this.actor)
    bindSecondaryStatsEdit(html, this.actor)
    bindPointsEdit(html, this.actor)

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

    const openQuickNoteEditor = async () => {
      const actorSystem = this.actor.system as GurpsActorSystem
      const noteText = (actorSystem.additionalresources?.qnotes || '').replace(/<br>/g, '\n')
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
              // @ts-expect-error: Unknown system types for legacy actor model
              actor.internalUpdate({ 'system.additionalresources.qnotes': value.replace(/\n/g, '<br>') })
            },
          },
        ],
      }).render({ force: true })
      const textarea = dialog.element.querySelector('textarea') as HTMLTextAreaElement
      textarea.addEventListener('drop', this.dropFoundryLinks.bind(this) as EventListener)
    }

    html.find('.ms-quicknotes-content').on('dblclick', openQuickNoteEditor)
    html.find('.ms-quicknotes-edit').on('click', openQuickNoteEditor)

    bindEquipmentCrudActions(html, this.actor, this)
    bindNoteCrudActions(html, this.actor, this)
    bindTrackerActions(html, this.actor)
    this.bindPostureActions(html)
    this.bindManeuverActions(html)
    this.bindEncumbranceActions(html)
    this.bindEffectActions(html)
    this.bindLiftingActions(html)
    this.bindEntityCrudActions(html)
  }

  bindPostureActions(html: JQuery): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-posture-dropdown',
      toggleSelector: '.ms-posture-selected',
      optionSelector: '.ms-posture-option',
      onSelect: (posture: string) => this.actor.replacePosture(posture),
    })
  }

  bindManeuverActions(html: JQuery): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-maneuver-dropdown',
      toggleSelector: '.ms-maneuver-selected',
      optionSelector: '.ms-maneuver-option',
      onSelect: (maneuver: string) => this.actor.replaceManeuver(maneuver),
    })
  }

  bindEncumbranceActions(html: JQuery): void {
    if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE) === false) {
      html.find('.ms-enc-row').on('click', this._onClickEnc.bind(this))
    }

    html.find('.ms-move-mode-edit').on('click', () => {
      new MoveModeEditor(this.actor).render(true)
    })
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-move-mode-dropdown',
      toggleSelector: '.ms-move-mode-selected',
      optionSelector: '.ms-move-mode-option',
      onSelect: (mode: string) => this.actor.setMoveDefault(mode),
    })
  }

  bindEffectActions(html: JQuery): void {
    html.find('[data-action="add-effect"]').on('click', (event: JQuery.ClickEvent) => {
      event.preventDefault()
      new EffectPicker(this.actor).render(true)
    })

    html.find('[data-action="delete-effect"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget as HTMLElement
      const effectId = target.dataset.effectId ?? ''
      const effect = this.actor.effects.get(effectId)
      if (!effect) return
      const confirmed = await Dialog.confirm({
        title: game.i18n!.localize('GURPS.delete'),
        content: `<p>${game.i18n!.localize('GURPS.delete')}: <strong>${effect.name}</strong>?</p>`,
      })
      if (confirmed) {
        await effect.delete()
      }
    })
  }

  bindLiftingActions(html: JQuery): void {
    html.find('[data-action="recalc-lifting"]').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault()
      await this.actor.updateAndPersistStrengthBasedAttributes()
    })
  }

  bindEntityCrudActions(html: JQuery): void {
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
}
