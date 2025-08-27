import fields = foundry.data.fields

import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'

class GcsTrait extends GcsItem<TraitModel> {
  static override metadata = {
    childClass: GcsTrait,
    modifierClass: null,
    weaponClass: null,
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
}

/* ---------------------------------------- */

const traitData = () => {
  return {
    // START: TraitEditData
    userdesc: new fields.StringField({ required: true, nullable: true, initial: null }),
    cr: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // END: TraitEditData

    // START: TraitSyncData
    name: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference: new fields.StringField({ required: true, nullable: true, initial: null }),
    local_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    // END: TraitSyncData

    // START: TraitNonContainerOnlyEditData
    levels: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // END: TraitNonContainerOnlyEditData

    // START: TraitNonContainerOnlySyncData
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
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

export { GcsTrait }
