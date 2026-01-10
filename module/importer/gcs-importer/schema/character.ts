import { fields } from '../../../types/foundry/index.js'
import { GcsAttribute } from './attribute.js'
import { GcsElement } from './base.js'
import { GcsBody } from './body.js'
import { GcsEquipment } from './equipment.js'
import { GcsNote } from './note.js'
import { GcsSkill } from './skill.js'
import { GcsSpell } from './spell.js'
import { GcsTrait } from './trait.js'
import { GcsWeapon } from './weapon.js'

class GcsCharacter extends GcsElement<GcsCharacterModel> {
  static override defineSchema(): GcsCharacterModel {
    return characterData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any, name: string) {
    switch (name) {
      case 'body_type':
        return GcsBody.importSchema(data, GcsBody.defineSchema())
      case 'attributes':
        return data?.map((attributeData: any) => GcsAttribute.importSchema(attributeData))
      case 'advantages':
      case 'traits':
        return data?.map((traitData: any) => GcsTrait.importSchema(traitData))
      case 'skills':
        return data?.map((skillData: any) => GcsSkill.importSchema(skillData))
      case 'spells':
        return data?.map((spellData: any) => GcsSpell.importSchema(spellData))
      case 'equipment':
      case 'other_equipment':
        return data?.map((equipmentData: any) => GcsEquipment.importSchema(equipmentData))
      // case 'notes':
      //   return data?.map((noteData: any) => GcsNote.importSchema(noteData))
      default:
        return super._importField(data, field, name)
    }
  }

  /* ---------------------------------------- */

  override get isRoot(): boolean {
    return true
  }

  /* ---------------------------------------- */

  get allTraits(): GcsTrait[] {
    const traits = this.traits ?? []

    for (const trait of traits) {
      traits.push(...trait.allChildItems)
    }

    return traits
  }

  /* ---------------------------------------- */

  get allSkills(): GcsSkill[] {
    const skills = this.skills ?? []

    for (const skill of skills) {
      skills.push(...skill.allChildItems)
    }

    return skills
  }

  /* ---------------------------------------- */

  get allSpells(): GcsSpell[] {
    const spells = this.spells ?? []

    for (const spell of spells) {
      spells.push(...spell.allChildItems)
    }

    return spells
  }

  /* ---------------------------------------- */

  get allCarriedEquipment(): GcsEquipment[] {
    const equipment = this.equipment ?? []

    for (const item of equipment) {
      equipment.push(...item.allChildItems)
    }

    return equipment
  }

  /* ---------------------------------------- */

  get allOtherEquipment(): GcsEquipment[] {
    const equipment = this.other_equipment ?? []

    for (const item of equipment) {
      equipment.push(...item.allChildItems)
    }

    return equipment
  }

  /* ---------------------------------------- */

  // get allNotes(): GcsNote[] {
  //   const notes = this.notes ?? []
  //   for (const note of notes) {
  //     notes.push(...note.allChildItems)
  //   }
  //   return notes
  // }

  /* ---------------------------------------- */

  get allEquippedWeapons(): GcsWeapon[] {
    const weapons: GcsWeapon[] = []

    ;[...this.allTraits, ...this.allSkills, ...this.allSpells, ...this.allCarriedEquipment].forEach(e => {
      if (!e.isEnabled) weapons.push(...e.weaponItems)
    })

    return weapons
  }
}

/* ---------------------------------------- */

const characterData = () => {
  return {
    total_points: new fields.NumberField({ required: true, nullable: false }),
    profile: new fields.SchemaField(
      {
        name: new fields.StringField({ required: true, nullable: true }),
        age: new fields.StringField({ required: true, nullable: true }),
        birthday: new fields.StringField({ required: true, nullable: true }),
        eyes: new fields.StringField({ required: true, nullable: true }),
        hair: new fields.StringField({ required: true, nullable: true }),
        skin: new fields.StringField({ required: true, nullable: true }),
        handedness: new fields.StringField({ required: true, nullable: true }),
        gender: new fields.StringField({ required: true, nullable: true }),
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
        body_type: new fields.EmbeddedDataField(GcsBody, { required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    attributes: new fields.ArrayField(new fields.EmbeddedDataField(GcsAttribute, { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    traits: new fields.ArrayField(new fields.EmbeddedDataField(GcsTrait, { required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    skills: new fields.ArrayField(new fields.EmbeddedDataField(GcsSkill, { required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    spells: new fields.ArrayField(new fields.EmbeddedDataField(GcsSpell, { required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    equipment: new fields.ArrayField(new fields.EmbeddedDataField(GcsEquipment, { required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    other_equipment: new fields.ArrayField(
      new fields.EmbeddedDataField(GcsEquipment, { required: true, nullable: false }),
      { required: true, nullable: true }
    ),
    notes: new fields.ArrayField(new fields.EmbeddedDataField(GcsNote, { required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    created_date: new fields.StringField({ required: true, nullable: false }),
    modified_date: new fields.StringField({ required: true, nullable: false }),

    calc: new fields.SchemaField(
      {
        swing: new fields.StringField({ required: true, nullable: false }),
        thrust: new fields.StringField({ required: true, nullable: false }),
        parry_bonus: new fields.NumberField({ required: true, nullable: true }),
        dodge: new fields.ArrayField(new fields.NumberField({ required: true, nullable: false }), {
          required: true,
          nullable: false,
          length: 5,
        }),
      },
      { required: true, nullable: false }
    ),
  }
}

type GcsCharacterModel = ReturnType<typeof characterData>

/* ---------------------------------------- */

export { GcsCharacter, characterData, type GcsCharacterModel }
