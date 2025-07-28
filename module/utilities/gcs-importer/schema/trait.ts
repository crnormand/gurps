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
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModel
    // START: TraitEditData
    vtt_note: new fields.StringField({ required: true, nullable: true }),
    userdesc: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    modifiers: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    cr: new fields.NumberField({ required: true, nullable: true }),
    disabled: new fields.BooleanField({ required: true, nullable: true }),
    // END: TraitEditData
    // START: TraitSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // STUB: prereqs is not yet supported
    prereqs: new fields.ObjectField({ required: true, nullable: true }),
    cr_adj: new fields.StringField({ required: true, nullable: true }),
    // END: TraitSyncData
    // START: TraitContainerSyncData
    ancestry: new fields.StringField({ required: true, nullable: true }),
    template_picker: new fields.ObjectField({ required: true, nullable: true }),
    container_type: new fields.StringField({ required: true, nullable: true }),
    // END: TraitContainerSyncData
    // START: TraitNonContainerOnlyEditData
    levels: new fields.NumberField({ required: true, nullable: true }),
    // STUB: study is not yet supported
    study: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    study_hours_needed: new fields.NumberField({ required: true, nullable: true }),
    // END: TraitNonContainerOnlyEditData
    // START: TraitNonContainerOnlySyncData
    base_points: new fields.NumberField({ required: true, nullable: true }),
    points_per_level: new fields.NumberField({ required: true, nullable: true }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    round_down: new fields.BooleanField({ required: true, nullable: true }),
    can_level: new fields.BooleanField({ required: true, nullable: true }),
    // END: TraitNonContainerOnlySyncData
    // START: calc
    calc: new fields.SchemaField(
      {
        points: new fields.NumberField({ required: true, nullable: false }),
        unsatisfied_reason: new fields.StringField({ required: true, nullable: true }),
        resolved_notes: new fields.StringField({ required: true, nullable: true }),
      },
      { required: true, nullable: true }
    ),
    // END: calc
  }
}

type TraitModel = SourcedIdSchema & ReturnType<typeof traitData>

/* ---------------------------------------- */

export { GcsTrait, traitData }
