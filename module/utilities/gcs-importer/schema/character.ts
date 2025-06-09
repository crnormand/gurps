import { GcsBody } from './body.js'
import fields = foundry.data.fields
import { GcsElement } from './base.js'

class GcsCharacter extends GcsElement<GcsCharacterData> {
  static override defineSchema(): GcsCharacterData {
    return characterData()
  }
}

/* ---------------------------------------- */

const characterData = () => {
  return {
    version: new fields.NumberField({ required: true, nullable: false }),
    id: new fields.StringField({ required: true, nullable: false }),
    total_points: new fields.NumberField({ required: true, nullable: false }),
    // STUB: points_record is not yet supported
    points_record: new fields.ArrayField(new fields.ObjectField(), { required: true, nullable: false }),
    profile: new fields.SchemaField(
      {
        name: new fields.StringField({ required: true, nullable: true }),
        age: new fields.StringField({ required: true, nullable: true }),
        birthday: new fields.StringField({ required: true, nullable: true }),
        eyes: new fields.StringField({ required: true, nullable: true }),
        hair: new fields.StringField({ required: true, nullable: true }),
        skin: new fields.StringField({ required: true, nullable: true }),
        handedness: new fields.StringField({ required: true, nullable: true }),
        gendeer: new fields.StringField({ required: true, nullable: true }),
        height: new fields.StringField({ required: true, nullable: true }),
        weight: new fields.StringField({ required: true, nullable: true }),
        player_name: new fields.StringField({ required: true, nullable: true }),
        title: new fields.StringField({ required: true, nullable: true }),
        organization: new fields.StringField({ required: true, nullable: true }),
        religion: new fields.StringField({ required: true, nullable: true }),
        tech_level: new fields.StringField({ required: true, nullable: true }),
        portrait: new fields.StringField({ required: true, nullable: true }),
        SM: new fields.NumberField({ required: true, nullable: true }),
      },
      { required: true, nullable: false }
    ),
    settings: new fields.SchemaField(
      {
        // STUB: settings.page is not yet supported
        page: new fields.ObjectField({ required: true, nullable: false }),
        // STUB: settings.block_layout is not yet supported
        block_layout: new fields.ObjectField({ required: true, nullable: false }),
        // STUB: settings.attributes is not yet supported
        attributes: new fields.ObjectField({ required: true, nullable: false }),
        body_type: new fields.EmbeddedDataField(GcsBody, { required: true, nullable: false }),
        damage_progression: new fields.StringField({ required: true, nullable: false }),
        default_length_units: new fields.StringField({ required: true, nullable: false }),
        default_weight_units: new fields.StringField({ required: true, nullable: false }),
        user_description_display: new fields.StringField({ required: true, nullable: false }),
        modifiers_display: new fields.StringField({ required: true, nullable: false }),
        notes_display: new fields.StringField({ required: true, nullable: false }),
        skill_level_adj_display: new fields.StringField({ required: true, nullable: false }),
        use_multiplicative_modifiers: new fields.BooleanField({ required: true, nullable: false }),
        use_modifying_dice_plus_adds: new fields.BooleanField({ required: true, nullable: false }),
        use_half_stat_defaults: new fields.BooleanField({ required: true, nullable: true }),
        show_trait_modifier_adj: new fields.BooleanField({ required: true, nullable: true }),
        show_equipment_modifier_adj: new fields.BooleanField({ required: true, nullable: true }),
        show_spell_adj: new fields.BooleanField({ required: true, nullable: true }),
        hide_source_mismatch: new fields.BooleanField({ required: true, nullable: true }),
        hide_tl_column: new fields.BooleanField({ required: true, nullable: true }),
        hide_lc_column: new fields.BooleanField({ required: true, nullable: true }),
        use_title_in_footer: new fields.BooleanField({ required: true, nullable: true }),
        exclude_unspent_points_from_total: new fields.BooleanField({ required: true, nullable: true }),
        show_lifting_st_damage: new fields.BooleanField({ required: true, nullable: true }),
        show_iq_based_damage: new fields.BooleanField({ required: true, nullable: true }),
      },
      { required: true, nullable: false }
    ),
  }
}

type GcsCharacterData = ReturnType<typeof characterData>

/* ---------------------------------------- */

export { GcsCharacter, characterData, type GcsCharacterData }
