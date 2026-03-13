import { DisplayTrait } from '@gurps-types/gurps/display-item.js'
import { TraitModel } from '@module/item/data/trait.js'
import { isHTMLElement } from '@module/util/guards.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'

import { GurpsBaseActorSheet } from './base-actor-sheet.js'

import ActorSheet = gurps.applications.ActorSheet

type CharacterV2Schema = foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>

type PoolEntry = {
  fields: {
    numerator: foundry.data.fields.NumberField<any>
    denominator: foundry.data.fields.NumberField<any>
  }
  path: string
  numerator: number
  denominator: number
  atMax: boolean
  name: string
  state: string
  thresholds: ThresholdDescriptor[]
}

type LiftingMovingEntry = {
  label: string
  value: string
}

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
    actor: Actor.OfType<'characterV2'>
    system: Actor.SystemOfType<'characterV2'>
    systemFields?: foundry.data.fields.SchemaField<CharacterV2Schema>['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<CharacterV2Schema>
    moveModeChoices?: Record<string, string>
    pools: PoolEntry[]
    liftingMoving: LiftingMovingEntry[]
    traits: DisplayTrait[]
    sortKeys: {
      traits: Record<string, string>
    }
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
  // #dragItemId: string | null = null

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: ActorSheet.Configuration = {
    classes: ['gcs-sheet'],
    position: {
      width: 800,
      height: 800,
    },
    actions: {
      incrementPool: GurpsActorGcsSheet.#onIncrementPool,
      decrementPool: GurpsActorGcsSheet.#onDecrementPool,
      sortItems: GurpsActorGcsSheet.#onSortItems,
      toggleItemContainer: GurpsActorGcsSheet.#onToggleItemContainer,
      toggleItemNotes: GurpsActorGcsSheet.#onToggleItemNotes,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, gurps.applications.handlebars.TemplatePart> = {
    header: {
      template: this.systemPath('gcs/header.hbs'),
    },
    resources: {
      template: this.systemPath('gcs/resources.hbs'),
    },
    combat: {
      template: this.systemPath('gcs/combat.hbs'),
    },
    traits: {
      template: this.systemPath('gcs/traits.hbs'),
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    const moveModeChoices = Object.fromEntries(this.actor.system.moveV2.map(mode => [mode._id, mode.mode]))

    const traitSortKeys = TraitModel.sortKeys ?? {}

    return {
      ...superContext,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
      moveModeChoices,
      pools: this._preparePools(),
      liftingMoving: this._prepareLiftingMoving(),
      traits: this.actor.system.adsV2.map(trait => trait.system.toDisplayItem()),
      sortKeys: {
        traits: traitSortKeys,
      },
    }
  }

  /* ---------------------------------------- */

  // protected override async _onRender(
  //   context: GurpsActorGcsSheet.RenderContext,
  //   options: ActorSheet.RenderOptions
  // ): Promise<void> {
  //   await super._onRender(context, options)
  //   this.#applyTraitSortIndicator()
  //   this.#bindTraitDragDrop()
  // }

  /* ---------------------------------------- */

  protected _preparePools(): PoolEntry[] {
    const pools: PoolEntry[] = []
    const systemFields = this.actor.system.schema.fields
    const systemSource = this.actor.system._source

    const hpThresholds = HitPoints.getThresholds(systemSource.HP.max).reverse()
    const fpThresholds = Fatigue.getThresholds(systemSource.FP.max).reverse()

    const hpState = hpThresholds.find(threshold => threshold.value >= this.actor.system.HP.value)?.condition || ''
    const fpState = fpThresholds.find(threshold => threshold.value >= this.actor.system.FP.value)?.condition || ''

    pools.push(
      {
        fields: {
          numerator: systemFields.HP.fields.damage,
          denominator: systemFields.HP.fields.max,
        },
        path: 'system.HP.damage',
        numerator: systemSource.HP.damage,
        denominator: systemSource.HP.max,
        atMax: systemSource.HP.damage === 0,
        name: 'GURPS.HP',
        state: hpState,
        thresholds: hpThresholds,
      },
      {
        fields: {
          numerator: systemFields.FP.fields.damage,
          denominator: systemFields.FP.fields.max,
        },
        path: 'system.FP.damage',
        numerator: systemSource.FP.damage,
        denominator: systemSource.FP.max,
        atMax: systemSource.FP.damage === 0,
        name: 'GURPS.FP',
        state: fpState,
        thresholds: fpThresholds,
      }
    )

    return pools
  }

  /* ---------------------------------------- */

  protected _prepareLiftingMoving(): LiftingMovingEntry[] {
    const liftingMoving = this.actor.system.liftingmoving

    return [
      { label: 'GURPS.basicLift', value: liftingMoving.basiclift },
      { label: 'GURPS.oneHandLift', value: liftingMoving.onehandedlift },
      { label: 'GURPS.twoHandLift', value: liftingMoving.twohandedlift },
      { label: 'GURPS.shoveAndKnockOver', value: liftingMoving.shove },
      { label: 'GURPS.runningShoveAndKnockOver', value: liftingMoving.runningshove },
      { label: 'GURPS.shiftSlightly', value: liftingMoving.shiftslightly },
      { label: 'GURPS.carryOnBack', value: liftingMoving.carryonback },
    ].map(({ label, value }) => {
      return { label, value: value.toLocaleString() }
    })
  }

  /* ---------------------------------------- */

  // #bindItemDragDrop(): void {
  //   const tbody = this.element.querySelector<HTMLTableSectionElement>('.gcs-traits-table tbody')
  //
  //   if (!tbody) return
  //
  //   tbody.addEventListener('dragstart', this.#onTraitDragStart.bind(this))
  //   tbody.addEventListener('dragover', this.#onTraitDragOver.bind(this))
  //   tbody.addEventListener('dragleave', this.#onTraitDragLeave.bind(this))
  //   tbody.addEventListener('drop', this.#onTraitDrop.bind(this))
  //   tbody.addEventListener('dragend', this.#onTraitDragEnd.bind(this))
  // }
  //
  // /* ---------------------------------------- */
  //
  // #onTraitDragStart(event: DragEvent): void {
  //   const row = (event.target as HTMLElement).closest<HTMLElement>('tr.gcs-trait-row')
  //
  //   if (!row) return
  //   const itemId = row.dataset.itemId
  //
  //   if (!itemId) return
  //
  //   this.#dragItemId = itemId
  //   event.dataTransfer?.setData('text/plain', itemId)
  //   row.classList.add('gcs-dragging')
  // }
  //
  // /* ---------------------------------------- */
  //
  // #onTraitDragOver(event: DragEvent): void {
  //   event.preventDefault()
  //   const row = (event.target as HTMLElement).closest<HTMLElement>('tr.gcs-trait-row')
  //
  //   if (!row || row.dataset.itemId === this.#dragItemId) return
  //
  //   this.element.querySelectorAll('.gcs-drag-over').forEach(el => el.classList.remove('gcs-drag-over'))
  //   row.classList.add('gcs-drag-over')
  // }
  //
  // /* ---------------------------------------- */
  //
  // #onTraitDragLeave(event: DragEvent): void {
  //   const related = event.relatedTarget as HTMLElement | null
  //
  //   if (related?.closest('.gcs-traits-table')) return
  //   this.element.querySelectorAll('.gcs-drag-over').forEach(el => el.classList.remove('gcs-drag-over'))
  // }
  //
  // /* ---------------------------------------- */
  //
  // async #onTraitDrop(event: DragEvent): Promise<void> {
  //   event.preventDefault()
  //
  //   const draggedId = this.#dragItemId
  //
  //   this.#dragItemId = null
  //
  //   this.element
  //     .querySelectorAll('.gcs-drag-over, .gcs-dragging')
  //     .forEach(el => el.classList.remove('gcs-drag-over', 'gcs-dragging'))
  //
  //   if (!draggedId) return
  //
  //   const targetRow = (event.target as HTMLElement).closest<HTMLElement>('tr.gcs-trait-row')
  //
  //   if (!targetRow || targetRow.dataset.itemId === draggedId) return
  //
  //   const targetId = targetRow.dataset.itemId!
  //   const draggedItem = this.actor.items.get(draggedId)
  //   const targetItem = this.actor.items.get(targetId)
  //
  //   if (!draggedItem || !targetItem) return
  //
  //   // Determine drop zone: top 25% = before, bottom 25% = after, middle 50% = into container
  //   const rect = targetRow.getBoundingClientRect()
  //   const zone = (event.clientY - rect.top) / rect.height
  //   const targetHasChildren = targetRow.dataset.hasChildren === 'true'
  //
  //   let newParentId: string | null
  //   let insertBefore: boolean
  //   let appendInto: boolean = false
  //
  //   if (targetHasChildren && zone > 0.25 && zone < 0.75) {
  //     newParentId = targetId
  //     insertBefore = false
  //     appendInto = true
  //   } else if (zone < 0.5) {
  //     newParentId = (targetItem.system as any).containedBy ?? null
  //     insertBefore = true
  //   } else {
  //     newParentId = (targetItem.system as any).containedBy ?? null
  //     insertBefore = false
  //   }
  //
  //   // Prevent circular containment: don't allow dropping into own subtree
  //   if (newParentId !== null && this.#isDescendant(newParentId, draggedId)) return
  //
  //   // Find siblings in the target container (excluding the dragged item)
  //   const siblings = [...this.actor.items]
  //     .filter(i => (i.system as any).containedBy === newParentId && i.id !== draggedId)
  //     .sort((left, right) => left.sort - right.sort)
  //
  //   let newSort: number
  //
  //   if (appendInto) {
  //     newSort = siblings.length > 0 ? siblings[siblings.length - 1].sort + 100000 : 100000
  //   } else if (insertBefore) {
  //     const idx = siblings.findIndex(i => i.id === targetId)
  //     const prev = siblings[idx - 1]
  //
  //     newSort = prev ? Math.round((prev.sort + targetItem.sort) / 2) : targetItem.sort - 100000
  //   } else {
  //     const idx = siblings.findIndex(i => i.id === targetId)
  //     const next = siblings[idx + 1]
  //
  //     newSort = next ? Math.round((targetItem.sort + next.sort) / 2) : targetItem.sort + 100000
  //   }
  //
  //   await draggedItem.update({ sort: newSort, 'system.containedBy': newParentId } as Record<string, unknown>)
  // }
  //
  // /* ---------------------------------------- */
  //
  // #onTraitDragEnd(_event: DragEvent): void {
  //   this.#dragItemId = null
  //   this.element
  //     .querySelectorAll('.gcs-drag-over, .gcs-dragging')
  //     .forEach(el => el.classList.remove('gcs-drag-over', 'gcs-dragging'))
  // }
  //
  // /* ---------------------------------------- */
  //
  // #isDescendant(candidateId: string, ancestorId: string): boolean {
  //   const queue = [ancestorId]
  //
  //   while (queue.length > 0) {
  //     const current = queue.shift()!
  //
  //     for (const item of this.actor.items) {
  //       if ((item.system as any).containedBy === current) {
  //         if (item.id === candidateId) return true
  //         queue.push(item.id!)
  //       }
  //     }
  //   }
  //
  //   return false
  // }
  //
  /* ---------------------------------------- */
  /*  Action Bindings                         */
  /* ---------------------------------------- */

  static async #onIncrementPool(this: GurpsActorGcsSheet, event: PointerEvent): Promise<void> {
    return this.#updatePool(event, 1)
  }

  /* ---------------------------------------- */

  static async #onDecrementPool(this: GurpsActorGcsSheet, event: PointerEvent): Promise<void> {
    return this.#updatePool(event, -1)
  }

  /* ---------------------------------------- */

  static async #onSortItems(this: GurpsActorGcsSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const getItemList = (part: string): Item.Implementation[] => {
      switch (part) {
        case 'traits':
          return this.actor.system.allAdsV2
        default:
          return []
      }
    }

    const part = target.closest<HTMLElement>('[data-application-part]')?.dataset.applicationPart ?? ''
    const sortBy = target.dataset.sortBy
    const itemList = getItemList(part)

    const unsortedIds = itemList.map(i => i._id)

    let sortedIds = itemList
      .sort((left, right) => {
        return left.name.localeCompare(right.name)
      })
      .sort((left, right) => {
        const leftValue = foundry.utils.getProperty(left, sortBy ?? '') ?? 0
        const rightValue = foundry.utils.getProperty(right, sortBy ?? '') ?? 0

        switch (typeof leftValue) {
          case 'number':
            return leftValue - (rightValue as number)
          case 'string':
            return leftValue.localeCompare(rightValue as string)
          default:
            return 0
        }
      })
      .map(item => item._id)

    if (unsortedIds.equals(sortedIds)) sortedIds = sortedIds.reverse()

    const sortUpdates = sortedIds.map((_id, index) => {
      return { _id, sort: (index + 1) * CONST.SORT_INTEGER_DENSITY }
    })

    await this.actor.updateEmbeddedDocuments('Item', sortUpdates)
  }

  /* ---------------------------------------- */

  static async #onToggleItemContainer(
    this: GurpsActorGcsSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()

    const itemId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId

    if (!itemId) return

    const item = this.actor.items.get(itemId)

    await item?.system.toggleOpen?.()
  }

  /* ---------------------------------------- */

  static async #onToggleItemNotes(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const itemId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId
    const isNowOpen = target.dataset.open === 'true'

    if (!itemId) return

    const item = this.actor.items.get(itemId)

    if (item?.system && 'notesOpen' in item.system) {
      await item?.update({ 'system.notesOpen': !isNowOpen } as Record<string, unknown>)
    }
  }

  /* ---------------------------------------- */

  async #updatePool(event: PointerEvent, valueDelta: number): Promise<void> {
    event.preventDefault()

    const element = event.target

    if (!isHTMLElement(element)) return

    const systemPath = element.dataset.path

    if (!systemPath) {
      console.error('No pool path provided')

      return
    }

    const pathValue = foundry.utils.getProperty(this.actor, systemPath)

    if (pathValue === undefined || pathValue === null || typeof pathValue !== 'number') {
      console.error(`Invalid pool path provided, value does not exist or is not a number: ${systemPath}`)

      return
    }

    const maxPath = systemPath.replace(/\.value$/, '.max')
    const maxValue = foundry.utils.getProperty(this.actor, maxPath)
    const newValue =
      valueDelta > 0 && typeof maxValue === 'number'
        ? Math.min(pathValue - valueDelta, maxValue)
        : pathValue - valueDelta

    await this.actor.update({ [systemPath]: newValue })
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
