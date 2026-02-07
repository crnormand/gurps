import { defaultAttributes } from '../../config/attributes.ts'
import { Length } from '../../data/common/length.js'
import { ResolverCacheKey } from '../../scripting/types.ts'
import { fields, TypeDataModel } from '../../types/foundry/index.ts'

import { BaseActorModel } from './base.ts'
import { GcsAttributeDefinition } from './gcs-attribute-definition.ts'
import { GcsAttribute } from './gcs-attribute.ts'
import { GcsBody } from './gcs-body.ts'

const GcsCharacterVersion = 5

/* ---------------------------------------- */

class GcsCharacterModel extends BaseActorModel<GcsCharacterSchema> {
  resolverCache: Map<ResolverCacheKey, string> = new Map()

  static override defineSchema(): GcsCharacterSchema {
    return gcsCharacterSchema()
  }

  /* ---------------------------------------- */

  protected override _onCreate(
    data: TypeDataModel.ParentAssignmentType<GcsCharacterSchema, Actor.Implementation>,
    options: foundry.abstract.Document.Database.CreateOptions<foundry.abstract.types.DatabaseCreateOperation>,
    userId: string
  ): void {
    super._onCreate(data, options, userId)

    console.log('_onCreate', data, options, userId)
  }

  /* ---------------------------------------- */

  get attributes(): Record<string, GcsAttribute> {
    return Object.fromEntries(Object.values(this._attributes).map(attribute => [attribute.id, attribute]))
  }

  /* ---------------------------------------- */

  get attributeDefinitions(): Record<string, GcsAttributeDefinition> {
    return Object.fromEntries(
      Object.values(this.settings._attributes).map(attributeDefinition => [attributeDefinition.id, attributeDefinition])
    )
  }
}

/* ---------------------------------------- */

