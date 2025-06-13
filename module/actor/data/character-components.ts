import fields = foundry.data.fields

const attributeSchema = {
  import: new fields.NumberField({ required: true, nullable: false, initial: 10 }),
  value: new fields.NumberField({ required: true, nullable: false, initial: 10 }),
  points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
}

/* ---------------------------------------- */

const poolSchema = {
  value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
}

/* ---------------------------------------- */

const encumbranceSchema = {
  key: new fields.StringField({ required: true, nullable: false }),
  level: new fields.NumberField({ required: true, nullable: false }),
  dodge: new fields.NumberField({ required: true, nullable: false }),
  weight: new fields.NumberField({ required: true, nullable: false }),
  move: new fields.NumberField({ required: true, nullable: false }),
}

type EncumbranceSchema = typeof encumbranceSchema

/* ---------------------------------------- */

const liftingMovingSchema = {
  basiclift: new fields.StringField({ required: true, nullable: false }),
  onehandedlift: new fields.StringField({ required: true, nullable: false }),
  twohandedlift: new fields.StringField({ required: true, nullable: false }),
  shove: new fields.StringField({ required: true, nullable: false }),
  runnningshove: new fields.StringField({ required: true, nullable: false }),
  shiftslightly: new fields.StringField({ required: true, nullable: false }),
  carryonback: new fields.StringField({ required: true, nullable: false }),
}

type LiftingMovingSchema = typeof liftingMovingSchema

/* ---------------------------------------- */

export {
  attributeSchema,
  poolSchema,
  encumbranceSchema,
  liftingMovingSchema,
  type EncumbranceSchema,
  type LiftingMovingSchema,
}
