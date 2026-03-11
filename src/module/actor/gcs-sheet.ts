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
  numerator: number
  denominator: number
  name: string
  state: string
  thresholds: ThresholdDescriptor[]
}

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
    actor: Actor.OfType<'characterV2'>
    system: Actor.SystemOfType<'characterV2'>
    systemFields?: foundry.data.fields.SchemaField<CharacterV2Schema>['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<CharacterV2Schema>
    moveModeChoices?: Record<string, string>
    pools: PoolEntry[]
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
    }
  }

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
        numerator: systemSource.HP.value,
        denominator: systemSource.HP.max,
        name: 'GURPS.HP',
        state: hpThresholds.find(threshold => threshold.value >= systemSource.HP.value)?.condition || '',
        thresholds: hpThresholds,
      },
      {
        fields: {
          numerator: systemFields.FP.fields.value,
          denominator: systemFields.FP.fields.max,
        },
        numerator: systemSource.FP.value,
        denominator: systemSource.FP.max,
        name: 'GURPS.FP',
        state: fpThresholds.find(threshold => threshold.value >= systemSource.FP.value)?.condition || '',
        thresholds: fpThresholds,
      }
    )

    return pools
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
