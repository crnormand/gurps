import fields = foundry.data.fields

import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsTraitModifier } from './trait-modifier.js'
import { GcsWeapon } from './weapon.js'

class GcsTrait extends GcsItem<TraitModel> {
  static override metadata = {
    childClass: GcsTrait,
    modifierClass: GcsTraitModifier,
    weaponClass: GcsWeapon,
  }

  /* ---------------------------------------- */

  static override defineSchema(): TraitModel {
    return {
      ...sourcedIdSchema(),
      ...traitData(),
    }
  }

  /* ---------------------------------------- */

  protected static override _importField(
    data: any,
    field: fields.DataField.Any,
    name: string,
    replacements: Record<string, string> = {}
  ): any {
    switch (name) {
      case 'name':
      case 'local_notes':
      case 'userdesc':
        return this.processReplacements(data, replacements) ?? field.getInitialValue()
      default:
        return super._importField(data, field, name, replacements)
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('T')
  }

  /* ---------------------------------------- */

  get effectivelyDisabled(): boolean {
    if (this.disabled) return true
    let parent = this.parent
    while (parent instanceof GcsTrait) {
      if (parent.disabled) return true
      parent = parent.parent
    }
    return false
  }

  /* ---------------------------------------- */

  get adjustedPoints(): number {
    if (this.effectivelyDisabled) return 0
    if (!this.isContainer) return this.calc?.points ?? 0

    let points = 0
    if (this.container_type === 'alternative_abilities') {
      const values = this.childItems.map((child: GcsTrait) => child.adjustedPoints) ?? []
      points = Math.max(...values)
      const maximum = points
      let found = false
      for (const value of values) {
        if (!found && value === maximum) {
          found = true
        } else {
          points += this.round_down ? Math.floor(value / 5) : Math.ceil(value / 5)
        }
      }
    } else {
      this.childItems.reduce((sum: number, child: GcsTrait) => (sum += child.adjustedPoints), points)
    }

    return points
  }

  /* ---------------------------------------- */

  /**
	/* Should this trait container be counted against attribute point costs?
	*/
  get isAttribute(): boolean {
    if (!this.isContainer) return false
    return this.container_type === 'attribute'
  }

  /* ---------------------------------------- */

  /**
	/* Should this trait container be counted against ancestry point costs?
	*/
  get isAncestry(): boolean {
    if (!this.isContainer) return false
    return this.container_type === 'ancestry'
  }

  /** @abstract */
  override get isEnabled(): boolean {
    return !this.effectivelyDisabled
  }
}

/* ---------------------------------------- */

const traitData = () => {
  return {
    // START: TraitModel
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    vtt_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: TraitModel

    // START: TraitEditData
    userdesc: new fields.StringField({ required: true, nullable: true, initial: null }),
    modifiers: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    cr: new fields.NumberField({ required: true, nullable: true, initial: null }),
    disabled: new fields.BooleanField({ required: true, nullable: true, initial: null }),
    // END: TraitEditData

    // START: TraitSyncData
    name: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference: new fields.StringField({ required: true, nullable: true, initial: null }),
    local_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    // END: TraitSyncData

    // START: TraitContainerSyncData
    container_type: new fields.StringField({ required: true, nullable: true, initial: null }),
    // END: TraitContainerSyncData
    // START: TraitNonContainerOnlyEditData
    levels: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // END: TraitNonContainerOnlyEditData

    // START: TraitNonContainerOnlySyncData
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    round_down: new fields.BooleanField({ required: true, nullable: true, initial: null }),
    // END: TraitNonContainerOnlySyncData

    // START: calc
    calc: new fields.SchemaField(
      {
        points: new fields.NumberField({ required: true, nullable: false }),
        resolved_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
      },
      { required: true, nullable: true, initial: null }
    ),
    // END: calc
  }
}

type TraitModel = SourcedIdSchema & ReturnType<typeof traitData>

/* ---------------------------------------- */

export { GcsTrait }
