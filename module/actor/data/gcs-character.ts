import { Length } from '../../data/common/length.js'
import { TidField } from '../../data/fields/tid-field.ts'
import { fields } from '../../types/foundry/index.ts'

import { BaseActorModel } from './base.ts'
import { GcsAttribute } from './gcs-attribute.ts'
import { GcsBody } from './gcs-body.ts'

const GcsCharacterVersion = 5

/* ---------------------------------------- */

class GcsCharacterModel extends BaseActorModel<GcsCharacterSchema> {
  static override defineSchema(): GcsCharacterSchema {
    return gcsCharacterSchema()
  }

  /* ---------------------------------------- */

  get attributes(): Map<string, GcsAttribute> {
    return new Map(this._attributes.map(e => [e.id, e]))
  }

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

const pointsRecordSchema = () => {
  return {
    // When   jio.Time `json:"when"`
    // Points fxp.Int  `json:"points"`
    // Reason string   `json:"reason,omitzero"`
    when: new fields.StringField({ required: true, nullable: false, initial: () => new Date().toISOString() }),
    points: new fields.NumberField({ required: true, nullable: false, initia: 0 }),
    reason: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

/* ---------------------------------------- */

const profileSchema = () => {
  return {
    // type ProfileRandom struct
    // 	Name       string     `json:"name,omitzero"`
    // 	Age        string     `json:"age,omitzero"`
    // 	Birthday   string     `json:"birthday,omitzero"`
    // 	Eyes       string     `json:"eyes,omitzero"`
    // 	Hair       string     `json:"hair,omitzero"`
    // 	Skin       string     `json:"skin,omitzero"`
    // 	Handedness string     `json:"handedness,omitzero"`
    // 	Gender     string     `json:"gender,omitzero"`
    // 	Height     fxp.Length `json:"height,omitzero"`
    // 	Weight     fxp.Weight `json:"weight,omitzero"`
    // TODO: Implement randomization function in field
    // NOTE: Unused. Use Actor#name instead.
    name: new fields.StringField({ required: true, nullable: false, initial: '' }),
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

    // type Profile struct
    // 	ProfileRandom
    // 	PlayerName        string        `json:"player_name,omitzero"`
    // 	Title             string        `json:"title,omitzero"`
    // 	Organization      string        `json:"organization,omitzero"`
    // 	Religion          string        `json:"religion,omitzero"`
    // 	TechLevel         string        `json:"tech_level,omitzero"`
    // 	PortraitData      []byte        `json:"portrait,omitzero"`
    // 	PortraitImage     *unison.Image `json:"-"`
    // 	SizeModifier      int           `json:"SM,omitzero"`
    // 	SizeModifierBonus fxp.Int       `json:"-"`
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

const attributeThresholdSchema = () => {
  return {
    // State       string         `json:"state"`
    // Value       string         `json:"value"`
    // Explanation string         `json:"explanation,omitzero"`
    // Ops         []threshold.Op `json:"ops,omitzero"`
    state: new fields.StringField({ required: true, nullable: false }),
    value: new fields.StringField({ required: true, nullable: false }),
    explanation: new fields.StringField({ required: true, nullable: false }),
    // NOTE: STUB. This field is used to store operation names (as strings) which correspond to
    // halving values like ST, Move, etc. at the given threshold. There may be a better way of
    // storing this information.
    ops: new fields.ArrayField(new fields.StringField()),
  }
}

// NOTE: AttributeDef should likely be defined as a DataModel rather than a simple schema, as the corresponding
// GCS object includes accessors fields which a SchemaField does not permit.
const attributeDefSchema = () => {
  return {
    // DefID               string              `json:"id"`
    // Type                attribute.Type      `json:"type"`
    // Placement           attribute.Placement `json:"placement,omitzero"`
    // Name                string              `json:"name"`
    // FullName            string              `json:"full_name,omitzero"`
    // Base                string              `json:"base,omitzero"`
    // CostPerPoint        fxp.Int             `json:"cost_per_point,omitzero"`
    // CostAdjPercentPerSM fxp.Int             `json:"cost_adj_percent_per_sm,omitzero"`
    // Thresholds          []*PoolThreshold    `json:"thresholds,omitzero"`
    // NOTE: The .initial value of this field is a temporary placeholder. GCS generates a new ID
    // as an alphanumeric (plus _) string of minimum length to ensure there are no duplicate ID keys.
    // Therefore, it should cycle through "a" -> "z", then "aa" etc.
    id: new fields.StringField({ required: true, nullable: false, blank: false, initial: 'a' }),
    // TODO: STUB. Include enum or enumlike values for attribute types
    type: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for attribute placement
    placement: new fields.StringField({ required: true, nullable: false, choices: [] }),
    name: new fields.StringField({ required: true, nullable: false }),
    fullName: new fields.StringField({ required: true, nullable: false }),
    // NOTE: This is parsed as JS code, but no type yet exists for this.
    // TODO: Create dedicated JS code type.
    base: new fields.StringField({ required: true, nullable: false }),
    costPerPoint: new fields.NumberField({ requried: true, nullable: false, initial: 0 }),
    // NOTE: Should be displayed as a percentage
    costAdjPerSm: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // TODO: Check if required and nullable even works for array fields
    thresholds: new fields.ArrayField(new fields.SchemaField(attributeThresholdSchema()), {
      required: true,
      nullable: true,
    }),
  }
}

const sheetSettingsSchema = () => {
  return {
    // Page                          *PageSettings      `json:"page,omitzero"`
    // BlockLayout                   *BlockLayout       `json:"block_layout,omitzero"`
    // Attributes                    *AttributeDefs     `json:"attributes,omitzero"`
    // BodyType                      *Body              `json:"body_type,omitzero"`
    // DamageProgression             progression.Option `json:"damage_progression"`
    // DefaultLengthUnits            fxp.LengthUnit     `json:"default_length_units"`
    // DefaultWeightUnits            fxp.WeightUnit     `json:"default_weight_units"`
    // UserDescriptionDisplay        display.Option     `json:"user_description_display"`
    // ModifiersDisplay              display.Option     `json:"modifiers_display"`
    // NotesDisplay                  display.Option     `json:"notes_display"`
    // SkillLevelAdjDisplay          display.Option     `json:"skill_level_adj_display"`
    // UseMultiplicativeModifiers    bool               `json:"use_multiplicative_modifiers,omitzero"`
    // UseModifyingDicePlusAdds      bool               `json:"use_modifying_dice_plus_adds,omitzero"`
    // UseHalfStatDefaults           bool               `json:"use_half_stat_defaults,omitzero"`
    // ShowTraitModifierAdj          bool               `json:"show_trait_modifier_adj,omitzero"`
    // ShowEquipmentModifierAdj      bool               `json:"show_equipment_modifier_adj,omitzero"`
    // ShowAllWeapons                bool               `json:"show_all_weapons,omitzero"`
    // ShowSpellAdj                  bool               `json:"show_spell_adj,omitzero"`
    // HideSourceMismatch            bool               `json:"hide_source_mismatch,omitzero"`
    // HideTLColumn                  bool               `json:"hide_tl_column,omitzero"`
    // HideLCColumn                  bool               `json:"hide_lc_column,omitzero"`
    // HidePageRefColumn             bool               `json:"hide_page_ref_column,omitzero"`
    // UseTitleInFooter              bool               `json:"use_title_in_footer,omitzero"`
    // ExcludeUnspentPointsFromTotal bool               `json:"exclude_unspent_points_from_total,omitzero"`
    // ShowLiftingSTDamage           bool               `json:"show_lifting_st_damage,omitzero"`
    // ShowIQBasedDamage             bool               `json:"show_iq_based_damage,omitzero"`
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
    // Here, we define ._attributes as an ArrayField, while .attributes is a Map<string, AttributeDef>
    // and is created at runtime. However, this can be changed if making .attributes (the Map<string,AttributeDef> field)
    // persistent makes more sense.
    _attributes: new fields.ArrayField(new fields.SchemaField(attributeDefSchema()), {
      required: true,
      nullable: false,
    }),
    bodyType: new fields.EmbeddedDataField(GcsBody),
    // TODO: STUB. Include enum or enumlike values for damage progression
    damageProgression: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for default length units
    defaultLengthUnits: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for default weight units
    defaultWeightUnits: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    userDescriptionDisplay: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    modifiersDisplay: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    notesDisplay: new fields.StringField({ required: true, nullable: false, choices: [] }),
    // TODO: STUB. Include enum or enumlike values for display type (if we're using this at all)
    skillLevelAdjDisplay: new fields.StringField({ required: true, nullable: false, choices: [] }),
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
    id: new TidField({ kind: TidField.TidKind.Entity, required: true, nullable: false }),
    totalPoints: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    pointsRecord: new fields.ArrayField(new fields.SchemaField(pointsRecordSchema()), {
      required: true,
      nullable: false,
      initial: [],
    }),
    profile: new fields.SchemaField(profileSchema(), { required: true, nullable: false }),
    settings: new fields.SchemaField(sheetSettingsSchema()),
    _attributes: new fields.ArrayField(new fields.EmbeddedDataField(GcsAttribute)),
    createdOn: new fields.StringField({ required: true, nullable: false }),
    modifiedOn: new fields.StringField({ required: true, nullable: false }),
    // Arbitrary data field
    thirdParty: new fields.ObjectField(),
  }
}

type GcsCharacterSchema = ReturnType<typeof gcsCharacterSchema>

/* ---------------------------------------- */

export { GcsCharacterModel }
