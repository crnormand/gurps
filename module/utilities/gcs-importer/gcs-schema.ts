import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

/* ---------------------------------------- */

const sourcedIdSchema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    source: new fields.StringField({ required: true, nullable: true }),
  }
}

type SourcedIdSchema = ReturnType<typeof sourcedIdSchema>

/* ---------------------------------------- */

type GCSItemMetaData = {
  childClass: null | typeof GCSItem<any>
  modifierClass: null | typeof GCSItem<any>
}

class GCSItem<Schema extends fields.DataSchema> extends DataModel<Schema> {
  static metadata: GCSItemMetaData = {
    childClass: null,
    modifierClass: null,
  }

  /* ---------------------------------------- */

  static fromImportData<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema
  ): GCSItem<Schema> {
    const createData: DataModel.CreateData<Schema> = this._importSchema(importData, schema)

    return new this(createData as DataModel.CreateData<Schema>)
  }

  /* ---------------------------------------- */

  protected static _importSchema<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema
  ): DataModel.CreateData<Schema> {
    const data: Partial<DataModel.CreateData<Schema>> = {}

    for (const [key, field] of Object.entries(schema)) {
      if (key === 'children') {
        ;(data as AnyMutableObject)[key] = this._importChildren(importData)
      } else if (key === 'modifiers') {
        ;(data as AnyMutableObject)[key] = this._importModifiers(importData)
      } else {
        ;(data as AnyMutableObject)[key] = this._importField(importData[key], field)
      }
    }

    return data as DataModel.CreateData<Schema>
  }

  /* ---------------------------------------- */

  protected static _importField(data: any, field: fields.DataField.Any): any {
    switch (field.constructor) {
      case fields.StringField:
      case fields.NumberField:
      case fields.BooleanField:
      case fields.ObjectField:
        return data ?? field.getInitialValue()
      case fields.SchemaField:
        return data === undefined || data === null
          ? null
          : Object.keys((field as fields.SchemaField<any>).fields).reduce((obj: any, key) => {
              obj[key] = this._importField(data[key], (field as unknown as fields.SchemaField<any>).fields[key])
              return obj
            }, {})
    }
  }

  /* ---------------------------------------- */

  protected static _importChildren<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject
  ): GCSItem<any>[] {
    const childClass: null | typeof GCSItem<any> = this.metadata.childClass
    if (!childClass) return []
    const children = (importData.children as unknown as Array<AnyObject>) || []
    return children.map((childData: AnyObject) => {
      return (childClass as typeof GCSItem<any>).fromImportData(childData as any, (childClass as any).schema)
    })
  }

  /* ---------------------------------------- */

  protected static _importModifiers<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject
  ): GCSItem<any>[] {
    const modifierClass: null | typeof GCSItem<any> = this.metadata.modifierClass
    if (modifierClass === null) return []
    const modifiers = (importData.modifiers as unknown as Array<AnyObject>) || []
    return modifiers.map((modifierData: AnyObject) => {
      return (modifierClass as typeof GCSItem<any>).fromImportData(modifierData as any, (modifierClass as any).schema)
    })
  }
}

/* ---------------------------------------- */

class GCSSkillDefault extends GCSItem<SkillDefaultData> {
  static override defineSchema(): SkillDefaultData {
    return skillDefaultData()
  }
}

const skillDefaultData = () => {
  return {
    type: new fields.StringField({ required: true, nullable: false }),
    name: new fields.StringField({ required: true, nullable: true }),
    specialization: new fields.StringField({ required: true, nullable: true }),
    modifier: new fields.NumberField({ required: true, nullable: true }),
    level: new fields.NumberField({ required: true, nullable: false }),
    adjusted_level: new fields.NumberField({ required: true, nullable: false }),
    points: new fields.NumberField({ required: true, nullable: false }),
    // STUB: when_tl is not yet supported
    when_tl: new fields.ObjectField({ required: true, nullable: true }),
  }
}

type SkillDefaultData = ReturnType<typeof skillDefaultData>

/* ---------------------------------------- */

class GCSWeapon extends GCSItem<WeaponData> {
  static override defineSchema(): WeaponData {
    return weaponData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any): any {
    if (field.name === 'defaults') {
      return data?.map((defaultData: AnyObject) => {
        return GCSSkillDefault.fromImportData(defaultData as any, GCSSkillDefault.schema.fields)
      })
    }
    return super._importField(data, field)
  }
}

