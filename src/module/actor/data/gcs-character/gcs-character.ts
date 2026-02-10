import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'
import { LengthField, LengthUnit } from '@module/data/common/length.js'
import { WeightField, WeightUnit } from '@module/data/common/weight.js'
import { ResolverCache } from '@module/scripting/types.js'

import { BaseActorModel } from '../base.ts'

import { GcsAttributeDefinition } from './attribute-definition.ts'
import { GcsAttribute } from './attribute.ts'
import { sheetSettingsSchema } from './sheet-settings.ts'

const GcsCharacterVersion = 5

/* ---------------------------------------- */

type GcsCharacterBaseData = {
  attributes: Record<string, GcsAttribute>
  attributeList: GcsAttribute[]
  attributeDefinitions: Record<string, GcsAttributeDefinition>
  attributeDefinitionList: GcsAttributeDefinition[]
}

/* ---------------------------------------- */

class GcsCharacterModel extends BaseActorModel<GcsCharacterSchema, GcsCharacterBaseData> {
  resolverCache: ResolverCache = new Map()

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

  override prepareBaseData(): void {
    const attributeList = Object.values(this._attributes)
    const attributeDefinitionList = Object.values(this.settings._attributes)

    foundry.utils.performIntegerSort(attributeList)
    foundry.utils.performIntegerSort(attributeDefinitionList)

    this.attributeList = attributeList
    this.attributeDefinitionList = attributeDefinitionList

    this.attributes = Object.fromEntries(Object.values(this._attributes).map(attribute => [attribute.id, attribute]))
    this.attributeDefinitions = Object.fromEntries(
      Object.values(this.settings._attributes).map(definition => [definition.id, definition])
    )
  }
}

/* ---------------------------------------- */

const pointsRecordSchema = () => {
  return {
    when: new fields.StringField({ required: true, nullable: false, initial: () => new Date().toISOString() }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
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
    height: new LengthField({
      required: true,
      nullable: false,
      initial: { value: 71, unit: LengthUnit.FeetAndInches },
    }),
    weight: new WeightField({ required: true, nullable: false, initial: { value: 180, unit: WeightUnit.Pound } }),
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

const gcsCharacterSchema = () => {
  return {
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
