import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'
import { Length } from '@module/data/common/length.js'
import { ResolverCache } from '@module/scripting/types.js'

import { BaseActorModel } from '../base.ts'

import { GcsAttributeDefinition } from './attribute-definition.ts'
import { GcsAttribute } from './attribute.ts'
import { sheetSettingsSchema } from './sheet-settings.ts'

const GcsCharacterVersion = 5

/* ---------------------------------------- */

class GcsCharacterModel extends BaseActorModel<GcsCharacterSchema> {
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