const weaponData = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    damage: new fields.ObjectField({ required: true, nullable: false }),
    strength: new fields.ObjectField({ required: true, nullable: true }),
    usage: new fields.StringField({ required: true, nullable: true }),
    usage_notes: new fields.StringField({ required: true, nullable: true }),
    reach: new fields.ObjectField({ required: true, nullable: true }),
    parry: new fields.ObjectField({ required: true, nullable: true }),
    block: new fields.ObjectField({ required: true, nullable: true }),
    accuracy: new fields.ObjectField({ required: true, nullable: true }),
    range: new fields.ObjectField({ required: true, nullable: true }),
    rate_of_fire: new fields.ObjectField({ required: true, nullable: true }),
    shots: new fields.ObjectField({ required: true, nullable: true }),
    bulk: new fields.ObjectField({ required: true, nullable: true }),
    recoil: new fields.ObjectField({ required: true, nullable: true }),
    defaults: new fields.ArrayField(new fields.EmbeddedDataField(GCSSkillDefault, { required: true, nullable: false })),
    hide: new fields.BooleanField({ required: true, nullable: true }),
    calc: new fields.SchemaField(
      {
        level: new fields.NumberField({ required: true, nullable: false }),
        damage: new fields.StringField({ required: true, nullable: true }),
        parry: new fields.StringField({ required: true, nullable: true }),
        block: new fields.StringField({ required: true, nullable: true }),
        accuracy: new fields.StringField({ required: true, nullable: true }),
        reach: new fields.StringField({ required: true, nullable: true }),
        range: new fields.StringField({ required: true, nullable: true }),
        rate_of_fire: new fields.StringField({ required: true, nullable: true }),
        shots: new fields.StringField({ required: true, nullable: true }),
        bulk: new fields.StringField({ required: true, nullable: true }),
        recoil: new fields.StringField({ required: true, nullable: true }),
        strength: new fields.StringField({ required: true, nullable: true }),
      },
      { required: true, nullable: true }
    ),
  }
}

type WeaponData = ReturnType<typeof weaponData>

/* ---------------------------------------- */

class GCSTraitModifier extends GCSItem<TraitModifierData> {}

const traitModifierData = () => {
  return {
    // START: TraitModifierData
    third_party: new fields.ObjectField(),
    // Change from GCS' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModifierData
    // START: TraitModifierEditData
    vtt_notes: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: TraitModifierEditData
    // START: TraitModifierSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModifierSyncData
    // START: TraitModifierNonContainerSyncData
    cost: new fields.NumberField({ required: true, nullable: true }),
    cost_type: new fields.StringField({ required: true, nullable: true }),
    use_level_from_trait: new fields.BooleanField({ required: true, nullable: true }),
    show_notes_on_weapon: new fields.BooleanField({ required: true, nullable: true }),
    affects: new fields.StringField({ required: true, nullable: true }),
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // END: TraitModifierNonContainerSyncData
  }
}

type TraitModifierData = SourcedIdSchema & ReturnType<typeof traitModifierData>

/* ---------------------------------------- */

class GCSTrait extends GCSItem<TraitData> {
  static override metadata = {
    childClass: GCSTrait,
    modifierClass: GCSTraitModifier,
  }

  /* ---------------------------------------- */

  static override defineSchema(): TraitData {
    return {
      ...sourcedIdSchema(),
      ...traitData(),
    }
  }
}

const traitData = () => {
  return {
    // START: TraitData
    third_party: new fields.ObjectField(),
    // Change from GCS' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitData
    // START: TraitEditData
    vtt_note: new fields.StringField({ required: true, nullable: true }),
    userdesc: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    modifiers: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    cr: new fields.StringField({ required: true, nullable: true }),
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
    // START: TraitNonContianerOnlyEditData
    base_points: new fields.NumberField({ required: true, nullable: true }),
    points_per_level: new fields.NumberField({ required: true, nullable: true }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GCSWeapon, { required: true, nullable: false })),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    roun_down: new fields.BooleanField({ required: true, nullable: true }),
    can_level: new fields.BooleanField({ required: true, nullable: true }),
    // END: TraitNonContianerOnlyEditData
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

type TraitData = SourcedIdSchema & ReturnType<typeof traitData>
