import { SimpleMerge } from 'fvtt-types/utils'

import { fields } from '../../types/foundry/index.js'

/* ---------------------------------------- */

class TidField<
  Kind extends TidField.TidKind = TidField.TidKind.Entity,
  Options extends TidField.Options<Kind> = TidField.DefaultOptions<Kind>,
  AssignmentType = fields.StringField.AssignmentType<Options>,
  InitializedType = fields.StringField.InitializedType<Options>,
  PersistentType extends string | null | undefined = fields.StringField.InitializedType<Options>,
> extends fields.StringField<Options, AssignmentType, InitializedType, PersistentType> {
  kind: Kind

  /* ---------------------------------------- */

  constructor(options: Options, context?: fields.DataField.ConstructionContext) {
    super(options, context)
    this.kind = options.kind
  }

  /* ---------------------------------------- */

  static override get _defaults(): TidField.DefaultOptions<TidField.TidKind> {
    return foundry.utils.mergeObject(super._defaults as fields.StringField.DefaultOptions, {
      kind: TidField.TidKind.Entity,
    })
  }
}

/* ---------------------------------------- */

namespace TidField {
  export enum TidKind {
    // Campaign = 'C', // Unused
    ConditionalModifier = 'c',
    Entity = 'A', // Character
    Equipment = 'e',
    EquipmentContainer = 'E',
    EquipmentModifier = 'f',
    EquipmentModifierContainer = 'F',
    Loot = 'L',
    // NavigatorFavorites = '0', // Unused
    // NavigatorLibrary = '1', // Unused
    // NavigatorDirectory = '2', // Unused
    // NavigatorFile = '3', // Unused
    Note = 'n',
    NoteContainer = 'N',
    RitualMagicSpell = 'r',
    // Session = '9', // Unused
    Skill = 's',
    SkillContainer = 'S',
    Spell = 'p',
    SpellContainer = 'P',
    // TableOfContents = '8', // Unused
    Technique = 'q',
    // Template = 'B', // Unused
    Trait = 't',
    TraitContainer = 'T',
    TraitModifier = 'm',
    TraitModifierContainer = 'M',
    WeaponMelee = 'w',
    WeaponRanged = 'W',
  }

  /* ---------------------------------------- */

  type TidType<Kind extends TidKind> = `${Kind}${string}`

  /* ---------------------------------------- */

  export interface Options<Kind extends TidKind, Type = TidType<Kind>> extends fields.StringField.Options<Type> {
    kind: Kind
  }

  export type DefaultOptions<Kind extends TidKind> = SimpleMerge<
    fields.StringField.DefaultOptions,
    {
      kind: Kind
    }
  >
}

export { TidField }
