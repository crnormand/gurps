import { fields } from '@gurps-types/foundry/index.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'

/**
 * This file contains the functionally identical ReactionModifier and ConditionalModifier classes. They are separate
 * classes due to a design limitation imposed by the PseudoDocument implementation which necessitates that a
 * PseudoDocument of a given documentName can only be embedded in one location on a given parent document.
 *
 * There are other ways around this limitation, such as distinguishing between the two types of modifier using a "type"
 * field on a single class, but this would be a less clean design and would require additional checks throughout the
 * codebase to determine which type of modifier is being accessed.
 */

/* ---------------------------------------- */

class ConditionalModifier extends PseudoDocument<ConditionalModifier.Schema> {
  static override defineSchema(): ConditionalModifier.Schema {
    return conditionalModifierSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'ConditionalModifier'> {
    return {
      documentName: 'ConditionalModifier',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.item.parent
  }
}

/* ---------------------------------------- */

class ReactionModifier extends PseudoDocument<ConditionalModifier.Schema> {
  static override defineSchema(): ConditionalModifier.Schema {
    return conditionalModifierSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'ReactionModifier'> {
    return {
      documentName: 'ReactionModifier',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.item.parent
  }
}

/* ---------------------------------------- */

const conditionalModifierSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    // NOTE: change from previous schema, where "modifier" was a string
    modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    situation: new fields.StringField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
  }
}

/* ---------------------------------------- */

namespace ConditionalModifier {
  export type Schema = ReturnType<typeof conditionalModifierSchema>
}

/* ---------------------------------------- */

export { ConditionalModifier, ReactionModifier }
