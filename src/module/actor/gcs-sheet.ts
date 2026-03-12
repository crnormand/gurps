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
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
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
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    const moveModeChoices = Object.fromEntries(this.actor.system.moveV2.map(mode => [mode._id, mode.mode]))

    return {
      ...superContext,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
      moveModeChoices,
      pools: this._preparePools(),
      liftingMoving: this._prepareLiftingMoving(),
    }
  }

  /* ---------------------------------------- */

  protected _preparePools(): PoolEntry[] {
    const pools: PoolEntry[] = []
    const systemFields = this.actor.system.schema.fields
    const systemSource = this.actor.system._source

    const hpThresholds = HitPoints.getThresholds(systemSource.HP.max)
    const fpThresholds = Fatigue.getThresholds(systemSource.FP.max)

    pools.push(
      {
        fields: {
          numerator: systemFields.HP.fields.value,
          denominator: systemFields.HP.fields.max,
        },
        path: 'system.HP.value',
        numerator: systemSource.HP.value,
        denominator: systemSource.HP.max,
        atMax: systemSource.HP.value >= systemSource.HP.max,
        name: 'GURPS.HP',
        state: hpThresholds.find(threshold => threshold.value >= systemSource.HP.value)?.condition || '',
        thresholds: hpThresholds,
      },
      {
        fields: {
          numerator: systemFields.FP.fields.value,
          denominator: systemFields.FP.fields.max,
        },
        path: 'system.FP.value',
        numerator: systemSource.FP.value,
        denominator: systemSource.FP.max,
        atMax: systemSource.FP.value >= systemSource.FP.max,
        name: 'GURPS.FP',
        state: fpThresholds.find(threshold => threshold.value >= systemSource.FP.value)?.condition || '',
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
        ? Math.min(pathValue + valueDelta, maxValue)
        : pathValue + valueDelta

    await this.actor.update({ [systemPath]: newValue })
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
