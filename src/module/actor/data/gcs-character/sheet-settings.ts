import { fields } from '@gurps-types/foundry/index.js'
import { defaultAttributes } from '@module/config/attributes.js'
import { defaultBodyType } from '@module/config/body.js'
import { WeightUnit, LengthUnit } from '@module/data/common/index.js'

import { GcsAttributeDefinition } from './attribute-definition.js'
import { GcsBody } from './body.js'

enum DamageProgression {
  BasicSet = 'basicSet',
  KnowingYourOwnStrength = 'knowingYourOwnStrength',
  NoSchoolGrognardDamage = 'noSchoolGrognardDamage',
  ThrustEqualsSwingMinus2 = 'thrustEqualsSwingMinus2',
  SwingEqualsThrustPlus2 = 'swingEqualsThrustPlus2',
  Tbone1 = 'tbone1',
  Tbone1Clean = 'tbone1Clean',
  Tbone2 = 'tbone2',
  Tbone2Clean = 'tbone2Clean',
  PhoenixFlameD3 = 'phoenixFlameD3',
}

/* ---------------------------------------- */

enum DisplayOption {
  NotShown = 'notShown',
  Inline = 'inline',
  Tooltip = 'tooltip',
  InlineAndTooltip = 'inlineAndTooltip',
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
    // instantiated data is of type Record<string, AttributeDef>. It is important to note that the JSON
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
    bodyType: new fields.EmbeddedDataField(GcsBody, { required: true, nullable: false, initial: defaultBodyType() }),
    damageProgression: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(DamageProgression),
      initial: DamageProgression.BasicSet,
    }),
    defaultLengthUnits: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(LengthUnit),
      initial: LengthUnit.FeetAndInches,
    }),
    // TODO: STUB. Include enum or enumlike values for default weight units
    defaultWeightUnits: new fields.StringField({
      required: true,
      nullable: false,

      choices: Object.values(WeightUnit),
      initial: WeightUnit.Pound,
    }),
    userDescriptionDisplay: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(DisplayOption),
      initial: DisplayOption.Inline,
    }),
    modifiersDisplay: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(DisplayOption),
      initial: DisplayOption.Inline,
    }),
    notesDisplay: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(DisplayOption),
      initial: DisplayOption.Inline,
    }),
    skillLevelAdjDisplay: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(DisplayOption),
      initial: DisplayOption.Inline,
    }),
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

export { sheetSettingsSchema, DamageProgression, DisplayOption }