const pointsRecordSchema = () => {
  return {
    when: new fields.StringField({ required: true, nullable: false, initial: () => new Date().toISOString() }),
    points: new fields.NumberField({ required: true, nullable: false, initia: 0 }),
    reason: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

/* ---------------------------------------- */

const profileSchema = () => {
  return {
    // TODO: Implement randomization function in field
    // NOTE: Unused. Use Actor#name instead.
    // name: new fields.StringField({ required: true, nullable: false, initial: '' }),
    age: new fields.StringField({ required: true, nullable: false, initial: '' }),
    birthday: new fields.StringField({ required: true, nullable: false, initial: '' }),
    eyes: new fields.StringField({ required: true, nullable: false, initial: '' }),
    hair: new fields.StringField({ required: true, nullable: false, initial: '' }),
    skin: new fields.StringField({ required: true, nullable: false, initial: '' }),
    handedness: new fields.StringField({ required: true, nullable: false, initial: '' }),
    gender: new fields.StringField({ required: true, nullable: false, initial: '' }),
    height: new fields.EmbeddedDataField(Length, { required: true, nullable: false }),
    // TODO: Convert to Weight DataModel or special field
    weight: new fields.StringField({ required: true, nullable: false, initial: '' }),
    playerName: new fields.StringField({ required: true, nullable: false, initial: '' }),
    title: new fields.StringField({ required: true, nullable: false, initial: '' }),
    organization: new fields.StringField({ required: true, nullable: false, initial: '' }),
    religion: new fields.StringField({ required: true, nullable: false, initial: '' }),
    techLevel: new fields.StringField({ required: true, nullable: false, initial: '' }),
    // NOTE: Unused. Use Actor#img instead.
    // portrait: new fields.StringField({ required: true, nullable: false, initial: '' }),
    SM: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

/* ---------------------------------------- */

const sheetSettingsSchema = () => {
  return {
    // NOTE: Only used for data parity with GCS. Not used in GGA.
    page: new fields.SchemaField(
      {
        paperSize: new fields.StringField({ required: true, nullable: false, initial: 'a4' }),
        orientation: new fields.StringField({ required: true, nullable: false, initial: 'portrait' }),
        topMargin: new fields.StringField({ required: true, nullable: false, initial: '0 in' }),
        leftMargin: new fields.StringField({ required: true, nullable: false, initial: '0 in' }),
        bottomMargin: new fields.StringField({ required: true, nullable: false, initial: '0 in' }),
        rightMargin: new fields.StringField({ required: true, nullable: false, initial: '0 in' }),
      },
      { required: true, nullable: false }
    ),
    // NOTE: STUB. Used to decide sheet layout, but might not be used.
    blockLayout: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
    // NOTE: The GCS JSON data for attribute definitions is of type AttributeDef[], but the
    // instantiated data is of type Map<string, AttributeDef>. It is important to note that the JSON
    // data maintains a particular order to the defined attributes,w hich is reflected in the sheets.
    // The Map on the other hand relies on the .order attribute of each AttributeDef to represent this order.
    // Here, we define ._attributes as an TypedObjectField (ArrayFields cannot be updated incrementally, so are best
    // avoided in cases where they represent anything more comples than an array of primitives), and maps each attribute
    // to a randomly generated ID. the .attributes accessor maps each definition to its GCS ID. While this may seem
    // redundant, the latter GCS ID is user-editable and poses potential issues with duplicate IDs and could force
    // issues wherein the field by which attributes are keyed is changed, forcing a replacement of the whole object
    // rather than changing of a single property.
    _attributes: new fields.TypedObjectField(new fields.EmbeddedDataField(GcsAttributeDefinition), {
      required: true,
      nullable: false,
      initial: defaultAttributes(),
    }),
    bodyType: new fields.EmbeddedDataField(GcsBody),
    // TODO: STUB. Include enum or enumlike values for damage progression
    damageProgression: new fields.StringField({ required: true, nullable: false }),
    // TODO: STUB. Include enum or enumlike values for default length units
    defaultLengthUnits: new fields.StringField({ required: true, nullable: false }),
    // TODO: STUB. Include enum or enumlike values for default weight units
    defaultWeightUnits: new fields.StringField({ required: true, nullable: false }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    userDescriptionDisplay: new fields.StringField({ required: true, nullable: false }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    modifiersDisplay: new fields.StringField({ required: true, nullable: false }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    notesDisplay: new fields.StringField({ required: true, nullable: false }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    skillLevelAdjDisplay: new fields.StringField({ required: true, nullable: false }),
    useMultiplicativeModifiers: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    useModifyingDicePlusAdds: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    useHalfStatDefaults: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showTraitModifierAdj: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showEquipmentModifierAdj: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showAllWeapons: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showSpellAdj: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    hideSourceMismatch: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    hideTlColumn: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    hideLcColumn: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    hidePageRefColumn: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    useTitleInFooter: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    excludeUnspentPointsFromTotal: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showLiftingStDamage: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showIqBasedDamage: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

/* ---------------------------------------- */

const gcsCharacterSchema = () => {
  return {
    // Version          int             `json:"version"`
    // ID               tid.TID         `json:"id"`
    // TotalPoints      fxp.Int         `json:"total_points"`
    // PointsRecord     []*PointsRecord `json:"points_record,omitzero"`
    // Profile          Profile         `json:"profile"`
    // SheetSettings    *SheetSettings  `json:"settings,omitzero"`
    // Attributes       *Attributes     `json:"attributes,omitzero"`
    // Traits           []*Trait        `json:"traits,omitzero"`
    // Skills           []*Skill        `json:"skills,omitzero"`
    // Spells           []*Spell        `json:"spells,omitzero"`
    // CarriedEquipment []*Equipment    `json:"equipment,omitzero"`
    // OtherEquipment   []*Equipment    `json:"other_equipment,omitzero"`
    // Notes            []*Note         `json:"notes,omitzero"`
    // CreatedOn        jio.Time        `json:"created_date"`
    // ModifiedOn       jio.Time        `json:"modified_date"`
    // ThirdParty       map[string]any  `json:"third_party,omitzero"`
    version: new fields.NumberField({ required: true, nullable: false, initial: GcsCharacterVersion }),
    tid: new fields.DocumentIdField({ required: true, nullable: false, initial: () => foundry.utils.randomID() }),
    totalPoints: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    pointsRecord: new fields.TypedObjectField(new fields.SchemaField(pointsRecordSchema()), {
      required: true,
      nullable: false,
      initial: {},
    }),
    profile: new fields.SchemaField(profileSchema(), { required: true, nullable: false }),
    settings: new fields.SchemaField(sheetSettingsSchema()),
    _attributes: new fields.TypedObjectField(new fields.EmbeddedDataField(GcsAttribute), {
      required: true,
      nullable: false,
      initial: (data: any) =>
        data.settings?._attributes ? GcsAttribute.setFromDefinitions(data.settings._attributes) : {},
    }),
    createdOn: new fields.StringField({ required: true, nullable: false }),
    modifiedOn: new fields.StringField({ required: true, nullable: false }),
    // Arbitrary data field
    thirdParty: new fields.ObjectField(),
  }
}

type GcsCharacterSchema = ReturnType<typeof gcsCharacterSchema>

/* ---------------------------------------- */

export { GcsCharacterModel }
