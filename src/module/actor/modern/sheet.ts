import { HandlebarsApplicationMixin, ActorSheet, Application } from '@gurps-types/foundry/index.js'
import {
  DisplayConditionalModifier,
  DisplayEquipment,
  DisplayMeleeAttack,
  DisplayNote,
  DisplayRangedAttack,
  DisplaySkill,
  DisplaySpell,
  DisplayTrait,
} from '@gurps-types/gurps/display-item.js'
import { ActionType } from '@module/action/types.js'
import GurpsWiring from '@module/gurps-wiring.js'
import { ItemType } from '@module/item/types.js'
import { getGame } from '@module/util/guards.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'
import { DeepPartial } from 'fvtt-types/utils'

import EffectPicker from '../effect-picker.js'
import type { GurpsActorV2 } from '../gurps-actor.js'
import MoveModeEditor from '../move-mode-editor.js'
import { GurpsBaseActorSheet } from '../sheets/base-actor-sheet.js'
import { ActorType } from '../types.js'

import { bindSectionCollapse, bindContainerCollapse } from './collapse-handler.js'
import {
  //   bindEquipmentCrudActions,
  //   bindNoteCrudActions,
  bindTrackerActions,
  PreparedTrackerData,
  prepareTrackerDataForSheet,
} from './dialog-crud-handler.js'
import { bindDropdownToggle } from './dropdown-handler.js'
import {
  bindAllInlineEdits,
  bindAttributeEdit,
  bindSecondaryStatsEdit,
  bindPointsEdit,
  bindAllTrackerEdits,
} from './inline-edit-handler.js'
import { isPostureOrManeuver } from './utils/effect.js'

export function countItems(record: Record<string, EntityComponentBase> | undefined): number {
  if (!record) return 0

  return Object.values(record).reduce((count, item) => {
    const nestedContains = item?.contains ? countItems(item.contains) : 0
    const nestedCollapsed = item?.collapsed ? countItems(item.collapsed) : 0

    return count + 1 + nestedContains + nestedCollapsed
  }, 0)
}

export namespace GurpsActorModernSheet {
  export type Type = ActorType.Character

  export interface ModernItemSection<DisplayItem> {
    section: string
    documentName: ItemType | string
    type: ItemType | string
    icon: string
    title: string
    count: number
    items: DisplayItem[]
    flags: Record<string, unknown>
  }

  export interface ItemSections {
    traits: ModernItemSection<DisplayTrait>
    skills: ModernItemSection<DisplaySkill>
    spells: ModernItemSection<DisplaySpell>
    equipmentCarried: ModernItemSection<DisplayEquipment>
    equipmentOther: ModernItemSection<DisplayEquipment>
    attacksMelee: ModernItemSection<DisplayMeleeAttack>
    attacksRanged: ModernItemSection<DisplayRangedAttack>
  }

  export interface RenderContext extends ActorSheet.RenderContext {
    system: Actor.SystemOfType<Type>
    effects: ActiveEffect[]
    skillCount: number
    traitCount: number
    meleeCount: number
    rangedCount: number
    modifierCount: number
    showHPTinting: boolean
    reactions: DisplayConditionalModifier[]
    conditionalModifiers: DisplayConditionalModifier[]
    itemSections: ItemSections
    notes: DisplayNote[]
    // Uses getter's union return type since it varies between v1/v2 actor models
    moveMode: GurpsActorV2<Actor.SubType>['currentMoveMode']
    resourceTrackers: PreparedTrackerData[]
    hpThresholds: ThresholdDescriptor[]
    fpThresholds: ThresholdDescriptor[]
    tab?: Application.Tab
  }

  export interface RenderOptions extends GurpsBaseActorSheet.RenderOptions {
    isFirstRender: boolean
  }
}

export class GurpsActorModernSheet extends GurpsBaseActorSheet<
  GurpsActorModernSheet.Type,
  GurpsBaseActorSheet.Configuration,
  GurpsBaseActorSheet.RenderOptions,
  GurpsActorModernSheet.RenderContext
