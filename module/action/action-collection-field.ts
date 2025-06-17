import { MeleeAttack } from './melee-attack.js'
import fields = foundry.data.fields
import { RangedAttack } from './ranged-attack.js'
import { AnyObject } from 'fvtt-types/utils'
import { CollectionField } from 'module/data/fields/collection-field.js'

/* ---------------------------------------- */

const types = {
  meleeAtk: MeleeAttack,
  rangedAtk: RangedAttack,
}

type Types = typeof types

/* ---------------------------------------- */

class ActionCollectionField<
  const Options extends fields.TypedObjectField.Options<AnyObject> = fields.TypedObjectField.DefaultOptions,
> extends CollectionField<Types, Options> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(types, options, context)
  }
}

/* ---------------------------------------- */

export { ActionCollectionField }
