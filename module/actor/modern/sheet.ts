import { GurpsActorSheet } from '../actor-sheet.js'
import EffectPicker from '../effect-picker.js'
import { bindAllInlineEdits } from './inline-edit-handler.js'
import { bindCrudActions, bindModifierCrudActions } from './crud-handler.js'
import { entityConfigurations, modifierConfigurations } from './entity-config.js'
import { bindDropdownToggle } from './dropdown-handler.js'
import { bindEquipmentCrudActions, bindNoteCrudActions, bindTrackerActions } from './dialog-crud-handler.js'
import { bindRowExpand, bindSectionCollapse, bindResourceReset } from './collapse-handler.js'

interface NestedContainer {
  contains?: Record<string, NestedContainer>
  collapsed?: Record<string, NestedContainer>
}

export function countItems(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0
  let count = 0
  const record = obj as Record<string, NestedContainer>
  for (const key in record) {
    count++
    if (record[key]?.contains) count += countItems(record[key].contains)
    if (record[key]?.collapsed) count += countItems(record[key].collapsed)
  }
  return count
}

export function calculatePositivePoints(totalpoints: TotalPoints): number {
  const racePoints = parseInt(String(totalpoints.race ?? 0)) || 0
  return (
    (parseInt(String(totalpoints.ads ?? 0)) || 0) +
    (parseInt(String(totalpoints.attributes ?? 0)) || 0) +
    (parseInt(String(totalpoints.skills ?? 0)) || 0) +
    (parseInt(String(totalpoints.spells ?? 0)) || 0) +
    (racePoints > 0 ? racePoints : 0)
  )
}

export function calculateNegativePoints(totalpoints: TotalPoints): number {
  const racePoints = parseInt(String(totalpoints.race ?? 0)) || 0
  return Math.abs(
    (parseInt(String(totalpoints.disads ?? 0)) || 0) +
    (parseInt(String(totalpoints.quirks ?? 0)) || 0) +
    (racePoints < 0 ? racePoints : 0)
  )
}

interface ModernSheetData {
  system?: {
    skills?: Record<string, unknown>
    ads?: Record<string, unknown>
    melee?: Record<string, unknown>
    ranged?: Record<string, unknown>
    reactions?: Record<string, unknown>
    conditionalmods?: Record<string, unknown>
    totalpoints?: TotalPoints
    additionalresources?: {
      qnotes?: string
    }
  }
  skillCount?: number
  traitCount?: number
  meleeCount?: number
  rangedCount?: number
  modifierCount?: number
  positivePoints?: number
  negativePoints?: number
}

export class GurpsActorModernSheet extends GurpsActorSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor', 'modern-sheet'],
      width: 750,
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

    sheetData.skillCount = countItems(sheetData.system?.skills)
    sheetData.traitCount = countItems(sheetData.system?.ads)
    sheetData.meleeCount = countItems(sheetData.system?.melee)
    sheetData.rangedCount = countItems(sheetData.system?.ranged)
    sheetData.modifierCount = countItems(sheetData.system?.reactions) + countItems(sheetData.system?.conditionalmods)

    const totalpoints = sheetData.system?.totalpoints || {}
    sheetData.positivePoints = calculatePositivePoints(totalpoints)
    sheetData.negativePoints = calculateNegativePoints(totalpoints)

    return sheetData
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html)

    bindAllInlineEdits(html, this.actor)

    bindResourceReset(html, this.actor, [
      { selector: '.ms-resource-reset[data-action="reset-hp"]', resourcePath: 'system.HP.value', maxPath: 'system.HP.max' },
      { selector: '.ms-resource-reset[data-action="reset-fp"]', resourcePath: 'system.FP.value', maxPath: 'system.FP.max' }
    ])

    bindRowExpand(html, {
      rowSelector: '.ms-skills-row, .ms-traits-row',
      excludeSelectors: ['.ms-use-button', '.expandcollapseicon', '.ms-row-actions']
    })

    bindSectionCollapse(html, {
      headerSelector: '.ms-section-header.ms-collapsible',
      excludeSelectors: ['.expandcollapseicon', '.ms-add-icon']
    })

    const openQuickNoteEditor = async () => {
      let noteText = (this.actor.system as any).additionalresources?.qnotes || ''
      noteText = noteText.replace(/<br>/g, '\n')
      const actor = this.actor

      const dialog = await new (foundry.applications.api as any).DialogV2({
        window: { title: 'Quick Note', resizable: true },
        content: `Enter a Quick Note (a great place to put an On-the-Fly formula!):<textarea rows="4" id="i">${noteText}</textarea><b>Examples:</b>
          [+1 due to shield]<br>[Dodge +3 retreat]<br>[Dodge +2 Feverish Defense *Cost 1FP]`,
        buttons: [
          {
            label: 'Save',
            icon: 'fas fa-save',
            callback: (_event: Event, button: HTMLButtonElement) => {
              const form = button.form as HTMLFormElement
              const input = form.elements.namedItem('i') as HTMLTextAreaElement
              const value = input.value
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

    bindEquipmentCrudActions(html, this.actor, this as unknown as GurpsActorSheet)
    bindNoteCrudActions(html, this.actor, this as unknown as GurpsActorSheet)
    bindTrackerActions(html, this.actor)
    this.bindPostureActions(html)
    this.bindEffectActions(html)
    this.bindEntityCrudActions(html)
  }

  bindPostureActions(html: JQuery): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-posture-dropdown',
      toggleSelector: '.ms-posture-selected',
      optionSelector: '.ms-posture-option',
      onSelect: (posture: string) => this.actor.replacePosture(posture)
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

  bindEntityCrudActions(html: JQuery): void {
    const sheet = this as unknown as GurpsActorSheet
    entityConfigurations.forEach(config => {
      const resolvedConfig: EntityConfigWithMethod = {
        ...config,
        editMethod: (this as unknown as Record<string, unknown>)[config.editMethod] as EntityConfigWithMethod['editMethod'],
        createArgs: config.createArgs?.() as any
      }
      bindCrudActions(html, this.actor, sheet, resolvedConfig)
    })

    modifierConfigurations.forEach(({ isReaction }) => {
      bindModifierCrudActions(html, this.actor, sheet, this.editModifier.bind(this), isReaction)
    })
  }
}