>() {
  static override DEFAULT_OPTIONS: ActorSheet.DefaultOptions<GurpsBaseActorSheet.Configuration> = {
    classes: ['modern-sheet'],
    position: {
      width: 768,
      height: 816,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
    },
    actions: {
      resetHp: GurpsActorModernSheet.#onResetResource,
      resetFp: GurpsActorModernSheet.#onResetResource,
      addEffect: GurpsActorModernSheet.#onAddEffect,
      deleteEffect: GurpsActorModernSheet.#onDeleteEffect,
      editQuickNotes: GurpsActorModernSheet.#onEditQuickNotes,
      editMoveMode: GurpsActorModernSheet.#onEditMoveMode,
      decrementQuantity: GurpsActorModernSheet.#onChangeQuantity,
      incrementQuantity: GurpsActorModernSheet.#onChangeQuantity,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: 'systems/gurps/templates/actor/modern/header.hbs',
    },
    statusBar: {
      template: 'systems/gurps/templates/actor/modern/status-bar.hbs',
    },
    tabNavigation: {
      template: 'systems/gurps/templates/actor/modern/tab-navigation.hbs',
    },
    character: {
      template: 'systems/gurps/templates/actor/modern/tab-character.hbs',
    },
    combat: {
      template: 'systems/gurps/templates/actor/modern/tab-combat.hbs',
    },
    equipment: {
      template: 'systems/gurps/templates/actor/modern/tab-equipment.hbs',
    },
    notes: {
      template: 'systems/gurps/templates/actor/modern/tab-notes.hbs',
    },
  }

  /* ---------------------------------------- */

  static override TABS: Record<string, Application.TabsConfiguration> = {
    primary: {
      tabs: [
        { id: 'character', label: 'GURPS.basic', icon: 'fas fa-user' },
        { id: 'combat', label: 'GURPS.combatTab', icon: 'fas fa-swords' },
        { id: 'equipment', label: 'GURPS.equipmentTab', icon: 'fas fa-backpack' },
        { id: 'notes', label: 'GURPS.description', icon: 'fas fa-book' },
      ],
      initial: 'character',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: GurpsActorModernSheet.RenderOptions
  ): Promise<GurpsActorModernSheet.RenderContext> {
    const baseContext = await super._prepareContext(options)
    const actorSystem = this.actor.system as Actor.SystemOfType<GurpsActorModernSheet.Type>

    const effects = this.actor.effects.contents.filter(effect => !isPostureOrManeuver(effect))

    const itemSections = this._prepareItemSections()

    const context: GurpsActorModernSheet.RenderContext = {
      ...baseContext,
      actor: this.actor,
      system: actorSystem,
      effects,
      itemSections,
      notes: this.actor.getEmbeddedCollection('Note').contents.map(note => note.toDisplayItem()),
      meleeCount: countItems(actorSystem?.melee),
      rangedCount: countItems(actorSystem?.ranged),
      modifierCount:
        Object.keys(actorSystem?.reactions ?? {}).length + Object.keys(actorSystem?.conditionalmods ?? {}).length,
      showHPTinting: getGame().settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_PORTRAIT_HP_TINTING) as boolean,
      reactions: this.actor.system.reactions.map(mod => mod.toDisplayItem()),
      conditionalModifiers: this.actor.system.conditionalmods.map(mod => mod.toDisplayItem()),
      moveMode: this.actor.currentMoveMode,
      resourceTrackers: prepareTrackerDataForSheet(this.actor),
      hpThresholds: HitPoints.getThresholds(actorSystem.HP.max),
      fpThresholds: Fatigue.getThresholds(actorSystem.FP.max),
    }

    return context
  }

  /* ---------------------------------------- */

  protected _prepareItemSections(): GurpsActorModernSheet.ItemSections {
    const melee = this.actor.getItemAttacks({ attackType: 'melee' })
    const ranged = this.actor.getItemAttacks({ attackType: 'ranged' })

    return {
      traits: {
        section: 'traits',
        documentName: 'Item',
        type: ItemType.Trait,
        icon: 'fa-solid fa-sparkles',
        title: 'GURPS.advDisadvPerkQuirks',
        count: this.actor.system.allAdsV2.length,
        items: this.actor.system.adsV2.map(item => item.system.toDisplayItem()),
        flags: {
          otf: true,
          points: true,
          reference: true,
        },
      },
      skills: {
        section: 'skills',
        documentName: 'Item',
        type: ItemType.Skill,
        icon: 'fa-solid fa-graduation-cap',
        title: 'GURPS.skills',
        count: this.actor.system.allSkillsV2.length,
        items: this.actor.system.skillsV2.map(item => item.system.toDisplayItem()),
        flags: { level: true, rsl: true },
      },
      spells: {
        section: 'spells',
        documentName: 'Item',
        type: ItemType.Spell,
        icon: 'fa-solid fa-hat-wizard',
        title: 'GURPS.spells',
        count: this.actor.system.allSpellsV2.length,
        items: this.actor.system.spellsV2.map(item => item.system.toDisplayItem()),
        flags: { level: true, rsl: true, college: true },
      },
      equipmentCarried: {
        section: 'traits',
        documentName: 'Item',
        type: ItemType.Equipment,
        icon: 'fa-solid fa-briefcase',
        // TODO: add total weight and value)
        title: 'GURPS.equipmentCarried',
        count: this.actor.system.equipmentV2.carried.length,
        items: this.actor.system.equipmentV2.carried.map(item => item.system.toDisplayItem()),
        flags: { equipped: true, carried: true },
      },
      equipmentOther: {
        section: 'traits',
        documentName: 'Item',
        type: ItemType.Equipment,
        icon: 'fa-solid fa-archive',
        // TODO: add total weight and value)
        title: 'GURPS.equipmentOther',
        count: this.actor.system.equipmentV2.other.length,
        items: this.actor.system.equipmentV2.other.map(item => item.system.toDisplayItem()),
        flags: { carried: false },
      },
      attacksMelee: {
        section: 'melee',
        documentName: 'Action',
        type: ActionType.MeleeAttack,
        icon: 'fa-solid fa-sword',
        title: 'GURPS.melee',
        count: melee.length,
        items: melee.map(item => item.toDisplayItem()),
        flags: {},
      },
      attacksRanged: {
        section: 'ranged',
        documentName: 'Action',
        type: ActionType.RangedAttack,
        icon: 'fa-solid fa-crosshairs',
        title: 'GURPS.ranged',
        count: ranged.length,
        items: ranged.map(item => item.toDisplayItem()),
        flags: {},
      },
    }
  }

  /* ---------------------------------------- */

  protected override async _preparePartContext(
    partId: string,
    context: GurpsActorModernSheet.RenderContext,
    options: DeepPartial<ActorSheet.RenderOptions>
  ): Promise<GurpsActorModernSheet.RenderContext> {
    await super._preparePartContext(partId, context, options)

    if (context.tabs && partId in context.tabs) context.tab = context.tabs[partId]

    return context
  }

  protected override async _onRender(
    context: GurpsActorModernSheet.RenderContext,
    options: GurpsActorModernSheet.RenderOptions
  ): Promise<void> {
    super._onRender(context, options)

    const actor = this.actor
    const html = this.element

    // Bind inline edit handlers (click-to-edit pattern)
    bindAllInlineEdits(html, actor)
    bindAttributeEdit(html, actor)
    bindSecondaryStatsEdit(html, actor)
    bindPointsEdit(html, actor)
    bindAllTrackerEdits(html, actor)

    // // Bind resource reset handlers - note: these are now handled by actions system
    // // but keeping for complex multi-resource configs
    // bindResourceReset(html, actor, [
    //   {
    //     selector: '.ms-resource-reset[data-action="resetHp"]',
    //     resourcePath: 'system.HP.value',
    //     maxPath: 'system.HP.max',
    //   },
    //   {
    //     selector: '.ms-resource-reset[data-action="resetFp"]',
    //     resourcePath: 'system.FP.value',
    //     maxPath: 'system.FP.max',
    //   },
    // ])

    bindSectionCollapse(html, {
      headerSelector: '.ms-section-header.ms-collapsible',
      excludeSelectors: ['.expandcollapseicon', '.ms-add-icon'],
    })

    const actorId = this.actor.id

    if (!actorId) return
    bindContainerCollapse(html, actorId, {
      tableSelector: '.ms-traits-table, .ms-skills-table, .ms-spells-table',
      rowSelector: '.ms-traits-row, .ms-skills-row, .ms-spells-row',
      excludeSelectors: ['.ms-row-actions', '.ms-use-button', '.ms-col-otf', '.ms-col-level'],
    })

    // Bind quick notes editor
    const quickNotesContent = html.querySelector('.ms-quicknotes-content')

    quickNotesContent?.addEventListener('dblclick', () => this.#openQuickNoteEditor())

    // Bind CRUD actions for entities
    // bindEquipmentCrudActions(html, this.actor)
    // bindNoteCrudActions(html, this.actor, this)
    bindTrackerActions(html, this.actor)

    // Bind dropdown handlers
    this.#bindPostureActions(html)
    this.#bindManeuverActions(html)
    this.#bindMoveModeActions(html)

    // Bind entity CRUD actions
    this.#bindEntityCrudActions(html)

    // Wire up OTF rollable elements
    GurpsWiring.hookupAllEvents(html)

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
  }

  /* ---------------------------------------- */

  static async #onResetResource(this: GurpsActorModernSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()
    const action = target.dataset.action

    if (action === 'resetHp' || action === 'reset-hp') {
      const maxValue = foundry.utils.getProperty(this.actor, 'system.HP.max') as number

      await this.actor.internalUpdate({ 'system.HP.value': maxValue } as Actor.UpdateData)
    } else if (action === 'resetFp' || action === 'reset-fp') {
      const maxValue = foundry.utils.getProperty(this.actor, 'system.FP.max') as number

      await this.actor.internalUpdate({ 'system.FP.value': maxValue } as Actor.UpdateData)
    }
  }

  /* ---------------------------------------- */

  static async #onAddEffect(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    new EffectPicker(this.actor).render(true)
  }

  /* ---------------------------------------- */

  static async #onDeleteEffect(this: GurpsActorModernSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()
    event.stopPropagation()
    const effectId = target.dataset.effectId ?? ''
    const effect = this.actor.effects.get(effectId)

    if (!effect) return

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: getGame().i18n.localize('GURPS.delete') },
      content: `<p>${getGame().i18n.localize('GURPS.delete')}: <strong>${effect.name}</strong>?</p>`,
    })

    if (confirmed) {
      await effect.delete()
    }
  }

  /* ---------------------------------------- */

  static async #onEditQuickNotes(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    await this.#openQuickNoteEditor()
  }

  /* ---------------------------------------- */

  static async #onEditMoveMode(this: GurpsActorModernSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()
    new MoveModeEditor(this.actor).render(true)
  }

  /* ---------------------------------------- */

  static async #onChangeQuantity(this: GurpsActorModernSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event?.preventDefault()

    const doc = await this._getEmbedded(target)

    if (!doc) return

    if (!(doc instanceof CONFIG.Item.documentClass)) {
      console.error('Expected document to be an Item, but got', doc)

      return
    }

    if (!doc.isOfType(ItemType.Equipment)) {
      console.error('Expected document to be of type Equipment, but got', doc)

      return
    }

    const action = target.dataset.action

    if (action === 'incrementQuantity') {
      await doc.system.incrementQuantity()
    } else {
      await doc.system.decrementQuantity()
    }
  }

  /* ---------------------------------------- */

  async #openQuickNoteEditor(): Promise<void> {
    const actorSystem = this.actor.system as Actor.SystemOfType<GurpsActorModernSheet.Type>
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

            actor.internalUpdate({
              'system.additionalresources.qnotes': value.replace(/\n/g, '<br>'),
            } as Actor.UpdateData)
          },
        },
      ],
    }).render({ force: true })

    const textarea = dialog.element.querySelector('textarea') as HTMLTextAreaElement

    textarea.addEventListener('drop', this.dropFoundryLinks.bind(this) as EventListener)
  }

  /* ---------------------------------------- */

  #bindPostureActions(html: HTMLElement): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-posture-dropdown',
      toggleSelector: '.ms-posture-selected',
      optionSelector: '.ms-posture-option',
      onSelect: (posture: string) => this.actor.replacePosture(posture),
    })
  }

  /* ---------------------------------------- */

  #bindManeuverActions(html: HTMLElement): void {
    bindDropdownToggle(html, {
      dropdownSelector: '.ms-maneuver-dropdown',
      toggleSelector: '.ms-maneuver-selected',
      optionSelector: '.ms-maneuver-option',
      onSelect: (maneuver: string) => this.actor.replaceManeuver(maneuver),
    })
  }

  /* ---------------------------------------- */

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

  /* ---------------------------------------- */

  #bindEntityCrudActions(_html: HTMLElement): void {
    // TODO: redo
    // entityConfigurations.forEach(config => {
    //   const editMethodKey = config.editMethod as keyof this
    //   const resolvedConfig: EntityConfigWithMethod = {
    //     ...config,
    //     editMethod: (this[editMethodKey] as EntityConfigWithMethod['editMethod']).bind(this),
    //     createArgs: config.createArgs?.(),
    //   }
    //
    //   bindCrudActions(html, this.actor, this, resolvedConfig)
    // })
    // TODO: redo
    // modifierConfigurations.forEach(({ isReaction }) => {
    //   bindModifierCrudActions(html, this.actor, this, this.editModifier.bind(this), isReaction)
    // })
  }

  /* ---------------------------------------- */

  dropFoundryLinks(event: Event | JQuery.DropEvent, modelkey?: string): void {
    const ev = (event as JQuery.DropEvent).originalEvent ?? (event as DragEvent)
    const dragData = JSON.parse(ev.dataTransfer?.getData('text/plain') ?? '{}')

    if (dragData.uuid) dragData.id = dragData.uuid.split('.').at(1)

    if (!dragData.type) return

    if (dragData.type === 'JournalEntry' || dragData.type === 'JournalEntryPage' || dragData.type === 'Actor') {
      const target = ev.target as HTMLTextAreaElement | HTMLInputElement
      let currentText = target.value

      if (modelkey) {
        currentText = (foundry.utils.getProperty(this.actor, modelkey) as string) ?? ''
      }

      const link =
        dragData.type === 'Actor'
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
