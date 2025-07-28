import fields = foundry.data.fields

const attributeSchema = () => {
  return {
    import: new fields.NumberField({ required: true, nullable: false, initial: 10 }),
    value: new fields.NumberField({ required: true, nullable: false, initial: 10 }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

/* ---------------------------------------- */

const poolSchema = () => {
  return {
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

/* ---------------------------------------- */

const encumbranceSchema = () => {
  return {
    key: new fields.StringField({ required: true, nullable: false }),
    level: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: change from previous schema, where "dodge" was a string
    dodge: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: change from previuos schema where "weight" was a string
    weight: new fields.NumberField({ required: true, nullable: false }),
    move: new fields.NumberField({ required: true, nullable: false }),
    current: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    currentmove: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    currentsprint: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    currentdodge: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    currentmovedisplay: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

type EncumbranceSchema = ReturnType<typeof encumbranceSchema>

/* ---------------------------------------- */

// NOTE: change from previous schema where these values were all strings
const liftingMovingSchema = () => {
  return {
    basiclift: new fields.NumberField({ required: true, nullable: false }),
    onehandedlift: new fields.NumberField({ required: true, nullable: false }),
    twohandedlift: new fields.NumberField({ required: true, nullable: false }),
    shove: new fields.NumberField({ required: true, nullable: false }),
    runningshove: new fields.NumberField({ required: true, nullable: false }),
    shiftslightly: new fields.NumberField({ required: true, nullable: false }),
    carryonback: new fields.NumberField({ required: true, nullable: false }),
  }
}

type LiftingMovingSchema = ReturnType<typeof liftingMovingSchema>

/* ---------------------------------------- */

// TODO: move this to a move appropriate location to do wih OTF Action or something like that
const damageActionSchema = () => {
  return {
    orig: new fields.StringField({ required: true, nullable: false }),
    costs: new fields.StringField({ required: true, nullable: false }),
    formula: new fields.StringField({ required: true, nullable: false }),
    damagetype: new fields.StringField({ required: true, nullable: false }),
    extdamagetype: new fields.StringField({ required: true, nullable: false }),
    hitlocation: new fields.StringField({ required: true, nullable: false }),
    accumulate: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    count: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
    roll: new fields.StringField({ required: true, nullable: true, initial: '' }),
  }
}

type DamageActionSchema = ReturnType<typeof damageActionSchema>

/* ---------------------------------------- */

const modifierSetSchema = () => {
  return {
    modifiers: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
  }
}

/* ---------------------------------------- */

const conditionsSchema = () => {
  return {
    actions: new fields.SchemaField(
      {
        maxActions: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
        maxBlocks: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
      },
      { required: true, nullable: false }
    ),
    posture: new fields.StringField({ required: true, nullable: false }),
    // NOTE: change from previous schema where maneuver is not nullable
    maneuver: new fields.StringField({ required: true, nullable: true }),
    move: new fields.StringField({ required: true, nullable: false }),

    self: new fields.SchemaField(modifierSetSchema(), { required: true, nullable: false }),
    target: new fields.SchemaField(modifierSetSchema(), { required: true, nullable: false }),
    // Change from previous schema. Now a Set instead of an Array to eliminate duplicates.
    usermods: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),

    reeling: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    exhausted: new fields.BooleanField({ required: true, nullable: false, initial: false }),

    damageAccumulators: new fields.ArrayField(
      new fields.SchemaField(damageActionSchema(), { required: true, nullable: false }),
      { required: true, nullable: false }
    ),
  }
}

type ConditionsSchema = ReturnType<typeof conditionsSchema>

/* ---------------------------------------- */

const reactionSchema = () => {
  return {
    // NOTE: change from previous schema, where "modifier" was a string
    modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    situation: new fields.StringField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
  }
}

type ReactionSchema = ReturnType<typeof reactionSchema>

/* ---------------------------------------- */

const moveSchema = () => {
  return {
    mode: new fields.StringField({ required: true, nullable: false }),
    basic: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    enhanced: new fields.NumberField({ required: true, nullable: true }),
    default: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type MoveSchema = ReturnType<typeof moveSchema>

/* ---------------------------------------- */

export {
  attributeSchema,
  conditionsSchema,
  damageActionSchema,
  encumbranceSchema,
  liftingMovingSchema,
  moveSchema,
  poolSchema,
  reactionSchema,
  type ConditionsSchema,
  type DamageActionSchema,
  type EncumbranceSchema,
  type LiftingMovingSchema,
  type MoveSchema,
  type ReactionSchema,
}
